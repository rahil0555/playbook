# Edurance: launch plan

Inputs: `founder/board.md` (30-day plan, experiments E1–E8, decision gates), `founder/offer.md`, `founder/pricing.md`, `founder/cfo.md`, `founder/marketing.md` (calendar), `founder/brand.md`, `founder/ops.md`.

**Launch day: Monday 9 November 2026.** That's when the first pilot class takes the diagnostic. It's the earliest realistic date: 20 days from today, given school meetings, the agreement and consent letters. **It's an assumption, so give me your target date** and every date below shifts. Owners use the roles in `ops.md` §3 (Business, Operations, Product, Technology), still to be confirmed.

## 1. The real-world test first

Edurance is both a service sold to schools and a subscription sold to parents, so it runs **two cheap real tests** before any bigger spend (a hire, paid channels, more schools).

**Test A: will schools commit? (the board's E1 + E2)**
- **What:** offer the free Class Gap Report and a structured pilot in decision-maker meetings in one zone. Present both payer options: the parent plan at ₹299 with a 30% share, and the school licence at ₹1,200/student/year.
- **Success line (set now):** **≥ 10 meetings → ≥ 3 signed pilot agreements by 6 Nov**, each with a named owner, a timetable slot and teacher-assigned homework, **and** at least one school saying it would consider the paid school licence.
- **Fail line:** fewer than 1 agreement per 10 meetings. Go back to `/founder-offer` (the school-facing offer) before doing more outreach.

**Test B: will parents pay? (the board's E5; the subscription "founding member" test)**
- **What:** after gap reports go home, offer **Founding Families** (₹249/month or ₹849/term) through real Razorpay payment links, paid up front, with the school's real pilot end date as the deadline.
- **Success line (set now):** **≥ 10% of piloted students' parents pay** by the pilot end date. That's the CFO's ramp assumption. **The panel's 45% is an upper bound, not the target.**
- **Fail line:** below **5%**. The CFO shows the parent-pays model then needs ₹2.1 lakh, which is more than the budget. Switch the lead offer to the school-paid licence, and use `/founder-pricing` and `/founder-offer` for the parent offer.
- **If real parents fall well short of the panel,** trust the real parents.

**The usage gate in between (E3 + E4):**
- **≥ 80%** of the class completes onboarding and the diagnostic in one period.
- **≥ 40%** of students active 4+ days in each of weeks 2–4.
- Below **20%** by week 3: stop adding schools and fix the core loop.

## 2. The countdown (from today, 20 Oct 2026)

★ = critical path (a slip moves the launch date)

| week | task | owner | deadline |
| --- | --- | --- | --- |
| **20–25 Oct** | ★ Confirm founder roles and owners; pick one grade band, one subject, one board and one zone | All | 21 Oct |
| | ★ Engage a lawyer: consent form, data promise, guarantee terms, school agreement (fixed-fee quote) | Operations | 22 Oct |
| | Set an OpenAI hard spend limit; start cost-per-student logging | Technology | 22 Oct |
| | Start building the parent daily time limit (or drop it from the pitch) | Technology | build by 6 Nov |
| | Syllabus-chapter mapping for the chosen grade, subject and board | Product | 31 Oct |
| | Brand basics: the one-pager, the sample gap report, the consent letter layout (`brand.md`) | Product + Business | 25 Oct |
| | Check the domain, trademark (IP India) and handles (`brand.md`) | Business | 25 Oct |
| | Razorpay account + KYC; create the ₹249/₹299/₹849/₹999 payment links | Technology | 30 Oct (KYC can take days) |
| | Start the explanation audit (SOP 5) | Product | 23 Oct |
| **26 Oct–1 Nov** | ★ School outreach: warm intros + visits, ≥ 10 decision-maker meetings (marketing calendar L−14 to L−9) | Business (+ all on visits) | 31 Oct |
| | Log every meeting: payer preference, objection, local tuition fee | Business | daily |
| | ★ Lawyer returns the documents | Operations | 31 Oct |
| | Parallel-item re-test drafted | Product | 1 Nov |
| **2–8 Nov** | ★ Sign ≥ 3 pilot agreements (Test A) | Business | 6 Nov |
| | ★ Teacher orientation at the first school | Operations | 4 Nov |
| | ★ Consent letters home → signed forms back | Operations | 7 Nov |
| | Teacher posts to the class WhatsApp group | Operations (via the teacher) | 6 Nov |
| | Load test on school-like Wi-Fi; class accounts created; login slips printed | Technology + Operations | 7 Nov |
| | **Soft open:** a dry run with 5–10 friends' or family's children in the chosen grade, the full diagnostic flow, timed | All | Sat 7 Nov |
| **9 Nov** | **Launch: first class diagnostic** | Operations runs it; all on standby | 9 Nov |

**The critical path:** roles and scope → lawyer documents → signed agreement → consent forms back → onboarding. **The lawyer and consent forms are the most likely slip.** No child creates an account without signed consent.

## 3. Launch-day run sheet (Monday 9 Nov, first pilot school)

Timings assume a mid-morning class period; adjust to the timetable.

| time | who | what |
| --- | --- | --- |
| 07:30 | Technology | Check the app is up, the OpenAI key and spend limit, the Supabase status; open the dashboard |
| 08:00 | Operations + Product | Leave for school with login slips, a paper diagnostic backup, a hotspot, a printed consent list |
| 08:45 | Operations | Meet the class teacher; confirm the consent list; students without consent do the paper version |
| 09:00 | Technology (remote) | On call by phone until 15:00 |
| 09:30–10:15 | Teacher runs it; Operations observes; Product logs stuck points | **Diagnostic period.** Founders don't help unless a student is blocked for more than 2 minutes. |
| 10:20 | Operations | Thank the teacher; confirm the practice-assignment day (Fri 13 Nov) |
| 11:00 | Product | Completion rate + stuck-point log to the founder group |
| 14:00 | Technology | Any errors in the logs; AI cost for the session |
| 17:00 | All (call, 20 min) | Did ≥ 80% complete? What broke? What do we fix before the next school's onboarding? |
| Evening | Business | **No public social post** about the school without written permission. A LinkedIn post about "first pilot class" is fine, with no school name and no child data. |

**If something breaks** (from `ops.md` risk register):
- **Wi-Fi down:** switch to the hotspot. If that fails, run the paper diagnostic and enter it later.
- **App error:** Technology rolls back. If it isn't fixed in 10 minutes, use paper.
- **Wrong AI explanation spotted:** note the topic; Product disables it the same day.
- **Teacher unavailable:** reschedule. Don't run the session without the teacher.

## 4. The first 30 days (9 Nov–9 Dec)

**Track every week:**

| number | from | change something if… |
| --- | --- | --- |
| Pilots signed / decision-maker meetings | marketing | < 2 per 10 meetings |
| Onboarding completion in one period | board E3 | < 80% (< 60% = stop and fix) |
| Students active 4+ days per week | board E4 | < 40% in week 2; < 20% by week 3 = stop selling |
| Paid families / piloted students | Test B, CFO | < 10% = below the CFO's plan; < 5% = model fails the budget |
| Paid students vs break-even (108/month at ₹299) | CFO | Track the gap; don't expect to close it in month 1 |
| ₹ AI + voice cost per active student per month | CFO (estimate ₹42) | > ₹60 = fix caching or the model before adding schools |
| AI explanation error rate | board, SOP 5 | > 2% = fix; > 5% = turn off the topic |

**Reviews:**
- **Day 7 (16 Nov):** Did onboarding work without founders? What were the top 3 stuck points, and were they fixed? Are teachers assigning the work? What's the first cost-per-student reading?
- **Day 14 (23 Nov):** Weekly active rate in week 2? Gap reports opened by parents? Any Founding Families payments yet, and what are parents asking? How many more pilots are signed from outreach?
- **Day 30 (9 Dec):** The full board gate review (`board.md` §8): continue / fix the loop / switch to school-paid / expand to a second zone. Update `numbers.json` with real cost and conversion, re-run `/founder-cfo` and `/founder-plan`. Schedule the end-of-term re-test (E8).

**When to run the end-of-term re-test:** at the end of the school term (date to confirm with each school). The guarantee is settled after it. Only then may marketing say "proven".
