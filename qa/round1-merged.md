# Launch QA, round 1: merged and ranked

Eight first-time users in real headless Chrome: Wanjiru (impatient), Otieno (privacy sceptic), Akinyi (375px, slow 3G), Nakato (MTN MoMo, Kampala), Kip (breaker), Brian (free-tier AI), Mama Njeri (first-timer, 200% zoom, keyboard only), Zawadi (video creator).
All eight reached first success. No console errors, and no app requests left the page's own origin.

Ranked by how many of the 8 hit it, then by severity.

| # | Issue | Hit by | Worst severity |
|---|---|---|---|
| 1 | Story mode not recordable or usable: no auto-play hint, white-on-white controls in portrait, type too small or squeezed, weak hook, no focus trap, Back leaves overlay open, keys leak to the page behind | 6 (impatient, creator, firsttimer, breaker, mobile, sceptic) | major |
| 2 | PDF password field shows on every route (`.field{display:grid}` beats `[hidden]`) and paste box shows on the PDF route | 6 (momo, breaker, mobile, sceptic, firsttimer, impatient) | major |
| 3 | Transaction counts and periods disagree between Found, Story and Story mode | 6 (impatient, firsttimer, mobile, creator, sceptic, freeai) | major |
| 4 | Partial months compared as if full; monthly averages divided by calendar months, not days | 5 (impatient, firsttimer, mobile, freeai, creator) | major |
| 5 | Budget: pre-filled targets create red/green noise; typing re-renders and drops focus; no clamping; table overflows on phones | 5 (impatient, firsttimer, mobile, breaker, momo) | major |
| 6 | Sort game: skip counts as sorted, "Not sure" in tally, swipe right after skip repeats skip, focus lost, number badges on phones, leftovers on done screen | 4 (impatient, firsttimer, breaker, mobile) | major |
| 7 | Mobile layout: nav and chapter chips clipped, calendar labels overlap, unit-chart labels cut, loan axis collides, Privacy table overflows | 3 (mobile, firsttimer, creator) | major |
| 8 | Outliers chapter lists routine rent and cash withdrawals | 3 (momo, impatient, firsttimer) | major |
| 9 | Picking a source scrolls past the how-to steps; sticky header hides Step 2 | 3 (impatient, firsttimer, mobile) | major |
| 10 | Accessibility: invisible focus on file input, skip link, no h1 per view, low-contrast borders and muted text, focus ring on h1 at load, charts have no data alternative | 3 (firsttimer, impatient, mobile) | major |
| 11 | Demo: no "use my own data" path from the demo story; demo not labelled inside the AI prompt; "patterns are real" overclaims | 3 (impatient, sceptic, creator) | major |
| 12 | Statement route shows Fuliza fees as 0 and loses rollovers; SMS and PDF figures differ with no explanation | 3 (freeai, firsttimer, + Python route) | major |
| 13 | **People's names leak into the AI summary** via shops list when the phone number starts 011 or is absent | 2 (sceptic, freeai) | **blocker** |
| 14 | Stale state: loading own data after demo keeps demo story; old Found box survives an error; switching source mid-read; file silently beats paste | 2 (breaker, sceptic) | major |
| 15 | Touch: tooltips need hover | 2 (mobile, firsttimer) | major |
| 16 | Jargon and Kenya-only wording ("overdraft" instead of Fuliza for Kenyans; Fuliza/M-Shwari/shilling shown to MoMo users) | 2 (firsttimer, momo) | major |
| 17 | Enter in the password field does nothing | 2 (impatient, firsttimer) | major |
| 18 | "Three small changes" shows one or two | 2 (momo, impatient) | minor |
| 19 | Plurals ("1 people", "1 messages") | 2 (momo, breaker) | polish |
| 20 | Remember stores people's names in plain text; Clear hidden after reload; Clear leaves Remember ticked; "close the tab and it's gone" contradicts Remember | 1 (sceptic) | major |
| 21 | Offline test fails for PDFs because the PDF reader loads lazily | 1 (sceptic) | major |
| 22 | MoMo parser: amount-then-currency, undated messages and short formats dropped silently; MoKash loans read as income; mixed currencies added together; negative balances; drain chapter missing for salary-only income | 1 (momo) | major |
| 23 | Scripts block interaction on slow 3G (tap before ready is lost) | 1 (mobile) | major |
| 24 | Ask your AI: advice contradicts the prompt pack; raw-SMS option adds no messages; token estimate off by 25%; partial months unflagged; ambiguous peak hour | 1 (freeai) | major |
| 25 | Python route disagrees with the app (window, fee rows, charges as Borrowing) | 1 (freeai) | major |
| 26 | Reload on a deep link silently loses data | 1 (breaker) | minor |
| 27 | Mac script: saves to Desktop (often iCloud-synced), temp copy not always cleaned, narrow code filter, older macOS date units | 1 (sceptic) | minor |
| 28 | Privacy page affiliation list incomplete; menu paths stated as fact | 1 (sceptic) | minor |
| 29 | Fees legend shows empty series; chapter numbers skip; inflow days list days with no money in; Matatu Sacco counted as savings | 1 (momo) | minor |

Found by me while checking Mark's data: **reversed payments still counted as spending** (both MultiChoice KES 800 payments on 27 Feb were reversed at 20:50).
