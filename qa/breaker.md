# Breaker (Kip, 27, QA) - round 2

## Verdict
First success in about 3 s after choosing the PDF (123456, Enter). The state bugs are gone: no stale Found box or demo story, mid-read source switches are handled, Story mode no longer leaks keys, focus is trapped and restored, and Clear really clears. XSS still renders as text. What's left is input hygiene: the budget box turns decimals into numbers 100 times too big without a word, and long categories overflow. I'd share it once N1 is fixed. Note: app.js, parse.js and index.html changed at 15:17 UTC mid-test; all results are from the build served after 15:18.

## Round-1 status
| id | status | evidence |
|---|---|---|
| B1 | FIXED | Story mode over Sort, ArrowRight x4, "2" x3, Backspace: still "1 of 7 people sorted" (11-sort-after-storymode) |
| B2 | FIXED | Own data loaded, story not built: data nav, badge and Story mode hidden; #story redirects to #start (16-story-hash-before-tell) |
| B3 | FIXED | Good PDF then invoice.pdf: Found box hidden, error shown (04-after-invoice-error) |
| B4 | FIXED | Switch to Android mid-PDF-read: status cleared, Found hidden; next Read uses the XML (08-switch-midload) |
| B5 | FIXED | Password field hidden off the PDF route; paste box hidden on it (05-pdf-route-fields) |
| B6 | FIXED | Latest input wins both ways; "Remove" link added (07-file-plus-paste) |
| B7 | FIXED | Skip doesn't count; skipped person returns last; no "Not sure" in tally (14-sort-end) |
| B8 | PARTLY | Data views now land on #start with a notice (19-reload-budget-notice). Chapter hashes (#price, #money-clock) still silently show Home and keep the hash |
| B9 | PARTLY | No float noise or overflow; caps at 1bn, but silently, and see N1 (15-budget-big) |
| B10 | PARTLY | Empty and duplicate names get inline messages. A 40-char unbroken name still overflows its button and the tally (424 px in 338 px) (13-tally-longcat) |
| B11 | FIXED | Tab/Shift+Tab stay in the dialog; Escape returns focus to the opener |
| B12 | FIXED | Loader, source, file name and nav all reset (18-start-after-clear) |
| B13 | FIXED | "We looked at 2 blocks of text, but none looked like mobile money transactions" |
| B14 | FIXED | From the 3rd wrong password: "Still stuck? Each new request makes a new PDF and a new code…" (02-wrongpw-x5) |
| B15 | NOT FIXED | Badge still drops 17 px under "Household and home help" and "Savings group or chama". 10th category has no key, and no note says only 1 to 9 work (20-sort-10cats) |

## New issues
| id | sev | where | what happened | screenshot | suggested fix |
|---|---|---|---|---|---|
| N1 | major | Budget, Target input | Non-digits are stripped silently: "1,500.50" becomes 150050 (100x), "2.5k" becomes 25, "1e12" becomes 112, "0.5" shows "05", "-500" becomes 500 | 21-budget-decimal | Parse as a number (drop commas/"KES", round decimals); otherwise show an inline hint; say when clamping |
| N2 | minor | Sort, Add a category form | Escape does not close the form; only Cancel does | 20-sort-10cats | Close the form on Escape and return focus to "Add a category" |
| N3 | minor | Load data, file + paste | When the paste wins, the chip still says "Chosen: demo-mpesa-statement.pdf" with no hint it was ignored | 07-file-plus-paste | Say in the status which input was read |
| N4 | polish | Load data notice | Notice says "after a reload the story needs your file again" when data is loaded but the story isn't built yet | 16-story-hash-before-tell | Separate copy: "Press Tell me my story first" when `S.raw` exists |

## Delights
- Every round-1 state bug is closed, including the busy-read race.
- Two-tap Clear and the inline category form replace blocked confirm()/prompt().
- Story mode: Back closes it; Escape during the record countdown restores scroll.
- XSS neutralised ("Img Srcx Onerroralert1"); AI summary labelled DEMO, no people's names.

## Console / network
Console errors: none. Page errors: none. Requests to non-localhost hosts: none.
