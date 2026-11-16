#!/usr/bin/env python3
"""
Pesadithi Lab: extract mobile-money SMS from the Messages app on a Mac.

WHAT IT DOES
  1. Copies ~/Library/Messages/chat.db (plus its -wal and -shm files) to a temporary folder.
  2. Reads ONLY messages from mobile-money senders (M-PESA, Fuliza, M-Shwari, MTN MoMo, Airtel Money...).
  3. Drops anything that looks like a one-time password or PIN message.
  4. Writes a JSON file you can open in Pesadithi Lab (in your browser, on your machine).
  5. Deletes the temporary copy.

WHAT IT NEEDS
  - A Mac whose Messages app receives your phone's SMS. For iPhone users this means
    Settings > Messages > Text Message Forwarding is on for this Mac. Android phones do not sync SMS to a Mac.
  - Full Disk Access for the app you run this from (Terminal, iTerm, or an AI desktop app).
    System Settings > Privacy & Security > Full Disk Access. This is a broad permission: it lets that app
    read ALL your files, not just Messages. Turn it on, run this script, then turn it off again.

WHAT IT NEVER DOES
  - It never edits or deletes your messages (it only reads a copy).
  - It never connects to the internet. Read the code: there is no network import.

USAGE
  python3 extract_mobile_money.py                      # last 12 months, default senders
  python3 extract_mobile_money.py --since 2026-01-01 --out ~/Downloads/my-mpesa.json
  python3 extract_mobile_money.py --senders MPESA,M-Shwari,Fuliza,MTN,MoMo,AirtelMoney
"""
import argparse, datetime as dt, json, os, re, shutil, sqlite3, sys, tempfile

DEFAULT_SENDERS = [
    # Kenya (Safaricom)
    'MPESA', 'M-PESA', 'mpesa', 'M-Shwari', 'MShwari', 'Mshwari', 'm-shwari', 'mshwari', 'Fuliza', 'fuliza',
    # MTN MoMo (Uganda, Ghana, Rwanda, Zambia, Cameroon, Côte d'Ivoire ...)
    'MTN', 'MTNMoMo', 'MoMo', 'MobileMoney', 'MTN MoMo',
    # Airtel Money
    'AirtelMoney', 'Airtel Money', 'AIRTEL', 'Airtel',
    # Others
    'T-Kash', 'TKASH', 'MPESA TZ', 'M-Pesa', 'Tigo Pesa', 'TigoPesa', 'EcoCash', 'Orange Money', 'Wave'
]
OTP = re.compile(r'\b(OTP|one[- ]time|verification|security code|auth(?:entication|orisation|orization) code|(?:your|the) code(?: is)?|PIN is|new PIN|reset (?:your )?PIN|password|do not share|don\'t share|never share)\b', re.I)
MONEY = re.compile(r'(Ksh|KES|UGX|GHS|RWF|ZMW|TZS|XAF|XOF|MWK|USD)\s?[\d,]+', re.I)


def decode_attributed(blob):
    """Newer macOS versions keep the text inside an NSAttributedString blob."""
    if not blob:
        return None
    try:
        part = blob.split(b'NSString')[1][5:]
        if part[0] == 0x81:
            n = int.from_bytes(part[1:3], 'little'); raw = part[3:3 + n]
        else:
            n = part[0]; raw = part[1:1 + n]
        return raw.decode('utf-8', 'replace')
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser(description='Extract mobile-money SMS from macOS Messages into a JSON file.')
    ap.add_argument('--since', default=(dt.date.today() - dt.timedelta(days=365)).isoformat(), help='YYYY-MM-DD (default: 12 months ago)')
    ap.add_argument('--until', default=None, help='YYYY-MM-DD (default: today)')
    ap.add_argument('--senders', default=None, help='Comma-separated sender names to include')
    ap.add_argument('--out', default=os.path.expanduser('~/Downloads/pesadithi-messages.json'), help='Default: your Downloads folder (not Desktop, which iCloud often syncs)')
    ap.add_argument('--db', default=os.path.expanduser('~/Library/Messages/chat.db'))
    a = ap.parse_args()

    senders = [s.strip() for s in (a.senders.split(',') if a.senders else DEFAULT_SENDERS)]
    if not os.path.exists(a.db):
        sys.exit('No Messages database found. Is this a Mac with Messages set up?')
    tmp = tempfile.mkdtemp(prefix='pesadithi-')
    rows = []
    try:
      try:
        for suffix in ('', '-wal', '-shm'):
            src = a.db + suffix
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(tmp, 'chat.db' + suffix))
      except PermissionError:
        sys.exit('macOS blocked access to Messages. Give Full Disk Access to the app you are running this from '
                 '(System Settings > Privacy & Security > Full Disk Access), restart that app, and try again.')
      con = sqlite3.connect('file:' + os.path.join(tmp, 'chat.db') + '?mode=ro', uri=True)
      q = ('SELECT m.text, m.attributedBody, m.date, h.id FROM message m JOIN handle h ON h.ROWID = m.handle_id '
           'WHERE m.is_from_me = 0 AND h.id IN (%s) ORDER BY m.date' % ','.join('?' * len(senders)))
      rows = con.execute(q, senders).fetchall()
      con.close()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    since = dt.datetime.fromisoformat(a.since)
    until = dt.datetime.fromisoformat(a.until) + dt.timedelta(days=1) if a.until else dt.datetime.max
    out, dropped_otp = [], 0
    for text, blob, ns, sender in rows:
        text = text or decode_attributed(blob)
        if not text:
            continue
        secs = ns / 1e9 if ns > 1e11 else ns  # macOS before High Sierra stored seconds, later nanoseconds
        when = (dt.datetime(2001, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(seconds=secs)).astimezone().replace(tzinfo=None)
        if not (since <= when < until):
            continue
        if OTP.search(text):
            dropped_otp += 1
            continue
        if not MONEY.search(text) and 'Fuliza' not in text and 'M-Shwari' not in text:
            continue  # promotions and service notices
        out.append({'date': when.strftime('%Y-%m-%dT%H:%M:%S'), 'sender': sender, 'text': text})

    if os.path.exists(a.out):
        print(f'Note: replacing the older {a.out}')
    fd = os.open(a.out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)  # readable by you only
    with os.fdopen(fd, 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(f'Saved {len(out)} money messages from {a.since} to {a.until or "today"} -> {a.out}')
    print(f'Skipped {dropped_otp} messages that looked like codes or PINs.')
    print('Next: open Pesadithi Lab in your browser and choose "Messages from a Mac (.json)".')
    print('Reminder: you can now turn Full Disk Access off again for this app.')
    print('When you are done, delete the file: it contains your money messages.')


if __name__ == '__main__':
    main()
