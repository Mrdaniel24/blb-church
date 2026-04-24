import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Service-role client — bypasses RLS to update any contribution
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    console.log('Snippe webhook received:', type, JSON.stringify(data))

    if (type === 'payment.completed') {
      const sessionRef = data?.session_reference
      const paymentRef = data?.reference

      if (!sessionRef) {
        console.error('Missing session_reference in webhook payload')
        return ok()
      }

      const { error } = await supabase
        .from('contributions')
        .update({
          status:            'completed',
          snippe_reference:  paymentRef ?? null,
        })
        .eq('snippe_session_id', sessionRef)
        .eq('status', 'pending') // only update if still pending

      if (error) {
        console.error('DB update error:', error.message)
      } else {
        console.log('Contribution confirmed for session:', sessionRef)
      }
    }

    if (type === 'payment.failed' || type === 'session.expired') {
      const sessionRef = data?.session_reference
      if (sessionRef) {
        await supabase
          .from('contributions')
          .update({ status: 'failed' })
          .eq('snippe_session_id', sessionRef)
          .eq('status', 'pending')
      }
    }

    return ok()

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})

function ok() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
