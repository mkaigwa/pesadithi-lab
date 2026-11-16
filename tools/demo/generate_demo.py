#!/usr/bin/env python3
"""
Generate a fully synthetic mobile-money year for "Amani", a fictional 32-year-old in Nairobi.

Outputs (all fake, safe to publish and to use in videos):
  app/demo/demo-mpesa-sms.json        Mac-extractor format: [{"date", "sender", "text"}]
  app/demo/demo-mpesa-sms.txt         the same messages as plain pasted text
  app/demo/demo-android-backup.xml    SMS Backup & Restore format
  app/demo/demo-mpesa-statement.pdf   statement-style PDF, password 123456
  app/demo/demo-mtn-momo-uganda.txt   MTN MoMo-style SMS (UGX)
  app/demo/demo-airtel-money.txt      Airtel Money-style SMS (KES)

Names, phone numbers and amounts are invented. Merchant names are common Kenyan brands used
only so the demo reads naturally; no real transactions are represented.
"""
import json, random, datetime as dt, os, string
from xml.sax.saxutils import quoteattr

random.seed(2026)
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'demo')
os.makedirs(OUT, exist_ok=True)

START = dt.datetime(2025, 11, 1, 7, 0)
END = dt.datetime(2026, 11, 14, 22, 0)

def code(d):
    # M-PESA style receipt: letter for year, letter for month, then 8 alphanumerics
    y = 'TU'[d.year - 2025] if d.year in (2025, 2026) else 'U'
    return y + 'ABCDEFGHIJKL'[d.month - 1] + str(d.day % 10) + ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))

def ksh(x): return f"{x:,.2f}"
def dmy(d): return f"{d.day}/{d.month}/{str(d.year)[2:]}"
def hm(d): return d.strftime('%-I:%M %p')

def send_cost(a):
    # Approximate person-to-person tariff bands, for demo purposes only
    for lim, c in [(100, 0), (500, 7), (1000, 13), (1500, 23), (2500, 33), (3500, 53), (5000, 57), (7500, 78), (10000, 90), (15000, 100), (20000, 105), (250000, 108)]:
        if a <= lim: return c
    return 108
def paybill_cost(a):
    for lim, c in [(100, 0), (500, 5), (1000, 10), (1500, 15), (2500, 20), (3500, 25), (5000, 34), (7500, 42), (10000, 48), (15000, 57), (20000, 62), (250000, 108)]:
        if a <= lim: return c
    return 108
def withdraw_cost(a):
    for lim, c in [(100, 11), (2500, 29), (3500, 52), (5000, 69), (10000, 115), (20000, 197), (250000, 309)]:
        if a <= lim: return c
    return 309

class Wallet:
    def __init__(self):
        self.bal = 6420.55
        self.fuliza = 0.0
        self.fuliza_limit = 8000.0
        self.msgs = []   # (datetime, sender, text)
        self.rows = []   # statement rows: (receipt, datetime, details, paid_in, withdrawn)
        self.mshwari = None
    def sms(self, d, text, sender='MPESA'):
        self.msgs.append((d, sender, text))
    def row(self, rc, d, details, paid_in=0.0, withdrawn=0.0):
        self.rows.append([rc, d, details, paid_in, withdrawn])
    def _repay_fuliza(self, d, rc):
        if self.fuliza <= 0 or self.bal <= 0: return
        pay = min(self.bal, self.fuliza)
        full = pay >= self.fuliza - 0.005
        self.bal -= pay; self.fuliza -= pay
        self.row(rc, d, 'OD Loan Repayment to 232323 - M-PESA Overdraw', withdrawn=pay)
        if full:
            self.fuliza = 0
            self.sms(d + dt.timedelta(seconds=2), f"{rc} Confirmed. Ksh {ksh(pay)} from your M-PESA has been used to fully pay your outstanding Fuliza M-PESA. Available Fuliza M-PESA limit is Ksh {ksh(self.fuliza_limit)}. M-PESA balance is Ksh{ksh(self.bal)}.")
        else:
            self.sms(d + dt.timedelta(seconds=2), f"{rc} Confirmed. Ksh {ksh(pay)} from your M-PESA has been used to partially pay your outstanding Fuliza M-PESA. Available Fuliza M-PESA limit is Ksh {ksh(self.fuliza_limit - self.fuliza)}. M-PESA balance is Ksh0.00.")
    def receive(self, d, amt, frm, statement_from):
        rc = code(d)
        self.bal += amt
        self.sms(d, f"{rc} Confirmed.You have received Ksh{ksh(amt)} from {frm} on {dmy(d)} at {hm(d)} New M-PESA balance is Ksh{ksh(self.bal)}. Separate personal and business funds through Pochi la Biashara on *334#.")
        self.row(rc, d, statement_from, paid_in=amt)
        self._repay_fuliza(d, rc)
    def _cover(self, d, rc, need):
        """Draw Fuliza if needed. Returns False if the payment cannot go through."""
        if self.bal >= need: return True
        short = round(need - self.bal, 2)
        if self.fuliza + short > self.fuliza_limit: return False
        fee = round(short * 0.01, 2)
        # daily maintenance charge accrued since last draw, folded into outstanding (approximation)
        self.fuliza += short + fee
        self.bal += short
        self.sms(d + dt.timedelta(seconds=12), f"{rc} Confirmed. Fuliza M-PESA amount is Ksh {short:.2f}. Access Fee charged Ksh {fee:.2f}. Total Fuliza M-PESA outstanding amount is Ksh{self.fuliza:.2f} due on {(d + dt.timedelta(days=30)).strftime('%d/%m/%y')}. To check daily charges, Dial *334#OK Select Query Charges")
        self.row(rc, d, 'OverDraft of Credit Party', paid_in=short)
        self.row(rc, d, 'Fuliza M-Pesa Access Fee', withdrawn=0)  # fee sits in the outstanding amount, not the wallet
        return True
    def pay(self, d, amt, kind, party, acct=None, phone=None):
        if kind == 'sent' and phone is None: phone = acct
        rc = code(d)
        cost = {'sent': send_cost, 'paybill': paybill_cost}.get(kind, lambda a: 0)(amt)
        if kind == 'withdraw': cost = withdraw_cost(amt)
        if not self._cover(d, rc, amt + cost): return False
        self.bal -= amt + cost
        b = ksh(self.bal)
        if kind == 'sent':
            self.sms(d, f"{rc} Confirmed. Ksh{ksh(amt)} sent to {party} {phone} on {dmy(d)} at {hm(d)}. New M-PESA balance is Ksh{b}. Transaction cost, Ksh{ksh(cost)}.  Amount you can transact within the day is 499,000.00.")
            self.row(rc, d, f"Customer Transfer to {phone[:4]}****{phone[-3:]} - {party}", withdrawn=amt)
            if cost: self.row(rc, d, 'Customer Transfer of Funds Charge', withdrawn=cost)
        elif kind == 'paybill':
            self.sms(d, f"{rc} Confirmed. Ksh{ksh(amt)} sent to {party} for account {acct} on {dmy(d)} at {hm(d)} New M-PESA balance is Ksh{b}. Transaction cost, Ksh{ksh(cost)}.Amount you can transact within the day is 499,000.00.")
            self.row(rc, d, f"Pay Bill Online to {random.randint(200000, 999999)} - {party} Acc. {acct}", withdrawn=amt)
            if cost: self.row(rc, d, 'Pay Bill Charge', withdrawn=cost)
        elif kind == 'till':
            self.sms(d, f"{rc} Confirmed. Ksh{ksh(amt)} paid to {party}. on {dmy(d)} at {hm(d)}.New M-PESA balance is Ksh{b}. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,000.00.")
            self.row(rc, d, f"Merchant Payment Online to {random.randint(100000, 999999)} - {party}", withdrawn=amt)
        elif kind == 'withdraw':
            self.sms(d, f"{rc} Confirmed.on {dmy(d)} at {hm(d)}Withdraw Ksh{ksh(amt)} from {party} New M-PESA balance is Ksh{b}. Transaction cost, Ksh{ksh(cost)}.")
            self.row(rc, d, f"Customer Withdrawal At Agent Till {random.randint(100000, 999999)} - {party}", withdrawn=amt)
            self.row(rc, d, 'Withdrawal Charge', withdrawn=cost)
        elif kind == 'airtime':
            self.sms(d, f"{rc} confirmed.You bought Ksh{ksh(amt)} of airtime on {dmy(d)} at {hm(d)}.New M-PESA balance is Ksh{b}. Transaction cost, Ksh0.00.")
            self.row(rc, d, 'Airtime Purchase', withdrawn=amt)
        return True
    def mshwari_borrow(self, d, principal):
        rc = code(d)
        fee = round(principal * 0.075); excise = round(fee * 0.2)
        dep = principal - excise
        self.bal += dep
        due = d + dt.timedelta(days=29)
        self.sms(d, f"{rc} Confirmed. Your M-Shwari loan has been approved on {dmy(d)} {hm(d)} and Ksh{ksh(dep)} less excise duty has been deposited to your M-PESA account. New M-PESA balance is Ksh{ksh(self.bal)}.")
        self.sms(d + dt.timedelta(seconds=30), f"Loan processed. Your total loan balance of Ksh.{ksh(principal + fee)} is due on {due.strftime('%d/%m/%Y')}. Facility fees charged is Ksh {ksh(fee)} and excise duty of Ksh.{ksh(excise)} has been deducted from your loan amount.", 'M-Shwari')
        self.row(rc, d, 'M-Shwari Loan Disbursement', paid_in=dep)
        self.mshwari = dict(taken=d, principal=principal, owed=principal + fee, due=due, fee=fee)
        self._repay_fuliza(d, rc)
    def mshwari_rollover(self, d):
        m = self.mshwari; roll = round(m['principal'] * 0.09)
        m['owed'] += roll
        self.sms(d, f"Dear Customer, we have applied a rollover fee of Ksh {ksh(roll)} inclusive of excise duty on your loan. Your loan balance is Ksh {ksh(m['owed'])} as at {d.strftime('%d/%m/%Y %H:%M')}.", 'M-Shwari')
    def mshwari_repay(self, d):
        m = self.mshwari; rc = code(d)
        if self.bal < m['owed']: return False
        self.bal -= m['owed']
        self.sms(d, f"{rc} Confirmed. Loan of Ksh{ksh(m['owed'])} repaid from M-PESA on {dmy(d)} at {hm(d)}. Loan balance is Ksh0.00. Transaction cost Kshs 0.00")
        self.row(rc, d, 'M-Shwari Loan Repayment', withdrawn=m['owed'])
        self.mshwari = None
        return True

W = Wallet()
PEOPLE = [('MAMA WANJIKU', '0722118845'), ('KEVIN OTIENO', '0712334907'), ('FAITH MWENDE', '0704558216'), ('BRIAN KIPCHUMBA', '0791220643'), ('MERCY ADHIAMBO', '0725990311'), ('JOSEPH MAINA MECHANIC', '0733451820'), ('ESTHER NJERI', '0700918442')]
COFFEE = ['JAVA HOUSE KIMATHI ST', 'ARTCAFFE WESTGATE', 'CONNECT COFFEE RIVERSIDE', 'DORMANS COFFEE YAYA']
FOOD = ['KFC JUNCTION', 'CJS RESTAURANT KOINANGE', 'MAMA OLIECH RESTAURANT', 'PIZZA INN WESTLANDS', 'KAREN BLIXEN COFFEE GARDEN']
GROCERY = ['NAIVAS WESTLANDS', 'QUICKMART KILIMANI', 'CARREFOUR JUNCTION', 'CHANDARANA FOOD PLUS YAYA']
NIGHT = ['THE ALCHEMIST BAR', 'BRIDGES LOUNGE WESTLANDS', 'K1 KLUBHOUSE']

d = START
mshwari_plan = {dt.date(2026, 1, 14): 12000, dt.date(2026, 4, 16): 14000, dt.date(2026, 7, 13): 15000, dt.date(2026, 9, 15): 16000}
while d < END:
    day = d.date(); wd = day.weekday()
    def at(h, m=None): return dt.datetime.combine(day, dt.time(h, m if m is not None else random.randint(0, 59), random.randint(0, 59)))
    # income: salary on the 26th via an employer's Equity bulk account
    if day.day == 26:
        W.receive(at(16), 148250.0, 'Equity Bulk Account 300600', 'Business Payment from 300600 - Equity Bulk Account via API.')
    if day.day in (9, 21) and random.random() < 0.55:
        amt = random.choice([4500, 7800, 12350, 6200])
        W.receive(at(19), float(amt), 'ACME DESIGN STUDIO LTD 0711002300' if random.random() < .5 else 'PATRICK OCHIENG 0798223104', 'Funds received from 2547****104 - SIDE GIG')
    # fixed costs early in the month
    if day.day == 2: W.pay(at(10), 38500.0, 'paybill', 'ZARA COURT APARTMENTS', acct='B12')
    if day.day == 3: W.pay(at(9), 15000.0, 'sent', *PEOPLE[0])  # family support
    if day.day == 5: W.pay(at(20), 3000.0, 'paybill', 'UMOJA WOMEN CHAMA', acct='AMANI')
    if day.day == 6: W.pay(at(18), 4950.0, 'paybill', 'SAFARICOM HOME FIBRE', acct='HF2231')
    if day.day == 8:
        W.pay(at(21, 5), 2100.0, 'paybill', 'MULTICHOICE KENYA LIMITED', acct='7012334')
        if day == dt.date(2026, 3, 8): W.pay(at(21, 12), 2100.0, 'paybill', 'MULTICHOICE KENYA LIMITED', acct='7012334')  # duplicate
    if day.day in (4, 18): W.pay(at(7, 40), random.choice([1500, 2000, 2500]) * 1.0, 'paybill', 'KPLC PREPAID', acct='37112908221')
    if day == dt.date(2026, 1, 8): W.pay(at(11), 32400.0, 'paybill', 'ST TERESA GIRLS SECONDARY', acct='ADM 4471')
    if day == dt.date(2026, 7, 21): W.pay(at(15), 46800.0, 'paybill', 'AGA KHAN UNIVERSITY HOSPITAL', acct='OP 99831')
    # M-Shwari: borrow mid-month when it gets tight
    if day in mshwari_plan and W.mshwari is None:
        W.mshwari_borrow(at(13), float(mshwari_plan[day]))
    if W.mshwari:
        m = W.mshwari; age = (day - m['taken'].date()).days
        if m['taken'].date() == dt.date(2026, 7, 13) and age == 6: W.mshwari_repay(at(12))       # repaid fast: earns cashback
        elif m['taken'].date() == dt.date(2026, 4, 16) and age == 31: W.mshwari_rollover(at(8, 5))  # rolled over
        elif m['taken'].date() == dt.date(2026, 4, 16) and age == 33: W.mshwari_repay(at(13))
        elif m['taken'].date() in (dt.date(2026, 1, 14), dt.date(2026, 9, 15)) and day.day == 27: W.mshwari_repay(at(9))
    # daily life
    if wd < 5 and random.random() < 0.62: W.pay(at(8, random.randint(5, 55)), random.choice([350, 420, 480, 550, 610]) * 1.0, 'till', random.choice(COFFEE))
    if wd < 5 and random.random() < 0.55: W.pay(at(13), random.choice([450, 650, 780, 900]) * 1.0, 'till', random.choice(FOOD))
    if wd == 5: W.pay(at(11), random.choice([4800, 6350, 7900, 9200, 5600]) * 1.0, 'till', random.choice(GROCERY))
    if wd in (4, 5) and random.random() < 0.7: W.pay(at(20), random.choice([1800, 2600, 3400, 4200]) * 1.0, 'till', random.choice(FOOD + ['JAVA HOUSE KIMATHI ST']))
    if wd in (4, 5) and random.random() < 0.35:
        late = dt.datetime.combine(day, dt.time(23, random.randint(10, 55))) + dt.timedelta(hours=random.choice([0, 1, 2]))
        W.pay(late, random.choice([1500, 2800, 3900]) * 1.0, 'till', random.choice(NIGHT))
    if random.random() < 0.28: W.pay(at(random.choice([7, 18, 19])), random.choice([300, 450, 600, 1000, 1500]) * 1.0, 'sent', *random.choice(PEOPLE[1:]))
    if random.random() < 0.1: W.pay(at(10), random.choice([100, 200, 250]) * 1.0, 'airtime', 'Airtime')
    if day.day in (12, 24) and random.random() < 0.5: W.pay(at(17), random.choice([2000, 3000]) * 1.0, 'withdraw', 'JIMBO AGENCIES WESTLANDS')
    if wd == 6 and random.random() < 0.6: W.pay(at(10), random.choice([2500, 3500, 4000]) * 1.0, 'till', random.choice(['TOTALENERGIES WAIYAKI WAY', 'SHELL LAVINGTON', 'RUBIS KILELESHWA']))
    d += dt.timedelta(days=1)

W.msgs.sort(key=lambda x: x[0]); W.rows.sort(key=lambda r: r[1])
msgs = [dict(date=m[0].strftime('%Y-%m-%dT%H:%M:%S'), sender=m[1], text=m[2]) for m in W.msgs]
json.dump(msgs, open(os.path.join(OUT, 'demo-mpesa-sms.json'), 'w'), indent=0)
open(os.path.join(OUT, 'demo-mpesa-sms.txt'), 'w').write('\n\n'.join(m['text'] for m in msgs))

# Android SMS Backup & Restore XML
epoch = dt.datetime(1970, 1, 1)
with open(os.path.join(OUT, 'demo-android-backup.xml'), 'w') as f:
    f.write(f"<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>\n<smses count=\"{len(msgs)}\">\n")
    for m in W.msgs:
        ms = int((m[0] - dt.timedelta(hours=3) - epoch).total_seconds() * 1000)
        f.write(f"  <sms protocol=\"0\" address={quoteattr(m[1])} date=\"{ms}\" type=\"1\" body={quoteattr(m[2])} read=\"1\" readable_date={quoteattr(m[0].strftime('%b %d, %Y %I:%M:%S %p'))} contact_name=\"(Unknown)\" />\n")
    f.write("</smses>\n")

# Statement-style PDF (password 123456)
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
tmp = os.path.join(OUT, '_stmt.pdf')
c = canvas.Canvas(tmp, pagesize=A4); Wd, H = A4
bal = 6420.55; rows = []
for r in W.rows:
    bal += r[3] - r[4]
    rows.append((r[0], r[1].strftime('%Y-%m-%d %H:%M:%S'), r[2], 'COMPLETED', r[3], r[4], bal))
rows.reverse()  # statements list newest first
def header(page):
    c.setFont('Helvetica-Bold', 13); c.drawString(40, H - 50, 'M-PESA STATEMENT  (DEMO, NOT A REAL DOCUMENT)')
    c.setFont('Helvetica', 8)
    c.drawString(40, H - 66, 'Customer Name: AMANI DEMO      Mobile Number: 0700 000 000      Statement Period: 01 Nov 2025 - 14 Nov 2026')
    c.drawString(40, H - 78, f'Page {page}')
    c.setFont('Helvetica-Bold', 7)
    y = H - 100
    for x, t in [(40, 'Receipt No.'), (95, 'Completion Time'), (170, 'Details'), (395, 'Transaction Status'), (455, 'Paid In'), (500, 'Withdrawn'), (548, 'Balance')]:
        c.drawString(x, y, t)
    return y - 12
page = 1; y = header(page); c.setFont('Helvetica', 6.6)
for r in rows:
    if y < 40:
        c.showPage(); page += 1; y = header(page); c.setFont('Helvetica', 6.6)
    det = r[2]
    c.drawString(40, y, r[0]); c.drawString(95, y, r[1]); c.drawString(170, y, det[:58]); c.drawString(395, y, r[3])
    c.drawRightString(490, y, ksh(r[4]) if r[4] else '0.00'); c.drawRightString(540, y, ('-' + ksh(r[5])) if r[5] else '0.00'); c.drawRightString(585, y, ksh(r[6]))
    if len(det) > 58:
        y -= 8; c.drawString(170, y, det[58:116])
    y -= 10
c.save()
rd = PdfReader(tmp); wr = PdfWriter()
for p in rd.pages: wr.add_page(p)
wr.encrypt('123456', algorithm='AES-128')
wr.write(os.path.join(OUT, 'demo-mpesa-statement.pdf')); os.remove(tmp)

# MTN MoMo Uganda-style and Airtel Money-style samples (formats approximate; illustrative only)
momo = []; b = 285000
dd = dt.datetime(2026, 9, 1, 9, 0)
for i in range(70):
    dd += dt.timedelta(hours=random.randint(6, 30)); tid = random.randint(10**10, 10**11 - 1)
    r = random.random()
    if (dd.day in (25, 26) and r < .9) or b < 110000:
        a = 950000 if dd.day in (25, 26) else 150000; b += a
        if a == 150000:
            momo.append(f"You have received UGX {a:,} from MUSOKE JOHN (256701234567) on {dd:%Y-%m-%d %H:%M:%S}. Your new balance: UGX {b:,}. Financial Transaction Id: {tid}.")
            continue
        momo.append(f"You have received UGX {a:,} from KAMPALA TRADERS LTD (256770000111) on {dd:%Y-%m-%d %H:%M:%S}. Reason: salary. Your new balance: UGX {b:,}. Financial Transaction Id: {tid}.")
    elif r < .55:
        a = random.choice([5000, 12000, 20000, 35000]); fee = 500 if a < 30000 else 1000; b -= a + fee
        momo.append(f"You have sent UGX {a:,} to NAKATO SARAH 256772123456 on {dd:%Y-%m-%d %H:%M:%S}. Fee: UGX {fee:,}. Your new balance: UGX {b:,}. Financial Transaction Id: {tid}.")
    elif r < .85:
        a = random.choice([8500, 15000, 22000, 46000]); b -= a
        momo.append(f"Payment of UGX {a:,} to {random.choice(['CAPITAL SHOPPERS NTINDA', 'CAFE JAVAS ACACIA', 'UMEME YAKA', 'NWSC WATER'])} was successful on {dd:%Y-%m-%d %H:%M:%S}. Fee: UGX 0. New balance: UGX {b:,}. Transaction Id: {tid}.")
    else:
        a = random.choice([50000, 100000]); fee = 2500; b -= a + fee
        momo.append(f"You have withdrawn UGX {a:,} from agent MUKWANO ENTERPRISES on {dd:%Y-%m-%d %H:%M:%S}. Fee: UGX {fee:,}. Your new balance: UGX {b:,}. Transaction Id: {tid}.")
open(os.path.join(OUT, 'demo-mtn-momo-uganda.txt'), 'w').write('\n\n'.join(momo))
airtel = []; b = 12000
dd = dt.datetime(2026, 9, 3, 10, 0)
for i in range(30):
    dd += dt.timedelta(hours=random.randint(8, 50)); tid = 'MP' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    if random.random() < .3 or b < 1500:
        a = random.choice([2000, 5000, 7500]); b += a
        airtel.append(f"{tid} Confirmed. You have received Ksh {a:,.2f} from OMONDI PETER 0733112244 on {dd:%d/%m/%y} at {dd:%I:%M %p}. Your Airtel Money balance is Ksh {b:,.2f}.")
    else:
        a = random.choice([150, 300, 700, 1200]); b -= a
        airtel.append(f"{tid} Confirmed. Ksh {a:,.2f} sent to {random.choice(['WANJIRU ANNE 0734556677', 'MATATU SACCO 0739001122'])} on {dd:%d/%m/%y} at {dd:%I:%M %p}. Your Airtel Money balance is Ksh {b:,.2f}. Cost Ksh 0.00.")
open(os.path.join(OUT, 'demo-airtel-money.txt'), 'w').write('\n\n'.join(airtel))
print(len(msgs), 'sms;', len(W.rows), 'statement rows;', len(momo), 'momo;', len(airtel), 'airtel')
