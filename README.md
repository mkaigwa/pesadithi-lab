# Pesadithi Lab

**The story of your mobile money, told through timing.** Load your M-PESA statement or your money SMS and see when money arrives, how fast it goes, the days you run low, when you borrow to cover the gap, and what that really costs.

*Pesadithi* combines Swahili *pesa* (money) and *hadithi* (story).

- **Runs in your browser.** Your file is read on your device and never uploaded. No account, no cookies, no analytics.
- **Works with M-PESA** (statement PDF, SMS from a Mac, Android SMS backups, pasted messages). **MTN MoMo and Airtel Money are in beta.**
- **Works with the AI you already use.** Generates a short, anonymised summary and a prompt sized for free or paid Claude, ChatGPT or Gemini.
- **Open source** (MIT). Read every line; that's the point.

> Not affiliated with Safaricom, M-PESA, NCBA, MTN or Airtel. Not financial advice. Some figures, such as Fuliza daily charges, are estimates. Your official statement is the final word.

## Try it

1. **Demo:** open the app and press **See a demo story**. It uses invented data for a fictional person, Amani.
2. **Your own data:** press **Use my own data** and pick a source. If you're unsure, use your **M-PESA statement PDF**: it works on any phone.

Run it locally:

```bash
git clone https://github.com/mkaigwa/pesadithi-lab
cd pesadithi-lab/app
python3 -m http.server 8000     # then open http://localhost:8000
```

(Opening `index.html` straight from disk works for your own files, but the demo needs a local server because browsers block `fetch` on `file://`.)

## What you get

| Chapter | What it shows |
|---|---|
| The shape | Daily balance above the line, overdraft owed below it, big payments in marked |
| How long it lasts | The "drain": days until half, then three quarters, of each big payment is spent |
| The month inside the month | A calendar heatmap of the days you run low, and Fuliza by date of month |
| Money clock | A weekday × hour heatmap, late-night and weekend shares, café habits |
| Where it goes | "For every 100 you spent" unit chart; top payees with a note on who each business is |
| Borrowing | Overdraft top-ups and every M-Shwari loan, side by side, with cost per 100 borrowed |
| The price you paid | Fees by month; rollovers, missed cashbacks; possible double payments |
| Outliers | The payments and days that broke the pattern |
| What to try | Three small changes the data points to |

Plus **Sort your people** (a swipe game to label who you send money to), a **Budget** (monthly averages and targets by category), **Ask your AI**, and **Story mode**: a vertical 9:16 version for screen recording short videos.

## Three ways to use it

| You use | Start here |
|---|---|
| A browser | `app/` (this repo, or the hosted copy) |
| Any AI assistant (Claude, ChatGPT, Gemini…) | [`prompts/any-llm.md`](prompts/any-llm.md) |
| Claude with artifacts, dashboards or motion | [`claude/`](claude/) |

## Getting your data

| Route | Who | Access you give | Guide |
|---|---|---|---|
| M-PESA statement PDF | Anyone with M-PESA | Only the PDF | In the app |
| Messages from a Mac | iPhone + Mac with Text Message Forwarding | **Full Disk Access** for Terminal (broad: read the risks) | [`tools/mac`](tools/mac) |
| Android SMS backup | Android | A backup app reads all texts | [`tools/android`](tools/android) |
| Windows | Anyone | Only the file | [`tools/windows`](tools/windows) |

Read [`DISCLOSURE.md`](DISCLOSURE.md) before using the Mac or Android routes.

## Make a video with it

Load the demo, open **Story mode** from the cover or the footer, press **Auto-play**, and screen-record. Every slide carries a "Demo data" label when you use the demo. The demo data comes from [`tools/demo/generate_demo.py`](tools/demo/generate_demo.py). Change the seed or persona to make your own.

## Help improve the parsers

Message formats vary by country and change over time. If something isn't read, it is listed after loading under "Messages we couldn't read". Open an issue with an example **after replacing names, phone numbers and amounts**. Never post a real statement.

## Project layout

```
app/            the web app (HTML, CSS, JS; vendored d3, pdf.js, fonts)
app/demo/       invented data: SMS (JSON, TXT, Android XML), statement PDF (password 123456), MoMo and Airtel samples
tools/mac/      extract_mobile_money.py, reads a copy of macOS Messages
tools/android/  SMS Backup & Restore route
tools/windows/  statement route
tools/python/   pesadithi.py, the same analysis for any assistant that can run Python
tools/demo/     generator for the demo data
prompts/        LLM-agnostic prompt pack, sized for free and paid plans
claude/         Claude-only version: skill, dashboard and motion briefs
qa/             launch QA reports and screenshots
```

## Licence

MIT. Third-party: d3 (ISC), pdf.js (Apache 2.0), Inter and Literata fonts (SIL Open Font Licence).
