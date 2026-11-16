# Mac route (iPhone users)

Reads your M-PESA, Fuliza, M-Shwari, MTN MoMo and Airtel Money texts from the Messages app and saves them as a JSON file for Pesadithi Lab.

## It only works if

- Your iPhone forwards SMS to this Mac: iPhone **Settings → Messages → Text Message Forwarding** → your Mac switched on. Check the Messages app on the Mac shows your M-PESA texts.
- Android phones don't sync texts to a Mac. Use the [Android route](../android) or the statement PDF.
- History goes back only as far as your Mac has synced.

## The permission you're giving

macOS protects the Messages database. To read it, the app you run the script from (usually **Terminal**) needs **Full Disk Access**. **That is a broad permission: it lets Terminal read every file on your Mac, not only Messages.**

1. System Settings → Privacy & Security → Full Disk Access → switch on **Terminal**. Quit and reopen Terminal.
2. Run the script (below).
3. Switch Terminal off again in the same place.

## Run it

```bash
python3 extract_mobile_money.py                       # last 12 months
python3 extract_mobile_money.py --since 2026-01-01    # from a date
python3 extract_mobile_money.py --out ~/Downloads/mpesa.json
```

It saves `pesadithi-messages.json` to your Downloads folder (not the Desktop, which iCloud often syncs). Load it in Pesadithi Lab with **Messages from a Mac**.

## What the script does and doesn't do

- Copies the database to a temporary folder, reads the copy, deletes the copy.
- Reads only messages from mobile-money senders (see `DEFAULT_SENDERS` in the script).
- Drops messages that look like codes or PINs, and promotions without amounts.
- Never changes your messages. Has no internet code: check the imports.

## Using an AI desktop app instead

If you'd rather ask Claude or another AI desktop app to do this, that app needs Full Disk Access instead of Terminal, and whatever it reads is sent to that AI company. The script route keeps everything on your Mac.
