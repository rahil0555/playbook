# Edurance: operations

Inputs: `founder/idea.md`, `founder/offer.md` (Gap-to-Grade), `founder/numbers.json`, `founder/board.md`, `founder/marketing.md`. Founder roles are still **unconfirmed**. The allocation in §3 is the board's recommendation, so confirm it.

## 1. The operating cycle

Edurance doesn't have a "day" like a shop. It has a **pilot cycle per school** and a **weekly rhythm** across all schools. Steps marked 👁 are ones a principal, teacher, parent or student sees.

**Per school (about one term):**
1. 👁 Visit and decision-maker meeting → free Class Gap Report offer
2. 👁 Pilot agreement signed (teacher assigns and checks, data promise, re-test, payer option)
3. Syllabus mapping for that school's board, grade and subject (reuse if already done)
4. 👁 Teacher orientation (30 min) + teacher accounts
5. 👁 Consent letters home → consent records stored
6. 👁 Class-period onboarding + diagnostic (a founder is present but doesn't help, per E3)
7. 👁 Gap reports to principal, teacher and parents
8. 👁 Daily practice set by the teacher; weekly parent view
9. Weekly usage check → nudge the teacher if a class drops
10. 👁 Founding Families / paid offer to parents before the pilot ends
11. 👁 End-of-term re-test → re-test report to school and parents → guarantee claims settled
12. 👁 Renewal conversation with the school + referral ask

**Every week, across schools:**
- Monday: usage review from Supabase.
- Tuesday–Friday: school visits and onboarding.
- Wednesday: AI explanation spot-audit.
- Friday: support ticket review and the cost check (OpenAI bill to date ÷ active students).
- Saturday: founder review against the decision gates.

## 2. Suppliers

| input | supplier options | public price / how to get it | terms and notes |
| --- | --- | --- | --- |
| AI explanations | **OpenAI API** (current). Alternatives: Google Gemini API, Anthropic API (compare per-token prices on their pricing pages) | gpt-4.1-mini ~0.40/1.60 USD per 1M input/output tokens ([aggregator](https://pricepertoken.com/pricing-page/model/openai-gpt-4.1-mini); confirm on openai.com/api/pricing) | Prepaid credits, card billing in USD. **Set a monthly hard spend limit** in the OpenAI dashboard. Check the current data-use terms before printing the data promise. |
| Text-to-speech | OpenAI gpt-4o-mini-tts (current); alternatives Google Cloud TTS, Azure TTS (both have Indian English and Telugu voices; check their pricing pages) | ~12 USD per 1M audio output tokens ([aggregator](https://www.llmreference.com/model/gpt-4o-mini-tts/openai-api)) | Cache aggressively (already built). Telugu voice quality is worth testing if letters and explanations go bilingual. |
| Database, auth, storage | **Supabase** Pro | 25 USD/month + overages ([guide](https://makerkit.dev/blog/md/saas/supabase-pricing)) | Pick or confirm the region (Mumbai `ap-south-1` exists on AWS; check Supabase's region list) for latency and the data story. |
| Web hosting | **Vercel** Pro | ~20 USD per seat per month (third-party tracker; confirm on https://vercel.com/pricing) | The free Hobby plan is for non-commercial use, so check Vercel's terms before charging customers. |
| Payments | **Razorpay** (alternatives: Cashfree, PayU) | 2% + 18% GST; possible 0% for the first 90 days ([Razorpay](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)) | Needs a business PAN, a bank account and KYC. Supports subscriptions (for the ₹299/month plan) and payment links. |
| Printing (gap reports, letters, one-pagers) | Any 2–3 local print shops near each zone | Get quotes per page for B/W and colour A4 | Ask about 24-hour turnaround; reports must go home within 3 days of the diagnostic. |
| Legal (DPDP consent, data promise, guarantee wording, school agreement) | 2–3 tech/privacy lawyers in Hyderabad; also check startup legal clinics (e.g. T-Hub programmes, unverified) | **Quote only.** ₹25,000 is a placeholder in `numbers.json` | Get a fixed-fee quote for 4 documents. |

No real price changes `numbers.json` yet. **When the first OpenAI and print bills arrive, update `numbers.json` and re-run `/founder-cfo`.**

## 3. People: who does what, when

All four founders are unpaid (`numbers.json`). This is the board's suggested ownership (confirm it):

| founder | owns | weekly hours in a pilot month (assumption) |
| --- | --- | --- |
| **Business & partnerships** | School pipeline, pilot agreements, commercial terms, paid conversion | Tue–Fri visits; ~25 h |
| **Operations** | Orientation, onboarding days, consent records, support, printing | Onboarding days + Fri support review; ~20 h |
| **Product** | Core loop, syllabus mapping, explanation audit, re-test design, parent view | Wed audit, mapping; ~20 h |
| **Technology** | Reliability in class periods, cost per student, security, consent storage, the time-limit build | Mon usage review, on call during class periods; ~20 h |

**Rota for the slow first month (1–3 schools):** every school onboarding has 2 founders on site. One runs it; the other observes and logs where students get stuck (E3). Tech is on call by phone.

**Rota at plan (12 schools):** at about one onboarding a week, the four founders can still cover it. The real squeeze is **support during class periods** (9am–3pm), which would fall on whoever isn't visiting.
- **Trigger for the first hire:** a part-time school success associate once more than 6 schools are live, or support takes more than 10 founder hours a week.
- Any hire needs cash beyond the current budget. Ask the CFO first.

**Wages:** none today. When you hire, payroll costs (PF, ESI, professional tax) apply. Check with an accountant.

## 4. Routines (one-page SOPs)

**SOP 1: School visit (Business)**
1. Before the visit, check the school's board, grades and fee band, and who the decision-maker is.
2. Carry: 5 one-pagers, a sample gap report, a phone with the demo loaded offline-ready.
3. Ask for the principal or correspondent. If they're unavailable, book a time and leave a one-pager.
4. In the meeting: the 2-minute demo; the free Class Gap Report offer; the two payer options (E2); ask which class and subject.
5. Log within 1 hour: who, role, objection, yes/no/maybe, payer preference, next step.
6. Follow up within 48 hours with the draft agreement if it's a yes.

**SOP 2: Class onboarding + diagnostic (Operations)**
1. Day −2: confirm the timetable slot, the device count (school lab or students' phones?), Wi-Fi, consent forms received.
2. Day −1: create class accounts; print login slips; test on the school's Wi-Fi if possible.
3. On the day: arrive 30 minutes early. The teacher runs it while the founder observes (don't help unless blocked for more than 2 minutes). Log each stuck point.
4. Students without consent do the paper version or sit out. No account is created for them.
5. Within 24 hours: completion rate logged. Within 48 hours: gap reports to the teacher. Within 72 hours: gap reports to parents.

**SOP 3: Weekly usage review (Technology, Monday)**
1. Pull the active-days-per-student list per class from Supabase.
2. Flag any class below 40% active (4+ days).
3. Message that class teacher with the list and one suggestion.
4. Divide the OpenAI bill to date by active students and log it.
5. Post the 3 marketing numbers to the founder group.

**SOP 4: Complaint (any founder; Operations owns it)**
1. Acknowledge within 4 hours during school days.
2. Ask what happened. Don't argue.
3. Fix it, or say when it will be fixed.
4. Reply with what happened, what was fixed and what you're offering, signed by name, within 24 hours.
5. If it's a data or safety complaint: escalate the same day to the founder who owns privacy, and log it.

**SOP 5: AI explanation spot-audit (Product, Wednesday)**
1. Sample 25 logged explanations from the week across topics.
2. A teacher (or the Product founder) marks each correct, off-syllabus or wrong level, or wrong.
3. Above a 2% error rate, find the topic, fix the prompt, and re-check.
4. Above 5%, turn off AI explanations for that topic until it's fixed.
5. Log the rate weekly. Over four weeks this gives you the 100-explanation audit in `board.md`.

**SOP 6: Data deletion on cancel (Technology)**
1. On cancel, or a parent's request: confirm identity.
2. Delete the child's records within 30 days (the data promise).
3. Confirm deletion to the parent in writing.
4. Log it.

## 5. Tools: the smallest stack

| need | tool | published price | why |
| --- | --- | --- | --- |
| Product hosting | Vercel Pro, Supabase Pro | see §2 | Already in use |
| Payments, subscriptions | Razorpay Subscriptions / Payment Links | 2% + GST | UPI, Indian cards, recurring ₹299 |
| School pipeline (CRM) | A shared Google Sheet (free) | ₹0 | 150 schools fit in a sheet. Don't buy a CRM yet. |
| Founder comms | WhatsApp group + Google Drive (free tier) | ₹0 | Already used by schools and parents |
| Business email | Google Workspace or Zoho Mail | Check the current India pricing pages | A domain email looks credible to principals |
| Bookkeeping, GST invoices | Zoho Books, or a spreadsheet plus a CA | Check Zoho's India pricing page | You need GST-compliant invoices once registered |
| Consent records | A table in Supabase plus scanned signed forms | ₹0 | Needed for DPDP |

## 6. Licences, permits, legal (India / Telangana): confirm each one

The rules differ by place and change over time. Confirm each with the authority or a CA or lawyer. Not legal advice.

| item | why | where to confirm |
| --- | --- | --- |
| **Company or LLP registration** (if not already done) | Needed to sign school contracts, take payments and limit liability | Ministry of Corporate Affairs: https://www.mca.gov.in |
| PAN and TAN for the entity | Tax and TDS | https://www.incometax.gov.in |
| **GST registration** | Mandatory above the turnover threshold for services (commonly ₹20 lakh; confirm for your case). Online supply rules may apply. | https://www.gst.gov.in, plus a CA |
| Professional tax (Telangana) | Applies to employers and some entities | Telangana Commercial Taxes Department |
| Shops & Establishments registration | Only if you run an office or premises; confirm | Telangana Labour Department |
| **DPDP Act 2023 + DPDP Rules 2025** | Children under 18 need verifiable parental consent; no tracking, behavioural monitoring or targeted ads aimed at children. The Rules were notified in November 2025 with phased commencement. Sources disagree on when the children's-consent provisions take full effect (November 2026 vs May 2027). **Build it now regardless.** | Gazette G.S.R. 846(E); MeitY; [summary](https://www.seclore.com/fundamentals/dpdp-rules-2025-compliance-guide/), [timeline](https://cybersigmacs.com/open/dpdp-compliance-timeline/); a lawyer |
| School agreement | Revenue share, data processing roles (school vs Edurance), guarantee, termination | A lawyer |
| Advertising and consumer claims | Learning claims and the guarantee | ASCI code and the Consumer Protection Act; a lawyer |
| Startup India (DPIIT) recognition | Optional. May bring tax and compliance benefits | https://www.startupindia.gov.in |
| Insurance | Optional at this stage. Cyber liability is worth a quote once you hold data on many children | Insurers or a broker |

## 7. Risk register

| # | risk | likelihood | impact | plan |
| --- | --- | :-: | :-: | --- |
| 1 | Schools agree but teachers don't assign or check the work | High | High | Write it into the pilot agreement; weekly teacher nudge (SOP 3); principal check-in at week 2 |
| 2 | Students drop off after week 1 | High | High | Teacher-set homework, the parent weekly view; fix the first session (E3) before adding schools |
| 3 | School Wi-Fi or devices fail in the onboarding period | Medium | High | Test the day before; offline-friendly login slips; a paper diagnostic backup; reschedule rather than run a broken session |
| 4 | An AI explanation is wrong in front of a class or parent | Medium | High | Weekly audit (SOP 5); turn off a topic above 5% errors; a "report this explanation" button |
| 5 | A child-data incident (leak or wrong access) | Low | Severe | Row-level security in Supabase, least-privilege teacher access, an incident plan, notify the school and parents fast |
| 6 | OpenAI cost per student runs well above ₹22 | Medium | Medium | A hard spend limit; caching; a cheaper model for routine hints; weekly cost check |
| 7 | OpenAI API outage or rate limit during class | Low | Medium | Cached content keeps working; show "explanation coming soon"; consider a fallback provider |
| 8 | Founder bandwidth: sales stalls while founders run onboarding | High | Medium | Fixed owner per role; cap at 3 pilot schools in month 1; hiring trigger in §3 |
| 9 | Parents treat the free pilot as the product and never pay | High | High | A clear pilot end date in writing; Founding Families deadline; test the school-paid licence in parallel |
| 10 | A school asks for free use forever or a bigger share | Medium | Medium | Walk-away terms decided in advance (e.g. maximum share 30%); offer the school-paid licence instead |

## Output notes
No supplier quote has changed `numbers.json` yet. Replace the estimates there with the first real OpenAI, print and legal invoices and re-run `/founder-cfo`. Next: `/founder-launch`.
