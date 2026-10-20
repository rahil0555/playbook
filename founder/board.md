# Edurance: board summary

Inputs: `founder/idea.md`, `founder/board/brief.md`, the three memos in `founder/board/`.
Date: 2026-10-20. Every number below is either something the founders said, a threshold proposed for the founders to confirm, or marked UNKNOWN. No figure here is a measured result.

---

## 1. The vote

**3 × FUND IF, 0 PASS. Average score 4.3 / 10.**

| Lens | Score | Vote | One line |
| --- | --- | --- | --- |
| Offers | 4 | FUND IF | The outcome people want is strong and schools are easy to reach, but nothing proves it works, the payer is undefined and ₹299 may leave no margin. |
| Monopoly | 4 | FUND IF | 150 schools is a good small market to own first, but nothing stops a copycat built on the same OpenAI APIs, and school sales may never compound. |
| Product | 5 | FUND IF | It is well built where nobody looks, but it does too many things for too many users, and the handovers between school, teacher, student and parent are undesigned. |

All three members say the same thing in different words. **This is a credible team with a working product and no evidence yet.** None of them passed, because the product is real and the market is reachable. None of them funded outright, because no one has yet adopted it, used it consistently, learned from it or paid for it.

**Where they disagree** (kept on purpose):
- **Scope.** The Product lens wants a hard cut to one grade band, one subject and one loop, with PlayLab frozen. The Offers lens wants *more* in the offer: a stack of a diagnostic report, a plan, parent reports and a guarantee. These fit together only if the stack is built from what already exists, not from new features.
- **Engagement bar.** Offers asks for 50% weekly active users (WAU) at week 6. Product asks for 40% active in each of weeks 4–6. Neither has a baseline. Section 5 uses one shared threshold for the founders to confirm.
- **What to prove first.** Monopoly cares most about owning one zone and getting referrals between schools. Offers cares most about who pays and margin. Product cares most about the first session and sustained use. The 30-day plan orders them: usage first, then payment, then repeatability.

---

## 2. The extended board: perspectives Edurance needs

The founder-board skill seats three framework lenses. You asked for domain seats as well. These are the challenges each seat should bring to every board review. They are not separate memos.

| Seat | What it must challenge | The question it should keep asking |
| --- | --- | --- |
| **Education / pedagogy** | Whether the diagnostic measures what it claims. Whether adaptive paths follow the syllabus of each school's board (CBSE, ICSE, Telangana State Board) and its language of instruction. Whether "mastery" is defined in a way a teacher would accept. Whether gains are real or just practice effects from retaking the same test. | "Compared with what? How would a teacher know this child learned more because of Edurance?" |
| **School sales / partnerships** | Who actually decides (owner, correspondent, principal, academic coordinator). The buying calendar: the academic year, term starts and exam season. Whether a pilot is a commitment or a polite yes. What the school gains: revenue share, a reputation for being modern, less teacher workload, or results. | "Who signs, who blocks, and what does the school get that it can show to parents?" |
| **AI / product technology** | Whether explanations are correct and on the syllabus. Whether they suit the student's age. Latency on school Wi-Fi and low-end phones. The OpenAI cost per active student. Uptime during a class period. What happens when the API is slow or wrong in front of 40 students. | "What does one active student cost per month, and what happens when the AI is wrong?" |
| **Finance** | Net revenue per user after the school share, refunds and payment fees. Contribution after AI and hosting cost. Cash runway against the sales cycle. Whether ₹299 is per month, per term or per year (this changes everything). | "After the school's share and the AI bill, what is left per paid user, and how many months of runway is that?" |
| **Child privacy and safety** | India's Digital Personal Data Protection Act, 2023 and its rules require verifiable parental consent before processing a child's personal data. They also restrict tracking, behavioural monitoring and targeted advertising aimed at children. Edurance profiles learning behaviour and sends data to an overseas AI provider, so this is core, not paperwork. Also: how long data is kept, who at the school sees what, and how the AI chat or voice is moderated. | "Could we show a parent, a principal and a regulator exactly what data we hold on their child, where it goes, and who consented?" Confirm with a lawyer before pilots go live. |
| **Business operations** | Who runs orientation and onboarding, who handles support tickets during class hours, the service level per school, and how many schools four founders can serve at once before quality drops. | "If 10 schools say yes next month, who shows up at each one and what breaks first?" |

---

## 3. The business model, assessed

| Element | Assessment | Status |
| --- | --- | --- |
| **Customer** | Three parties. Students use it, schools choose it, parents may pay. The real buyer is undecided, and this is the single biggest gap in the model. | Payer UNKNOWN |
| **Problem** | Real and widely felt: mixed-ability classrooms, students who fall behind and never catch up, parents spending on tuition. Not yet shown: that *these* schools rank this problem high enough to act on it now. | Assumption |
| **Value proposition** | Today it is a feature list: diagnostics, adaptive learning, AI explanations, voice, tracking, dashboards. It needs to be a named outcome with a time frame, e.g. "every student's gaps found in week 1, a measurable gain on the re-test by end of term". | Unproven |
| **Pricing** | ₹299 per paid user. The billing period, who pays and the school share are all UNKNOWN. Low enough to feel easy to say yes to, but possibly too low to cover AI cost, the school share and onboarding labour. Willingness to pay is untested. | Assumption |
| **Distribution** | Going through schools is the right instinct: one yes reaches a whole cohort, and 150 named prospects in four zones is a bounded target. Risk: every school costs significant founder time (demo, proposal, orientation, onboarding), so the channel may not scale without references between schools. | Planned, unproven |
| **Repeatable revenue** | Possible if (a) pilots convert at a predictable rate, (b) students keep paying term after term or year after year, and (c) schools renew and refer. None of the three has been observed. | UNKNOWN |

**The board's read:** the model is coherent on paper, but it is really two businesses that share a product. One sells to schools (B2B). The other sells to parents through schools (B2B2C). The next 30 days should find out which one is real in Hyderabad, rather than run both.

---

## 4. Risks, ranked

Severity is how badly it hurts if true. Uncertainty is how little we know today. The most severe and most uncertain risks come first.

| # | Risk | Severity | Uncertainty | Raised by |
| --- | --- | --- | --- | --- |
| 1 | **No one pays, or the wrong party is asked to pay.** The school does the work while the parent is asked for the money, or vice versa. | Critical | High | Offers, Product, Finance |
| 2 | **Students stop using it after onboarding.** It becomes a novelty in week 1 and dead by week 4. | Critical | High | Offers, Product |
| 3 | **No measurable learning gain**, or a gain that can't be told apart from practice effects. Without it there is no proof, no renewal and no referrals. | High | High | Offers, Monopoly, Education |
| 4 | **Unit economics are negative.** ₹299 minus the school share, payment fees, OpenAI cost and support leaves nothing. | High | High | Offers, Monopoly, Finance |
| 5 | **Schools say "pilot" but don't commit**: no named owner, no timetable slot, no success metric. | High | High | Offers, School sales |
| 6 | **Child-data compliance gap**: parental consent, data leaving India, profiling of minors. One incident can end school trust across the whole city. | High | Medium | Privacy (none of the lenses, so the board flags it) |
| 7 | **AI explanation errors** (wrong, off-syllabus, wrong level) read aloud to a child in class. | High | Medium | Product, AI/tech |
| 8 | **Founder bandwidth**: onboarding and support for even 5–10 schools takes over the time needed for sales. | Medium | Medium | Monopoly, Operations |
| 9 | **No durable edge**: a national player, an LMS vendor or a free AI chat tool offers "good enough" for free. | Medium | Medium | Monopoly |
| 10 | **Focus spread across PlayLab and early years**, which is a different user and a different product. | Medium | Low | Product |

### Facts vs assumptions vs unverified claims

| Known facts (stated by founders) | Assumptions (planning inputs) | Unknown / unverified |
| --- | --- | --- |
| A working web product (Flutter, Supabase, OpenAI, Vercel) | Schools will adopt via pilots | Signed schools or pilots to date |
| Built: auth, diagnostics, resume, adaptive flows, AI explanations, TTS, parent view | ₹299 is an acceptable price | Who pays, the billing period, the school revenue share |
| A 150-school prospect list across 4 zones | October funnel targets | Active users, engagement, retention |
| 4 co-founders across tech, business, ops and product | Students will keep using it | Learning outcomes |
| Initial market: Hyderabad and Secunderabad | Parents will pay after a school pilot | AI and hosting cost per student; operating costs |
| | Learning gains will drive conversion | Budget and runway |
| | | Conversion rates at any stage |
| | | Exact role ownership per founder |

---

## 5. Merged conditions (checklist for the rest of the pack)

Thresholds marked ◇ are board proposals for the founders to confirm, not benchmarks.

- [ ] **Payer and terms fixed in writing**: who pays (school or parent), the billing period, the school share and what the school gets. *(Offers, Product)* → `/founder-pricing`, `/founder-cfo`
- [ ] **One sentence, one core loop**: one grade band, one subject, diagnose → explain → practise → re-test. PlayLab and non-core features frozen until sustained use is shown. *(Product)*
- [ ] **Structured pilots signed**: ◇ at least 3 schools, each with a named decision-maker, a timetable slot and an agreed success metric. *(Offers)*
- [ ] **Own one zone**: ◇ at least 25% of one zone's schools signed in an agreed window. *(Monopoly)*
- [ ] **First session works without founders**: ◇ at least 80% of a class completes onboarding and the diagnostic in one period, in at least 2 schools. *(Product)*
- [ ] **Sustained use**: ◇ at least 40% of onboarded students active weekly in weeks 4–6 (Offers proposed 50% at week 6, Product 40%; start at 40% and raise it once you have a baseline). *(Offers, Product)*
- [ ] **Learning gain measured**: baseline to follow-up diagnostic, ideally against a comparison group that didn't use it, reported per school. *(Offers, Monopoly)*
- [ ] **Explanation quality**: ◇ at least 100 AI explanations reviewed by teachers, error rate below 2%, and a defined process for correcting them. *(Product)*
- [ ] **Someone pays**: at least one pilot converts to paid, with the real conversion rate recorded. *(Offers)* → `/founder-consumer`, `/founder-pricing`
- [ ] **Unit economics with real inputs**: net revenue per user after the school share > AI + hosting + support per user. *(Offers, Monopoly)* → `/founder-cfo`
- [ ] **A named offer with a guarantee**, tested against the plain feature pitch in ◇ at least 10 school meetings. *(Offers)* → `/founder-offer`
- [ ] **A referral between schools**: at least one school signed through an existing pilot school. *(Monopoly)*
- [ ] **A written answer to "what stops a copycat"** that rests on something Edurance owns, not on the AI model. *(Monopoly)*
- [ ] **Child-data compliance**: a parental consent flow, a data map (what goes to OpenAI and where), a retention policy and legal review, before any pilot goes live. *(Board, privacy seat)*

---

## 6. Founder execution: who owns what

Role allocation is **UNCONFIRMED**. This is the structure the board recommends. The gaps are where accountability is likely to slip.

| Owner | Must own (single point of accountability) | Metric they answer for |
| --- | --- | --- |
| **Business and partnerships** | The school pipeline: outreach, meetings, proposals, signed pilots, the commercial terms (payer, share, pricing) | Meetings held → pilots signed, and time from first meeting to signing |
| **Operations** | Pilot delivery: orientation, onboarding, support during class hours, the school relationship after signing, compliance paperwork (consent forms) | First-session completion rate, support response time, school satisfaction |
| **Product** | The core loop, the parent and teacher experience, explanation quality review, defining the success metric and learning-gain measurement | Weekly active rate, learning gain, explanation error rate |
| **Technology** | Reliability during class periods, AI and hosting cost per student, data security and the technical side of compliance | Uptime in class hours, ₹ cost per active student per month, incident count |

**Where accountability is likely to blur:**
1. **The four zones.** If each founder also "owns" a zone, every founder is doing sales, and nobody is building product or running delivery full-time. Decide whether zones are a sales territory (one owner) or a shared duty with a clear time cap.
2. **Paid conversion.** Is it sales (terms), product (value shown to parents) or ops (the parent journey)? Give it one owner. The board suggests Business, with Product as support.
3. **Learning outcomes.** Is it product or education? Someone has to own measurement design, or no one will.
4. **Child privacy.** It sits between tech, ops and legal. Name one founder.
5. **Pricing and unit economics.** If no one owns the spreadsheet, ₹299 never gets tested against cost.

---

## 7. Validation experiments (low-cost, measurable)

None of these needs new spending beyond what exists, apart from possible printing or travel. The budget is UNKNOWN, so tell the board before any experiment that would cost money.

| # | Experiment | Tests risk | How | Success (◇ confirm) | Kill or pivot signal |
| --- | --- | --- | --- | --- | --- |
| E1 | **Free gap-report offer to schools** | 5, 1 | Offer each school a free baseline diagnostic for one class plus a gap report for the principal. Ask for a structured pilot only after the report is delivered. | ◇ at least 30% of meetings agree to a diagnostic; at least 50% of those agree to a structured pilot | Fewer than 1 in 10 meetings say yes even to free: the problem isn't urgent for schools |
| E2 | **Payer test** | 1 | In the same meetings, present two written term sheets: (A) the school pays per student; (B) the parent pays ₹299 and the school gets a share. Record which they choose and why. | A clear majority preference, with stated reasons | Schools refuse both: rethink the model before building billing |
| E3 | **Observed first period** | 2, 7 | In 1–2 schools, a founder watches a full class onboard and take the diagnostic without helping, and logs every point where a student gets stuck. | ◇ at least 80% complete in one period | Below 60%: fix onboarding before signing more schools |
| E4 | **4-week usage cohort** | 2 | Track weekly active rate by student, class and school from Supabase. Compare classes with a teacher nudge against classes without one. | ◇ at least 40% weekly active in week 4 | Below 20% by week 3 even with a teacher nudge: the core loop isn't sticky |
| E5 | **Pre-sale to parents** | 1, 4 | After the gap report, send parents the child's report and a ₹299 offer (state the period), with a real payment link or a signed commitment form. | Any measurable paid conversion; record the rate | No payments from a cohort with real reports: the parent isn't the payer at this price |
| E6 | **Explanation audit** | 7 | Two teachers review 100 logged AI explanations for correctness, syllabus fit and age level. | ◇ error rate below 2% | Above 5%: pause voice and AI explanations in pilots until fixed |
| E7 | **Cost per active student** | 4 | Read OpenAI, Supabase and Vercel billing for the cohort and divide by active students. | Cost is a small fraction of net revenue per user | Cost is at or above net revenue per user: change the architecture or the price |
| E8 | **Re-test gain** | 3 | Re-run the diagnostic (parallel items, not identical) after 4–6 weeks, ideally against a class that didn't use it. | A positive gain larger than in the comparison class | No difference: the product isn't teaching yet |

---

## 8. 30-day validation plan

**Rule for the month:** no new features, no paid tools and no hires. Use only what exists. PlayLab is frozen.

**Week 1: decide and prepare**
- Confirm founder roles and owners (section 6). Name one owner for paid conversion and one for child privacy.
- Pick the one grade band, one subject and one zone.
- Write down the payer options (E2) and answer what ₹299 covers and for what period.
- Put a parental consent flow and a one-page data map in place. Get a legal opinion on the DPDP Act requirements.
- Set up the metric sheet: meetings, pilots, completion, weekly active, re-test, cost per student.
- Start E6 (explanation audit) and E7 (cost) right away. They need no school.

**Week 2: sell the free diagnostic**
- Book decision-maker meetings in the chosen zone. Run E1 + E2 in every meeting, and test the named offer against the plain pitch (condition: ◇ at least 10 meetings).
- Log for each meeting: who attended, the decision-maker's role, the objection, the yes or no, and their payer preference.

**Week 3: deliver**
- Run E3 (observed first period) at every school that agreed. Fix onboarding blockers within days.
- Start E4 (usage tracking). Deliver gap reports to principals and parents.
- Send the E5 parent offer once reports are in parents' hands.

**Week 4: measure and decide**
- Report the week-4 weekly active rate, parent conversion, cost per student, explanation error rate and meeting-to-pilot rate.
- Board review against the decision gates below. Schedule the E8 re-test for weeks 6–8.

### Decisions that depend on the results

| If… | Then… |
| --- | --- |
| Schools take the free diagnostic but won't commit to a structured pilot | Problem is acknowledged but not urgent. Rework the offer (`/founder-offer`) before more outreach. |
| Schools prefer to pay themselves (E2 = A) | Run as B2B: price per school or per student per year, and drop parent billing for now. |
| Schools prefer parent-pays and parents convert (E5 > 0) | Run as B2B2C: confirm the share, then model it with `/founder-cfo`. |
| Weekly active rate is below 20% by week 3–4 | Stop selling and fix the core loop. More schools would just mean more churn. |
| Cost per student ≥ net revenue per user | Change the model (cache, a cheaper model, fewer calls) or the price before scaling. |
| Explanation error rate is above 5% | Pull AI explanations and voice from live pilots until it's fixed. |
| All gates green in one zone | Expand to the next zone, ask pilot schools for referrals and run `/founder-cfo` with real inputs. |

---

## 9. Questions the board needs answered (these change the evaluation)

1. **Budget and runway:** how much cash is available, and for how many months? (This changes whether a 90-day pilot cycle is affordable.)
2. **₹299 per what?** Monthly, per term or per year? And today, is the payer the school, the parent, or still open?
3. **Current commitments:** how many of the 150 schools have you actually met, demoed to, or got a yes or a pilot from so far? Even "zero" is a useful answer.
4. **Usage to date:** how many real students have used the product, and is there any engagement or retention data?
5. **Grades, subjects and boards:** which grade band, subject and school boards (CBSE, ICSE, State) does the content cover today?
6. **Cost per student:** is there any OpenAI or TTS bill you can divide by active users?
7. **Founder roles:** who is doing what today, and are founders full-time?
8. **Compliance:** is there a parental consent step, and what student data goes to OpenAI?

---

## The strongest version the board can see

**This differs from the pitch.** The strongest Edurance in the near term is not "an AI tutor for every school student". It is a **diagnostic-led learning-gap service for one grade band and one subject, sold to schools in one zone of Hyderabad**. It starts with a free gap report for each class, which gives the principal something to show parents. It turns into a term-long, measured catch-up programme with a before-and-after re-test the school can put in front of families. The AI explanations and voice are how it is delivered, not what is being sold. What is sold is *a measured result per class, with almost no teacher effort*. If schools pay for that, or reliably bring parents who do, the diagnostic and mastery data built up across a zone's schools becomes the edge the Monopoly lens is looking for. The broader adaptive tutor, PlayLab and expansion beyond Hyderabad all wait until that loop is shown to work.

**Next step:** `/founder-competitors` to map who already sells into these 150 schools, then `/founder-consumer` to put the gap-report offer and the ₹299 payer question in front of simulated principals and parents before the real meetings in week 2.
