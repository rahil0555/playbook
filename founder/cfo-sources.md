# Edurance: where each number comes from

Every input in `founder/numbers.json`, and whether it's founder-confirmed, from a public price, or an **estimate**. Replace estimates with real bills as soon as you have them.

**Exchange rate:** ₹88 per USD. This is an ESTIMATE; use the rate on your card statement.

## Founder-confirmed (2026-10-20)

| input | value | source |
| --- | --- | --- |
| Price | ₹299 per paid student per month | Founders |
| School revenue share | 30% of price = ₹89.70 | Founders |
| Founder pay | ₹0 (unpaid) | Founders |
| Cash available, next 6–12 months | Under ₹2,00,000 | Founders |

## Public prices (check before relying on them)

| input | value | source |
| --- | --- | --- |
| Payment gateway | 2% + 18% GST = 2.36% (₹7.06 on ₹299). UPI may also carry 2% at Razorpay; a 0% intro offer may apply for the first 90 days. | [Razorpay pricing explained](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/) |
| Supabase Pro | 25 USD/month (≈ ₹2,200), plus usage overages | [Supabase pricing guide](https://makerkit.dev/blog/md/saas/supabase-pricing) (third party; confirm on supabase.com/pricing) |
| Vercel Pro | 20 USD per seat per month (≈ ₹1,760), 1 seat assumed | [Third-party tracker](https://toolradar.com/tools/openai-api/pricing); confirm on vercel.com/pricing |
| OpenAI gpt-4.1-mini | 0.40 USD per 1M input tokens, 1.60 USD per 1M output tokens | [Aggregator](https://pricepertoken.com/pricing-page/model/openai-gpt-4.1-mini); confirm on openai.com/api/pricing |
| OpenAI gpt-4o-mini-tts | 0.60 USD per 1M text input tokens, 12 USD per 1M audio output tokens | [Aggregator](https://www.llmreference.com/model/gpt-4o-mini-tts/openai-api); confirm on OpenAI's page |

## Estimates (marked ESTIMATE in numbers.json)

**AI explanations: ₹22 per active student per month.**
- Assumes 20 study sessions a month (about 20 minutes on 5 school days a week), with about 10 AI calls per session, so 200 calls a month.
- Each call is about 1,500 input tokens (lesson context and student state) and 400 output tokens.
- Per call: 1,500 × 0.40/1M + 400 × 1.60/1M = 0.00124 USD. For 200 calls that's 0.25 USD, or ≈ ₹22.
- This is the number to replace first. Divide the OpenAI bill for a pilot month by the number of active students.

**Text-to-speech: ₹20 per active student per month, after caching.**
- Assumes about 30 minutes of narration per student per month at about 0.015 USD per minute, which is 0.45 USD uncached.
- The product already caches audio, so lesson narration shared by many students is generated once. That's assumed to cut the cost by about half, to ≈ ₹20.
- Personalised explanations read aloud cannot be cached, so heavy voice use pushes this up.

**Hosting usage beyond the plan: ₹3 per student per month.** Storage, bandwidth and database usage above the Pro plan's included quota. Low confidence.

**Travel: ₹8,000 per month.** Four founders visiting schools across four zones, fuel and auto fares. Replace with real spend.

**Printing: ₹2,000 per month** for printed gap reports and pilot handouts.

**Phone and data: ₹1,000 per month.** **Domain, email and misc. software: ₹1,000 per month.**

**Startup (one-off), ₹85,240 in total:**
- Child-data and DPDP legal review with consent forms: ₹25,000. Get a real quote from a lawyer.
- AI and voice cost of free pilots: 3 schools × 120 students × 2 months × ₹42 = ₹30,240. The school and class sizes are assumptions.
- Pilot materials and parent evenings: ₹15,000.
- Contingency: ₹15,000.

**The ramp (paid students per month):** 0, 0, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144.
- Months 1–2 are free pilots, so there are no paid students.
- From month 3 it assumes **10% of piloted students convert to paid**. That's a third of the panel's 30% buy rate, because simulated buyers overstate. It starts at 3 schools × 120 students.
- It then adds one school of about 120 students (12 paid) a month, reaching 12 schools by month 12.
- It assumes no paid parent cancels. Real cancellations will lower every month after the first. **The ramp is the weakest input.**

**How "a month" works in the tool.** The CFO tool counts in "units a day". Here `days_per_month` is set to 1, so every "a day" in the tool's output means **a month**. `founder/cfo.md` has been relabelled to match.

**Not included:** founder salaries, GST on Edurance's own sales (Edurance must register for GST once over the threshold; prices here are before tax), refunds, the cost of the free-term guarantee (see `founder/offer.md`), customer support staff, and company registration if not done. An accountant should check GST, the structure and the revenue-share contract before money moves.
