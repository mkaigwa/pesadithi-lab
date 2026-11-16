# Round 2: impatient (Wanjiru, 29, sales, 1366x768)

## Verdict (in character)
Much better. From the demo I hit "Now try it with my own data" straight away, picked the PDF, typed 123456, pressed Enter and it worked. Focus then landed on "Tell me my story", so Enter again and I had my story. The script took 8.1s end to end; for a person that is about a minute. The sort game is still the best part and the budget no longer shouts at me in red. The tall story still sits on the cover until I find Auto-play, so I would screen-record the sort game, not story mode. One shop name now has "M-Pesa Statement (Demo," glued onto it, which made me trust the page less.

## Round-1 status
| id | status | evidence |
|---|---|---|
| I1 demo has no own-data CTA | FIXED | "Now try it with my own data" under the summary cards, "Try it with my data" at the end, and the header badge "Demo data · use mine" links to #start (02-demo-fold.png) |
| I2 story mode stuck on cover | NOT FIXED | Cover unchanged after 10s, no hint, Auto-play off, progress bar static (11-storymode-t3.png) |
| I3 cover 975 vs story 761 | FIXED | The cover now says "40 days of 363", which matches the story. The story says 716 transactions and the slide figures (1.9m, 1.8m, 18k) agree with it (10-storymode-open.png) |
| I4 Enter in password does nothing | FIXED | Enter submits in 331ms, and the hint says "Press Enter to read" (07-after-enter.png) |
| I5 no prompt after file chosen; wording | FIXED | "Now type the password from the M-PESA SMS, then press 'Read my data'." The placeholder reads "The code Safaricom sent you by SMS" (05-after-file.png) |
| I6 paste box on PDF route | FIXED | The paste textarea is hidden on the PDF route (04-pdf-step2-settled.png) |
| I7 Step 2 under sticky header | FIXED | The Step 2 label sits at y=334 against a header bottom of 61, and the "Get your statement" help is visible above it (04-pdf-step2-settled.png) |
| I8 Tell me my story below fold | FIXED | It settles at y=533 by +300ms and focus is on #btnStory, so Enter continues (08-step3.png) |
| I9 partial-month compare | FIXED | "Between December 2025 and October 2026 … (Full months only.)" |
| I10 rent listed as outlier | FIXED | "Regular bills, rent and cash withdrawals are left out." No rent appears in the list |
| I11 "Three" with 1–2 tries | FIXED | Own data shows "Two small changes" with 2 tries; the demo shows "Three" with 3 |
| I12 sort done leftovers / two CTAs | FIXED | One "Build my budget" button; no toast, Undo or Skip (14-sort-done.png) |
| I13 sort card labels / fold / badge wrap | PARTLY | "15k a month" now matches "Usually KES 15,000". Undo/Skip are still at y=898, below the 768 fold, and the "1" badge on "Household and home help" still wraps (12-sort-open.png) |
| I14 Build my budget too prominent | FIXED | Ghost style until the first person is sorted (class `btn small ghost` → `btn small`) |
| I15 budget "own banks" + red noise | FIXED | "93% of it moved in from your own bank accounts". Difference shows "–" until a target is set; typing keeps focus (15-budget.png, 18-budget-target.png) |
| I16 h1 focus ring on load | FIXED | activeElement is BODY on load, and the h1 has outline: none (01-landing-fold.png) |
| I17 load cards misaligned | NOT FIXED | Card titles at y=356/347/367/382 (03-load-from-badge.png) |
| I18 Demo badge on Load page | FIXED | The badge is hidden on #start |

## New issues
| id | severity | where | what happened | screenshot | suggested fix |
|---|---|---|---|---|---|
| N1 | major | Story ch.8 "Unusual payments", PDF route | The payee shows as "Chandarana Food Plus Y Aya M-Pesa Statement (Demo," (twice: 6 Jun, KES 6,350; 24 Oct, KES 5,600). PDF page header text has bled into the name across a page break. | 19-outliers-payee-name.png | Strip the repeating page header and footer lines before joining wrapped detail cells. Add a test for a row split across pages. |
| N2 | minor | Step 3 vs Story header | Step 3 says "We found 730… Your story will cover 15 Nov 2025 to 14 Nov 2026". The story then says "17 NOV 2025 TO 14 NOV 2026" and "716 transactions", with nothing explaining the gap. | 08-step3.png, 09-my-story-fold.png | Show the in-period count on Step 3 ("716 in this period"), and use the same start date (the first transaction or the period start) in both places. |
| N3 | polish | Story buttons | One feature has three names: "Watch as a tall story", "Story mode" (end card) and "Story mode (vertical)" (footer). | 09-my-story-fold.png | Pick one label. |
| N4 | polish | Story ch.8 | Three of the six "unusual" payments are an identical KES 4,200 at restaurants, which reads like a pattern, not stand-outs. "St Teresa Girls Secondary" (KES 32,400) is labelled "Other". | 09b-my-story-full.png | Drop amounts that recur across similar merchants. Add a school fees or education category. |
| N5 | minor | Story ch.6 "The price" | "plus an estimated KES 0 in daily charges, which statements don't show": an estimate of zero for something it says it cannot see. | 09b-my-story-full.png | Say "daily charges are not on statements, so they are not counted". |

## Delights
- Demo to own data is now one obvious click. The Enter → Enter flow from password to story feels fast.
- Inline password prompts are clear and land in the right place.
- The sort game "All sorted" state is clean, with one CTA.
- The budget is calm: no fake differences, and focus holds while typing.
- Story mode closes on browser Back.

## Console and network
- Console errors or page errors: none.
- Page network requests: localhost:8600 only.
