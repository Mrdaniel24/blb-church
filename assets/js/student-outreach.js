/* BLB student campus invitation calling workflow. */
(function () {
  'use strict';

  const STATUSES = {
    pending: { label: 'Pending', icon: 'schedule' },
    confirmed: { label: 'Amethibitisha', icon: 'check_circle' },
    not_confirmed: { label: 'Hajathibitisha', icon: 'cancel' },
    no_answer: { label: 'Hakupokea simu', icon: 'call_missed' }
  };
  const params = new URLSearchParams(window.location.search);
  const state = { profile: null, coordinator: false, callOnly: false, previewOnly: false, guestMode: false, guestToken: params.get('mgeni'), guestCaller: null, students: [], history: [], callers: [], memberCallers: [], selectedCallers: [], lastAttempt: {}, requestedCaller: params.get('mpigaji') };
  const $ = id => document.getElementById(id);

  document.addEventListener('DOMContentLoaded', async () => {
    if (state.guestToken) {
      state.guestMode = true;
      state.callOnly = true;
      document.body.classList.add('call-only-mode');
      $('main-page-intro').classList.add('hidden');
      $('call-only-heading').classList.remove('hidden');
      $('call-only-title').textContent = 'Orodha ya simu';
      $('call-only-caption').textContent = 'Piga simu, chagua matokeo na ongeza maelezo.';
      $('dashboard-summary').classList.add('hidden');
      $('campus-summary').classList.add('hidden');
      $('bulk-assign-panel').classList.add('hidden');
      $('caller-feedback-panel').classList.add('hidden');
      $('coordinator-actions').classList.add('hidden');
      $('empty-state').querySelector('h4').textContent = 'Bado hujagawiwa namba';
      $('empty-state').querySelector('p').textContent = 'Wasiliana na mwenyekiti wa kikundi chako.';
      $('list-caption').textContent = 'Namba ulizogawiwa na kumbukumbu za simu';
      document.body.style.opacity = '1';
      bindEvents();
      await loadGuest();
      return;
    }
    state.profile = await initPageGuard();
    if (!state.profile) return;
    const permissions = state.profile.permissions;
    state.coordinator = state.profile.role === 'super_admin' || Boolean(permissions?.all || permissions?.can_manage_members);
    state.callOnly = Boolean(state.requestedCaller);
    state.previewOnly = state.callOnly && state.coordinator && state.requestedCaller !== state.profile.id;
    if (state.callOnly) {
      if (!state.coordinator && state.requestedCaller !== state.profile.id) {
        showError('Link hii imegawiwa kwa akaunti nyingine. Ingia kwenye akaunti yako ya BLB kisha fungua link yako binafsi.');
        $('loading-state').classList.add('hidden');
        document.body.style.opacity = '1';
        return;
      }
      document.body.classList.add('call-only-mode');
      $('main-page-intro').classList.add('hidden');
      $('call-only-heading').classList.remove('hidden');
      $('call-only-title').textContent = state.previewOnly ? 'Preview ya mpigaji' : 'Orodha yako ya simu';
      $('call-only-caption').textContent = state.previewOnly ? 'Huu ni muonekano wa kusoma tu; mpigaji mwenye akaunti hii ndiye anayeweza kurekodi matokeo.' : 'Piga simu, chagua matokeo na ongeza maelezo.';
      $('dashboard-summary').classList.add('hidden');
      $('campus-summary').classList.add('hidden');
      $('bulk-assign-panel').classList.add('hidden');
      $('caller-feedback-panel').classList.add('hidden');
      $('coordinator-actions').classList.add('hidden');
      $('list-caption').textContent = state.previewOnly ? 'Orodha ya mpigaji (preview ya kusoma tu)' : 'Namba ulizogawiwa na kumbukumbu za simu';
    }
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
    if (state.callOnly) {
      ['coordinator-actions','dashboard-summary','campus-summary','bulk-assign-panel','caller-feedback-panel','export-btn','campus-filter','caller-filter','caller-head'].forEach(id => $(id)?.classList.add('hidden'));
      $('empty-state').querySelector('h4').textContent = 'Bado huna namba ulizogawiwa';
      $('empty-state').querySelector('p').textContent = 'Mwasiliane na mwenyekiti akugawie wanafunzi wa kuwapigia.';
    }
    bindEvents();
    await loadAll();
  });

  function bindEvents() {
    $('refresh-btn').addEventListener('click', () => state.guestMode ? loadGuest() : loadAll());
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
    $('assign-caller-choice').addEventListener('change', event => {
      addCallerName(event.currentTarget.value);
      event.currentTarget.value = '';
    });
    $('add-caller-name').addEventListener('click', () => {
      addCallerName($('assign-new-caller').value);
      $('assign-new-caller').value = '';
    });
    $('assign-new-caller').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); $('add-caller-name').click(); }
    });
    $('selected-callers-list').addEventListener('click', event => {
      const remove = event.target.closest('button[data-remove-caller]');
      if (!remove) return;
      state.selectedCallers = state.selectedCallers.filter(name => name !== remove.dataset.removeCaller);
      renderSelectedCallers();
    });
    renderSelectedCallers();
    $('caller-feedback-list').addEventListener('click', handleCallerLink);
  }

  async function loadGuest() {
    showError('');
    $('loading-state').classList.remove('hidden');
    $('students-table').classList.add('hidden');
    $('empty-state').classList.add('hidden');
    try {
      const { data, error } = await supabase.rpc('student_outreach_open_manual_caller', { p_token: state.guestToken });
      if (error) throw error;
      state.guestCaller = data.caller;
      state.callers = [data.caller];
      state.students = data.students || [];
      state.history = data.history || [];
      $('call-only-title').textContent = `Simu za ${state.guestCaller.full_name}`;
      populateFilters();
      render();
    } catch (error) {
      showError(`Link hii si sahihi au imebatilishwa. Omba mwenyekiti akutumie link mpya. ${error.message || ''}`);
    } finally { $('loading-state').classList.add('hidden'); }
  }

  async function loadAll() {
    showError(''); $('loading-state').classList.remove('hidden'); $('students-table').classList.add('hidden'); $('empty-state').classList.add('hidden');
    try {
      let query = supabase.from('student_outreach_students').select('*').order('campus').order('full_name');
      if (!state.coordinator || state.callOnly) query = query.eq('assigned_caller', state.requestedCaller || state.profile.id);
      const { data, error } = await query;
      if (error) throw error;
      state.students = data || [];
      const { data: history, error: historyError } = await supabase.from('student_outreach_call_history').select('id,student_id,caller_id,manual_caller_id,call_status,note,called_at').order('called_at', { ascending: false });
      if (historyError) throw historyError;
      state.history = history || [];
      if (state.coordinator) { await loadCallers(); await loadMemberCallers(); }
      populateFilters();
      populateAssignmentControls();
      renderCallerFeedback();
      render();
    } catch (error) {
      showError(`Haikuweza kupakia orodha. Hakikisha migrations za Supabase 20261114_student_outreach.sql, 20261115_student_outreach_even_assignment.sql na 20261116_student_outreach_guest_callers.sql zimeendeshwa. Maelezo: ${error.message || error}`);
    } finally { $('loading-state').classList.add('hidden'); }
  }

  async function loadCallers() {
    const { data, error } = await supabase.rpc('student_outreach_manual_callers');
    if (error) throw error;
    state.callers = data || [];
  }

  async function loadMemberCallers() {
    const { data, error } = await supabase.rpc('student_outreach_callers');
    if (error) throw error;
    state.memberCallers = data || [];
  }

  function callerName(id) {
    const manualId = String(id || '').startsWith('manual:') ? String(id).slice(7) : id;
    const caller = state.callers.find(person => person.id === manualId) || state.memberCallers.find(person => person.id === id);
    return caller?.full_name || caller?.email || state.guestCaller?.full_name || 'Hajapangiwa';
  }

  function populateFilters() {
    const campuses = [...new Set(state.students.map(student => student.campus).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    $('campus-filter').innerHTML = '<option value="">Vyuo vyote</option>' + campuses.map(campus => `<option value="${escapeHtml(campus)}">${escapeHtml(campus)}</option>`).join('');
    const callerValues = [...new Set(state.students.map(student => student.assigned_caller_manual_id ? `manual:${student.assigned_caller_manual_id}` : student.assigned_caller).filter(Boolean))];
    $('caller-filter').innerHTML = '<option value="">Wapigaji wote</option>' + callerValues.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(callerName(value))}</option>`).join('');
    if (state.coordinator && state.requestedCaller && callerValues.includes(state.requestedCaller)) $('caller-filter').value = state.requestedCaller;
  }

  function populateAssignmentControls() {
    if (!state.coordinator) return;
    const campuses = [...new Set(state.students.map(student => student.campus).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    $('assign-campus').innerHTML = '<option value="">Chagua chuo</option>' + campuses.map(campus => `<option value="${escapeHtml(campus)}">${escapeHtml(campus)}</option>`).join('');
  }

  function addCallerName(value) {
    const name = String(value || '').trim();
    if (!name) return;
    if (!state.selectedCallers.some(existing => existing.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      state.selectedCallers.push(name);
      renderSelectedCallers();
    }
  }

  function renderSelectedCallers() {
    $('selected-callers-list').innerHTML = state.selectedCallers.map(name =>
      `<span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-950">${escapeHtml(name)}<button type="button" data-remove-caller="${escapeHtml(name)}" aria-label="Ondoa ${escapeHtml(name)}" class="ml-1 rounded-full px-1 text-blue-700 hover:bg-blue-200">×</button></span>`
    ).join('') || '<span class="text-xs text-slate-400">Bado hujachagua wapigaji</span>';
  }

  function renderCallerFeedback() {
    if (!state.coordinator) return;
    const assignedCallerIds = new Set(state.students.map(student => student.assigned_caller_manual_id).filter(Boolean));
    $('caller-feedback-list').innerHTML = state.callers.filter(caller => assignedCallerIds.has(caller.id)).map(caller => {
      const assigned = state.students.filter(student => student.assigned_caller_manual_id === caller.id);
      const contacted = state.history.filter(entry => entry.manual_caller_id === caller.id);
      const confirmed = assigned.filter(student => student.call_status === 'confirmed').length;
      const notConfirmed = assigned.filter(student => student.call_status === 'not_confirmed').length;
      const noAnswer = assigned.filter(student => student.call_status === 'no_answer').length;
      return `<article class="rounded-xl border border-slate-200 bg-slate-50 p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h4 class="font-extrabold text-blue-950">${escapeHtml(caller.full_name || 'Mpigaji')}</h4><p class="text-xs text-slate-500">Mpigaji wa link binafsi</p></div><div class="flex flex-wrap gap-2"><button data-caller-action="open" data-caller-id="${escapeHtml(caller.id)}" class="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-blue-900 hover:bg-blue-50"><span class="material-symbols-outlined text-base">visibility</span>Ona orodha</button><button data-caller-action="copy" data-caller-id="${escapeHtml(caller.id)}" class="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-950 px-3 text-xs font-bold text-white hover:bg-blue-900"><span class="material-symbols-outlined text-base">link</span>Nakili link</button></div></div><div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Waliogawiwa</span><strong class="text-base text-blue-950">${assigned.length}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Simu/historia</span><strong class="text-base text-blue-950">${contacted.length}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Ndiyo</span><strong class="text-base text-emerald-700">${confirmed}</strong></div><div class="rounded-lg bg-white p-2"><span class="block text-slate-500">Hapana / hakupokea</span><strong class="text-base text-rose-700">${notConfirmed} / ${noAnswer}</strong></div></div></article>`;
    }).join('') || '<p class="text-sm text-slate-500">Bado hakuna mpigaji aliyegawiwa wanafunzi.</p>';
  }

  async function handleCallerLink(event) {
    const button = event.target.closest('button[data-caller-action]');
    if (!button) return;
    const callerId = button.dataset.callerId;
    if (button.dataset.callerAction === 'open') {
      $('caller-filter').value = `manual:${callerId}`;
      render();
      $('students-table').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    try {
      const { data: token, error } = await supabase.rpc('student_outreach_make_manual_caller_link', { p_caller_id: callerId });
      if (error) throw error;
      const link = `${window.location.origin}${window.location.pathname}?mgeni=${encodeURIComponent(token)}`;
      try { await navigator.clipboard.writeText(link); }
      catch (_) { window.prompt('Nakili link hii ya faragha na umtumie mpigaji:', link); }
      button.innerHTML = '<span class="material-symbols-outlined text-base">check</span>Link mpya imenakiliwa';
      setTimeout(() => { if (button.isConnected) button.innerHTML = '<span class="material-symbols-outlined text-base">link</span>Nakili link'; }, 1800);
    } catch (error) {
      showError(`Link haijatengenezwa: ${error.message || error}`);
    }
  }

  async function assignCampus() {
    const campus = $('assign-campus').value;
    const names = state.selectedCallers;
    const students = state.students.filter(student => student.campus === campus);
    if (!campus || !names.length || !students.length) {
      showAssignmentFeedback('Chagua chuo, chagua jina kwenye list au andika jina jipya, na hakikisha chuo kina wanafunzi.', false);
      return;
    }
    const uniqueNames = [...new Map(names.map(name => [name.toLocaleLowerCase(), name])).values()];
    if (!window.confirm(`Unataka kuwagawa wanafunzi ${students.length} wa ${campus} kwa wapigaji ${uniqueNames.join(', ')} kwa usawa?`)) return;
    const { data, error } = await supabase.rpc('student_outreach_assign_manual_campus', { p_campus: campus, p_names: uniqueNames });
    if (error) { showAssignmentFeedback(`Mgawo haujahifadhiwa: ${error.message}`, false); return; }
    const summary = (data.callers || []).map(item => `${item.full_name}: ${item.assigned}`).join(' · ');
    showAssignmentFeedback(`${data.total} wamegawiwa kwa usawa — ${summary}`, true);
    state.selectedCallers = [];
    renderSelectedCallers();
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
      const callerValue = student.assigned_caller_manual_id ? `manual:${student.assigned_caller_manual_id}` : student.assigned_caller;
      return matchesTerm && (!status || student.call_status === status) && (!campus || student.campus === campus) && (!caller || callerValue === caller);
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
    const callerCell = state.coordinator && !state.callOnly ? `<td class="px-5 py-4 text-sm text-slate-600"><span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-base text-slate-400">person</span>${escapeHtml(callerName(student.assigned_caller_manual_id || student.assigned_caller))}</span></td>` : '';
    const dialNumber = String(student.phone || '').replace(/[^\d+*#,;]/g, '');
    const callButton = state.previewOnly
      ? `<button type="button" disabled class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-xs font-extrabold text-slate-500"><span class="material-symbols-outlined text-base">call</span><span>Piga simu</span></button>`
      : dialNumber
      ? `<a href="tel:${encodeURIComponent(dialNumber)}" aria-label="Piga simu kwa ${escapeHtml(student.full_name)}" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"><span class="material-symbols-outlined text-base">call</span><span>Piga simu</span></a>`
      : `<button type="button" disabled aria-label="Hakuna namba ya simu kwa ${escapeHtml(student.full_name)}" title="Hakuna namba ya simu" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-xs font-extrabold text-slate-500"><span class="material-symbols-outlined text-base">call</span><span>Piga simu</span></button>`;
    const disabled = state.previewOnly ? 'disabled' : '';
    const noteButton = state.previewOnly ? '' : `<button data-action="note" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Ongeza note"><span class="material-symbols-outlined text-lg">edit_note</span></button>`;
    const controls = `<div class="flex min-w-[280px] flex-wrap items-center gap-2">${callButton}<select ${disabled} data-action="status" data-id="${escapeHtml(student.id)}" aria-label="Hali ya simu kwa ${escapeHtml(student.full_name)}" class="min-h-11 rounded-lg border-slate-200 py-2 text-xs font-bold focus:border-blue-800 focus:ring-blue-800">${Object.entries(STATUSES).map(([value,item]) => `<option value="${value}" ${student.call_status === value ? 'selected' : ''}>${item.label}</option>`).join('')}</select>${noteButton}${state.coordinator && !state.callOnly ? `<button data-action="edit" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Hariri mgawo"><span class="material-symbols-outlined text-lg">tune</span></button>` : ''}<button data-action="history" data-id="${escapeHtml(student.id)}" class="min-h-11 min-w-11 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-900" title="Historia ya simu"><span class="material-symbols-outlined text-lg">history</span></button></div>`;
    return `<tr class="hover:bg-slate-50/70"><td class="px-5 py-4"><div class="flex items-center gap-3"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-900">${escapeHtml(initial)}</div><div><div class="font-bold text-blue-950">${escapeHtml(student.full_name)}</div><div class="text-xs text-slate-500">${escapeHtml(student.phone || 'Hakuna namba')}${student.latest_note ? ` · <span title="${escapeHtml(student.latest_note)}">${escapeHtml(trimText(student.latest_note,32))}</span>` : ''}</div></div></div></td><td class="campus-cell px-5 py-4 text-sm font-semibold text-slate-700">${escapeHtml(student.campus)}</td>${callerCell}<td class="px-5 py-4"><span class="status-pill status-${statusClass(student.call_status)}"><span class="material-symbols-outlined text-sm">${status.icon}</span>${status.label}</span></td><td class="px-5 py-4 text-xs text-slate-500">${latestCall ? `${formatDate(latestCall.called_at)}<br/><span class="text-slate-400">${escapeHtml(trimText(latestCall.note || 'Hakuna note', 40))}</span>` : 'Bado hajapigiwa'}</td><td class="px-5 py-4">${controls}</td></tr>`;
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
      const assigned = list.filter(student => student.assigned_caller || student.assigned_caller_manual_id).length;
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
    const now = new Date().toISOString();
    try {
      if (state.guestMode) {
        const { error } = await supabase.rpc('student_outreach_record_manual_call', { p_token: state.guestToken, p_student_id: studentId, p_status: nextStatus, p_note: null });
        if (error) throw error;
        student.call_status = nextStatus;
        state.history.unshift({ id: crypto.randomUUID(), student_id: studentId, manual_caller_id: state.guestCaller.id, call_status: nextStatus, note: null, called_at: now });
        render();
        return;
      }
      const { error: historyError } = await supabase.from('student_outreach_call_history').insert({ student_id: studentId, call_status: nextStatus, note: null });
      if (historyError) throw historyError;
      const { error } = await supabase.from('student_outreach_students').update({ call_status: nextStatus }).eq('id', studentId);
      if (error) throw error;
      student.call_status = nextStatus;
      state.history.unshift({ id: crypto.randomUUID(), student_id: studentId, caller_id: state.profile.id, call_status: nextStatus, note: null, called_at: now });
      render();
    } catch (error) { showError(`Hali ya simu haijahifadhiwa: ${error.message || error}`); }
  }

  async function addNote(student) {
    const note = window.prompt(`Note mpya kwa ${student.full_name}:`, student.latest_note || '');
    if (note === null) return;
    const clean = note.trim();
    try {
      if (state.guestMode) {
        const { error } = await supabase.rpc('student_outreach_record_manual_call', { p_token: state.guestToken, p_student_id: student.id, p_status: student.call_status || 'pending', p_note: clean });
        if (error) throw error;
        student.latest_note = clean || null;
        state.history.unshift({ id: crypto.randomUUID(), student_id: student.id, manual_caller_id: state.guestCaller.id, call_status: student.call_status || 'pending', note: clean || null, called_at: new Date().toISOString() });
        render();
        return;
      }
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
      const caller = callerName(entry.manual_caller_id || entry.caller_id) || state.guestCaller?.full_name;
      return `<article class="border-l-2 border-blue-200 pl-4 pb-5 last:pb-0"><div class="flex flex-wrap items-center justify-between gap-2"><span class="status-pill status-${statusClass(entry.call_status)}">${status.label}</span><time class="text-xs text-slate-500">${formatDate(entry.called_at)}</time></div><p class="mt-2 text-sm text-slate-700">${escapeHtml(entry.note || 'Hakuna maelezo ya ziada.')}</p><p class="mt-1 text-xs text-slate-400">Mpigaji: ${escapeHtml(caller)}</p></article>`;
    }).join('') : '<p class="text-sm text-slate-500">Bado hakuna historia ya simu.</p>';
    showModal(`Historia · ${student.full_name}`, `<div class="max-h-[55vh] space-y-1 overflow-auto">${content}</div>`);
  }

  async function openStudentForm(student = null) {
    if (!state.coordinator) return;
    const body = `<form id="student-form" class="space-y-4"><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Jina kamili *</label><input name="full_name" required maxlength="160" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.full_name || '')}" /></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Namba ya simu</label><input name="phone" maxlength="40" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.phone || '')}" /></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Chuo *</label><input name="campus" required maxlength="160" list="campus-options" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.campus || '')}" /><datalist id="campus-options">${[...new Set(state.students.map(item => item.campus))].map(campus => `<option value="${escapeHtml(campus)}"></option>`).join('')}</datalist></div></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Jina la mpigaji (si lazima)</label><input name="caller_name" maxlength="120" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" placeholder="Andika jina; akaunti haihitajiki" value="${escapeHtml(student?.assigned_caller_manual_id ? callerName(student.assigned_caller_manual_id) : '')}" /></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Mwaliko ni wa Jumapili gani?</label><input name="invited_for" type="date" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" value="${escapeHtml(student?.invited_for || '')}" /></div><div><label class="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-600">Note</label><textarea name="latest_note" rows="3" class="w-full rounded-xl border-slate-200 focus:border-blue-800 focus:ring-blue-800" placeholder="Maelezo muhimu…">${escapeHtml(student?.latest_note || '')}</textarea></div><button class="w-full rounded-xl bg-blue-950 py-3 font-bold text-white hover:bg-blue-900">${student ? 'Hifadhi mabadiliko' : 'Ongeza mwanafunzi'}</button></form>`;
    showModal(student ? 'Hariri mwanafunzi na mgawo' : 'Ongeza mwanafunzi', body);
    $('student-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const callerNameInput = String(form.get('caller_name') || '').trim();
      let manualCallerId = student?.assigned_caller_manual_id || null;
      if (callerNameInput) {
        const { data: caller, error } = await supabase.from('student_outreach_manual_callers').upsert({ full_name: callerNameInput }, { onConflict: 'normalized_name' }).select('id').single();
        if (error) { showError(`Jina la mpigaji halijahifadhiwa: ${error.message}`); return; }
        manualCallerId = caller.id;
      }
      const payload = { full_name: String(form.get('full_name')).trim(), phone: String(form.get('phone') || '').trim() || null, campus: String(form.get('campus')).trim(), assigned_caller: callerNameInput ? null : (student?.assigned_caller || null), assigned_caller_manual_id: manualCallerId, invited_for: String(form.get('invited_for') || '') || null, latest_note: String(form.get('latest_note') || '').trim() || null };
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
      const students = normalized.map(row => ({ full_name: (row[0] || '').trim(), phone: (row[1] || '').trim() || null, campus: (row[2] || '').trim(), created_by: state.profile.id })).filter(row => row.full_name && row.campus);
      if (!students.length) throw new Error('Tumia safu: Jina, Simu, Chuo. Gawa wapigaji kwenye sehemu ya mgawo wa chuo.');
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
    } catch (error) { showError(`CSV haijaingizwa. Tumia safu Jina, Simu, Chuo. ${error.message || error}`); }
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
    const list = state.students.filter(student => (!campus || student.campus===campus) && (!caller || (student.assigned_caller_manual_id ? `manual:${student.assigned_caller_manual_id}` : student.assigned_caller)===caller) && (!status || student.call_status===status) && (!term || [student.full_name,student.phone,student.campus].some(value=>String(value||'').toLocaleLowerCase().includes(term))) && student.call_status==='confirmed');
    const rows = [['Jina','Simu','Chuo','Mpigaji','Hali','Note'], ...list.map(student=>[student.full_name,student.phone,student.campus,callerName(student.assigned_caller_manual_id || student.assigned_caller),'Amethibitisha',student.latest_note])];
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


