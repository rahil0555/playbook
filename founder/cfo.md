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
| **Contribution** (what each paid student-month leaves to pay the fixed costs) | **₹157.24** (53%) |

## The margin that matters

Fixed costs: ₹15,960 a month (Founder pay (4 founders, unpaid by founder decision) ₹0, Supabase Pro (₹25, ESTIMATE ₹88/USD) ₹2,200, Vercel Pro, 1 seat (₹20, ESTIMATE) ₹1,760, Domain, email, misc. software (ESTIMATE) ₹1,000, Travel to schools across 4 zones (ESTIMATE) ₹8,000, Printed gap reports and pilot materials (ESTIMATE) ₹2,000, Phone and data (ESTIMATE) ₹1,000).

- **Break-even: 102 paid student-months a month.** Below that you lose money every month.
- **Profit margin at your plan** (144 a month): **16%** of every sale, after every cost.

## Year 1, month by month

| month | paid student-months a month | revenue | profit | cumulative (after ₹85,240 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | ₹0 | -₹15,960 | -₹101,200 |
| 2 | 0 | ₹0 | -₹15,960 | -₹117,160 |
| 3 | 36 | ₹10,764 | -₹10,299 | -₹127,459 |
| 4 | 48 | ₹14,352 | -₹8,412 | -₹135,872 |
| 5 | 60 | ₹17,940 | -₹6,526 | -₹142,397 |
| 6 | 72 | ₹21,528 | -₹4,639 | -₹147,036 |
| 7 | 84 | ₹25,116 | -₹2,752 | -₹149,788 |
| 8 | 96 | ₹28,704 | -₹865 | -₹150,653 |
| 9 | 108 | ₹32,292 | ₹1,022 | -₹149,631 |
| 10 | 120 | ₹35,880 | ₹2,909 | -₹146,722 |
| 11 | 132 | ₹39,468 | ₹4,796 | -₹141,927 |
| 12 | 144 | ₹43,056 | ₹6,683 | -₹135,244 |

- **Year 1 operating profit: -₹50,004** on ₹269,100 of revenue.
- After the ₹85,240 startup spend: -₹135,244.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **₹150,653**.

## What if

| scenario | margin at plan | break-even a month | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 16% | 102 | -₹50,004 |
| Price -10% | 6% | 126 | -₹76,914 |
| Volume -20% | 6% | 102 | -₹78,307 |
| Unit costs +15% | 8% | 118 | -₹69,142 |

## Red flags

- Year 1 loses money on operations (-₹50,004).
- The startup spend is not earned back within year 1.
