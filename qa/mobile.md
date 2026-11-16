# Round 2: mobile (Akinyi, 375x812 @2x, touch, slow 3G 400 ms/400 kbps, 4x CPU)

## Verdict (in character)
Better. "Loading…" tells me to wait, and "Use my own data" works even at 3 s. Story in about 25 s again. I can tap charts for numbers, fill the budget without the keyboard closing, and Back closes Story mode. But sliding my finger across the balance chart once threw me back to Load data. I'd share Story mode now.

Load: buttons ready at 11.6 s (DCL 11.58 s), 526 KB in 11 requests; pdf.js still not requested on the Android route.

## Round-1 status
| id | status | evidence |
|---|---|---|
| M1 | PARTLY | Demo shows disabled "Loading…" until 11.6 s (01); an early tap is still dropped, not replayed. "Use my own data" at 3 s works (04). |
| M2 | FIXED | Tap shows a tip on all 7 charts (25-*); drag scrubs; tap outside hides. See N1. |
| M3 | FIXED | Back closes overlay, scroll unlocked (63). |
| M4 | FIXED | Focus stays on next field; Difference updates live (71, 72). |
| M5 | FIXED | Rent 38,742/mo; Mama Wanjiku 15k (15,094) a month. |
| M6 | FIXED | Left skips, then right → "Faith Mwende → Family support" (52). |
| M7 | FIXED | Cards, no sideways scroll (71). See N5. |
| M8 | FIXED | 2-row nav, all 7 links, 44 px (13). See N2. |
| M9 | FIXED | Help box top at 80 px (10). |
| M10 | FIXED | Hidden on Android route. |
| M11 | FIXED | 0 label collisions, 12 px cells (30-chart-cal). See N3. |
| M12 | FIXED | No clipped text (23). |
| M13 | FIXED | "0d 10d 20d 30d 40d" (30-chart-loans). |
| M14 | PARTLY | Active chip scrolls into view, sticky 52 px (28). Chips still 35 px. |
| M15 | PARTLY | Badges hidden on touch; "Not sure" gone from tally. Copy still says "use number keys"; narration off-screen at y=1222 (51). |
| M16 | PARTLY | Page no longer wobbles; 4th column cut mid-word, no scroll hint (81). |
| M17 | PARTLY | 44 px controls. Still "Close (Esc)" (60); no replay at end (62). |
| M18 | PARTLY | Checkbox fixed (20 px in 67 px label). Footer "Story mode"/"Clear my data" still 22 px tall. |
| M19 | FIXED | h1 at x=20; no focus ring. |
| M20 | PARTLY | Period line added, but see N4 (12, 20). |

## New issues
| id | sev | where | what happened | shot | fix |
|---|---|---|---|---|---|
| N1 | major | Story, Ch.1 river chart | Finger drag left-to-right from x≈80 to 300 fires popstate (browser Back). The story vanishes and I land on Load data (#start). Starts at x≥150 scrub fine. 2/2, emulated Chrome. | 27-after-river-drag | `overscroll-behavior-x: none` on html/body; `preventDefault` on horizontal touchmove inside chart hit rects. |
| N2 | minor | Sort people | Header (150 px) plus intro push the card to y≈500; 7 of 8 buttons and the narration are below the fold, so taps give no visible feedback. | 51 | Compact header or menu on mobile; pin narration as a toast. |
| N3 | minor | Ch.3 calendar | 506 px grid in a 335 px box with a hard cut at about the 20th and no scroll hint. The 21st to 31st, where the Fuliza draws cluster, are hidden by default. | 30-chart-cal | Fade edge plus "scroll →" hint, or scroll to the right end on render. |
| N4 | minor | Found vs story | Three counts: "790 of 790 messages were transactions or loan updates", "We found 730", story "716". Period start 15 Nov on Found, 17 Nov in story. | 12, 20 | One count with an explanation ("730 payments + 60 loan updates; 716 in your 12 months"). Show the first actual transaction date in the period text. |
| N5 | minor | Budget | Table starts at y=778 under three tiles. "KES 160,015 money in… 93% from your own bank accounts" counts own transfers as income beside 151,092 spending. | 70 | Put the tiles after the table on mobile; show income without own transfers, or label it "including your own transfers". |
| N6 | polish | Charts, tooltips | Tapping a gap between heatmap cells leaves the previous tooltip showing. Fees tooltip lists all four zero rows ("Fuliza fees KES 0…"). | 31-heat-tap, 28 | Hide the tip on taps that miss a mark; omit zero rows. |

## Delights
Tap-to-see numbers on every chart plus "See the numbers" tables; budget cards with live Difference; help box lands under the header; clean Back from Story mode.

## Console and network
No console or page errors. App requests: localhost:8600 only (Chrome's own accounts/android.clients.google.com background calls aside).
