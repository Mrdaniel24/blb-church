/* BLB student campus invitation calling workflow. */
(function () {
  'use strict';

  const STATUSES = {
    pending: { label: 'Pending', icon: 'schedule' },
    confirmed: { label: 'Amethibitisha', icon: 'check_circle' },
    not_confirmed: { label: 'Hajathibitisha', icon: 'cancel' },
    no_answer: { label: 'Hakupokea simu', icon: 'call_missed' }
  };
  const state = { profile: null, coordinator: false, students: [], history: [], callers: [], lastAttempt: {}, requestedCaller: new URLSearchParams(window.location.search).get('mpigaji') };
  const $ = id => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', async () => {
    state.profile = await initPageGuard();
    if (!state.profile) return;
    const permissions = state.profile.permissions;
    state.coordinator = state.profile.role === 'super_admin' || Boolean(permissions?.all || permissions?.can_manage_members);
    if (state.coordinator) {
      $('coordinator-actions').classList.remove('hidden');
      $('campus-summary').classList.remove('hidden');
      $('bulk-assign-panel').classList.remove('hidden');
      $('caller-feedback-panel').classList.remove('hidden');
      $('campus-filter').classList.remove('hidden');
      $('caller-filter').classList.remove('hidden');
      $('caller-head').classList.remove('hidden');
      $('export-btn').classList.remove('hidden');
      $('list-caption').textContent = 'Muhtasari na mgawo wa simu kwa vyuo';
    } else {
      $('dashboard-summary').classList.add('hidden');
    }
    bindEvents();
    await loadAll();
  });

  function bindEvents() {
    $('refresh-btn').addEventListener('click', loadAll);
    $('search').addEventListener('input', render);
    $('status-filter').addEventListener('change', render);
    $('campus-filter').addEventListener('change', render);
    $('caller-filter').addEventListener('change', render);
    $('add-btn').addEventListener('click', () => openStudentForm());
    $('import-btn').addEventListener('click', () => $('csv-file').click());
    $('csv-file').addEventListener('change', importCsv);
    $('export-btn').addEventListener('click', exportDriverList);
    $('students-body').addEventListener('click', handleRowAction);
    $('assign-campus-btn').addEventListener('click', assignCampus);
    $('caller-feedback-list').addEventListener('click', handleCallerLink);
  }

  async function loadAll() {
    showError(''); $('loading-state').classList.remove('hidden'); $('students-table').classList.add('hidden'); $('empty-state').classList.add('hidden');
    try {
      let query = supabase.from('student_outreach_students').select('*').order('campus').order('full_name');
      if (!state.coordinator) query = query.eq('assigned_caller', state.profile.id);
      const { data, error } = await query;
      if (error) throw error;
      state.students = data || [];
      const { data: history, error: historyError } = await supabase.from('student_outreach_call_history').select('id,student_id,caller_id,call_status,note,called_at').order('called_at', { ascending: false });
      if (historyError) throw historyError;
      state.history = history || [];
      if (state.coordinator) await loadCallers();
      populateFilters();
      populateAssignmentControls();
      renderCallerFeedback();
      render();
    } catch (error) {
      showError(`Haikuweza kupakia orodha. Hakikisha migration za Supabase 20261114_student_outreach.sql na 20261115_student_outreach_even_assignment.sql zimeendeshwa. Maelezo: ${error.message || error}`);
    } finally { $('loading-state').classList.add('hidden'); }
  }

  async function loadCallers() {
    const { data, error } = await supabase.rpc('student_outreach_callers');
    if (error) throw error;
    state.callers = data || [];
  }

  function callerName(id) {
    const caller = state.callers.find(person => person.id === id);
    return caller?.full_name || caller?.email || 'Hajapangiwa';
  }

  function populateFilters() {
    const campuses = [...new Set(state.students.map(student => student.campus).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    $('campus-filter').innerHTML = '<option value="">Vyuo vyote</option>' + campuses.map(campus => `<option value="${escapeHtml(campus)}">${escapeHtml(campus)}</option>`).join('');
    const callerIds = [...new Set(state.students.map(student => student.assigned_caller).filter(Boolean))];
    $('caller-filter').innerHTML = '<option value="">Wapigaji wote</option>' + callerIds.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(callerName(id))}</option>`).join('');
    if (state.coordinator && state.requestedCaller && callerIds.includes(state.requestedCaller)) $('caller-filter').value = state.requestedCaller;
  }

  function populateAssignmentControls() {
    if (!state.coordinator) return;
    const campuses = [...new Set(state.students.map(student => student.campus).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    $('assign-campus').innerHTML = '<option value="">Chagua chuo</option>' + campuses.map(campus => `<option value="${escapeHtml(campus)}">${escapeHtml(campus)}</option>`).join('');
  }

  function renderCallerFeedback() {
    if (!state.coordinator) return;
    const assignedCallerIds = new Set(state.students.map(student => student.assigned_caller).filter(Boolean));
    $('caller-feedback-list').innerHTML = state.callers.filter(caller => assignedCallerIds.has(caller.id)).map(caller => {
      const assigned = state.students.filter(student => student.assigned_caller === caller.id);
      const contacted = state.history.filter(entry => entry.caller_id === caller.id);
      const confirmed = assigned.filter(student => student.call_status === 'confirmed').length;
      const notConfirmed = assigned.filter(student => student.call_status === 'not_confirmed').length;
      const noAnswer = assigned.filter(student => student.call_status === 'no_answer').length;
      const link = `${window.location.origin}${window.location.pathname}?mpigaji=${encodeURIComponent(caller.id)}`;
      return `<article class="rounded-xl border border-slate-200 bg-slate-50 p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h4 class="font-extrabold text-blue-950">${escapeHtml(caller.full_name || caller.email || 'Mpigaji')}</h4><p class="text-xs text-slate-500">${escapeHtml(caller.email || '')}</p></div><div class="flex flex-wrap gap-2"><button data-caller-action="open" data-link="${escapeHtml(link)}" class="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-blue-900 hover:bg-blue-50"><span class="material-symbols-outlined text-base">visibility</span>Ona orodha</button><button data-caller-action="copy" data-link="${escapeHtml(link)}" class="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-950 px-3 text-xs font-bold text-white hover:bg-blue-900"><span class="material-symbols-outlined text-base">link</span>Nakili link</button></div></div><div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Waliogawiwa</span><strong class="text-base text-blue-950">${assigned.length}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Simu/historia</span><strong class="text-base text-blue-950">${contacted.length}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Ndiyo</span><strong class="text-base text-emerald-700">${confirmed}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Hapana / hakupokea</span><strong class="text-base text-rose-700">${notConfirmed} / ${noAnswer}</strong></div></div></article>`;
    }).join('') || '<p class="text-sm text-slate-500">Bado hakuna mpigaji aliyegawiwa wanafunzi.</p>';
  }

  async function handleCallerLink(event) {
    const button = event.target.closest('button[data-caller-action]');
    if (!button) return;
    const link = button.dataset.link;
    if (button.dataset.callerAction === 'open') {
      $('caller-filter').value = new URL(link).searchParams.get('mpigaji') || '';
      render();
      $('students-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      button.innerHTML = '<span class="material-symbols-outlined text-base">check</span>Link imenakiliwa';
      setTimeout(() => { if (button.isConnected) button.innerHTML = '<span class="material-symbols-outlined text-base">link</span>Nakili link'; }, 1800);
    } catch (_) {
      window.prompt('Nakili link hii na umtumie mpigaji:', link);
    }
  }

  async function assignCampus() {
    const campus = $('assign-campus').value;
    const names = $('assign-callers').value.split(/[\n,;]+/).map(name => name.trim()).filter(Boolean);
    const students = state.students.filter(student => student.campus === campus);
    if (!campus || !names.length || !students.length) {
      showAssignmentFeedback('Chagua chuo, andika angalau jina moja la mpigaji mwenye akaunti hai ya BLB, na hakikisha chuo kina wanafunzi.', false);
      return;
    }
    const uniqueNames = [...new Map(names.map(name => [name.toLocaleLowerCase(), name])).values()];
    const callerIds = [];
    for (const name of uniqueNames) {
      const matches = state.callers.filter(caller => String(caller.full_name || '').trim().toLocaleLowerCase() === name.toLocaleLowerCase());
      if (matches.length !== 1) {
        showAssignmentFeedback(matches.length ? `Jina “${name}” linafanana na akaunti zaidi ya moja. Tumia jina kamili tofauti.` : `“${name}” hana akaunti hai ya BLB. Muombe aingie au afungue akaunti kwanza, kisha andika jina lake kama lilivyo kwenye akaunti.`, false);
        return;
      }
      callerIds.push(matches[0].id);
    }
    if (!window.confirm(`Unataka kuwagawa wanafunzi ${students.length} wa ${campus} kwa wapigaji ${uniqueNames.join(', ')} kwa usawa?`)) return;
    const { data, error } = await supabase.rpc('student_outreach_assign_campus', { p_campus: campus, p_caller_ids: callerIds });
    if (error) { showAssignmentFeedback(`Mgawo haujahifadhiwa: ${error.message}`, false); return; }
    const summary = (data.callers || []).map(item => `${callerName(item.id)}: ${item.assigned}`).join(' · ');
    showAssignmentFeedback(`${data.total} wamegawiwa kwa usawa — ${summary}`, true);
    $('assign-callers').value = '';
    await loadAll();
  }

  function showAssignmentFeedback(message, success) {
    const el = $('assign-feedback');
    el.textContent = message;
    el.classList.remove('hidden', 'text-emerald-700', 'text-rose-700');
    el.classList.add(success ? 'text-emerald-700' : 'text-rose-700');
  }

  function render() {
    const term = $('search').value.trim().toLocaleLowerCase();
    const status = $('status-filter').value;
    const campus = $('campus-filter').value;
    const caller = $('caller-filter').value;
    const filtered = state.students.filter(student => {
      const matchesTerm = !term || [student.full_name, student.phone, student.campus, student.latest_note].some(value => String(value || '').toLocaleLowerCase().includes(term));
      return matchesTerm && (!status || student.call_status === status) && (!campus || student.campus === campus) && (!caller || student.assigned_caller === caller);
    });
    updateStats(filtered);
    updateCampusSummary(filtered);
    $('result-count').textContent = `${filtered.length} kati ya ${state.students.length} wanafunzi`;
    if (!filtered.length) { $('empty-state').classList.remove('hidden'); $('students-table').classList.add('hidden'); $('students-body').innerHTML = ''; return; }
    $('empty-state').classList.add('hidden'); $('students-table').classList.remove('hidden');
    $('students-body').innerHTML = filtered.map(student => rowHtml(student)).join('');
  }

  function rowHtml(student) {
    const latestCall = state.history.find(entry => entry.student_id === student.id);
    const status = STATUSES[student.call_status] || STATUSES.pending;
    const initial = getInitials(student.full_name || 'M');
    const callerCell = state.coordinator ? `<td class="px-5 py-4 text-sm text-slate-600"><span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-base text-slate-400">person</span>${escapeHtml(callerName(student.assigned_caller))}</span></td>` : '';
    const dialNumber = String(student.phone || '').replace(/[^\d+*#,;]/g, '');
    const callButton = dialNumber
      ? `<a href="tel:${encodeURIComponent(dialNumber)}" aria-label="Piga simu kwa ${escapeHtml(student.full_name)}" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"><span class="material-symbols-outlined text-base">call</span><span>Piga simu</span></a>`
      : `<button type="button" disabled aria-label="Hakuna namba ya simu kwa ${escapeHtml(student.full_name)}" title="Hakuna namba ya simu" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-xs font-extrabold text-slate-500"><span class="material-symbols-outlined text-base">call</span><span>Piga simu</span></button>`;
    const controls = `<div class="flex min-w-[280px] flex-wrap items-center gap-2">${callButton}<select data-action="status" data-id="${escapeHtml(student.id)}" aria-label="Hali ya simu kwa ${escapeHtml(student.full_name)}" class="min-h-11 rounded-lg border-slate-200 py-2 text-xs font-bold focus:border-blue-800 focus:ring-blue-800">${Object.entries(STATUSES).map(([value,item]) => `<option value="${value}" ${student.call_status === value ? 'selected' : ''}>${item.label}</option>`).join('')}</select><button data-action="note" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Ongeza note"><span class="material-symbols-outlined text-lg">edit_note</span></button>${state.coordinator ? `<button data-action="edit" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Hariri mgawo"><span class="material-symbols-outlined text-lg">tune</span></button>` : ''}<button data-action="history" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Historia ya simu"><span class="material-symbols-outlined text-lg">history</span></button></div>`;
    return `<tr class="hover:bg-slate-50/70"><td class="px-5 py-4"><div class="flex items-center gap-3"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-900">${escapeHtml(initial)}</div><div><div class="font-bold text-blue-950">${escapeHtml(student.full_name)}</div><div class="text-xs text-slate-500">${escapeHtml(student.phone || 'Hakuna namba')}${student.latest_note ? ` · <span title="${escapeHtml(student.latest_note)}">${escapeHtml(trimText(student.latest_note,32))}</span>` : ''}</div></div></div></td><td class="px-5 py-4 text-sm font-semibold text-slate-700">${escapeHtml(student.campus)}</td>${callerCell}<td class="px-5 py-4"><span class="status-pill status-${statusClass(student.call_status)}"><span class="material-symbols-outlined text-sm">${status.icon}</span>${status.label}</span></td><td class="px-5 py-4 text-xs text-slate-500">${latestCall ? `${formatDate(latestCall.called_at)}<br/><span class="text-slate-400">${escapeHtml(trimText(latestCall.note || 'Hakuna note', 40))}</span>` : 'Bado hajapigiwa'}</td><td class="px-5 py-4">${controls}</td></tr>`;
  }

  function updateStats(students) {
    if (!state.coordinator) return;
    $('stat-total').textContent = students.length;
    for (const status of Object.keys(STATUSES)) $(`stat-${status.replace('_','-')}`).textContent = students.filter(student => student.call_status === status).length;
  }

  function updateCampusSummary(students) {
    if (!state.coordinator) return;
    const campuses = [...new Set(students.map(student => student.campus))].sort((a,b) => a.localeCompare(b));
    $('campus-cards').innerHTML = campuses.map(campus => {
      const list = students.filter(student => student.campus === campus);
      const confirmed = list.filter(student => student.call_status === 'confirmed').length;
      const assigned = list.filter(student => student.assigned_caller).length;
      return `<article class="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div class="flex items-start justify-between gap-2"><h4 class="font-extrabold text-blue-950">${escapeHtml(campus)}</h4><span class="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-600">${list.length} watu</span></div><div class="mt-3 flex items-center justify-between text-xs text-slate-600"><span>✓ ${confirmed} wamethibitisha</span><span>${assigned}/${list.length} wamegawiwa</span></div><div class="mt-3 h-1.5 rounded-full bg-slate-200"><div class="h-1.5 rounded-full bg-emerald-500" style="width:${list.length ? Math.round(confirmed/list.length*100) : 0}%"></div></div></article>`;
    }).join('') || '<p class="text-sm text-slate-500">Vyuo vitaonekana baada ya kuongeza wanafunzi.</p>';
  }

  function statusClass(status) { return STATUSES[status] ? status : 'pending'; }

  async function handleRowAction(event) {
    const select = event.target.closest('select[data-action="status"]');
    if (select) { await updateStatus(select.dataset.id, select.value); return; }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const student = state.students.find(item => item.id === button.dataset.id);
    if (!student) return;
    if (button.dataset.action === 'note') await addNote(student);
    else if (button.dataset.action === 'history') showHistory(student);
    else if (button.dataset.action === 'edit') openStudentForm(student);
  }

  async function updateStatus(studentId, nextStatus) {
    const student = state.students.find(item => item.id === studentId);
    if (!student || !STATUSES[nextStatus]) return;
    state.lastAttempt[studentId] = Date.now();
    const note = window.prompt(`Maelezo ya simu hii kwa ${student.full_name} (si lazima):`, student.latest_note || '');
    if (note === null) { render(); return; }
    const now = new Date().toISOString();
    try {
      const { error: historyError } = await supabase.from('student_outreach_call_history').insert({ student_id: studentId, call_status: nextStatus, note: note.trim() || null });
      if (historyError) throw historyError;
      const { error } = await supabase.from('student_outreach_students').update({ call_status: nextStatus, latest_note: note.trim() || null }).eq('id', studentId);
      if (error) throw error;
      student.call_status = nextStatus; student.latest_note = note.trim() || null;
      state.history.unshift({ id: crypto.randomUUID(), student_id: studentId, caller_id: state.profile.id, call_status: nextStatus, note: note.trim() || null, called_at: now });
      render();
    } catch (error) { showError(`Hali ya simu haijahifadhiwa: ${error.message || error}`); }
  }

  async function addNote(student) {
    const note = window.prompt(`Note mpya kwa ${student.full_name}:`, student.latest_note || '');
    if (note === null) return;
    const clean = note.trim();
    try {
      const { error: historyError } = await supabase.from('student_outreach_call_history').insert({ student_id: student.id, call_status: student.call_status || 'pending', note: clean || null });
      if (historyError) throw historyError;
      const { error } = await supabase.from('student_outreach_students').update({ latest_note: clean || null }).eq('id', student.id);
      if (error) throw error;
      student.latest_note = clean || null;
      await loadAll();
    } catch (error) { showError(`Note haijahifadhiwa: ${error.message || error}`); }
  }

  function showHistory(student) {
    const history = state.history.filter(entry => entry.student_id === student.id);
    const content = history.length ? history.map(entry => {
      const status = STATUSES[entry.call_status] || STATUSES.pending;
      const caller = callerName(entry.caller_id);
      return `<article class="border-l-2 border-blue-200 pl-4 pb-5 last:pb-0"><div class="flex flex-wrap items-center justify-between gap-2"><span class="status-pill status-${statusClass(entry.call_status)}">${status.label}</span><time class="text-xs text-slate-500">${formatDate(entry.called_at)}</time></div><p class="mt-2 text-sm text-slate-700">${escapeHtml(entry.note || 'Hakuna maelezo ya ziada.')}</p><p class="mt-1 text-xs text-slate-400">Mpigaji: ${escapeHtml(caller)}</p></article>`;
    }).join('') : '<p class="text-sm text-slate-500">Bado hakuna historia ya simu.</p>';
    showModal(`Historia · ${student.full_name}`, `<div class="max-h-[55vh] space-y-1 overflow-auto">${content}</div>`);
  }

  async function openStudentForm(student = null) {
    if (!state.coordinator) return;
    const { data: users, error } = await supabase.rpc('student_outreach_callers');
    if (error) { showError(`Wapigaji hawakupatikana: ${error.message}`); return; }
    const callerOptions = (users || []).map(user => `<option value="${escapeHtml(user.id)}" ${student?.assigned_caller === user.id ? 'selected' : ''}>${escapeHtml(user.full_name || user.email || user.id)}</option>`).join('');
    const body = `<form id="student-form" class="space-y-4"><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Jina kamili *</label><input name="full_name" required maxlength="160" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.full_name || '')}" /></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Namba ya simu</label><input name="phone" maxlength="40" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.phone || '')}" /></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Chuo *</label><input name="campus" required maxlength="160" list="campus-options" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.campus || '')}" /><datalist id="campus-options">${[...new Set(state.students.map(item => item.campus))].map(campus => `<option value="${escapeHtml(campus)}"></option>`).join('')}</datalist></div></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Mpigaji wa simu</label><select name="assigned_caller" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800"><option value="">— Hajapangiwa bado —</option>${callerOptions}</select></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Mwaliko ni wa Jumapili gani?</label><input name="invited_for" type="date" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.invited_for || '')}" /></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Note</label><textarea name="latest_note" rows="3" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" placeholder="Maelezo muhimu…">${escapeHtml(student?.latest_note || '')}</textarea></div><button class="w-full rounded-xl bg-blue-950 py-3 font-bold text-white hover:bg-blue-900">${student ? 'Hifadhi mabadiliko' : 'Ongeza na gawa'}</button></form>`;
    showModal(student ? 'Hariri mwanafunzi na mgawo' : 'Ongeza mwanafunzi', body);
    $('student-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = { full_name: String(form.get('full_name')).trim(), phone: String(form.get('phone') || '').trim() || null, campus: String(form.get('campus')).trim(), assigned_caller: String(form.get('assigned_caller') || '') || null, invited_for: String(form.get('invited_for') || '') || null, latest_note: String(form.get('latest_note') || '').trim() || null };
      if (!payload.full_name || !payload.campus) return;
      const response = student ? await supabase.from('student_outreach_students').update(payload).eq('id', student.id) : await supabase.from('student_outreach_students').insert(payload);
      if (response.error) { showError(`Taarifa hazijahifadhiwa: ${response.error.message}`); return; }
      closeModal(); await loadAll();
    });
  }

  async function importCsv(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text.replace(/^\uFEFF/, '')).filter(row => row.some(cell => cell.trim()));
      if (!rows.length) throw new Error('Faili halina data.');
      const header = rows[0].map(value => value.trim().toLocaleLowerCase());
      const normalized = ['jina','name','full_name','jina kamili'].includes(header[0]) ? rows.slice(1) : rows;
      const students = normalized.map(row => ({ full_name: (row[0] || '').trim(), phone: (row[1] || '').trim() || null, campus: (row[2] || '').trim(), assigned_caller: (row[3] || '').trim() || null, created_by: state.profile.id })).filter(row => row.full_name && row.campus);
      if (!students.length) throw new Error('Tumia safu: Jina, Simu, Chuo, UUID ya mpigaji (ya hiari).');
      const phones = students.map(student => student.phone).filter(Boolean);
      const existingPhones = new Set();
      for (let offset = 0; offset < phones.length; offset += 100) {
        const batch = phones.slice(offset, offset + 100);
        const { data: existing, error: lookupError } = await supabase.from('student_outreach_students').select('phone').in('phone', batch);
        if (lookupError) throw lookupError;
        (existing || []).forEach(row => existingPhones.add(row.phone));
      }
      const unseen = students.filter(student => !student.phone || !existingPhones.has(student.phone));
      if (!unseen.length) { window.alert('Hakuna majina mapya. Simu zote zipo kwenye mfumo tayari.'); return; }
      const { error } = await supabase.from('student_outreach_students').insert(unseen);
      if (error) throw error;
      window.alert(`${unseen.length} wameingizwa${students.length > unseen.length ? `; ${students.length - unseen.length} waliokuwepo tayari wameachwa` : ''}.`); await loadAll();
    } catch (error) { showError(`CSV haijaingizwa. Tumia safu Jina, Simu, Chuo, UUID ya mpigaji (ya hiari). ${error.message || error}`); }
    finally { event.target.value = ''; }
  }

  function parseCsv(text) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let index=0; index<text.length; index++) { const char=text[index];
      if (quoted && char === '"' && text[index+1] === '"') { cell+='"'; index++; }
      else if (char === '"') quoted=!quoted;
      else if (char === ',' && !quoted) { row.push(cell); cell=''; }
      else if ((char === '\n' || char === '\r') && !quoted) { if (char==='\r' && text[index+1]==='\n') index++; row.push(cell); rows.push(row); row=[]; cell=''; }
      else cell+=char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function exportDriverList() {
    const campus = $('campus-filter').value; const caller = $('caller-filter').value;
    const status = $('status-filter').value; const term = $('search').value.trim().toLocaleLowerCase();
    const list = state.students.filter(student => (!campus || student.campus===campus) && (!caller || student.assigned_caller===caller) && (!status || student.call_status===status) && (!term || [student.full_name,student.phone,student.campus].some(value=>String(value||'').toLocaleLowerCase().includes(term))) && student.call_status==='confirmed');
    const rows = [['Jina','Simu','Chuo','Mpigaji','Hali','Note'], ...list.map(student=>[student.full_name,student.phone,student.campus,callerName(student.assigned_caller),'Amethibitisha',student.latest_note])];
    const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${String(value||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); link.download=`wanafunzi-dereva-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  function showModal(title, html) {
    closeModal();
    const overlay=document.createElement('div'); overlay.id='outreach-modal'; overlay.className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4';
    overlay.innerHTML=`<section class="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><header class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h3 class="font-extrabold text-blue-950">${escapeHtml(title)}</h3><button type="button" data-close-modal class="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><span class="material-symbols-outlined">close</span></button></header><div class="max-h-[75vh] overflow-y-auto p-5">${html}</div></section>`;
    overlay.addEventListener('click', event => { if(event.target===overlay || event.target.closest('[data-close-modal]')) closeModal(); }); document.body.appendChild(overlay);
  }
  function closeModal() { $('outreach-modal')?.remove(); }
  function showError(message) { const el=$('page-error'); if(!el)return; el.textContent=message; el.classList.toggle('hidden',!message); }
  function trimText(value, length) { const text=String(value||''); return text.length>length ? text.slice(0,length-1)+'…' : text; }
  function formatDate(value) { if(!value)return '—'; const date=new Date(value); return Number.isNaN(date.getTime())?'—':date.toLocaleString('sw-TZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
})();

