# Round 2: momo (Nakato, 33, Kampala, MTN MoMo)

## Verdict (in character)
This is much better. I picked "MTN MoMo or Airtel Money", uploaded my file and saw my story in under a minute. The Safaricom password box has gone. "How long money lasts" now appears, and it appears even when all my income is salary. The fees legend shows only what I paid. Chapters run 1 to 8, and the AI prompt talks about MoMo, not Fuliza. My MoKash loan now has its own Borrowing chapter. Messages in other currencies are listed rather than lost. Two things still bother me. The home page still promises "the date you lean on Fuliza most" and tells me to use the M-PESA statement. And my MoKash loan is judged by M-Shwari's rules, so I am told I "missed" a 20% cashback MoKash never offered. I would now share it, with a smaller caveat.

## Round-1 issues: status

| id | status | evidence |
|---|---|---|
| M1 | FIXED | pwField hidden on the MoMo route (`offsetParent===null`), 04-uploaded.png |
| M2 | FIXED | Salary-only paste (4 × UGX 950,000): Ch2 "Half of a big payment is spent within 33.6 days", 28-salary-only-story.png |
| M3 | FIXED (see N3/N4) | "4 of 6 messages were transactions". The Ghana undated message and the RWF message are listed. The short "SENT. TID … UGX 30,000 to KATO MOSES" now parses. 24-custom-skipped-open.png |
| M4 | FIXED (see N1) | Ledger: `loan_in, Mobile loan, 150000, fee 13500` and `loan_repay 163500`. Borrowing chapter shows "1 loan … costing UGX 13,500". |
| M5 | PARTLY | GHS no longer summed: "We found more than one currency; this story uses UGX only". The app picks the majority currency without asking (N5). 27-mixed-skipped-open.png |
| M6 | FIXED | Demo has no negative balances. All 70 ledger rows have a balance. |
| M7 | FIXED | Prompt: "understands mobile money in Africa (MTN MoMo, mobile loans and agent fees)". No overdraft point. |
| M8 | FIXED | The fees legend shows only "Transaction costs" (07-story-full.png). |
| M9 | FIXED | Chapters are numbered 1 to 8 without gaps. |
| M10 | FIXED | "Two small changes the data points to" with 2 items. The custom run shows "One small change". |
| M11 | PARTLY | Cash withdrawals are gone, but the Outliers chapter lists NWSC Water (UGX 46,000 and 8,500) right under "Regular bills … are left out". |
| M12 | PARTLY | MATATU SACCO is now "Transport & fuel". There is still no Uganda/UGX Airtel sample (demo-airtel-money.txt is Ksh only). |
| M13 | NOT FIXED | The home page still says "the date you lean on Fuliza most". The start page still says "Not sure? Use the M-PESA statement: it works on any phone." 01-landing.png, 02-start.png |
| M14 | FIXED | Calendar rows read "Sep 2026 / Oct 2026". |
| M15 | FIXED | Ch1 ticks read "6 Sep, 13 Sep, 20 Sep…". |
| M16 | FIXED | "1 person received UGX 808,000 across 39 sends". |
| M17 | FIXED | The heading is "Give your money a job". Targets start blank. |
| M18 | FIXED | "The biggest payments in land around the 25th, 26th, 5th". All three days have inflows. |

## New issues

| id | sev | where | what happened | screenshot | suggested fix |
|---|---|---|---|---|---|
| N1 | major | Story > The price + What to try, MoKash loan | The MoKash loan is scored with M-Shwari rules. The avoidable line reads "Early-repayment cashback missed … refunds 20% of the facility fee", UGX 2,700. The TRY says "timing cost UGX 2,700 in late penalties and missed early-repayment refunds". The bars use 10-day and 30-day due markers. The AI JSON carries `avoidable: 2700`. | 24-custom-story.png | Apply cashback, due-date and penalty rules per lender. For MoKash, Airtel and unknown lenders, show the cost only and avoidable = 0. |
| N2 | minor | Ch1 ticks + Ch2 calendar dots when money-in is zero | "Ticks … mark money coming in of UGX 0 or more". Every day gets a tick at the top and a black "big payment" dot in the calendar, including days outside the period. | 24-custom-story.png | When there are no inflows, set bigCut to Infinity and hide the tick and dot legend. Skip out-of-range days. |
| N3 | minor | Found box + Overview | The title says "We found 2 MTN MoMo transactions" while the text says "4 of 6 messages were transactions or loan updates". The overview says "what 2 transactions say", but the ledger CSV has 4 rows. | 24-custom-found.png | Use one count. For example: "4 transactions (including 2 loan updates)". |
| N4 | minor | Found > "Messages we couldn't read" | The RWF message was read but excluded, yet it sits under "couldn't read". The Ghana message has no reason shown (it has no date). | 24-custom-skipped-open.png | Split the list into "Not read (no date)" and "Other currency, left out". Show the reason on every line. |
| N5 | minor | Mixed currency | The app picks the majority currency silently. A Ghanaian with a few UGX texts would lose most of their own data. | 27-mixed-skipped-open.png | Ask "Which currency is your story in?" with counts per currency. |
| N6 | polish | Story mode slide 2 vs Overview | Story mode shows "2.6m UGX came in. 1.8m went out" but the page says 2.65m / 1.85m, and 48.5k becomes "49k". The rounding is inconsistent (truncate vs round). | 13-sm-01.png | Use one compact formatter, or show 2.65m. |
| N7 | polish | Ch1 note, salary-only | "money in per month moved from UGX 950,000 to UGX 950,000, and money out from UGX 385,000 to UGX 385,000". | 28-salary-only-story.png | When values are equal, say "stayed at". |
| N8 | polish | Ch3 / Ch4 zero states | "café and restaurant payments, about 0 a week". "Money moved to your own banks, cards and savings (UGX 0) is left out". | 24-custom-story.png | Hide zero-value tiles and clauses. |

## Delights
- UGX stays consistent across the page, budget, CSV, AI JSON and story mode.
- Loans are read from MoKash keywords and labelled "Mobile loan" with no lender name leak.
- The honest "4 of 6" count and the currency warning build trust.
- Airtel sends to Matatu Sacco are now counted as transport.

## Console and network
No console errors, warnings or page errors in 7 contexts. No request to any host other than localhost.
