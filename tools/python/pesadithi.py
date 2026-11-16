#!/usr/bin/env python3
"""
Pesadithi Lab, Python edition: the same story analysis for any assistant that can run Python
(Claude, ChatGPT data analysis, Gemini, Jupyter) or for your own terminal.

Input:  M-PESA messages as JSON from tools/mac/extract_mobile_money.py, an Android SMS Backup XML,
        pasted text in a .txt file, or an M-PESA statement PDF (needs: pip install pypdf).
Output: ledger.csv (one row per transaction) and summary.json (anonymised totals and patterns,
        the same shape the web app's "Ask your AI" produces). No network calls.

Usage:
  python3 pesadithi.py messages.json --months 12
  python3 pesadithi.py statement.pdf --months 6   # asks for the PDF password without showing it
"""
import os, argparse, csv, datetime as dt, json, re, statistics as st, sys, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

A = r'Ksh ?([\d,]+\.\d\d)'
num = lambda s: float(str(s).replace(',', '').rstrip('.'))
OWN = {'Banks & cards', 'Savings & investing'}
CATS = [
    (r'ziidi|mmf|money market|chama|sacco', 'Savings & investing'),
    (r'workpay', 'Business & payroll'),
    (r'pesapal|tingg|cellulant|ipay|evopay|paystack|flutterwave|dpo', 'Payment platforms'),
    (r'java|caff|coffee|cafe|bakery|kfc|pizza|chicken|grill|restaurant|ristorante|kitchen|bistro|galitos', 'Eating out & coffee'),
    (r'\bbar\b|lounge|klub|club\b|pub\b', 'Going out'),
    (r'naivas|quick ?mart|carrefour|chandarana|supermarket|foodplus|magunas', 'Groceries & household'),
    (r'shell|total|rubis|ola energy|petroleum', 'Transport & fuel'),
    (r'\buber\b|\bbolt\b|little cab', 'Transport & fuel'),
    (r'autoxpress|servicebay|car ?wash|tyre|garage|parking|parkngo|cliknet|kaps|expressway', 'Car & parking'),
    (r'kplc|kenya power|water|zuku|safaricom (post ?paid|home)|home fibre|faiba', 'Bills & utilities'),
    (r'multichoice|dstv|gotv|showmax|netflix|spotify', 'Subscriptions & entertainment'),
    (r'kra|e-?citizen|ntsa|nssf|nhif|\bsha\b', 'Government & tax'),
    (r'hospital|clinic|pharma|chemist|medical|salon|barber|spa\b', 'Health'),
    (r'school|academy|university|college|strathmore|institute', 'Education'),
    (r'apartment|court|estate|rent|properties', 'Rent & housing'),
    (r'church|harambee|fundraiser|funeral|weds|wedding|foundation', 'Giving & community'),
    (r'bank|credit card|co-?operative|i ?& ?m|im bank|ncba|kcb|absa|stanbic|standard chartered|prime|dtb|equity', 'Banks & cards'),
]
PHONE = re.compile(r'(?:\b0?7\d{8}\b|\b0\d{3}\*{3}\d{3}\b|\b2547\d{8}\b|\b\d{4}\*{2,}\d{3}\b)')


def category(party, typ, person):
    if typ == 'airtime': return 'Airtime & data'
    if typ == 'withdraw': return 'Cash'
    for rx, c in CATS:
        if re.search(rx, party or '', re.I): return c
    return 'People' if person else 'Other'


def when(t, fallback=None):
    m = re.search(r'on (\d{1,2})/(\d{1,2})/(\d{2,4})\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)', t, re.I)
    if m:
        y = int(m[3]); y = y + 2000 if y < 100 else y; h = int(m[4]) % 12 + (12 if m[6].upper() == 'PM' else 0)
        return dt.datetime(y, int(m[2]), int(m[1]), h, int(m[5]))
    return fallback


def load_messages(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    if raw.lstrip().startswith('['):
        return [(dt.datetime.fromisoformat(m['date'][:19]) if m.get('date') else None, m['text']) for m in json.loads(raw)]
    if '<smses' in raw[:2000]:
        return [(dt.datetime.fromtimestamp(int(e.get('date')) / 1000), e.get('body')) for e in ET.fromstring(raw).iter('sms') if e.get('type') != '2']
    return [(None, b.strip()) for b in re.split(r'\n\s*\n', raw) if b.strip()]


def parse_sms(msgs):
    txs, by_code, last = [], {}, None
    for ts0, t in msgs:
        t = ' '.join(t.split()); cm = re.match(r'^([A-Z0-9]{10})\s*[Cc]onfirmed', t); code = cm[1] if cm else None
        ts = when(t) or (by_code.get(code) if code else None) or ts0 or last
        if code and ts: by_code.setdefault(code, ts)
        cost = re.search(r'Transaction cost,? ?Kshs? ?([\d,]+\.\d\d)', t); cost = num(cost[1]) if cost else 0
        bal = re.search(r'M-PESA balance is ?Ksh ?([\d,]+\.\d\d)', t, re.I); bal = num(bal[1]) if bal else None
        base = dict(ts=ts, fee=0, bal=bal, party='', person=False, outstanding=None)
        if r := re.search(r'Fuliza M-P[Ee][Ss][Aa] amount is Ksh ?([\d,.]+?)\.?\s+(?:Access )?(?:Fee|Interest) charged Ksh ?([\d,.]+?)\.?\s+Total Fuliza M-P[Ee][Ss][Aa] outstanding amount is Ksh ?([\d,.]+?)\.?\s', t):
            txs.append({**base, 'type': 'credit_draw', 'dir': 'none', 'amt': num(r[1]), 'fee': num(r[2]), 'outstanding': num(r[3]), 'bal': None})
        elif r := re.search(r'Ksh ?([\d,]+\.\d\d) from your M-PESA has been used to (fully|partially) pay your outstanding Fuliza', t, re.I):
            txs.append({**base, 'type': 'credit_repay', 'dir': 'none', 'amt': num(r[1]), 'full': r[2] == 'fully'})
        elif r := re.search(r'M-Shwari loan has been approved .*?Ksh ?([\d,]+\.\d\d)', t, re.I):
            txs.append({**base, 'type': 'loan_in', 'dir': 'none', 'amt': num(r[1])})
        elif r := re.search(r'Loan processed\..*?balance of Ksh\.? ?([\d,]+(?:\.\d\d)?).*?(?:fee of Ksh ?([\d,]+(?:\.\d\d)?)|Facility fees charged is Ksh ?([\d,]+(?:\.\d\d)?))', t, re.I):
            ex = re.search(r'excise duty of Ksh\.? ?([\d,]+(?:\.\d\d)?)', t)
            txs.append({**base, 'type': 'loan_terms', 'dir': 'none', 'amt': num(r[1]), 'facility': num(r[2] or r[3]), 'excise': num(ex[1]) if ex else 0})
        elif r := re.search(r'rollover fee of Ksh ?([\d,]+(?:\.\d\d)?)', t, re.I):
            txs.append({**base, 'type': 'loan_rollover', 'dir': 'none', 'amt': num(r[1])})
        elif r := re.search(r'Loan of Ksh ?([\d,]+\.\d\d) repaid', t, re.I):
            txs.append({**base, 'type': 'loan_repay', 'dir': 'none', 'amt': num(r[1])})
        elif r := re.search('received ' + A + r' from (.+?) on \d', t, re.I):
            txs.append({**base, 'type': 'received', 'dir': 'in', 'amt': num(r[1]), 'party': PHONE.sub('', r[2]).strip(), 'person': bool(PHONE.search(r[2]))})
        elif r := re.search(A + r' (sent|paid) to (.+?)(?: for account (.+?))? on \d', t, re.I):
            typ = 'till' if r[2] == 'paid' else 'paybill' if r[4] else 'sent'
            txs.append({**base, 'type': typ, 'dir': 'out', 'amt': num(r[1]), 'party': PHONE.sub('', r[3]).strip(' .'), 'fee': cost, 'person': typ == 'sent' and bool(PHONE.search(r[3]))})
        elif r := re.search('Withdraw ' + A + r' from (.+?) New', t, re.I):
            txs.append({**base, 'type': 'withdraw', 'dir': 'out', 'amt': num(r[1]), 'party': r[2].strip(), 'fee': cost})
        elif r := re.search('bought ' + A + ' of airtime', t, re.I):
            txs.append({**base, 'type': 'airtime', 'dir': 'out', 'amt': num(r[1]), 'party': 'Airtime'})
        else:
            continue
        if ts: last = ts
    return [x for x in txs if x['ts']]


def parse_statement(path, password):
    from pypdf import PdfReader
    rd = PdfReader(path)
    if rd.is_encrypted and not rd.decrypt(password or ''): sys.exit('Wrong or missing PDF password.')
    text = ' '.join(' '.join((p.extract_text() or '').split()) for p in rd.pages)
    rows = re.findall(r'([A-Z0-9]{10}) (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*?) (COMPLETED) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)', text)
    txs = []
    for rc, tm, d, _, pin, wd, bal in sorted(rows, key=lambda r: r[1]):
        pin, wd = num(pin), abs(num(wd)); amt = pin or wd; ts = dt.datetime.fromisoformat(tm)
        party = PHONE.sub('', re.sub(r'^.*? - ', '', d)).strip(); base = dict(ts=ts, amt=amt, fee=0, bal=num(bal), party=party, person=False, outstanding=None)
        if re.search(r'Charge\b|Access Fee|Fuliza.*Fee|Transaction Cost', d, re.I): txs.append({**base, 'type': 'fee', 'dir': 'none'})
        elif re.search(r'OverDraft of Credit Party', d): txs.append({**base, 'type': 'credit_draw', 'dir': 'none'})
        elif re.search(r'OD Loan Repayment|Overdraw', d): txs.append({**base, 'type': 'credit_repay', 'dir': 'none', 'full': False})
        elif re.search(r'M-?Shwari Loan|Loan Disbursement', d): txs.append({**base, 'type': 'loan_in' if pin else 'loan_repay', 'dir': 'none'})
        elif re.search(r'Airtime', d): txs.append({**base, 'type': 'airtime', 'dir': 'out'})
        elif re.search(r'Withdraw', d): txs.append({**base, 'type': 'withdraw', 'dir': 'out'})
        elif pin: txs.append({**base, 'type': 'received', 'dir': 'in', 'person': 'Funds received from 2547' in d})
        elif re.search(r'Pay Bill', d): txs.append({**base, 'type': 'paybill', 'dir': 'out', 'party': re.sub(r'\s+Acc\..*$', '', party)})
        elif re.search(r'Merchant Payment|Buy Goods', d): txs.append({**base, 'type': 'till', 'dir': 'out'})
        else: txs.append({**base, 'type': 'sent', 'dir': 'out', 'person': 'Customer Transfer' in d})
    return txs


def analyse(txs, months):
    txs.sort(key=lambda x: x['ts'])
    if months:
        # Same window as the web app: same calendar date N months back, plus one day
        end = txs[-1]['ts'].date(); y, m = end.year, end.month - months
        while m <= 0: m += 12; y -= 1
        import calendar
        start = dt.date(y, m, min(end.day, calendar.monthrange(y, m)[1])) + dt.timedelta(days=1)
        txs = [x for x in txs if x['ts'].date() >= start]
    for x in txs: x['category'] = category(x['party'], x['type'], x['person']) if x['dir'] in ('in', 'out') else ('Fees and charges' if x['type'] == 'fee' else 'Borrowing')
    ins = [x for x in txs if x['type'] == 'received']; outs = [x for x in txs if x['dir'] == 'out']
    spendout = [x for x in outs if x['category'] not in OWN and x['category'] != 'Business & payroll']
    # overdraft days
    owed, days_owing, day = 0.0, set(), None
    credit = [x for x in txs if x['type'] in ('credit_draw', 'credit_repay')]
    for x in txs:
        if x['type'] == 'credit_draw': owed = x['outstanding'] if x.get('outstanding') is not None else owed + x['amt']
        if x['type'] == 'credit_repay': owed = 0 if x.get('full') else max(0, owed - x['amt'])
        if owed > 0: days_owing.add(x['ts'].date())
    # carry owed across quiet days
    d0, d1 = txs[0]['ts'].date(), txs[-1]['ts'].date(); n_days = (d1 - d0).days + 1
    events = sorted(credit, key=lambda x: x['ts']); owing_days, o, i = 0, 0.0, 0
    for k in range(n_days):
        d = d0 + dt.timedelta(days=k)
        while i < len(events) and events[i]['ts'].date() <= d:
            e = events[i]; o = (e['outstanding'] if e.get('outstanding') is not None else o + e['amt']) if e['type'] == 'credit_draw' else (0 if e.get('full') else max(0, o - e['amt'])); i += 1
        if o > 1: owing_days += 1
    # half-life of big inflows
    amts = sorted(x['amt'] for x in ins); cut = max(amts[int(len(amts) * .9)] if amts else 0, 5 * (st.median(amts) if amts else 0))
    big = [x for x in ins if x['amt'] >= cut]
    def life(share):
        out = []
        for b in big:
            s = 0
            for o in spendout:
                if o['ts'] <= b['ts']: continue
                s += o['amt'] + o['fee']
                if s >= b['amt'] * share: out.append((o['ts'] - b['ts']).total_seconds() / 86400); break
        return round(st.median(out), 1) if out else None
    dom_in, dom_bal = defaultdict(float), defaultdict(list)
    for x in ins: dom_in[x['ts'].day] += x['amt']
    for x in txs:
        if x.get('bal') is not None: dom_bal[x['ts'].day].append(x['bal'])
    low_day = min((d for d in dom_bal if d <= 28), key=lambda d: st.median(dom_bal[d]), default=None)
    hours, wdays = Counter(), Counter()
    for x in spendout: hours[x['ts'].hour] += x['amt']; wdays[x['ts'].weekday()] += x['amt']
    tot_sp = sum(x['amt'] for x in spendout) or 1
    late = sum(x['amt'] for x in spendout if x['ts'].hour >= 22 or x['ts'].hour < 4)
    # loans
    loans, cur = [], None
    for x in txs:
        if x['type'] == 'loan_in': cur = dict(taken=x['ts'], received=x['amt'], principal=x['amt'], facility=0, excise=0, rollover=0, repaid=None, repaid_amt=None); loans.append(cur)
        elif x['type'] == 'loan_terms' and cur: cur.update(facility=x['facility'], excise=x['excise'], principal=x['amt'] - x['facility'])
        elif x['type'] == 'loan_rollover' and cur: cur['rollover'] += x['amt']
        elif x['type'] == 'loan_repay' and cur and not cur['repaid']: cur['repaid'] = x['ts']; cur['repaid_amt'] = x['amt']
    for l in loans:
        if not l['facility'] and l['repaid_amt']: l['facility'] = max(0, l['repaid_amt'] - l['received'])
        l['days'] = (l['repaid'] - l['taken']).days if l['repaid'] else None
        l['cost'] = l['facility'] + l['excise'] + l['rollover']
    avoid = []
    for l in loans:
        if l['rollover']: avoid.append(dict(date=l['taken'].date().isoformat(), what='Loan rollover penalty', amount=round(l['rollover'])))
        if l['days'] and l['days'] > 10: avoid.append(dict(date=l['taken'].date().isoformat(), what='Early-repayment cashback missed (if offered)', amount=round(l['facility'] * .2)))
    cats = Counter(); [cats.update({x['category']: x['amt']}) for x in outs]
    merch = Counter(); [merch.update({x['party'].upper(): x['amt']}) for x in outs if not x['person'] and x['category'] not in OWN]
    monthly = defaultdict(lambda: [0, 0])
    for x in ins: monthly[x['ts'].strftime('%Y-%m')][0] += x['amt']
    for x in outs: monthly[x['ts'].strftime('%Y-%m')][1] += x['amt']
    fees = sum(x['fee'] for x in outs) + sum(x['amt'] for x in txs if x['type'] == 'fee') + sum(x['fee'] for x in credit) + sum(l['cost'] for l in loans)
    wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; r = lambda v: round(v or 0)
    return dict(tool='Pesadithi Lab (Python)', currency='KES', period=dict(start=str(d0), end=str(d1), days=n_days),
        totals=dict(money_in=r(sum(x['amt'] for x in ins)), money_out=r(sum(x['amt'] for x in outs)), moved_to_own_accounts_or_savings=r(sum(x['amt'] for x in outs if x['category'] in OWN)), fees_and_charges=r(fees), avoidable=r(sum(a['amount'] for a in avoid))),
        timing=dict(days_until_half_of_a_big_inflow_is_spent=life(.5), days_until_three_quarters_spent=life(.75), biggest_inflow_days_of_month=[d for d, _ in Counter(dom_in).most_common(3)], lowest_balance_day_of_month=low_day, peak_spend_hour=max(hours, key=hours.get) if hours else None, peak_spend_weekday=wd[max(wdays, key=wdays.get)] if wdays else None, late_night_share=round(late / tot_sp * 100, 1)),
        monthly=[dict(month=m, **{'in': r(v[0]), 'out': r(v[1])}) for m, v in sorted(monthly.items())],
        spending_by_category=[dict(category=c, total=r(v)) for c, v in cats.most_common()],
        top_merchants=[dict(name=n, total=r(v)) for n, v in merch.most_common(12)],
        overdraft=dict(days_owing=owing_days, draws=sum(1 for x in credit if x['type'] == 'credit_draw'), drawn=r(sum(x['amt'] for x in credit if x['type'] == 'credit_draw')), access_fees=r(sum(x['fee'] for x in credit))) if credit else None,
        loans=[dict(taken=str(l['taken'].date()), principal=r(l['principal']), days=l['days'], cost=r(l['cost']), rollover=r(l['rollover'])) for l in loans],
        avoidable=avoid), txs


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('--password'); ap.add_argument('--months', type=int, default=12); ap.add_argument('--outdir', default='.')
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)
    if a.input.lower().endswith('.pdf') and not a.password:
        import getpass
        a.password = getpass.getpass('PDF password from the M-PESA SMS (not your PIN; hidden as you type): ')
    txs = parse_statement(a.input, a.password) if a.input.lower().endswith('.pdf') else parse_sms(load_messages(a.input))
    if not txs: sys.exit('No M-PESA transactions found in that file.')
    summary, txs = analyse(txs, a.months)
    with open(f'{a.outdir}/ledger.csv', 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['date_time', 'direction', 'type', 'party', 'category', 'amount', 'fee', 'balance'])
        for x in txs: w.writerow([x['ts'].isoformat(), x['dir'], x['type'], '' if x['person'] else x['party'], x.get('category', ''), x['amt'], x['fee'], x.get('bal') or ''])
    json.dump(summary, open(f'{a.outdir}/summary.json', 'w'), indent=1)
    print(json.dumps(summary['totals'], indent=1)); print('Wrote ledger.csv and summary.json (people are left unnamed in the ledger).')


if __name__ == '__main__':
    main()
