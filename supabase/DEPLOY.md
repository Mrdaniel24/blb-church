# Snippe Integration — Deployment Steps

## 1. Run the SQL Migration
Open Supabase Dashboard → SQL Editor, paste and run:
`supabase/migrations/20260424_contributions_snippe.sql`

Or via CLI:
```bash
supabase db push
```

## 2. Get your Snippe API Key
1. Login at https://dashboard.snippe.sh/dashboard
2. Go to Settings → API Keys → Generate new key
3. Copy the key (starts with something like `sk_live_...`)

## 3. Set Supabase Secrets
```bash
supabase secrets set SNIPPE_API_KEY=your_snippe_api_key_here
```

## 4. Deploy the Edge Functions
```bash
supabase functions deploy create-snippe-session
supabase functions deploy snippe-webhook
```

## 5. Configure Snippe Webhook URL
In Snippe Dashboard → Settings → Webhooks, add:
```
https://vscjivuatnchqwtcgggn.supabase.co/functions/v1/snippe-webhook
```
Events to enable: `payment.completed`, `payment.failed`, `session.expired`

## 6. Test
- Open member/contributions.html
- Click "Toa Sasa / Give Now"
- Enter amount, select category, enter phone
- Should redirect to Snippe checkout
- After payment → redirects to member/payment-success.html
