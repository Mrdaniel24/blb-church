import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Require auth — admin/super_admin only
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) return json({ error: 'Configuration error' }, 500)

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the user is admin/super_admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile } = await userClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return json({ error: 'Access denied' }, 403)
    }

    const { message, history = [] } = await req.json()
    if (!message?.trim()) return json({ error: 'Message is required' }, 400)

    // Service-role client for full data access
    const db = createClient(supabaseUrl, serviceKey)

    const now      = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString()
    const weekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch comprehensive church data in parallel
    const [
      membersRes, newMembersRes, deptStatsRes,
      contribMonthRes, contribYearRes, contribCatRes,
      eventsRes, sermonsRes, announcementsRes,
      adminsRes, mediaRes, settingsRes,
    ] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('role', 'member'),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member').gte('created_at', weekAgo),
      db.from('profiles').select('department_id, departments(name)').eq('status', 'active').eq('role', 'member'),
      db.from('contributions').select('amount').gte('contribution_date', monthStart.split('T')[0]).eq('status', 'completed'),
      db.from('contributions').select('amount').gte('contribution_date', yearStart.split('T')[0]).eq('status', 'completed'),
      db.from('contributions').select('category, amount').gte('contribution_date', monthStart.split('T')[0]).eq('status', 'completed'),
      db.from('events').select('title, start_date, category, location').gte('end_date', now.toISOString()).order('start_date').limit(8),
      db.from('sermons').select('title, speaker, sermon_date').eq('is_published', true).order('sermon_date', { ascending: false }).limit(5),
      db.from('announcements').select('title, priority, target_type').eq('is_active', true),
      db.from('profiles').select('full_name, role, department_id, whatsapp').in('role', ['admin', 'super_admin']).eq('status', 'active'),
      db.from('media_items').select('id', { count: 'exact', head: true }),
      db.from('system_settings').select('church_name, church_address, church_phone').single(),
    ])

    // Process stats
    const totalMembers  = membersRes.count ?? 0
    const newThisWeek   = newMembersRes.count ?? 0
    const admins        = adminsRes.data ?? []
    const totalAdmins   = admins.filter(a => a.role === 'admin').length
    const contribMonth  = (contribMonthRes.data ?? []).reduce((s, c) => s + (c.amount || 0), 0)
    const contribYear   = (contribYearRes.data ?? []).reduce((s, c) => s + (c.amount || 0), 0)
    const totalMedia    = mediaRes.count ?? 0
    const events        = eventsRes.data ?? []
    const sermons       = sermonsRes.data ?? []
    const announcements = announcementsRes.data ?? []
    const s             = settingsRes.data

    // Department breakdown
    const deptMap: Record<string, { name: string; count: number }> = {}
    for (const m of (deptStatsRes.data ?? [])) {
      const dname = (m.departments as any)?.name ?? 'Hakuna Idara'
      if (!deptMap[dname]) deptMap[dname] = { name: dname, count: 0 }
      deptMap[dname].count++
    }
    const deptStats = Object.values(deptMap).sort((a, b) => b.count - a.count)

    // Contributions by category this month
    const catMap: Record<string, number> = {}
    for (const c of (contribCatRes.data ?? [])) {
      catMap[c.category] = (catMap[c.category] || 0) + (c.amount || 0)
    }
    const catLabels: Record<string, string> = {
      tithe: 'Zaka', offering: 'Sadaka', building_fund: 'Mfuko wa Ujenzi',
      thanksgiving: 'Shukrani', special: 'Maalum',
    }
    const catStats = Object.entries(catMap)
      .map(([k, v]) => `${catLabels[k] ?? k}: TZS ${v.toLocaleString()}`)
      .join(', ')

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

    const systemPrompt = `You are the official AI management assistant for ${s?.church_name ?? 'BLB Church'}.
You are speaking with ${profile.full_name} — ${profile.role === 'super_admin' ? 'SUPER ADMINISTRATOR (highest access level, can see and manage everything)' : 'ADMINISTRATOR'}.

CRITICAL RULES:
1. You have DIRECT, REAL-TIME access to the church database. The data below was fetched THIS MOMENT.
2. ALWAYS use the exact numbers and data provided below. NEVER say "I don't have access" or "contact someone" for data listed here.
3. Respond in the same language the user writes (Swahili or English). Keep answers concise (2-4 sentences) unless detail is requested.
4. You can CREATE announcements when asked. See instructions at the bottom.

━━━ LIVE DATABASE SNAPSHOT — ${fmt(now.toISOString())} ━━━

MEMBERSHIP:
- Total active members (waumini): ${totalMembers}
- New members this week: ${newThisWeek}
- Active administrators: ${totalAdmins}
- Total admin + super_admin accounts: ${admins.length}

DEPARTMENTS (member count per department):
${deptStats.length ? deptStats.map(d => `• ${d.name}: ${d.count} members`).join('\n') : '• No department assignments yet'}

CONTRIBUTIONS THIS MONTH:
- Total: TZS ${contribMonth.toLocaleString()}
- By category: ${catStats || 'No completed contributions this month'}

CONTRIBUTIONS THIS YEAR:
- Total: TZS ${contribYear.toLocaleString()}

UPCOMING EVENTS (${events.length} total):
${events.length ? events.map(e => `• ${e.title} — ${fmt(e.start_date)}${e.location ? ' @ ' + e.location : ''}`).join('\n') : '• No upcoming events scheduled'}

RECENT SERMONS (last 5 published):
${sermons.length ? sermons.map(sr => `• "${sr.title}" by ${sr.speaker} (${fmt(sr.sermon_date)})`).join('\n') : '• No published sermons yet'}

ACTIVE ANNOUNCEMENTS (${announcements.length}):
${announcements.length ? announcements.map(a => `• [${(a.priority || 'general').toUpperCase()}] ${a.title} → ${a.target_type}`).join('\n') : '• No active announcements'}

MEDIA LIBRARY: ${totalMedia} files

ADMIN TEAM:
${admins.map(a => `• ${a.full_name} (${a.role})${a.whatsapp ? ' 📱 ' + a.whatsapp : ''}`).join('\n')}

━━━ ANNOUNCEMENT CREATION ━━━
When the user asks you to create, write, or draft an announcement:
1. Write a professional announcement in Swahili (or the user's language)
2. At the END of your response, append exactly this format (no spaces, valid JSON):
[[ANNOUNCE:{"title":"...","content":"...","priority":"general","target_type":"general"}]]

Priority options: "general" | "urgent" | "new" | "update"
Target options: "general" (all members) | "public" (landing page) | "department" (specific dept)

Example response when creating an announcement:
"Hii hapa rasimu ya tangazo lako:
[[ANNOUNCE:{"title":"Mkutano wa Jumapili","content":"Tunakualika kujiunga nasi Jumapili saa 4 asubuhi kwa ibada ya pamoja. Karibu nyote!","priority":"new","target_type":"general"}]]"`

    const isFirstMessage = !history || history.length === 0
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      ...(isFirstMessage ? [] : [
        { role: 'system', content: 'Do NOT start with a greeting. Reply directly.' }
      ]),
      { role: 'user', content: message.trim() },
    ]

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 500,
        temperature: 0.4,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error('Groq error:', groqRes.status, err)
      return json({ error: 'AI service unavailable' }, 502)
    }

    const data  = await groqRes.json()
    let reply   = data.choices?.[0]?.message?.content?.trim()
      ?? 'Samahani, sikuweza kujibu. Jaribu tena.'

    if (!isFirstMessage) {
      reply = reply.replace(/^(Shalom[,!]?\s*|Bwana\s+asifiwe[!,]?\s*|Yesu\s+asifiwe[!,]?\s*|Karibu[,!]?\s*)/i, '').trim()
    }

    return json({ reply })

  } catch (err) {
    console.error('admin-ai error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
