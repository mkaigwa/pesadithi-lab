# Round 2: freeai (Brian, 22, ChatGPT free + Gemini free, 1280x800)

## Verdict
Big improvement. Demo to a copied prompt takes under 10 seconds, and my PDF takes about 30. Free now always means under 300 words. The token count is honest (6,121 chars = 1,530 tokens) and adds "plus your PDF / messages". Partial months are flagged, and the raw-messages route has a paste slot. I'd share the summary route now. The PDF route still undercounts what Fuliza and loans cost me. It also mangles one shop name in the story. The Python route still doesn't produce the same summary as the web app.

## Round-1 status

| id | status | evidence |
|---|---|---|
| F1 | PARTLY | PDF `overdraft.fees_estimated` is now 444, with "estimated at 1% of amount drawn" (was 0). Two gaps remain. Loan `rollover` is still 0 for the April loan (SMS: 1,260), with no note in the JSON. The story says "an estimated KES 0 in daily charges" (SMS estimate: 253) (13) |
| F2 | FIXED | Prompt ends `MY MONEY MESSAGES:\n[Paste them here]`. Advice: "one month at most. Never paste bank codes or chats" (07). No 8k-15k size hint |
| F3 | FIXED (c PARTLY) | Free + A lot: "under 300 words". Paid + Some + PDF: "at most 3 months", 600 words. Another + paid still says "fits comfortably in a free plan" |
| F4 | FIXED | `partial_month: true, days_covered: 14` on 2025-11 and 2026-11, plus a rule in the prompt |
| F5 | FIXED | Size = chars/4 in all 13 cases, "+ your PDF/messages" |
| F6 | PARTLY | Double payment now has a date and amount (2026-03-08, 2,100). People category 236,650 ≠ `people.total` 248,950 (88 vs 102 sends). Spike days are still all the 2nd (rent) |
| F7 | NOT FIXED | Fees: SMS 12,624 vs PDF 17,908. Avoidable: 1,890 vs 1,008. Neither route explains the gap |
| F8 | NOT FIXED | Free PDF advice says "attach at most 1 month". The prompt says "The summary below covers the same period", but the summary covers 363 days (06) |
| F9 | FIXED | `"peak_spend_hour": "10:00-10:59"` |
| F10 | FIXED | "About 1,530 tokens · Copied. Paste it into your assistant." (04b) |
| F11 | NOT FIXED | Still "(never people)" (05) |
| C1 | PARTLY | Period (17 Nov, 363 days), out, overdraft days and draws now match. Still different: low day 24 vs 25. Fees 12,371 vs 12,624. Loan days 12/32/5/11 vs 13/33/6/12. `access_fees` 444 vs `fees_estimated` 697 |
| C2 | PARTLY | Access-fee rows are now "Fees and charges", but every amount is 0.0, so `access_fees: 0`. PDF fees total 11,927 (web 17,908). Names are still truncated ("CJS RESTAURANT KOINANG") |
| C3 | NOT FIXED | Still has no people, outliers, possible_double_payments, weekend_share or partial_month. Keys are still start/end and access_fees, and `peak_spend_hour: 10`. The docstring still says "same shape". The Route C prompt asks for double payments that summary.json can't supply |
| B1 | FIXED | The rules are now inline. The password goes "in a separate message" or never leaves the device (local run) |
| B2 | PARTLY | Route B's "suggest the Pesadithi summary" still has no link in the copy box |

## New issues

| id | sev | where | what happened | shot | fix |
|---|---|---|---|---|---|
| N1 | major | Story > Stand-outs, PDF | Page header bleeds into a payee: "Chandarana Food Plus Y Aya M-Pesa Statement (Demo,". This splits one shop into two. The pieces become fake "unusual payments" (6,350, 5,600) and the AI summary drops Chandarana to 75,350/11 (SMS: 87,300/13) | 12 | Strip page headers and footers before joining wrapped lines |
| N2 | minor | Story > Borrowing, PDF | "plus an estimated KES 0 in daily charges". An "estimate" of 0 contradicts itself, and the SMS route estimates 253 | 13 | Estimate daily charges from days owing, or say "not shown" |
| N3 | minor | Summary loans, PDF | Principals 11,820/13,790 vs SMS 12,000/14,000 (net of fee?). Missed cashback 216/504 vs 180/210 | n/a | Use the disbursed principal, or label it as net |
| N4 | minor | Found vs Story, PDF | Found: "Your story will cover 15 Nov 2025". Story and summary: 17 Nov 2025 | 08, 09 | Same start date |
| N5 | minor | tools/python, `--outdir x` | Raises a FileNotFoundError traceback if the folder doesn't exist | n/a | `os.makedirs(outdir, exist_ok=True)` |
| N6 | minor | Route C, `--months 3` | Starts 2026-08-15. August (out 66,860) and November are unflagged partial months | n/a | Add partial_month |
| N7 | polish | Summary category | School fees (St Teresa Girls Secondary, 32,400) are "Other" on the web but "Education" in Python | 12 | Share the category rules |

## Delights
- Every free answer is capped at 300 words. Advice changes live with each choice and names the assistant's data settings.
- The demo prompt says up front that it's invented data.
- Clipboard matched the box in all 10 combinations.
- Python and web now agree on period, money in and out, and overdraft days.

## Console and network
No console or page errors. No requests to hosts other than localhost (both pages, 13 combinations).
