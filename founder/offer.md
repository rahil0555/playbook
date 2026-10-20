# Edurance: the offer

Method: the Offers lens in `founder-board/lenses.md`, a summary of a published framework applied here. These are not the author's words. Inputs: `founder/panel/results.md` (v1 pitch), `founder/board.md`, `founder/numbers.json`.

## 1. The problem list (in the parent's words, from the panel and the board)

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

## 2. Solutions, scored (value to parent 1–5, cost to deliver 1–5; keep high value, low cost)

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

## 3. The stack: "Edurance Gap-to-Grade Term"

**The core (described by the outcome):** *Your child's gaps found in week 1, closed by 20 minutes of school-set practice a day, and proven by an end-of-term re-test.*

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

## 4. Value-equation scores (1–10), before and after

| element | v1 pitch | Gap-to-Grade | what moved it |
| --- | :-: | :-: | --- |
| Dream outcome | 6 | 7 | "Gaps closed and proven by a re-test" is more concrete than "personal learning path" |
| Perceived likelihood | 3 | 6 | Teacher assigns and checks it, school syllabus, re-test, guarantee |
| Time to result | 5 | 6 | One term, with weekly progress in the parent view |
| Effort and sacrifice (higher = less effort) | 4 | 6 | The school sets it as homework so the parent doesn't have to push; time limit; family price |

## 5. Re-test: same 20 parents, same seed (149644)

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

## 6. What this changes

- **Pitch:** `founder/pitch.md` is now the Gap-to-Grade pitch. v1 is kept as `founder/pitch-v1.md`.
- **To build before launch:** the parent daily time limit; syllabus-chapter mapping for one grade, one subject and one board; a re-test made of parallel items.
- **To write before launch:** the data promise and consent form (legal review), the guarantee terms, and a pilot agreement in which the school commits to teachers assigning and checking the work.
- **For the CFO:** the guarantee reserve is ₹9 per paid student-month. The Founding Families rate (₹249) applies to the first three schools only.
