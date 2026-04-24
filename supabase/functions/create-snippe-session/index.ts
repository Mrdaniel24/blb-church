import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // User-scoped client (respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { amount, category, phone } = body

    const amountInt = parseInt(amount, 10)
    if (!amountInt || amountInt < 500) {
      return json({ error: 'Kiwango cha chini ni TZS 500' }, 400)
    }

    const allowedCategories = ['tithe', 'offering', 'building_fund', 'thanksgiving', 'special']
    const cat = allowedCategories.includes(category) ? category : 'offering'

    // Fetch member profile for pre-filling checkout
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single()

    const customerPhone = phone || profile?.phone || ''
    const customerName  = profile?.full_name || 'Church Member'
    const customerEmail = profile?.email || user.email || ''

    // Insert pending contribution — will be confirmed by webhook
    const { data: contribution, error: insertErr } = await supabase
      .from('contributions')
      .insert({
        member_id:         user.id,
        amount:            amountInt,
        category:          cat,
        contribution_date: new Date().toISOString().split('T')[0],
        payment_method:    'mobile_money',
        status:            'pending',
        notes:             'Online payment via Snippe',
      })
      .select('id')
      .single()

    if (insertErr || !contribution) {
      return json({ error: 'Imeshindwa kuunda rekodi ya malipo' }, 500)
    }

    const origin      = req.headers.get('origin') || 'https://blbchurch.co.tz'
    const redirectUrl = `${origin}/member/payment-success.html?cid=${contribution.id}`
    const webhookUrl  = `${Deno.env.get('SUPABASE_URL')}/functions/v1/snippe-webhook`

    const categoryLabels: Record<string, string> = {
      tithe:         'Zaka',
      offering:      'Sadaka',
      building_fund: 'Mfuko wa Ujenzi',
      thanksgiving:  'Shukrani',
      special:       'Mchango Maalum',
    }

    // Create Snippe payment session
    const snippeRes = await fetch('https://api.snippe.me/api/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${Deno.env.get('SNIPPE_API_KEY')}`,
      },
      body: JSON.stringify({
        amount:          amountInt,
        currency:        'TZS',
        allowed_methods: ['mobile_money'],
        customer: {
          name:  customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        redirect_url: redirectUrl,
        webhook_url:  webhookUrl,
        description:  `BLB Church — ${categoryLabels[cat] ?? cat}`,
        metadata: {
          contribution_id: contribution.id,
          member_id:       user.id,
          category:        cat,
        },
        expires_in: 1800,
      }),
    })

    const snippeData = await snippeRes.json()

    if (!snippeRes.ok || !snippeData?.data?.checkout_url) {
      // Remove the orphaned pending record
      const svcSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await svcSupabase.from('contributions').delete().eq('id', contribution.id)
      console.error('Snippe error:', JSON.stringify(snippeData))
      return json({ error: 'Tatizo la gateway ya malipo. Jaribu tena.' }, 502)
    }

    // Store Snippe session reference on the contribution
    await supabase
      .from('contributions')
      .update({ snippe_session_id: snippeData.data.reference })
      .eq('id', contribution.id)

    return json({
      checkout_url:    snippeData.data.checkout_url,
      session_id:      snippeData.data.reference,
      contribution_id: contribution.id,
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'Hitilafu ya seva' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
