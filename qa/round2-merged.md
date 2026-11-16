# Launch QA, round 2: proof of fixes, then a third pass

The same eight first-time testers re-ran their round-1 journeys from scratch in real headless Chrome, against the build with the round 1 fixes. Each one marked every round-1 issue as fixed, partly fixed or not fixed, with evidence. Then they logged anything new.

## Round 1 issues: where they stood in round 2

| Tester | Fixed | Partly | Not fixed |
|---|---|---|---|
| Wanjiru (impatient) | 15 | 1 | 2 |
| Otieno (privacy sceptic) | 11 | 3 | 2 |
| Akinyi (375px, slow 3G) | 12 | 8 | 0 |
| Nakato (MTN MoMo, Kampala) | 13 | 4 | 1 |
| Kip (breaker) | 10 | 3 | 1 |
| Brian (free-tier AI) | 7 | 6 | 4 |
| Mama Njeri (200% zoom, keyboard) | 15 | 9 | 1 |
| Zawadi (video creator) | 11 | 4 | 2 |
| **Total (145)** | **94 (65%)** | **38 (26%)** | **13 (9%)** |

No regressions. All eight reached first success again: scripted first success fell from 16s to 10.7s at 200% zoom. There were no console errors, and the app made no requests to any host other than its own.

## New in round 2, ranked by how many testers hit it, all fixed in the third pass

| # | Issue | Hit by | Fix |
|---|---|---|---|
| 1 | PDF page header leaked into a payee name ("…M-Pesa Statement (Demo,"), which split one shop in two and created fake "unusual payments" | 4 | Headers and footers are cut from wrapped detail lines |
| 2 | Found screen and story disagreed on the start date and count | 4 | Period text uses the first real transaction in the period |
| 3 | "An estimated KES 0 in daily charges" on statements | 3 | Says statements don't show daily charges, so the real cost is higher |
| 4 | Story mode: Record countdown kept running after Close; controls covered the footer; the frame padding shrank the text on desktop; type was capped too small at 1080x1920; "Close (Esc)" showed on phones; focus was lost after closing | 3 | Countdown cleared, controls fade while playing, the last frame holds after Record until a tap or H, % padding with larger caps, focus restored and scrolled into view |
| 5 | **Privacy:** a person paid at a till could be named when their name began with a shop keyword (LABAN matched "lab") | 1 | Keywords must start a word, and short ones must be whole words. Tested on Mark's 235 payees: one change, PARENTEEN no longer counts as rent |
| 6 | **Privacy:** Remember codes were unsalted, so a list of common names could reverse them | 1 | A random salt per browser. DISCLOSURE wording corrected |
| 7 | PDF route failed offline (the worker loaded late) | 1 | The worker starts when the PDF route is chosen. Verified offline |
| 8 | MoKash judged by M-Shwari's 20% cashback rule, inventing "avoidable" money | 1 | Cashback applies to M-Shwari only |
| 9 | Budget target "1,500.50" read as 150050 | 1 | Accepts 1,500, KES 1500, 1500.50 and 15k; anything else gets an inline hint |
| 10 | Left-edge drag on a chart triggered browser Back | 1 | `overscroll-behavior-x: none` |
| 11 | Heading order, 22px footer links, 35px chips, number-key copy on phones, long category names overflowing, Escape not closing the add-category form, tooltips stuck on a missed tap, zero rows in tooltips, three names for Story mode, "data stays on your phone" on a laptop, "moved from 950,000 to 950,000", zero-value tiles, school fees under Other, Mac export file readable by other users, `unsafe-inline` in the CSP, a chapter-link reload landing silently on Home | 1 each | All fixed |

## Known and left open (honest list)

- Statement and SMS fee totals still differ for the same months, because each source records different fees. The story now says so; it doesn't reconcile them.
- The Python port matches the app on the period, money in and out, and credit days, but not on every fee line or on outliers and double payments.
- On a phone, a tap made before the scripts finish loading on slow 3G is dropped. The button shows "Loading…" until the scripts are ready.
- When there are mixed currencies, the app picks the most common one and lists the others. It doesn't ask you.
