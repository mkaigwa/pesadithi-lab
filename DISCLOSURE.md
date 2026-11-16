# Privacy, permissions and risks

Plain words, no small print. If any of this is wrong or unclear, open an issue.

## The web app

- Your file is opened by JavaScript **inside your browser**. There is no server that receives it.
- The page loads only its own files (HTML, CSS, scripts, fonts, a PDF reader). A Content Security Policy blocks connections to any other site. You can check: load the page, switch off Wi-Fi and mobile data, then load your file. It still works.
- **Nothing is saved** unless you tick "Remember my sorting and targets". Then only your category choices and budget targets are stored in your browser, with each person kept as a scrambled code (a one-way hash), never as a name. Transactions are never stored. "Clear my data" removes everything.
- Hosting: if you use a hosted copy (GitHub Pages or another host), that host sees that you visited the page, like any website. It does not see your file.

## Each route

### M-PESA statement PDF (recommended)
- You request it yourself (M-PESA app → Statements, or `*334#` → My Account → M-PESA Statement). It arrives by email; the password arrives by SMS and differs for each statement.
- You give the app only that one file.
- Limits: statements show less than SMS about M-Shwari fees and rollovers, and nothing about Fuliza daily charges.

### Messages from a Mac (iPhone users)
- Works only if your iPhone forwards SMS to your Mac (Settings → Messages → Text Message Forwarding). **Android phones don't sync texts to a Mac.**
- The script needs **Full Disk Access** for the app that runs it (usually Terminal). **This is a broad macOS permission: that app can read every file on your Mac, not only Messages.** Turn it on, run the script, turn it off again.
- The script copies the Messages database to a temporary folder, reads only messages from mobile-money senders, drops texts that look like codes or PINs, writes a JSON file, then deletes the copy. It never changes your messages and contains no network code.
- If you ask an AI desktop app (Claude, ChatGPT…) to read your Messages for you, the same permission applies to that app, and the messages it reads are sent to that AI company.

### Android SMS backup
- An SMS backup app (for example *SMS Backup & Restore* by SyncTech) needs permission to read **all** your texts, including bank and one-time codes.
- Back up to your phone's storage only. Load the file, then delete it. Don't send it to cloud storage, email or chat apps.

### Windows
- Windows can't read your phone's texts directly. Use the statement PDF, or an Android backup file.

### iPhone without a Mac
- iPhones don't let apps export SMS. Use the statement PDF.

### MTN MoMo and Airtel Money (beta)
- Message formats vary between countries and change over time. The parser uses general patterns; some messages won't be read and are listed after loading.
- Some MTN and Airtel markets offer statements in their apps. PDF statements from them are not yet supported.

## AI assistants

- Whatever you paste or upload into an AI assistant goes to that company. Check its data settings: on some plans, chats can be used to improve models unless you switch that off.
- The app's **Ask your AI** summary contains totals, categories, dates and patterns. It never contains people's names, phone numbers or message text. Business names are included unless you untick that option.
- A full statement or raw SMS **does** contain names and phone numbers. Share those only if you accept that.

## Accuracy

- Figures come from what your statement or SMS say. Fuliza daily charges are **estimated** from changes in the outstanding amount; treat them as a floor.
- The "20% cashback missed" assumes M-Shwari's early-repayment offer applied to that loan. Check your own messages.
- Categories come from matching business names and are approximate.
- "Possible double payment" means the same amount to the same place within 30 minutes. It is often deliberate.
- This is not financial advice.

## Not affiliated

Pesadithi Lab is independent and open source. It isn't made by, endorsed by or affiliated with Safaricom, M-PESA, NCBA, MTN, Airtel, Anthropic, OpenAI or Google. Product names belong to their owners.

_Menus, app steps and plan limits described in this file were checked in November 2026. Providers change them; their official apps and pages are the final word._
