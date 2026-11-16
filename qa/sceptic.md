# Sceptic (Otieno, tech journalist): round 2

## Verdict
A real improvement. I reached first success with the JSON in under a minute. All of my round-1 leak vectors are closed, and Clear and Remember now behave. Two headlines still stand. (1) "Switch off Wi-Fi and it still works" is false for the PDF route, even with the Privacy page's workaround. (2) "Never people's names" fails when a name contains a merchant keyword (LABAN → "lab" → Health). The Remember codes are also reversible. I would share it once (1) and (2) are fixed.

## Round-1 status
| id | status | evidence |
|---|---|---|
| S1 AI summary names | PARTLY | All round-1 vectors are gone (10-ai-no-leak.png, ai-leak-output.txt). New vector: N1. |
| S2 PDF offline | NOT FIXED | Only `pdf.min.js` is preloaded. The worker is fetched on read, so offline it fails with "We couldn't open that PDF. Is it an M-PESA statement?" (11-pdf-offline-fails.png, 18-…). |
| S3 Remember stores names | PARTLY | localStorage now holds `{"10nfbuu":…,"716p40":…}`. But see N2: the codes can be reversed. |
| S4 Clear hidden after reload | FIXED | Visible on Home and Privacy after reload (07-reload-clear.png) |
| S5 Clear leaves Remember ticked | FIXED | Two taps leave `{}` and Remember unticked (16, 17). |
| S6 file beats paste | FIXED | Switching source clears the file, and the last input wins (09). |
| S7 password field on all routes | FIXED | Hidden on mac, paste, android and momo |
| S8 "close the tab" vs Remember | FIXED | "…unless you tick 'Remember'" (01) |
| S9 "patterns are real" | FIXED | "Meet Amani · invented data … Her patterns are the kind this tool finds", plus a yellow badge (14) |
| S10 demo prompt | FIXED | The prompt opens with "NOTE: this is DEMO data…" (15) |
| S11 counts | PARTLY | Found shows 730 (JSON and PDF), but the cover shows 716 over 363 days. Period text starts "15 Nov 2025", cover "17 Nov 2025". |
| S12 affiliation list | FIXED | The Privacy page now names Apple, Google, OpenAI and Anthropic (see N4 for DISCLOSURE) |
| S13 menus as fact | FIXED | Dated "correct in November 2026" caveat in the app, Privacy page and DISCLOSURE |
| S14 Mac script | FIXED | `~/Downloads` default, nested try/finally removes the temp copy, broader OTP regex, `ns > 1e11` check |
| S15 CSP unsafe-inline | NOT FIXED | `script-src 'self' 'unsafe-inline'` is still there, though the page has no inline scripts or handlers (N6) |
| S16 GitHub public | FIXED | github.com/mkaigwa/pesadithi-lab returns 200, visibility public |

## New issues
| id | sev | where | what happened | screenshot | suggested fix |
|---|---|---|---|---|---|
| N1 | major | Ask your AI › top_merchants; Story › Who got paid most | Till/Pochi payments to a person whose name matches a merchant regex are named. "paid to LABAN OCHIENG." produces `{"name":"LABAN OCHIENG","category":"Health"}`, because `lab(?:oratory)?` has no word boundary. DISCLOSURE says "never contains people's names". | 19-ai-keyword-name-leak.png, 20-story-keyword-name.png, ai-leak2-output.txt | Add `\b` to every KB regex, and name a merchant only on a whole-name KB match (or an allowlist). Change "never" to "we try to leave out". |
| N2 | minor | Remember › stored codes | The codes are unsalted 32-bit FNV-1a hashes of upper-case names. A 130-name guess list recovered all 3 (MAMA WANJIKU, KEVIN OTIENO, FAITH MWENDE). DISCLOSURE says "one-way hash". | 06-budget-remember.png | Use a random per-browser salt, or stop claiming the codes can't be read. |
| N3 | minor | Home trust card, DISCLOSURE | The offline claim has no PDF caveat. Only the Privacy page has one, and that workaround doesn't work (S2). | 01-landing.png | Fix S2, then use one caveat everywhere |
| N4 | minor | DISCLOSURE › Not affiliated | It omits KCB and Apple, which the Privacy page lists. | 02-privacy.png | Generate both from one list |
| N5 | polish | Footer › Clear | After the second tap the page jumps to Home with no confirmation that anything was cleared | 17-after-clear.png | Show a "Cleared from this browser" status |
| N6 | polish | CSP | `'unsafe-inline'` isn't needed: there are no inline scripts | n/a | Remove it from `script-src` |
| N7 | polish | tools/mac | The output JSON is written with the default umask (0644) and silently overwrites an existing file | n/a | `os.open(..., 0o600)`, and warn before overwriting |

## Delights
Unknown till payees are grouped and counted, not named. The two-tap Clear really empties storage. The demo is labelled everywhere, including inside the prompt.

## Console and network
Network: localhost:8600 only. Console: `ERR_INTERNET_DISCONNECTED` for `pdf.worker.min.js` offline (S2). No page errors.
