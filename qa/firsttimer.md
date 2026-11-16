# Round 2: firsttimer (Mama Njeri, 58, Nyeri; 200% zoom; keyboard pass)

Fresh context, 640x400 CSS at scale 2 (a 1280x800 laptop at 200%). Statement route, demo PDF, password 123456. I ran axe-core on all 9 views. Screenshots are in round2/firsttimer/.

## Verdict (in character)
"This time the page showed me how to get the statement before anything else. It told me plainly that the code is not my M-PESA PIN, and pressing Enter worked. The story says Fuliza now, not overdraft. My rent and Mama Wanjiku look right in the sort game. Two things still worry me. A shop name has 'M-Pesa Statement (Demo' stuck on the end. And it says my Fuliza daily charges were KES 0. The first page also says 730 transactions from 15 Nov, but the story says 716 from 17 Nov. I would show my daughter, but not my chama yet." Scripted first success took 10.7 s (was 16 s). Keyboard use is now workable from start to finish.

## Round-1 status
| id | status | evidence |
|---|---|---|
| F1 | FIXED | The how-to sits at the top after the card click (helpTop 80, header no longer sticky). 04 |
| F2 | FIXED | "This is not your M-PESA PIN…" 06 |
| F3 | PARTLY | Access fee is now estimated (KES 444), but the text says "plus an estimated KES 0 in daily charges, which statements don't show", even with 40 days owing. 10-ch-credit |
| F4 | PARTLY | Story mode no longer shows 975. Found says 730 txns and "story will cover 15 Nov 2025". The story says 716 txns and "17 NOV 2025 TO 14 NOV 2026". 07, 08 |
| F5 | PARTLY | Sort card is right ("15k a month"). Budget rent shows KES 38,742, but she pays 38,500 (462,000 ÷ 12). 13 |
| F6 | FIXED | "Between December 2025 and October 2026 … (Full months only.)" |
| F7 | FIXED | Retitled "Unusual payments". Rent is excluded. A new data bug appears here (N1) |
| F8 | FIXED | Every chart has a "See the numbers" details box with a captioned table. 20 |
| F9 | FIXED | Focus on the 1px input draws a ring on .drop. 18 |
| F10 | FIXED | After a pick, focus goes to #pcard and the next Tab reaches category 1 (see N4). 22 |
| F11 | PARTLY | Focus is trapped (Tab cycles inside #sm), Space on Close closes, #smLive announces "Slide 4 of 10…", and arrows no longer scroll the page. Closing by Space, Enter or click leaves focus on BODY. Only Esc restores it |
| F12 | PARTLY | "overdraft" 0 times, "Fuliza" 13 times. Still unexplained: "top-ups", "9:16", "screen-record", "tokens", "1.91m", "93% … from your own bank accounts" |
| F13 | FIXED | Enter in the password box reads the file ("Done. Choose a period…") |
| F14 | FIXED | The paste box is hidden on the PDF route |
| F15 | FIXED | Step 4: "Open that email on this device and save the PDF…" |
| F16 | PARTLY | The header wraps and is static, and all nav links are in view. The chapter chips are still one nowrap row (1025px in 640px), so "Borrowing" onwards sits off-screen with no cue. 19 |
| F17 | FIXED | Hero h1 left edge is at 20px |
| F18 | FIXED | Skip link is 146x46 and visible on focus. 02 |
| F19 | FIXED | Every view has one h1 |
| F20 | PARTLY | --faint is #6e6e78 (5.04:1) and choice borders are #9a9aa6. The password input border is still #c9c9d3 (1.64:1) and the drop border #c6c6d0 |
| F21 | NOT FIXED | Auto-play, Record and Close still overlap the frame. Footer text collides ("Pesadithigith lab"). 17 |
| F22 | FIXED | Targets start as "–", so no red noise |
| F23 | FIXED | All 12 choices start with aria-pressed="false" |
| F24 | PARTLY | The card uses aria-labelledby. Backspace undo still isn't mentioned in the help text |
| F25 | FIXED | Nothing is focused or ringed at load |

## New issues
| id | sev | where | what happened | shot | fix |
|---|---|---|---|---|---|
| N1 | major | Story ch.8 Unusual payments | The PDF page footer leaks into payee names: "Chandarana Food Plus Y Aya M-Pesa Statement (Demo," (twice). The broken name then looks like a new "place paid once or twice", so normal grocery runs get flagged | 10-ch-outliers | Strip the statement header and footer lines in the PDF parser. Normalise payee names before grouping |
| N2 | minor | Story ch.6 loan table vs ch.7/ch.9 | Penalty is 0 for every loan, yet Try 1 says "timing cost KES 1,008 in late penalties and missed early-repayment refunds". All of it is missed cashback | 20 | Word it from the data ("missed early-repayment refunds") |
| N3 | minor | Story mode close | After Esc, focus goes back to "Story mode (vertical)", but that button is off-screen (top 1706) and the page doesn't scroll to it | – | Restore scroll position, or call focus() without preventScroll |
| N4 | polish | Sort after pick | Focus lands on #pcard with its top at −54px, so "Person 2 of 7" is hidden at 200% | 22 | scrollIntoView({block:'start'}) on the card |
| N5 | minor | Load data | axe heading-order: h3 inside the source buttons follows the h1 directly (also aside h3 in Sort) | – | Use h2, or a styled span |
| N6 | polish | Story mode last slide | "your data stays on your phone". She is on a laptop | 21 | Say "on your device" |
| N7 | polish | Story ch.8 | School fees "St Teresa Girls Secondary" are filed under "Other" | – | Add a School fees category or match rule |

## Delights
- The password step is now gentle and clear: not your PIN, Enter works, kind errors.
- Every chart has a "See the numbers" table, which is a big win for low vision.
- "Fuliza" everywhere, and the sort card shows real monthly amounts.
- The story mode live region and focus trap now work.

## Console and network
No console errors, warnings or page errors. No requests to any host other than localhost.
