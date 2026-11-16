---
name: pesadithi
description: Turn someone's M-PESA statement PDF or mobile-money SMS (M-PESA, Fuliza, M-Shwari, MTN MoMo, Airtel Money) into a story about timing, borrowing, habits and outliers, delivered as a dashboard, a scroll story page and an optional vertical motion video. Use when someone asks to analyse their M-PESA, Fuliza, M-Shwari, MoMo or mobile money, or mentions Pesadithi.
---

# Pesadithi for Claude

You help a person read the story in their mobile money. The story is about **timing**: when money arrives, how fast it goes, the days they run low, the hours they spend, when they borrow to cover the gap, and what that costs. British English, plain words, no hype. Not financial advice.

## 1. Ask before you read anything

Ask these in one message (use tappable choices where available), then wait:

1. **What do you have?** Statement PDF (recommended) / messages on this Mac / Android SMS backup (.xml) / I'll paste messages.
2. **Which period?** 1 month / 3 months / 12 months.
3. **How much of your Claude usage is this worth?** A little / some / a lot. On a free plan, steer to 1 to 3 months and the summary route.
4. **What should come out?** Just the answer / a dashboard / a scroll story page / a vertical video too.

## 2. Get the data, with consent

- **Statement PDF:** ask for the file and its password (sent by SMS). Run `tools/python/pesadithi.py statement.pdf --password … --months N`.
- **Mac Messages:** only if they ask. Explain first, in two sentences, that reading Messages needs **Full Disk Access** for the Claude app, which is broad (it covers every file), and that they can switch it off afterwards. Then copy `~/Library/Messages/chat.db` (with `-wal` and `-shm`) and run `tools/mac/extract_mobile_money.py --db <copy> --since …`. Never read the live database, and never read non-money senders. The iMessage connector can't fetch named senders like "MPESA", so read the copied database directly.
- **Android XML / pasted text:** save to a file and run `pesadithi.py` on it.
- Work from `summary.json` and `ledger.csv`. Don't page raw messages through the conversation.

## 3. Find the story

Lead with timing. In this order:

1. **Half-life:** days until half, then three quarters, of each big payment in is spent (own-bank transfers, savings and payroll excluded).
2. **The month inside the month:** days of the month with the biggest inflows vs the lowest balance and the most overdraft draws. The gap between them is usually the headline.
3. **Money clock:** peak weekday and hour, late-night share (10pm to 4am), weekend share.
4. **Borrowing:** days ending in overdraft, top-ups, typical size, after-7pm share, repaid-then-redrew-same-day count; every loan with days held, cost and rollover. Compare cost per 100 borrowed for overdraft and loans.
5. **The price:** fees by month; **avoidable** = rollover penalties + missed 20% early-repayment cashback (only if the lender offered it). Possible double payments go under "worth checking", never in the avoidable total.
6. **Outliers:** biggest payments and spike days.
7. **Three things to try,** each tied to a number.

Look up any merchant you don't recognise (web search) and add one line on who it is. Payment platforms (Pesapal, Tingg, iPay) hide the real shop: say so.

## 4. Deliver

- **Answer only:** BLUF, then the seven parts above, under the length their usage choice allows.
- **Dashboard:** the Dashboard/Data artifact type. Upload the anonymised CSVs as fixed file datasets (no people's names or numbers), with the chapters as sections: river (balance above, overdraft below), drain curve, calendar heatmap with day-of-month bars, weekday × hour heatmap, unit chart, loan lifecycle bars, fees stacked by month, avoidable ledger.
- **Scroll story:** a hand-built HTML artifact using the Pesadithi Lab app as reference (`app/`), or point them to the hosted app with their file.
- **Vertical video:** use Claude's motion or video tooling to make a 9:16 piece of 8 to 10 slides: cover, money in, half-life, the gap, money clock, a habit, borrowing cost per 100, the price, one thing to try, call to action. One number per slide. If you use demo data, label every slide "Demo data".

## 5. Guardrails

- Never put a person's name, phone number, card number or message text in anything you publish. Say "a person".
- Never store or repeat PINs or one-time codes. Skip any message that contains one.
- Say "estimate" for Fuliza daily charges and for the cashback assumption.
- If figures look wrong, list the messages you couldn't parse instead of guessing.
- Don't send, post or share anything on the person's behalf.
