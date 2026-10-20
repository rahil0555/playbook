# Edurance: pricing

Inputs: `founder/pricing-curve.md` (20 simulated parents), `founder/numbers.json` and the CFO tool, and public competitor prices (linked below). Simulated price answers tell you **what to test**. They are not proof of what parents will pay.

## 1. The price: keep ₹299/month as the list price and add a term pass

**What the panel said.** These are the Van Westendorp points, a standard way to read four price questions into an acceptable range. The tool's `$` signs are rupees:

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
| ₹199 | ₹89.6 (45%) | 178 | -11% | -₹1,10,880 |
| ₹249 | ₹123.4 (50%) | 129 | 5% | -₹80,442 |
| **₹299** | **₹157.2 (53%)** | **102** | **16%** | **-₹50,004** |
| ₹349 | ₹191.1 (55%) | 84 | 23% | -₹19,566 |
| ₹399 | ₹224.9 (56%) | 71 | 29% | +₹10,872 |

Going below ₹299 to win budget parents almost doubles the break-even at ₹199. The panel also said price was the main reason for only 1 of the 14 parents who said no. Trust, tuition and screen time were the real blockers, and those are an offer problem (`founder/offer.md`), not a price problem. **So keep ₹299 and fix the offer, rather than cut the price.**

**Against competitors** (public prices, not all official; check before quoting):
- **Free substitutes:** Khan Academy, DIKSHA and YouTube. Two panel parents named "free apps and YouTube".
- **PhysicsWallah school batches:** a Class 6 30-day revision batch at ₹250 and Class 9–10 annual batches from ₹2,200 (~₹180/month) ([pw.live](https://www.pw.live/school-prep/exams/pw-cbse-class-9-10-shiksha-mahotsav-offer-2026), [Class 6](https://www.pw.live/curious-jr/batches/class-6-in-30-days-755428)). These are live classes plus tests, not adaptive practice.
- **Extramarks:** aggregators list K-12 plans from about ₹1,820/month ([elearningindustry](https://elearningindustry.com/directory/elearning-software/extramarks/pricing)). Unofficial.
- **Mindspark (Ei):** an adaptive maths/language tool sold through schools, and the closest like-for-like competitor. Ei's own cost estimate at government scale is about ₹130 per child per year per subject ([ei.study](https://ei.study/?p=11313)). That's a cost figure, not a private-school price.
- **Local tuition:** the panel repeatedly called ₹299 "less than one tuition class". Real Hyderabad tuition rates are **not verified**. Collect them in school meetings.

₹299/month sits above PhysicsWallah's batch price per month, well below Extramarks, and far below tuition. The comparison parents actually made was tuition, so position against that, not against apps.

## 2. The ladder

| rung | price | what it is | reason to step up |
| --- | --- | --- | --- |
| **Free: Class Gap Report** | ₹0, via the school | Diagnostic in class, a gap report for parent and teacher, and full access during the school pilot | It's the hook. Nearly every parent who said no still valued the report. |
| **Monthly** | ₹299/month, cancel any time | Personal learning path, explanations, voice, weekly parent view | Low commitment, for parents who want to see their child use it first |
| **Term Pass** | ₹999 per school term (~4 months, ~₹250/month), paid up front | Same as Monthly, plus an end-of-term re-test report | Matches the school calendar, cuts monthly drop-off and collects cash up front. Contribution is ~₹124/month: lower per month, but steadier. |
| **Sibling add-on** | +₹149/month per extra child | Second child on the same parent account | Several parents asked for a family price ("two kids don't cost ₹600"). The extra child still costs ~₹45/month in AI and hosting, so ₹149 keeps a positive contribution after the school share. |

**Parallel model to test with schools (E2 in `board.md`).** The school pays per enrolled student, e.g. **₹1,200 per student per year** (₹100/month), invoiced with no revenue share and no gateway fee. That gives ~₹55 contribution per student-month, but across **every** student in the class rather than only the ~10–30% of parents who would pay. For a 120-student pilot, that is roughly ₹6,600/month of contribution per school, against roughly ₹1,900 if 10% of parents pay ₹299. This assumes paying schools exist. Test the quote in school meetings, don't assume it.

## 3. The opening offer: Founding Families rate

Parents at the **first three pilot schools** who subscribe before that school's pilot ends get **₹249/month locked for the rest of the 2026–27 academic year**, or the Term Pass at ₹849.
- The urgency is real: it's tied to a real pilot end date and a named group.
- It doesn't train parents to wait for discounts, because the next school's parents never see it.
- There is no "was ₹X" anchor. ₹299 is the price from the start.
- At ₹249 the contribution is ₹123/month (see table). Cap it at the first three schools so it can't drag the margin.

## 4. What to test with real buyers

1. **Monthly ₹299 vs Term Pass ₹999.** Offer one to parents in pilot school A and the other in school B (or split by class). Measure the paid conversion rate in the 14 days after gap reports go home, and the share still paying at day 60.
2. **Parent-pays vs school-pays.** In ≥10 school meetings, put the ₹299 parent plan (30% share) next to a ₹1,200/student/year school licence. Record which the school picks and why.
3. Collect **local tuition fees per subject per month** from at least 10 parents or schools, so the "less than tuition" comparison is real.

Decide after: if Term Pass conversion is ≥ Monthly conversion, lead with the Term Pass. If any school accepts a school-paid licence, model that path with `/founder-cfo` before signing.

## 5. The top price objections, verbatim (simulated; research, not quotes for ads)

1. *"I already pay fees for more than one child, and ₹299 a month for each of them turns into a new bill every month for something the school should be teaching anyway."* (P011)
2. *"If the school asked us to pay for it with the fees I might, but this is a separate payment to some company."* (P014)
3. *"₹299 isn't buying me something I can't roughly do myself."* (P005, with ChatGPT and YouTube)

These point to the sibling price, payment through the school, and proof of a result. Marketing has to answer all three.
