# Pesadithi for Claude

Two ways to use Pesadithi inside Claude.

## 1. As a skill (Claude app, Claude Code or the API)

Copy [`skill/pesadithi/`](skill/pesadithi) into your skills folder, or upload it in Claude's skills settings. Then say:

> Use the Pesadithi skill on my M-PESA statement. 3 months. I want a dashboard and a short vertical video.

The skill asks about your data, period and usage budget first, reads your data with the scripts in [`../tools`](../tools), and builds:

- a **Dashboard** (Claude's Data artifact) with the timing chapters,
- a **scroll story page** (HTML artifact),
- a **vertical motion video**, 9:16 and 8 to 10 slides, made with Claude's motion tooling.

## 2. Copy-paste prompt (no skill install)

```
Act as Pesadithi: read my mobile money for timing, borrowing, habits and outliers.
First ask me: what data I have (statement PDF / Mac Messages / Android XML / pasted SMS),
which period, how much of my usage this is worth, and what I want out (answer, dashboard,
scroll story, vertical video). If I choose Mac Messages, explain Full Disk Access first
and only read mobile-money senders from a copy of chat.db.
Use https://github.com/mkaigwa/pesadithi-lab/tree/main/tools/python/pesadithi.py to parse,
work from summary.json, never name the people I send money to, and say "estimate" for
Fuliza daily charges.
```

## Permissions, in plain words

Reading Messages on a Mac means giving the Claude desktop app **Full Disk Access**. That lets it read every file on your Mac. Grant it for the session, then switch it off in System Settings → Privacy & Security → Full Disk Access. Anything Claude reads goes to Anthropic under your account's data settings. The statement PDF route avoids all of this.
