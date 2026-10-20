# Edurance · Business plan

**Verdict: Not yet**

- ✓ Each paid student-month earns ₹148.24 before fixed costs (50% contribution).
- ✗ Year 1 operating LOSS: ₹58,104.
- ✓ 6 of 20 simulated buyers buy (30%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | ₹299.00 a paid student-month |
| Profit margin at plan | 13% per paid student-month |
| Break-even | 108 paid student-months a month |
| Year 1 operating profit | ₹-58,104 |
| Startup spend | ₹85,240 |
| Cash needed before it pays for itself | ₹154,217 |
| Startup money earned back | not in year 1 |
| Buyer panel | 6 buy · 14 pass |

## The idea

- What it is: an AI-powered adaptive learning platform that diagnoses each school student's level, gaps and pace, then teaches through personalized paths, AI explanations and voice, with progress visible to parents and schools.
- Who it is for: school students (primary users), sold through schools (key customer and distribution channel), with parents as stakeholders and possible subscription decision-makers.
- What it sells, at what price: a student subscription at ₹299 per paid student per month (founder-confirmed), paid by parents after a free school pilot; the school keeps a 30% revenue share (founder-confirmed). Offer now packaged as "Gap-to-Grade" (see offer.md).
- Where and how: Hyderabad and Secunderabad, Telangana, India. School-led B2B2C: outreach → demo → proposal → signed pilot → educator orientation → student onboarding → baseline diagnostic → activation → progress review → paid conversion. A 150-school prospect list across four founder-managed zones.
- Budget and constraints: under ₹2 lakh available for the next 6–12 months; founders unpaid (founder-confirmed 2026-10-20). Working web-first product (Flutter, Supabase, OpenAI APIs, Vercel). Four co-founders across technology, business/partnerships, operations and product; exact role allocation unconfirmed. No confirmed schools, users, retention, learning outcomes, costs or conversion rates yet.

## Summary

**Verdict: Not yet.** The verdict is computed by `compile.py`. It fails on one check: **year 1 loses ₹58,104** on the parent-pays model.

**What has to change, and which skill changes it:**
- **Test the school-paid licence:** ₹1,200 per student per year. The CFO's what-if shows year 1 at **+₹3,03,480** (`/founder-pricing` E2 test, then `/founder-cfo`).
- **Or get real parent conversion at or above 10% and test ₹349.** At ₹349, year 1 is −₹27,666 (`/founder-launch` Test B, then `/founder-cfo`).

**What it is.** Edurance is an AI-powered learning platform for school students in Hyderabad and Secunderabad. It finds each child's learning gaps with an in-class diagnostic. It then closes them with teacher-set daily practice on the school's syllabus, and shows the result on an end-of-term re-test. Schools bring it in; parents pay ₹299/month (or ₹999/term) to continue after a free pilot, and the school keeps 30%.

**The three numbers** (`founder/cfo.md`, estimates marked in `cfo-sources.md`):
- **₹148 contribution (50%)** per paid student-month.
- **Break-even: 108 paid students a month.** That's about 9 schools at 10% parent conversion.
- **Year 1: −₹58,104** operating, with founders unpaid. Cash needed: **₹1,54,217**, inside the under-₹2 lakh budget.

**What the board and the panel agreed on.**
- The board (3 × "fund if", average 4.3/10) and 20 simulated parents agree on the core point: **parents pay when the school stands behind it and a result is shown.**
- Price matters less. Adding teacher-assigned homework, a co-signed data promise, a re-test and a guarantee lifted the simulated buy rate **from 30% to 45%** (`offer.md`).
- The simulated parents are an upper bound, so the CFO plans on 10%.

**Where they disagree.**
- The board wants a hard cut to one grade, one subject and one loop. The offer adds a stack, built from existing features plus one small build: the parent time limit.
- **Tuition-first parents** (0/5 in both panel runs) won't pay until a re-test proves the result. They may never pay while they also pay a tutor.

**The biggest risk.** No one pays: the parent conversion rate is unknown. At 5%, the cash needed (₹2.1 lakh) exceeds the budget. **What will be done:** Test B in `launch.md` measures real conversion with real payment links, and Test A asks schools about the school-paid licence in the same meetings.

**What it needs to start.**
- About **₹1.54 lakh** over year 1 (CFO), with the founders unpaid.
- Three signed pilot schools.
- Lawyer-reviewed consent and data-promise documents.
- The first test is ≥ 10 decision-maker meetings by 31 October, aiming for ≥ 3 signed pilots by 6 November.

**The one thing to do this week:** confirm founder roles. Pick one grade, subject, board and zone. **Book 10 decision-maker meetings in that zone.** In every one, ask the payer question: would the school pay ₹1,200 per student per year, or prefer parents paying ₹299 a month?

*The panel is simulated buyers and the numbers are projections built partly on estimates. Real schools, real parents and real bills will confirm or overturn them. Not financial, legal or tax advice.*

## What the board said

Inputs: `founder/idea.md`, `founder/board/brief.md`, the three memos in `founder/board/`.
Date: 2026-10-20. Every number below is either something the founders said, a threshold proposed for the founders to confirm, or marked UNKNOWN. No figure here is a measured result.

---

### 1. The vote

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

### 2. The extended board: perspectives Edurance needs

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

### 3. The business model, assessed

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

### 4. Risks, ranked

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

#### Facts vs assumptions vs unverified claims

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

### 5. Merged conditions (checklist for the rest of the pack)

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

### 6. Founder execution: who owns what

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

### 7. Validation experiments (low-cost, measurable)

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

### 8. 30-day validation plan

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

#### Decisions that depend on the results

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

### 9. Questions the board needs answered (these change the evaluation)

1. **Budget and runway:** how much cash is available, and for how many months? (This changes whether a 90-day pilot cycle is affordable.)
2. **₹299 per what?** Monthly, per term or per year? And today, is the payer the school, the parent, or still open?
3. **Current commitments:** how many of the 150 schools have you actually met, demoed to, or got a yes or a pilot from so far? Even "zero" is a useful answer.
4. **Usage to date:** how many real students have used the product, and is there any engagement or retention data?
5. **Grades, subjects and boards:** which grade band, subject and school boards (CBSE, ICSE, State) does the content cover today?
6. **Cost per student:** is there any OpenAI or TTS bill you can divide by active users?
7. **Founder roles:** who is doing what today, and are founders full-time?
8. **Compliance:** is there a parental consent step, and what student data goes to OpenAI?

---

### The strongest version the board can see

**This differs from the pitch.** The strongest Edurance in the near term is not "an AI tutor for every school student". It is a **diagnostic-led learning-gap service for one grade band and one subject, sold to schools in one zone of Hyderabad**. It starts with a free gap report for each class, which gives the principal something to show parents. It turns into a term-long, measured catch-up programme with a before-and-after re-test the school can put in front of families. The AI explanations and voice are how it is delivered, not what is being sold. What is sold is *a measured result per class, with almost no teacher effort*. If schools pay for that, or reliably bring parents who do, the diagnostic and mastery data built up across a zone's schools becomes the edge the Monopoly lens is looking for. The broader adaptive tutor, PlayLab and expansion beyond Hyderabad all wait until that loop is shown to work.

**Next step:** `/founder-competitors` to map who already sells into these 150 schools, then `/founder-consumer` to put the gap-report offer and the ₹299 payer question in front of simulated principals and parents before the real meetings in week 2.

## The buyer panel

**6 buy · 14 pass** (30% buy) out of 20 simulated buyers. Seed 149644, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Parent at a premium or international-curriculum school | 4 | 50%  (thin) |
| Parent at a mid-fee private school (fees roughly ₹60k-1.5L a year) | 8 | 38% |
| Parent at a budget private school (fees roughly ₹25k-60k a year) | 8 | 12% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Marks-focused | 4 | 75%  (thin) |
| Follows the school | 3 | 67%  (thin) |
| Tech-curious | 2 | 50%  (thin) |
| Burned by an edtech app | 2 | 0%  (thin) |
| Screen-time worrier | 2 | 0%  (thin) |
| Tuition-first | 5 | 0%  (thin) |
| Price-careful | 2 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| ₹1,271,000 and up | 7 | 43%  (thin) |
| ₹662,000 to ₹1,271,000 | 7 | 29%  (thin) |
| under ₹662,000 | 6 | 17%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 5 | "I'll look at the free report and let him finish the pilot, but I'm not paying an AI company every month for my son's test data. I paid for a big learning app before and he dropped it in three weeks, and I work late so nobody is going to sit with him to make sure he uses it." (P001) · "I'll let my son use it during the free pilot since the school chose it, but I'm not paying to keep feeding his test results and learning data to an AI company I know nothing about. I already use ChatGPT and YouTube with him for free, so ₹299 isn't buying me something I can't roughly do myself." (P005) |
| habit | 5 | "We already pay a tuition teacher who sits with my child and knows exactly where she struggles, and more screen time is the last thing she needs. I'll look at the free report and pass it to her tutor, but I won't pay another ₹299 a month for an app." (P008) · "I already paid for a big learning app and my son stopped opening it within weeks, so I will not pay ₹299 a month again until I see him actually using this one on his own. The free report is useful, but YouTube and free apps can cover those gap topics." (P013) |
| need | 2 | "I already work hard to keep my son off the phone, and this asks me to pay ₹299 a month to put him back on it. The free report is useful and I will take it to the PTM, but I would rather the teacher work on those gaps in class." (P002) · "My child already goes to tuition and I am paying for that every month; ₹299 more for an app on my phone that we only share in the evenings feels like one more thing we won't keep up with. If the school asked us to pay for it with the fees I might, but this is a separate payment to some company." (P014) |
| values | 1 | "I already fight to keep my son off the phone and tablet, and this is one more app asking for screen time on top of school and tuition. The free report is useful, but I am not paying ₹299 a month to give him another reason to be on a device." (P006) |
| price | 1 | "I already pay fees for more than one child, and ₹299 a month for each of them turns into a new bill every month for something the school should be teaching anyway. The free report is useful, so I'll use the pilot, but I won't pay to keep it going." (P011) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 4 | "The school itself picked this and the report shows exactly which topics my child is weak in, so if the teacher says at the PTM that it helps marks, ₹299 is less than one tuition class. I'll pay for a month and watch the parent view closely." (P012) · "The school itself is running it and the report already shows exactly which topics my son is weak in, so for ₹299 a month next to what I pay for tuition, I will keep it going for the exam term. If the school is backing it, the other parents will continue too and I don't want him to fall behind." (P015) |
| trust | 1 | "The school brought this in and the report already showed me where my child is behind, so if the teachers say continue, I will pay. ₹299 is less than one tuition session and I don't have time to sit with homework myself." (P003) |
| habit | 1 | "If the school is running it in my child's class and the report already shows where she is behind, I'll just continue it. ₹299 a month is nothing next to the fees, and my relative's child is doing the same thing." (P004) |

### What would flip a no

- If the school itself told me in writing that the data stays with the school and isn't sold or used for anything else, and his class teacher showed me his marks actually went up during the free pilot.
- If his class teacher told me at the PTM that the app follows exactly what they teach and that his test scores went up during the pilot, with a fixed daily time limit I can set myself.
- A clear written data policy, signed off by the school, saying my child's data is not sold or used for training and is deleted if I cancel, plus the weekly parent view actually showing his weak topics improving during the pilot.
- If the school's own teachers assigned it as part of homework mapped chapter by chapter to his syllabus, with a fixed daily limit like 20 minutes, and the parent view showed his test marks actually improving after the pilot.
- The school recommending it officially, or other parents in the class showing me their children's marks went up after using it this term.
- If the school's own teachers used it in class and the term-end report showed my child's weak topics clearly improved, enough that I could cut back on tuition.
- If the school itself told me in writing that the data stays with the school and is not sold or used by the company, and the class teacher showed me his marks actually went up during the pilot.
- The school's own teachers vouching for it at the end of the pilot, with proof my child's weak topics actually improved, and a sibling price so two kids don't cost ₹600 a month.
- If the school included it in the fees, or there was one low family price for all my children, and the teacher or my relative's family showed me real marks going up after the pilot.
- If the teacher shows me at the parent-teacher meeting that his weak topics actually improved during the free pilot, and the school keeps using it in class so he keeps practising.
- If the class teacher said every child should continue with it and it was being used for homework, so it replaces some tuition and isn't extra.
- If the school covered it in the fees, or if the teacher or our tuition sir actually used the report and assigned work from it so it replaced something we already pay for.

Buyers say they would buy **1.0 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Inputs: `founder/pricing-curve.md` (20 simulated parents), `founder/numbers.json` and the CFO tool, and public competitor prices (linked below). Simulated price answers tell you **what to test**. They are not proof of what parents will pay.

### 1. The price: keep ₹299/month as the list price and add a term pass

**What the panel said.** These are the Van Westendorp points, a standard way to read four price questions into an acceptable range. The tool's `₹` signs are rupees:

| point | ₹/month | meaning |
| --- | ---: | --- |
| PMC (point of marginal cheapness) | ~₹83 | below this, parents think it's too cheap to be any good |
| OPP (optimal price point) | ~₹103 | the least resistance either way |
| IPP (indifference price point) | ~₹198 | as many call it a bargain as call it expensive |
| PME (point of marginal expensiveness) | ~₹404 | above this, too many won't buy at all |

₹299 sits **inside** the acceptable range (₹83–₹404) but **above** the indifference point (₹198). The median parent said ₹299 is where it "starts to feel expensive". This splits by segment: 7 of 8 budget-school parents put "getting expensive" at ₹299 or lower, while premium and marks-focused parents put it at ₹499–₹999.

**What the business needs.** I re-ran the CFO tool at each price, with the 30% school share and the 2.36% gateway fee scaled to the price. Fixed costs are ₹15,960/month, with founders unpaid.

| price/month | contribution per paid student | break-even (paid students/month) | margin at plan (144) | year 1 operating result |
| ---: | ---: | ---: | ---: | ---: |
| ₹199 | ₹80.6 (41%) | 198 | -15% | -₹1,18,980 |
| ₹249 | ₹114.4 (46%) | 139 | 1% | -₹88,542 |
| **₹299** | **₹148.2 (50%)** | **108** | **13%** | **-₹58,104** |
| ₹349 | ₹182.1 (52%) | 88 | 20% | -₹27,666 |
| ₹399 | ₹215.9 (54%) | 74 | 26% | +₹2,772 |

(Includes the ₹9/month guarantee reserve from `offer.md`.)

Going below ₹299 to win budget parents nearly doubles the break-even at ₹199. The panel also said price was the main reason for only 1 of the 14 parents who said no. Trust, tuition and screen time were the real blockers, and those are an offer problem (`founder/offer.md`), not a price problem. **So keep ₹299 and fix the offer, rather than cut the price.**

**Against competitors** (public prices, not all official; check before quoting):
- **Free substitutes:** Khan Academy, DIKSHA and YouTube. Two panel parents named "free apps and YouTube".
- **PhysicsWallah school batches:** a Class 6 30-day revision batch at ₹250 and Class 9–10 annual batches from ₹2,200 (~₹180/month) ([pw.live](https://www.pw.live/school-prep/exams/pw-cbse-class-9-10-shiksha-mahotsav-offer-2026), [Class 6](https://www.pw.live/curious-jr/batches/class-6-in-30-days-755428)). These are live classes plus tests, not adaptive practice.
- **Extramarks:** aggregators list K-12 plans from about ₹1,820/month ([elearningindustry](https://elearningindustry.com/directory/elearning-software/extramarks/pricing)). Unofficial.
- **Mindspark (Ei):** an adaptive maths/language tool sold through schools, and the closest like-for-like competitor. Ei's own cost estimate at government scale is about ₹130 per child per year per subject ([ei.study](https://ei.study/?p=11313)). That's a cost figure, not a private-school price.
- **Local tuition:** the panel repeatedly called ₹299 "less than one tuition class". Real Hyderabad tuition rates are **not verified**. Collect them in school meetings.

₹299/month sits above PhysicsWallah's batch price per month, well below Extramarks, and far below tuition. The comparison parents actually made was tuition, so position against that, not against apps.

### 2. The ladder

| rung | price | what it is | reason to step up |
| --- | --- | --- | --- |
| **Free: Class Gap Report** | ₹0, via the school | Diagnostic in class, a gap report for parent and teacher, and full access during the school pilot | It's the hook. Nearly every parent who said no still valued the report. |
| **Monthly** | ₹299/month, cancel any time | Personal learning path, explanations, voice, weekly parent view | Low commitment, for parents who want to see their child use it first |
| **Term Pass** | ₹999 per school term (~4 months, ~₹250/month), paid up front | Same as Monthly, plus an end-of-term re-test report | Matches the school calendar, cuts monthly drop-off and collects cash up front. Contribution is ~₹124/month: lower per month, but steadier. |
| **Sibling add-on** | +₹149/month per extra child | Second child on the same parent account | Several parents asked for a family price ("two kids don't cost ₹600"). The extra child still costs ~₹45/month in AI and hosting, so ₹149 keeps a positive contribution after the school share. |

**Parallel model to test with schools (E2 in `board.md`).** The school pays per enrolled student, e.g. **₹1,200 per student per year** (₹100/month), invoiced with no revenue share and no gateway fee. That gives ~₹55 contribution per student-month, but across **every** student in the class rather than only the ~10–30% of parents who would pay. For a 120-student pilot, that is roughly ₹6,600/month of contribution per school, against roughly ₹1,900 if 10% of parents pay ₹299. This assumes paying schools exist. Test the quote in school meetings, don't assume it.

### 3. The opening offer: Founding Families rate

Parents at the **first three pilot schools** who subscribe before that school's pilot ends get **₹249/month locked for the rest of the 2026–27 academic year**, or the Term Pass at ₹849.
- The urgency is real: it's tied to a real pilot end date and a named group.
- It doesn't train parents to wait for discounts, because the next school's parents never see it.
- There is no "was ₹X" anchor. ₹299 is the price from the start.
- At ₹249 the contribution is ₹114/month (see table). Cap it at the first three schools so it can't drag the margin.

### 4. What to test with real buyers

1. **Monthly ₹299 vs Term Pass ₹999.** Offer one to parents in pilot school A and the other in school B (or split by class). Measure the paid conversion rate in the 14 days after gap reports go home, and the share still paying at day 60.
2. **Parent-pays vs school-pays.** In ≥10 school meetings, put the ₹299 parent plan (30% share) next to a ₹1,200/student/year school licence. Record which the school picks and why.
3. Collect **local tuition fees per subject per month** from at least 10 parents or schools, so the "less than tuition" comparison is real.

Decide after: if Term Pass conversion is ≥ Monthly conversion, lead with the Term Pass. If any school accepts a school-paid licence, model that path with `/founder-cfo` before signing.

### 5. The top price objections, verbatim (simulated; research, not quotes for ads)

1. *"I already pay fees for more than one child, and ₹299 a month for each of them turns into a new bill every month for something the school should be teaching anyway."* (P011)
2. *"If the school asked us to pay for it with the fees I might, but this is a separate payment to some company."* (P014)
3. *"₹299 isn't buying me something I can't roughly do myself."* (P005, with ChatGPT and YouTube)

These point to the sibling price, payment through the school, and proof of a result. Marketing has to answer all three.

## The offer

Method: the Offers lens in `founder-board/lenses.md`, a summary of a published framework applied here. These are not the author's words. Inputs: `founder/panel/results.md` (v1 pitch), `founder/board.md`, `founder/numbers.json`.

### 1. The problem list (in the parent's words, from the panel and the board)

**Before buying**
1. "Who checks what the AI teaches my child?" (trust in AI correctness)
2. "I don't want my child's data going to some AI company." (data)
3. "I paid for a big app before; he dropped it in three weeks." (past failure)
4. "We already pay a tuition teacher." (tuition substitute)
5. "More screen time is the last thing my child needs." (screen time)
6. "Free apps and YouTube already do this." (free substitutes)
7. "The school should pay for this, not me." (payer)
8. "₹299 for each of my children every month." (siblings)
9. "Will it match my child's syllabus and exams?" (syllabus fit)

**During**
10. "Nobody at home can sit with him to make sure he uses it." (supervision)
11. "We share one phone in the evenings." (device access)
12. "I can't tell if he's actually learning or just tapping." (visibility)
13. "It's one more thing to remember." (effort)

**After**
14. "Will it still be used once the pilot ends?" (does it last)
15. "Does a better score in the app mean better school marks?" (proof)
16. "What if it doesn't work? I've wasted the money." (risk)
17. "Can I cancel easily?" (lock-in)
18. "Will the teacher even look at it?" (school follow-through)

### 2. Solutions, scored (value to parent 1–5, cost to deliver 1–5; keep high value, low cost)

| # | solution | value | cost | keep? | why |
| --- | --- | :-: | :-: | :-: | --- |
| 1, 13, 14, 18 | **The teacher assigns it as homework and checks it in class** (written into the pilot agreement) | 5 | 2 | ✅ | The biggest flip. "Follows the school" and "marks-focused" parents went to 100% in the re-test. Cost: founder time training teachers. |
| 9 | **Practice mapped to the school's own syllabus chapters** | 5 | 3 | ✅ | Mapping one grade and one subject to one board is bounded work. This is also the Product lens's "one core loop". |
| 15, 16 | **End-of-term re-test, compared with the week-1 diagnostic** | 5 | 1 | ✅ | The diagnostic already exists. Use parallel items, not the same test. |
| 16 | **Guarantee: no gain on gap topics → next term free** | 4 | 2 | ✅ | Costs only AI and hosting for a term (~₹180 per claim). Reserve ₹9 per paid student-month at a 20% claim rate. Clear terms in §3. |
| 2 | **Written data promise, co-signed with the school** | 5 | 2 | ✅ | It flipped P005. It also needs the DPDP consent work already in the board plan. OpenAI's API terms don't use API data for training by default; confirm on the current terms before printing this promise. |
| 5, 10 | **Daily time limit the parent sets (default 20 min)** | 4 | 2 | ✅ (build) | **Not built yet.** A small feature; build it before the offer goes live, or drop it from the pitch. |
| 12 | **Weekly parent view** | 4 | 1 | ✅ | Already built. |
| 8 | **Sibling add-on ₹149/month** | 3 | 1 | ✅ | Still a positive contribution (see `pricing.md`). |
| 7 | **Term Pass ₹999** | 3 | 1 | ✅ | Fits the school calendar. |
| 17 | **Cancel any time, monthly** | 3 | 1 | ✅ | |
| 4 | **Tutor access: share the gap report and progress with the child's tuition teacher** | 4 | 2 | ⏸ next | Tuition-first parents (0/5 in both runs) said they'd pass the report to the tutor. Making the tutor an ally may be the only way into this segment. Test it in the pilot first. |
| 6 | Free tier forever | 2 | 4 | ❌ | AI costs ~₹45/student/month. Free forever is affordable only for the school-paid model. |
| 11 | Offline or printable worksheets | 3 | 3 | ❌ for now | It solves shared phones, but it's a different product. Revisit if pilot usage shows evening-only access. |
| 3 | Human tutor calls | 4 | 5 | ❌ | Too costly at ₹299. |

### 3. The stack: "Edurance Gap-to-Grade Term"

**The core (described by the outcome):** *Your child's gaps found in week 1, closed by 20 minutes of school-set practice a month, and proven by an end-of-term re-test.*

**Included:**
- The free class diagnostic and the parent gap report. This is the hook.
- School-assigned daily practice on the child's own gap topics, mapped to the school's syllabus chapters and checked by the class teacher.
- AI explanations to read or listen to, and practice that adjusts to the child's level.
- A weekly parent view, plus a daily time limit the parent sets (**must build**).
- An end-of-term re-test report for parent and teacher.

**Bonuses (each kills one objection):**
1. **Written Data Promise**, co-signed by the school: the data is not sold, not used to train AI, visible only to the parent and class teacher, and deleted within 30 days of cancelling. *(Trust and data.)*
2. **Family price:** each extra child is ₹149/month. *(Siblings and price.)*
3. **Founding Families rate:** ₹249/month for the rest of 2026–27 for families at the first three pilot schools who join before their school's pilot ends. *(Price, with real urgency tied to a real date.)*

**Guarantee: "Gap-to-Grade or the next term is free."**
- **Condition:** the child completes at least 70% of assigned sessions, and the end-of-term re-test shows no improvement on the gap topics from the week-1 diagnostic.
- **What the parent gets:** the next term free.
- **What it costs Edurance:** about ₹180 per claim, the AI and hosting for one term. At an assumed 20% claim rate that's ~₹9 per paid student-month, now in `numbers.json`.
- **The safeguard:** the attendance condition keeps the guarantee from paying out when the child never used the product. Have a lawyer check the wording against Indian consumer-protection rules before it's printed. Not legal advice.

**Urgency:** only the Founding Families deadline (each school's real pilot end date). There are no countdown timers or "only N left".

**Name:** **Gap-to-Grade Term**. The company is Edurance; the offer is Gap-to-Grade.

### 4. Value-equation scores (1–10), before and after

| element | v1 pitch | Gap-to-Grade | what moved it |
| --- | :-: | :-: | --- |
| Dream outcome | 6 | 7 | "Gaps closed and proven by a re-test" is more concrete than "personal learning path" |
| Perceived likelihood | 3 | 6 | Teacher assigns and checks it, school syllabus, re-test, guarantee |
| Time to result | 5 | 6 | One term, with weekly progress in the parent view |
| Effort and sacrifice (higher = less effort) | 4 | 6 | The school sets it as homework so the parent doesn't have to push; time limit; family price |

### 5. Re-test: same 20 parents, same seed (149644)

| | v1 pitch | Gap-to-Grade |
| --- | :-: | :-: |
| **Buy rate** | **6/20 (30%)** | **9/20 (45%)** |
| Budget-school parents | 1/8 | 2/8 |
| Mid-fee parents | 3/8 | 4/8 |
| Premium parents | 2/4 | 3/4 |
| "Follows the school" | 2/3 | 3/3 |
| "Marks-focused" | 3/4 | 4/4 |
| **"Tuition-first"** | **0/5** | **0/5** |
| Median "getting expensive" | ₹299 | ₹399 |
| Acceptable range (Van Westendorp) | ₹83–₹404 | ₹98–₹498 |

**Who flipped to yes:**
- **P005, Imran:** the data promise plus a diagnostic that ChatGPT and YouTube don't give him.
- **P007, Suresh:** the teacher assigns and checks it.
- **P014, Nikhat:** the school recommends it and the teacher checks it.

Nobody flipped to no.

**Objections that dropped:** "trust" fell from 7 of the 14 no's to 3 of 11. The data worry mostly turned into "show me the signed agreement", which can be delivered.

**What didn't move:**
- **Tuition-first parents (0/5 both times).** They'll use the free pilot and pass the report to their tutor, but they won't pay for both. The only flips they named were proof from the end-of-term re-test, or the tutor using it so tuition hours can drop. That's a re-test-time sale, not a pilot-end sale, and the tutor-access idea is the thing to test.
- **Screen-time worriers and parents burned by an app before.** The time limit helped the wording but not the decision. They want to see the re-test first.

**New objections the stronger offer created:**
1. *"If the teacher assigns it as homework, the school should pay for it out of the fees."* (P007, P018) This is the strongest signal yet for the **school-paid licence** in `pricing.md`.
2. *"A better score on Edurance's own test doesn't prove better school marks."* (P002, P007, P015) Report the child's **school unit-test marks on gap chapters** alongside the re-test, and ask the school to share them with consent.

**Caveat:** these are simulated buyers and 45% is an upper bound. The size of the jump matters less than its direction: the school's endorsement and the data promise moved parents, and price barely did.

### 6. What this changes

- **Pitch:** `founder/pitch.md` is now the Gap-to-Grade pitch. v1 is kept as `founder/pitch-v1.md`.
- **To build before launch:** the parent daily time limit; syllabus-chapter mapping for one grade, one subject and one board; a re-test made of parallel items.
- **To write before launch:** the data promise and consent form (legal review), the guarantee terms, and a pilot agreement in which the school commits to teachers assigning and checking the work.
- **For the CFO:** the guarantee reserve is ₹9 per paid student-month. The Founding Families rate (₹249) applies to the first three schools only.

## The numbers

> **Units:** one unit is one **paid student-month**. The tool counts "a day"; `days_per_month` is 1, so every "a month" below is per month. Prices are before GST. Estimates are marked in `numbers.json` and explained in `cfo-sources.md`. This is not financial, tax or legal advice: an accountant should check GST registration, the revenue-share contract and the company structure before money moves.

**The margin.**
- Each paid student-month at ₹299 leaves **₹148 (50%)** after the school's 30% share, the gateway fee, AI, voice, hosting and the guarantee reserve.
- At the plan of 144 paid students a month, the profit margin is **13%**, with founders unpaid.
- **Break-even is 108 paid students a month.** At an assumed 10% parent conversion, that's about 9 schools of 120 piloted students.

**Year 1:**
- Operating result: **−₹58,104** on ₹2,69,100 revenue.
- After the ₹85,240 startup spend: −₹1,43,344.
- **Cash needed before it pays for itself: ₹1,54,217**, which fits inside the under-₹2 lakh budget with about ₹46k to spare.
- Monthly profit turns positive in month 9. The startup money is **not** earned back in year 1.

**The line to watch: parent conversion (the ramp).**
- The plan assumes 10% of piloted students' parents pay, a third of the simulated panel's rate.
- At **5% conversion**, year 1 is −₹1,24,812, the margin at plan is −25%, and the cash needed is **₹2,10,052, more than the budget.**
- The first real pilot's conversion number decides whether this model works. Nothing else in this file matters as much.

**Other lines that move it:**
- **AI and voice cost.** Doubling the estimate (₹42 → ₹84) cuts the contribution to ₹106 and raises break-even to 150 students. Replace the estimate with the first month's real OpenAI bill.
- **Founder pay.** Four founders on ₹15,000/month stipends raise break-even to **512 paid students a month** and need ₹8.6 lakh of cash. **The parent-pays model cannot pay the founders at this scale.**
- The tool's "Price −10%" row keeps the school share fixed in rupees, which overstates the hit slightly. `pricing.md` has the price table with the share scaled to the price.

**Three ways to improve the margin (each one run through the tool):**
1. **A school-paid licence instead of parent payments: ₹1,200 per student per year (₹100/month).** No 30% share, no gateway fee, and every pilot student counts (assumes 12 schools × 120 students by month 12).
   - Contribution: ₹55 per student-month.
   - Break-even: 290 enrolled students, about 3 schools.
   - **Year 1: +₹3,03,480.** Cash needed: ₹1,17,160.
   - This is the strongest lever by far, *if* schools will pay. That's test E2 in `board.md`.
2. **Price ₹349 instead of ₹299** (share scaled): contribution ₹182 (vs ₹148), break-even 88, year 1 −₹27,666. The re-test panel's median "getting expensive" rose to ₹399, so ₹349 is testable. Simulated answers aren't proof.
3. **Cut AI cost per student.** Cache explanations by topic as well as audio, and use a smaller model for routine hints. Each ₹10 saved adds ₹10 to the contribution and lowers break-even by about 7 students.

**The board's money conditions (`board.md` §5):**
- [ ] *Unit economics with real inputs:* **not met.** The contribution is positive (₹148) on estimates, but AI cost, conversion and churn are unmeasured.
- [ ] *Payer and terms fixed in writing:* **partly.** Parent pays ₹299, school share 30% (confirmed). The school-paid alternative is untested.
- [ ] *Someone pays:* **not met.** There are no paid users yet.

**Not counted here:** founder salaries, Edurance's own GST, refunds, parent cancellations (the ramp assumes none), support staff, and the Founding Families ₹249 rate (about ₹1,600/month less contribution while 36 founding families pay ₹249).

---

## Unit economics: Edurance

Every number below comes from the input file. Nothing is looked up or guessed.

### One paid student-month

| line | per paid student-month |
| --- | ---: |
| Price | ₹299.00 |
| School revenue share (30% of ₹299, founder-confirmed) | -₹89.70 |
| Payment gateway (Razorpay standard 2% + 18% GST = 2.36%) | -₹7.06 |
| AI explanations, OpenAI gpt-4.1-mini (ESTIMATE, see cfo-sources.md) | -₹22.00 |
| Text-to-speech narration after caching (ESTIMATE) | -₹20.00 |
| Supabase/Vercel usage beyond plan per student (ESTIMATE) | -₹3.00 |
| Free-next-term guarantee reserve (ESTIMATE: 20% of families claim; a free term costs ~₹180 in AI/hosting) | -₹9.00 |
| **Contribution** (what each paid student-month leaves to pay the fixed costs) | **₹148.24** (50%) |

### The margin that matters

Fixed costs: ₹15,960 a month (Founder pay (4 founders, unpaid by founder decision) ₹0, Supabase Pro (25 USD at an ESTIMATED ₹88 per USD) ₹2,200, Vercel Pro, 1 seat (20 USD, ESTIMATE) ₹1,760, Domain, email, misc. software (ESTIMATE) ₹1,000, Travel to schools across 4 zones (ESTIMATE) ₹8,000, Printed gap reports and pilot materials (ESTIMATE) ₹2,000, Phone and data (ESTIMATE) ₹1,000).

- **Break-even: 108 paid student-months a month.** Below that you lose money every month.
- **Profit margin at your plan** (144 a month): **13%** of every sale, after every cost.

### Year 1, month by month

| month | paid student-months a month | revenue | profit | cumulative (after ₹85,240 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | ₹0 | -₹15,960 | -₹101,200 |
| 2 | 0 | ₹0 | -₹15,960 | -₹117,160 |
| 3 | 36 | ₹10,764 | -₹10,623 | -₹127,783 |
| 4 | 48 | ₹14,352 | -₹8,844 | -₹136,628 |
| 5 | 60 | ₹17,940 | -₹7,066 | -₹143,693 |
| 6 | 72 | ₹21,528 | -₹5,287 | -₹148,980 |
| 7 | 84 | ₹25,116 | -₹3,508 | -₹152,488 |
| 8 | 96 | ₹28,704 | -₹1,729 | -₹154,217 |
| 9 | 108 | ₹32,292 | ₹50 | -₹154,167 |
| 10 | 120 | ₹35,880 | ₹1,829 | -₹152,338 |
| 11 | 132 | ₹39,468 | ₹3,608 | -₹148,731 |
| 12 | 144 | ₹43,056 | ₹5,387 | -₹143,344 |

- **Year 1 operating profit: -₹58,104** on ₹269,100 of revenue.
- After the ₹85,240 startup spend: -₹143,344.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **₹154,217**.

### What if

| scenario | margin at plan | break-even a month | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 13% | 108 | -₹58,104 |
| Price -10% | 3% | 135 | -₹85,014 |
| Volume -20% | 3% | 108 | -₹84,787 |
| Unit costs +15% | 5% | 128 | -₹78,457 |

### Red flags

- Year 1 loses money on operations (-₹58,104).
- The startup spend is not earned back within year 1.

## Marketing

Inputs: `founder/panel/results.md` and `founder/panel-v2/results.md` (simulated parents), `founder/offer.md` (Gap-to-Grade), `founder/pricing.md`, `founder/numbers.json`, `founder/board.md`. `/founder-competitors` has **not** been run, so the competitor points below come from the public prices in `pricing.md`, not from a full map. Run it before the campaign is locked.

Edurance has **two audiences, in order**:
1. **Schools** (owner or correspondent, principal, academic coordinator), who say yes to a pilot.
2. **Parents inside a pilot school**, who say yes to paying.

There is no marketing to parents outside a pilot school this year.

### 1. Positioning

Three versions:

**A. For schools (recommended for outreach)**
> For **private-school principals in Hyderabad** who have mixed-ability classes and parents asking "why is my child behind?", **Edurance** is the **class learning-gap programme** that **finds every student's gaps in week 1 and shows the improvement on a re-test by the end of term, with teachers spending only minutes**, unlike **content apps** that hand out videos and leave the school with no measured result.

**B. For parents in a pilot school (recommended for conversion)**
> For **marks-focused parents whose child's school already uses Edurance**, who want to know exactly where their child is behind, **Gap-to-Grade** is the **school-set daily practice** that **targets their child's own gap topics in the school's syllabus and proves the gain on a re-test**, unlike **tuition or YouTube**, which can't show which chapters were fixed.

**C. Tuition-replacement (not recommended yet)**
> For parents paying for tuition, Edurance is the cheaper way to close gaps.

This loses: tuition-first parents were 0/5 in both panel runs, and they trust their tutor. Revisit only once re-test results exist.

**Evidence for A and B:**
- "Follows the school" and "marks-focused" parents went to 100% buy when the teacher assigns and checks the work.
- The free gap report was valued even by parents who said no.
- "Trust" no's fell from 7 to 3 when the data promise was added.

### 2. Channels

| # | channel | audience | why it fits | rough cost | how you'll know it worked |
| --- | --- | --- | --- | --- | --- |
| 1 | **Founder visits to schools, zone by zone**: walk in, ask for the principal, offer the free Class Gap Report | Schools | B2B2C lives or dies on the decision-maker meeting. Four founders already own four zones. | Travel ~₹8,000/month (already in fixed costs), printed one-pagers ~₹2,000 | Meetings booked per 10 visits; pilots agreed per 10 meetings |
| 2 | **Warm introductions**: founders' own schools and teachers, parent networks, school-management associations in Telangana (identify the active ones and verify membership; not checked here) | Schools | A warm intro skips the gatekeeper and builds trust faster than a cold visit | ₹0, plus time | Intros → meetings ratio |
| 3 | **Inside the pilot school**: the parent-teacher meeting (PTM) slot, the class WhatsApp group (sent by the teacher, with the school's permission), the printed gap report with a QR code | Parents | Parents decide on what the school endorses (panel). The teacher is the channel. | Printing ~₹3,000 per school | Report-open rate, parent-view logins, paid conversion within 14 days of reports going home |
| 4 | **Pilot-school referrals**: the principal introduces 2 nearby principals once re-test results exist | Schools | The Monopoly lens's test: repeatable distribution | ₹0 | Schools signed through referral |

**Not doing, and why:**
- **Paid social or search ads to parents.** No pilot school means no endorsement, and endorsement is what converts. It also burns a budget under ₹2 lakh.
- **Influencers or parent-creator content.** Same reason, and the claims risk is high in education.
- **App-store and SEO growth.** Edurance is web-first and school-led. Later.
- **Cold email to schools as the main channel.** Principals rarely answer. Use it only to confirm a visit.

### 3. The 30-day campaign

**Launch day = Monday 9 November 2026**: the first pilot class takes the diagnostic. This is an assumption that matches the board's 30-day plan; move every date if launch moves. The calendar runs from L−14 (26 Oct) to L+16 (25 Nov).

| date | day | channel | what goes out / happens | message |
| --- | --- | --- | --- | --- |
| Mon 26 Oct | L−14 | — | Print school one-pagers and a sample (anonymised, fictional) gap report. List the first 20 schools per zone. | — |
| Tue 27 Oct | L−13 | 1, 2 | Founders send warm-intro messages (each founder 5) and visit 5 schools each | Hook 1 |
| Wed 28 Oct | L−12 | 1 | 5 visits per founder; book meetings | Hook 2 |
| Thu 29 Oct | L−11 | 1 | Decision-maker meetings: demo, free gap report offer, both payer options (E2) | Hooks 1, 3 |
| Fri 30 Oct | L−10 | 1 | Meetings; collect local tuition fees (pricing test 3) | Hook 3 |
| Sat 31 Oct | L−9 | — | Weekly review: visits, meetings and agreements by zone | — |
| Mon 2 Nov | L−7 | 1 | Follow-up visits to warm schools; send the pilot agreement draft | Hook 4 |
| Tue 3 Nov | L−6 | 1 | Sign the first pilot agreements (teacher assigns and checks, data promise, re-test) | Hook 4 |
| Wed 4 Nov | L−5 | 3 | Teacher orientation at the first pilot school (30 minutes) | — |
| Thu 5 Nov | L−4 | 3 | Consent forms go home with the school's letter | Hook 5 |
| Fri 6 Nov | L−3 | 3 | The teacher posts to the class WhatsApp group: what's coming, the data promise | Hook 5 |
| Sat 7 Nov | L−2 | — | Dry run of the class-period onboarding; check load on school Wi-Fi | — |
| **Mon 9 Nov** | **L** | 3 | **First class diagnostic** (observed first period, E3) | — |
| Tue 10 Nov | L+1 | 3 | Second pilot school diagnostic, if signed | — |
| Wed 11 Nov | L+2 | 3 | Gap reports to the principal and teacher | Hook 2 |
| Thu 12 Nov | L+3 | 3 | Gap reports home: printed, plus a link in the WhatsApp group via the teacher | Hooks 6, 7 |
| Fri 13 Nov | L+4 | 3 | The teacher assigns the first week of practice | — |
| Mon 16 Nov | L+7 | 3 | First weekly parent-view update | Hook 8 |
| Tue 17 Nov | L+8 | 1 | Founders resume school visits in other zones, with the first-week usage numbers as proof | Hook 9 |
| Thu 19 Nov | L+10 | 3 | Teacher class check-in; a short note to parents on how many days were practised | Hook 8 |
| Sat 21 Nov | L+12 | 3 | PTM slot (if scheduled): a founder explains Gap-to-Grade, the Term Pass, Founding Families | Hooks 6, 10 |
| Mon 23 Nov | L+14 | 3 | Second weekly parent update; the Founding Families offer is open until the pilot's end date | Hook 10 |
| Wed 25 Nov | L+16 | — | Review against the decision gates in `board.md` (weekly active rate, conversion, cost per student) | — |

**Founding Families:** ₹249/month for 2026–27 at the first three pilot schools. It closes on each school's real pilot end date, stated in writing to parents.

**When there's nothing new to say:** share how the diagnostic was built for the school's syllabus, a "topic of the week" the class is working on (aggregate only, never one child's data), and short teacher how-to clips.

### Ten hooks

Each hook answers one panel objection or uses one panel reason. Panel quotes are research and never appear in ads.

| # | for | format | hook | answers |
| --- | --- | --- | --- | --- |
| 1 | Principal | Opening line at the visit | "In one class period we can show you which topics each student in Class 7 is behind on. Free, for one class." | Schools need proof before commitment |
| 2 | Principal | One-pager headline | "Every student's gaps, found in week 1. Measured again by a re-test at the end of term." | Likelihood and proof |
| 3 | Principal | Meeting | "Your teachers assign it in two minutes and check it in class. We do the rest." | Teacher effort |
| 4 | Principal | Pilot agreement cover | "Your parents see a re-test, not a promise." | School reputation with parents |
| 5 | Parent | Consent letter | "Your child's data is not sold, not used to train AI, and deleted if you leave. The school co-signs this." | Data and trust |
| 6 | Parent | Gap report top line | "Here are the 4 topics [child] is behind on in [subject], and the 20-minute plan to fix them." | "Will it help my child specifically?" |
| 7 | Parent | WhatsApp message (from the teacher) | "This is homework the class teacher sets and checks. You choose the daily screen-time limit." | Screen time and "one more thing" |
| 8 | Parent | Weekly update | "This week: 4 of 5 days practised. 2 gap topics improving." | "Will he keep using it?" |
| 9 | Principal (new zone) | Follow-up visit | "In [School], X% of Class 7 practised 4+ days in week 1." Use only real numbers, with the school's permission. | Social proof between schools |
| 10 | Parent | PTM / Founding Families | "If the end-of-term re-test shows no gain on the gap topics, the next term is free." | Risk |

### 4. Budget and numbers

**Budget split.** The total is under ₹2 lakh, and the CFO needs ₹1.54 lakh of that for running costs and the pilot. The marketing-specific spend:

| item | ₹ |
| --- | ---: |
| School one-pagers and sample reports (printing) | 3,000 |
| Printed gap reports and consent letters, 3 schools | 9,000 |
| PTM materials and parent evening refreshments | 6,000 |
| Travel | already in fixed costs (₹8,000/month) |
| **Total** | **₹18,000**, inside the CFO's ₹15,000 pilot materials line plus contingency |

**The most you can pay to win a customer:**
- A paid family leaves ₹148/month (CFO).
- The simulated panel averaged 1 purchase in the first month and doesn't tell you how long families stay. **Assume one term (4 months), an assumption**, so a paid family is worth about ₹593 in contribution.
- At 10% conversion, a 120-student school gives about 12 paid families. **Spend no more than about ₹7,100 to win one school** (cash plus founder time valued at zero, which is how it's being paid today).
- Under the school-paid licence, the same school is worth ₹55 × 120 × 4 months ≈ ₹26,400 per term. That's another reason to test it.

**Three numbers to watch every week:**

| number | change something if… |
| --- | --- |
| Pilots signed per 10 decision-maker meetings | Below 2 after 10 meetings: rework the pitch (`/founder-offer`) or the target school segment |
| Pilot students active 4+ days that week | Below 40% in week 2: stop selling and fix the first session and teacher follow-through |
| Paid conversion within 14 days of the re-test or pilot-end offer | Below 5%: the parent-pays model fails the CFO's budget. Push the school-paid licence. |

### Rules followed
- No fake reviews, testimonials, before/after images or "as seen on".
- Hook 9 uses real pilot numbers only, with the school's written permission.
- Learning-gain claims ("proven closed") are made only once re-test data exists. Until then, say "measured by a re-test", not "proven". Check claims against Indian advertising rules (ASCI) and consumer-protection rules. Not legal advice.

## Brand

Inputs: `founder/idea.md`, `founder/marketing.md` (positioning A for schools, B for parents), `founder/offer.md` (Gap-to-Grade), and the panel's reasons for buying: the school endorses it, it targets the child's own gaps, and the re-test proves it. `/founder-competitors` hasn't run, so the confusion check covers only the names in `pricing.md` plus obvious look-alikes.

**The brand job:**
- To a principal, Edurance should feel like **a serious, measured school partner**, not a consumer app.
- To a parent, it should feel like **the school's own homework, with proof**, not one more screen.

### 1. Name

The company already trades as **Edurance** and has a working product under that name. The recommendation is to **keep Edurance as the company and product name** and give the offer its own name (**Gap-to-Grade**). The candidates below are for checking the name, and for a fallback if a trademark search blocks it.

| # | candidate | style | says | out loud / on an icon | risk |
| --- | --- | --- | --- | --- | --- |
| 1 | **Edurance** (current) | Invented (edu + endurance) | Learning that lasts | Easy to say. Reads well. 8 letters fit an icon as "E". | **Sounds like "Endurance"**, a common word used by many companies and brands. Check that no edtech in Class 41/9/42 uses "Edurance" or something close. |
| 2 | Gap-to-Grade | Descriptive (offer name) | The outcome | Rhythmic; works on a report header | Descriptive names are harder to register as trademarks. Fine as an offer name. |
| 3 | Gapwise | Evocative | Smart about gaps | Clear | Generic "-wise" names are crowded |
| 4 | Pathshala AI | Local (Hindi/Telugu-familiar word for school) | A local school feel | Warm for parents | "Pathshala" is widely used; hard to protect |
| 5 | Saarthi Learning | Local (guide/charioteer) | A guide | Warm | Very widely used |
| 6 | Kalam Learn | Local/tribute | Learning, the pen | Short | Linked to a public figure; avoid |
| 7 | Mastery Map | Descriptive | Progress made visible | Clear for schools | Generic |
| 8 | Nudge Class | Evocative | Small daily practice | Friendly | Sounds lightweight to principals |
| 9 | Re:Learn | Evocative | Re-test, re-learn | Hard to say aloud, awkward as a URL | Punctuation doesn't work in handles |
| 10 | Ankuram | Telugu (sprout) | Growth, local pride | Beautiful to local parents | Hard for non-Telugu speakers when expanding |

**Shortlist:** 1 Edurance (keep), 2 Gap-to-Grade (offer name), 3 Gapwise (fallback).

**Checks you must run yourself** (I couldn't reach the domain registries from this session, so nothing below is verified):

- **Trademark (India):** search the IP India public search at https://ipindia.gov.in (Trade Marks → Public Search) for "EDURANCE", "GAP TO GRADE" and "GAPWISE" in:
  - **Class 41:** education, tutoring, providing online non-downloadable educational content.
  - **Class 9:** downloadable software and apps.
  - **Class 42:** software as a service.

  If you'll expand outside India, also search WIPO's Global Brand Database. A trademark attorney confirms it. Nothing is registered until you file.
- **Domain:** check edurance.com, edurance.in, edurance.ai and edurance.app, plus gaptograde.in, at any registrar. If .com is taken, edurance.in or **getedurance.com** are fine for a school-facing brand.
- **Handles:** Instagram, YouTube, LinkedIn (most useful for principals) and X. WhatsApp Business needs only a phone number.
- **Confusion:** stay well clear of "Endurance" lookalike logos, and of the visual styles of Extramarks, PhysicsWallah and BYJU'S (see `pricing.md`).

### 2. Voice and promise

**The one-line promise:** *Every child's gaps, found and fixed, and you can see it.*

**Tagline options:**
1. **"Find the gap. Close the gap. See the proof."** (recommended)
2. "Homework that knows your child."
3. "Learning that lasts."

Option 3 plays on the name, but it's generic.

**Voice:**

| adjective | do | don't |
| --- | --- | --- |
| **Precise** | "Riya is behind on 3 topics: fractions, ratios, area." | "Unlock your child's full potential!" |
| **Calm** | "20 minutes a month, set by the class teacher." | "Don't let your child fall behind!" (fear) |
| **Honest** | "We'll show you the re-test, whatever it says." | "Guaranteed top marks." |

**Before → after, from `pitch-v1.md`:**
- Before: "Edurance gives your child a personal learning path for those gaps, explanations they can read or listen to, and practice that adjusts to their level."
- After: "Your child's class teacher sets 20 minutes a month on the 4 topics your child is behind on. At the end of term, a re-test shows what changed."

### 3. The look (brief)

**Colour** (contrast ratios computed, WCAG AA = 4.5:1 for body text):

| colour | hex | job | text contrast |
| --- | --- | --- | --- |
| Deep Teal | `#0F4C5C` | Primary: headers, buttons, the logo. Reads as serious and trustworthy for principals. | White on teal **9.5:1** ✅; teal on paper **8.9:1** ✅ |
| Marigold | `#F2A541` | Accent: progress, highlights, the "gap closed" moment. Warm, festive, local. | **Never use it for text on white (2.05:1 ❌).** Dark ink on marigold is **7.6:1** ✅. For orange text use Deep Marigold `#B45309` (5.0:1 on white ✅). |
| Paper | `#FAF7F2` | Background for reports and printed handouts | Ink `#1D2433` on paper **14.5:1** ✅ |
| Progress Green | `#2E7D5B` | "Improved" states only | White on green **5.0:1** ✅ |

**Type:**
- **Display: Poppins** (SemiBold, Bold). It reads well in English and has **Devanagari** support.
- **Text: Noto Sans**, with **Noto Sans Telugu** for Telugu parent letters.
- All are free under the SIL Open Font License from https://fonts.google.com. Both families support Indian scripts, so letters home can be bilingual.

**Logo brief:**
- **Must say:** *gap → closed / growth*. One idea: a lowercase "e" whose open counter (the gap) is closed by a marigold bar or tick.
- **Must work:** at 32px as the browser and app icon; on a single-colour printed gap report (photocopied in black and white at the school); on the school's WhatsApp DP; on a classroom poster.
- **Avoid:** graduation caps, owls, light bulbs, rockets, brains (every edtech uses them), and anything resembling the Endurance or BYJU'S marks.
- I can draft concepts with an image tool if you'd like. They'd be **concepts**, not a finished logo. A designer should finalise it.

**The first five touchpoints:**
1. **The school one-pager** (for the principal visit): teal header, the tagline, *"One class period. Every student's gaps."*, the 3-step process, the data promise, founder contact.
2. **The gap report** (printed and as a link): on paper background; the child's name, the 3–5 gap topics as marigold bars, the 20-minute plan; the school's logo next to Edurance's. This is the most important brand object.
3. **The consent letter home:** on school letterhead with "in partnership with Edurance", bilingual (English and Telugu), the data promise in plain words.
4. **The first WhatsApp message** (sent by the teacher): short, factual, one link, no emojis beyond one ✅.
5. **The reply to the first complaint:** within 24 hours, signed by a named founder. Say what happened, what you've fixed and what you're offering. Never defensive.

### Rules followed
No competitor names, logos, colours or taglines are copied. Fonts are free to use under the OFL. This is not legal advice on trademarks. Domains and handles were **not** checked from this session.

## Operations

Inputs: `founder/idea.md`, `founder/offer.md` (Gap-to-Grade), `founder/numbers.json`, `founder/board.md`, `founder/marketing.md`. Founder roles are still **unconfirmed**. The allocation in §3 is the board's recommendation, so confirm it.

### 1. The operating cycle

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

### 2. Suppliers

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

### 3. People: who does what, when

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

### 4. Routines (one-page SOPs)

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

### 5. Tools: the smallest stack

| need | tool | published price | why |
| --- | --- | --- | --- |
| Product hosting | Vercel Pro, Supabase Pro | see §2 | Already in use |
| Payments, subscriptions | Razorpay Subscriptions / Payment Links | 2% + GST | UPI, Indian cards, recurring ₹299 |
| School pipeline (CRM) | A shared Google Sheet (free) | ₹0 | 150 schools fit in a sheet. Don't buy a CRM yet. |
| Founder comms | WhatsApp group + Google Drive (free tier) | ₹0 | Already used by schools and parents |
| Business email | Google Workspace or Zoho Mail | Check the current India pricing pages | A domain email looks credible to principals |
| Bookkeeping, GST invoices | Zoho Books, or a spreadsheet plus a CA | Check Zoho's India pricing page | You need GST-compliant invoices once registered |
| Consent records | A table in Supabase plus scanned signed forms | ₹0 | Needed for DPDP |

### 6. Licences, permits, legal (India / Telangana): confirm each one

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

### 7. Risk register

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

### Output notes
No supplier quote has changed `numbers.json` yet. Replace the estimates there with the first real OpenAI, print and legal invoices and re-run `/founder-cfo`. Next: `/founder-launch`.

## Launch plan

Inputs: `founder/board.md` (30-day plan, experiments E1–E8, decision gates), `founder/offer.md`, `founder/pricing.md`, `founder/cfo.md`, `founder/marketing.md` (calendar), `founder/brand.md`, `founder/ops.md`.

**Launch day: Monday 9 November 2026.** That's when the first pilot class takes the diagnostic. It's the earliest realistic date: 20 days from today, given school meetings, the agreement and consent letters. **It's an assumption, so give me your target date** and every date below shifts. Owners use the roles in `ops.md` §3 (Business, Operations, Product, Technology), still to be confirmed.

### 1. The real-world test first

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

### 2. The countdown (from today, 20 Oct 2026)

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

### 3. Launch-day run sheet (Monday 9 Nov, first pilot school)

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

### 4. The first 30 days (9 Nov–9 Dec)

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

## Not done yet

- The competition: run /founder-competitors

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
