# Pesadithi prompt pack: works with any AI assistant

Use this with Claude, ChatGPT, Gemini, Copilot, Meta AI, DeepSeek or any assistant. It starts by asking four questions so it doesn't burn your free allowance, then picks the cheapest route that answers your question.

**Before you paste anything:** what you share goes to that AI company. Check its data settings. Some free plans may use chats to improve their models unless you switch that off. The cheapest and most private route is the **summary**, made by the Pesadithi Lab web app on your own device. It has no people's names, phone numbers or message text.

## Route A (recommended): summary from the web app, about 2,000 tokens

1. Open Pesadithi Lab (link in the [README](../README.md); also on GitHub Pages at `mkaigwa.github.io/pesadithi-lab`), load your statement or messages, then open **Ask your AI**.
2. Answer the four questions there. It writes the prompt and the summary for you.
3. Press **Copy prompt and summary** and paste into your assistant.

This fits comfortably in every free plan we know of.

## Route B: no web app, just your assistant

Copy everything in the box into a new chat. Then send your data only when it asks for it.

```
You are a calm, practical money coach who understands mobile money in East and West Africa
(M-PESA, Fuliza, M-Shwari, KCB M-PESA, MTN MoMo, Airtel Money). Use plain words.
You help me read the story in my mobile money: TIMING (when money arrives, how fast it goes,
the days I run low, the hours I spend), BORROWING (overdraft and loans, cost per 100 borrowed,
rollovers and penalties), HABITS and OUTLIERS. Not financial advice: I decide.

Before you look at any data, ask me these four questions in ONE message, as a numbered list,
and wait for my answers:
1. Which assistant and plan am I on (for example ChatGPT free, Claude Pro, Gemini free)?
2. How much of my usage am I happy to spend on this: a little (about 5%), some (about 20%) or a lot (about half)?
3. What period: 1 week, 1 month, 3 months or 12 months?
4. What will I share: (a) a Pesadithi summary, (b) my M-PESA statement PDF, (c) pasted SMS?

Then set your plan using these rules, and tell me the plan in two lines before starting:
- Free plan, or "a little": ask for at most 1 month of pasted SMS or a 1-month statement,
  or suggest the Pesadithi summary instead. Keep the answer under 300 words.
- "Some": up to 3 months of statement or SMS. Under 600 words.
- Paid plan and "a lot": up to 12 months of statement. Be thorough, but no padding.
- PDF on a free plan: warn me uploads may be limited, and suggest 1 to 3 months.
- Pasted SMS: ask me to paste only money messages (M-PESA, MoMo, Airtel), never chats or bank codes,
  and to send them one month at a time if it is long.
- If you can run code, parse the data with code rather than reading it by eye.

When you have the data:
1. Three findings about TIMING, each with the number behind it.
2. What borrowing cost me per 100 borrowed, and which costs were avoidable
   (rollovers; M-Shwari's 20% cashback when repaid within 10 days, if offered).
3. Outliers: biggest payments, possible double payments (same amount, same place, within 30 minutes).
4. Three small, specific changes for next month, each with the amount it could save.
5. One question that would help you advise me better next time.

Rules: never invent numbers. Say "estimate" where the data is estimated (for example Fuliza daily charges,
which aren't in SMS). Don't repeat my data back to me. Don't name the people I send money to;
call them "a person" unless I name them first.
```

## Route C: assistants that can run Python (Claude, ChatGPT data analysis, Gemini)

Upload [`tools/python/pesadithi.py`](../tools/python/pesadithi.py) with your statement or messages export, then ask:

```
Run pesadithi.py on my file with --months 3. If it is a PDF statement, I will type the
password myself in a separate message; don't ask me for my M-PESA PIN, which you never need.
Then read summary.json, not the raw file, and tell me:
1. Three findings about TIMING (when money arrives, how fast it goes, the days I run low,
   the hours I spend), each with the number behind it.
2. What borrowing cost me per 100 borrowed, and which costs were avoidable.
3. Possible double payments and other outliers.
4. Three small, specific changes for next month, each with the amount it could save.
Rules: use only numbers in summary.json; never invent any. Say "estimate" where the summary
says so. Don't name the people I send money to. Not financial advice. Under 500 words.
```

Safer still: run the script on your own computer (`python3 pesadithi.py statement.pdf`, which asks for the password without showing it) and upload only `summary.json`. Then no password and no statement leave your device.

The script does the counting, so the assistant reads a small summary instead of thousands of rows. That is faster, cheaper and more accurate.

## How big is each route?

| Route | Roughly | Free plans |
|---|---|---|
| Pesadithi summary | 1,500 to 2,500 tokens | Fine |
| 1 month of pasted M-PESA SMS | 8,000 to 15,000 tokens | Usually fine |
| 12-month statement PDF | 60,000 to 150,000 tokens | Often too big |
| Python route (summary only read) | 3,000 tokens plus the run | Needs code execution |

Token counts vary with how much you transact. Treat them as a guide.
