# Round 2: creator (Zawadi, 30, short vertical finance videos)

## Verdict
First success again in under a second: "See a demo story" put Amani on screen in 0.2s. Record mode is the feature I asked for and it mostly works. You press it, the buttons vanish, it counts 3-2-1 and plays all 10 slides once (42s of slides, dwell 3.6 to 6.2s each), then stops. The hook is now "40 days of 363 ended owing Fuliza", which is a real opener. If I screen-record on my phone (360x640 at 3x, so 1080x1920 pixels), the type fills the frame well and I would post it. Two things still bother me. In a 1080x1920 browser window, the text is capped at 96/40/22px, and on a 1920x1080 desktop it sits in a 300px column. Also, closing during the countdown leaves a hidden auto-play running.

## Round-1 status
| id | status | evidence |
|---|---|---|
| C1 | NOT FIXED (worse) | Desktop text column is 300px inside a 608px frame (was 339px). The text starts at x=154, the footer at x=43 and the badge ends at x=583. The frame padding `8cqh 8cqw` sits on the element that is itself the size container, so it resolves against the viewport. 15-desk-slide09.png |
| C2 | PARTLY | Phone at 3x: the hero is 13% of the width and the detail line 3.9%. Fine. In a 1080x1920 window it is still 96/40/22px (hero 8.9%, detail 2%). 02-v1080-slide01.png |
| C3 | FIXED | Dark pills that you can see, a Record mode button with a 3-2-1 countdown, and H toggles the chrome. 03-v1080-controls.png, 04-rec-countdown3.png |
| C4 | FIXED | Slide 1 is "40 days / of 363 ended owing Fuliza." |
| C5 | FIXED | The slides no longer show a count. The page says 716 transactions. |
| C6 | PARTLY | An amber "Demo · invented data" pill now sits top-right on every slide, at full contrast. It is 16px, which is 1.5% of the frame width in a 1080 window (3% on the phone). |
| C7 | FIXED | The slides say "her balance". |
| C8 | FIXED | "7 a week / café and restaurant visits / KES 31,982 a month." |
| C9 | FIXED | "KES 11 / paid for every 100 borrowed." |
| C10 | FIXED | The Net line has been added (see N5). |
| C11 | FIXED | "Repay by day 10" |
| C12 | FIXED | A 34px URL pill and "Free, open source, and your data stays on your phone." |
| C13 | PARTLY | A manual step now resets the timer (next slide came 3.62s later). Auto-play from the last slide restarts at slide 1. There is still no transition between slides. |
| C14 | FIXED | Each slide's dwell depends on its word count (5.6, 3.6, 5.1, 5.6, 4.9, 4.1, 4.9, 4.3, 4.4, 4.7s). |
| C15 | NOT FIXED | The phone still shows "Close (Esc)". 11-phone-slide1-controls.png |
| C16 | FIXED | The nav wraps on the phone. The scroll-spy is correct (shape, drain and month each highlight on arrival). 16-phone-scrollspy.png |
| C17 | PARTLY | "money coming in of KES 148,250" and "For each payment in of KES 148,250" still read "in of". The month comparison now uses full months only. |

## New issues
| id | sev | where | what happened | screenshot | suggested fix |
|---|---|---|---|---|---|
| N1 | major | Record mode countdown, then Esc or Close | The countdown `setInterval` is not cleared on close, so `play()` fires on the hidden overlay. When you reopen Story mode, the button says "Pause" and it moves to slide 2 by itself within 5s. That ruins the next take. | 06-reopen-after-esc-during-countdown.png | Store the interval id on SM. Clear it, and the timer, in closeStoryMode and openStoryMode. |
| N2 | minor | End of Record mode | The controls come back 1.5s after the last slide, on top of the frame (bottom-right on a 1080 window, the full width of the bottom on the phone). The tail of any recording shows the buttons unless you stop it within 1.5s. | 05-rec-end-controls-return.png | Hold the last frame. Keep the chrome hidden until a tap or H, or show an "End" card. |
| N3 | minor | Story mode controls | Even outside Record, the pills cover the footer URL (1080 window) and the bottom strip of the frame (phone). | 02-v1080-slide10.png, 11-phone-slide1-controls.png | Place the controls outside the frame when there is room, or auto-hide them after 2s. |
| N4 | minor | Record mode on touch | The only explanation is a `title` tooltip ("counts down… Press H"), which never shows on a phone. There is no H key on a phone either, so there is no way to bring the controls back mid-take apart from waiting. | 11-phone-slide1-controls.png | Show a one-line hint under the button before the countdown. Make a long-press bring back the chrome. |
| N5 | minor | Slide 2 "Money in" | "1.9m / KES came in. 1.8m went out. Net: +70k." With the rounding, 1.9 minus 1.8 looks like 100k. The hero has no currency, and "KES came in" reads oddly. | 02-v1080-slide02.png | Hero "KES 1.91m". Line "came in; KES 1.84m went out." |
| N6 | minor | Slide 4 chart | The bars have no day labels, and the 25th and 26th are not marked. The chart fills about 490 of 907px at 1080. Viewers cannot link it to "The 25th". | 02-v1080-slide04.png | Label days 1, 15 and 31. Highlight the lowest day and the payday. |
| N7 | minor | After Record ends | Focus drops to BODY because the Record button was hidden while focused. | n/a (scripted) | Return focus to smRec or smPlay when the chrome comes back. |
| N8 | polish | Slide 8 | "13k" while the page says KES 12,624. | 02-v1080-slide08.png | "KES 12.6k". |
| N9 | polish | Slide 10 | The URL appears twice (pill and footer). | 02-v1080-slide10.png | Hide the footer URL on the CTA slide. |
| N10 | polish | Record mode, desktop | The tap zones keep `cursor: pointer` over 70% of the frame, so the cursor shows in desktop screen recordings. | n/a | Set `.sm.rec { cursor: none }`. |

## Delights
- Record mode is one press with a clean 3-2-1. It plays once, the progress bar fills, and a tap during the countdown is ignored. Very creator-friendly.
- The dwell per slide feels natural and the total of about 42s suits a Reel.
- The demo pill on every slide makes it honest to post.
- Recording on a phone at 1080x1920 looks good.

## Console and network
No console errors or page errors. All requests went to localhost:8600 only.
