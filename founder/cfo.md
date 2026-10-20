# CFO's note: Edurance (read this first)

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

# Unit economics: Edurance

Every number below comes from the input file. Nothing is looked up or guessed.

## One paid student-month

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

## The margin that matters

Fixed costs: ₹15,960 a month (Founder pay (4 founders, unpaid by founder decision) ₹0, Supabase Pro (25 USD at an ESTIMATED ₹88 per USD) ₹2,200, Vercel Pro, 1 seat (20 USD, ESTIMATE) ₹1,760, Domain, email, misc. software (ESTIMATE) ₹1,000, Travel to schools across 4 zones (ESTIMATE) ₹8,000, Printed gap reports and pilot materials (ESTIMATE) ₹2,000, Phone and data (ESTIMATE) ₹1,000).

- **Break-even: 108 paid student-months a month.** Below that you lose money every month.
- **Profit margin at your plan** (144 a month): **13%** of every sale, after every cost.

## Year 1, month by month

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

## What if

| scenario | margin at plan | break-even a month | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 13% | 108 | -₹58,104 |
| Price -10% | 3% | 135 | -₹85,014 |
| Volume -20% | 3% | 108 | -₹84,787 |
| Unit costs +15% | 5% | 128 | -₹78,457 |

## Red flags

- Year 1 loses money on operations (-₹58,104).
- The startup spend is not earned back within year 1.
