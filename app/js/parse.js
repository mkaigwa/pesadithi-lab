/* Pesadithi Lab: parsers. Everything runs in the browser; nothing is sent anywhere.
   Output: a list of transactions in one shape, whatever the source.
   { id, ts:'YYYY-MM-DDTHH:MM:SS', amt, dir:'in'|'out'|'none', type, party, account, fee, bal, cur, src, provider }
*/
(function () {
  const P = {};
  const num = (s) => (s == null ? null : parseFloat(String(s).replace(/[,\s]/g, '').replace(/\.$/, '')));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (y, mo, d, h, mi, s) => `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s || 0)}`;
  const year4 = (y) => (y < 100 ? 2000 + y : y);

  // "13/11/26 at 6:18 PM", "16/1/26 1:37 PM"
  function dateFromText(t) {
    let m = t.match(/on (\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      let h = +m[4] % 12; if (/pm/i.test(m[6])) h += 12;
      return iso(year4(+m[3]), +m[2], +m[1], h, +m[5], 0);
    }
    m = t.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return iso(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
    m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (m) {
      let h = +m[4]; if (m[6]) { h = h % 12; if (/pm/i.test(m[6])) h += 12; }
      return iso(year4(+m[3]), +m[2], +m[1], h, +m[5], 0);
    }
    return null;
  }
  P.dateFromText = dateFromText;
  const cleanParty = (s) => (s || '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  const PHONE = /(?:\+?\b(?:254|255|256|250|233|260|237|225|234|265)\d{8,10}\b|\b0[1-9]\d{8}\b|\b0?[17]\d{8}\b|\b\d{2,6}\*{2,}\d{2,4}\b|\(\+?\d{9,13}\))/g;
  const stripPhone = (s) => cleanParty((s || '').replace(PHONE, '').replace(/\(\s*\)/g, ''));
  const hasPhone = (s) => { PHONE.lastIndex = 0; return PHONE.test(s || ''); };
  P.hasPhone = hasPhone; P.stripPhone = stripPhone;

  /* ---------- Split raw input into messages ---------- */
  P.splitMessages = function (input, name) {
    const text = input.trim();
    if (!text) return [];
    if (text[0] === '[' || text[0] === '{') {
      try {
        let j = JSON.parse(text); if (!Array.isArray(j)) j = j.messages || j.data || [];
        return j.filter((m) => m && (m.text || m.body)).map((m) => ({ ts: m.date ? String(m.date).replace(' ', 'T').slice(0, 19) : null, sender: m.sender || m.address || '', text: String(m.text || m.body) }));
      } catch (e) { /* fall through to text */ }
    }
    if (/<smses|<sms\s/i.test(text.slice(0, 2000))) {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const out = [];
      doc.querySelectorAll('sms').forEach((n) => {
        const ms = +n.getAttribute('date');
        let ts = null;
        if (ms) { const d = new Date(ms); ts = iso(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()); }
        if (n.getAttribute('type') === '2') return; // sent by the user, not a confirmation
        out.push({ ts, sender: n.getAttribute('address') || '', text: n.getAttribute('body') || '' });
      });
      return out;
    }
    // Plain pasted text: split on blank lines, then on message starters inside long blocks
    const starters = /(?=\b[A-Z0-9]{10}\s*[Cc]onfirmed)|(?=Loan processed\.)|(?=Dear Customer,)|(?<![Cc]onfirmed\.\s?)(?=You have (?:received|sent|withdrawn) )|(?=Payment of [A-Z]{3})/;
    const blocks = text.split(/\n\s*\n/);
    const out = [];
    blocks.forEach((b) => b.split(starters).forEach((p) => { p = p.trim(); if (p.length > 15) out.push({ ts: null, sender: '', text: p }); }));
    return out;
  };

  /* ---------- Provider detection ---------- */
  P.detect = function (msgs) {
    const sample = msgs.slice(0, 400).map((m) => m.sender + ' ' + m.text).join('\n');
    const score = {
      mpesa: (sample.match(/M-PESA|Fuliza|M-Shwari|Mshwari|Ksh[\d ]/gi) || []).length,
      mtn: (sample.match(/\bMoMo\b|MTN|Financial Transaction Id|UGX|GHS|RWF|ZMW|XAF/gi) || []).length,
      airtel: (sample.match(/Airtel Money/gi) || []).length * 3
    };
    return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
  };

  /* ---------- M-PESA SMS ---------- */
  const A = 'Ksh ?([\\d,]+\\.\\d\\d)';
  P.mpesaSms = function (msgs) {
    const txs = [], skipped = [], byCode = {};
    let lastTs = null;
    const tc = (t) => { const m = t.match(/Transaction cost,? ?Kshs? ?([\d,]+\.\d\d)/); return m ? num(m[1]) : 0; };
    const bl = (t) => { const m = t.match(/M-PESA balance is ?Ksh ?([\d,]+\.\d\d)/i) || t.match(/M-PESA balance is ([\d,]+\.\d\d)/i); return m ? num(m[1]) : null; };
    msgs.forEach((m, i) => {
      const t = m.text.replace(/\s+/g, ' ').trim();
      const sender = (m.sender || '').toLowerCase();
      if (sender && !/m-?pesa|m-?shwari|fuliza|safaricom|^$/.test(sender) && !/M-PESA|Fuliza|M-Shwari/.test(t)) return;
      const cm = t.match(/^([A-Z0-9]{10})\s*[Cc]onfirmed/);
      const code = cm ? cm[1] : null;
      let ts = dateFromText(t) || (code && byCode[code]) || m.ts || lastTs;
      if (code && ts) byCode[code] = byCode[code] || ts;
      const base = { id: code || 'm' + i, ts, src: 'sms', provider: 'M-PESA', cur: 'KES', fee: 0, bal: bl(t), account: null, party: null };
      let r;
      if ((r = t.match(/Fuliza M-P[Ee][Ss][Aa] amount is Ksh ?([\d,.]+?)\.?\s+(?:Access )?(?:Fee|Interest) charged Ksh ?([\d,.]+?)\.?\s+Total Fuliza M-P[Ee][Ss][Aa] outstanding amount is Ksh ?([\d,.]+?)\.?\s/))) {
        txs.push({ ...base, type: 'credit_draw', dir: 'none', amt: num(r[1]), fee: num(r[2]), outstanding: num(r[3]), party: 'Fuliza', bal: null });
      } else if ((r = t.match(/Ksh ?([\d,]+\.\d\d) from your M-PESA has been used to (fully|partially) pay your outstanding Fuliza/i))) {
        txs.push({ ...base, type: 'credit_repay', dir: 'none', amt: num(r[1]), full: r[2] === 'fully', party: 'Fuliza' });
      } else if ((r = t.match(/M-Shwari loan has been approved .*?Ksh ?([\d,]+\.\d\d)/i))) {
        txs.push({ ...base, type: 'loan_in', dir: 'none', amt: num(r[1]), party: 'M-Shwari' });
      } else if ((r = t.match(/Loan processed\. Your (?:total )?loan balance of Ksh\.? ?([\d,]+(?:\.\d\d)?) is due on (\d{2})\/(\d{2})\/(\d{2,4}).*?(?:fee of Ksh ?([\d,]+(?:\.\d\d)?)|Facility fees charged is Ksh ?([\d,]+(?:\.\d\d)?))/i))) {
        const ex = t.match(/excise duty of Ksh\.? ?([\d,]+(?:\.\d\d)?)/i);
        txs.push({ ...base, type: 'loan_terms', dir: 'none', amt: num(r[1]), due: iso(year4(+r[4]), +r[3], +r[2], 0, 0, 0), facility: num(r[5] || r[6]), excise: ex ? num(ex[1]) : 0, party: 'M-Shwari' });
      } else if ((r = t.match(/applied a rollover fee of Ksh ?([\d,]+(?:\.\d\d)?)/i))) {
        txs.push({ ...base, type: 'loan_rollover', dir: 'none', amt: num(r[1]), party: 'M-Shwari', fee: num(r[1]) });
      } else if ((r = t.match(/Loan of Ksh ?([\d,]+\.\d\d) repaid from (?:your )?M-PESA/i))) {
        txs.push({ ...base, type: 'loan_repay', dir: 'none', amt: num(r[1]), party: 'M-Shwari', cleared: /Loan balance is Ksh ?0\.00|repaid in full/i.test(t) });
      } else if ((r = t.match(new RegExp(A + ' moved from (Pochi la Biashara|M-PESA) to (Pochi la Biashara|M-PESA)', 'i')))) {
        // Moving money between your own Pochi and M-PESA wallets: not income, not spending
        txs.push({ ...base, type: 'own_transfer', dir: 'none', amt: num(r[1]), party: 'Pochi la Biashara' });
      } else if ((r = t.match(new RegExp('received ' + A + ' from (.+?) on \\d', 'i')))) {
        const pochi = /\s+(?:to|into|in) your Pochi(?: la Biashara)?/i;
        const raw = r[2].replace(pochi, ''); txs.push({ ...base, type: 'received', dir: 'in', amt: num(r[1]), party: stripPhone(raw), person: hasPhone(raw), pochi: pochi.test(r[2]) || /Pochi/i.test(t) });
      } else if ((r = t.match(new RegExp(A + ' (sent|paid) to (.+?)(?: for account (.+?))? on \\d', 'i')))) {
        const raw = r[3]; const kind = r[2] === 'paid' ? 'till' : r[4] ? 'paybill' : 'sent';
        txs.push({ ...base, type: kind, dir: 'out', amt: num(r[1]), party: stripPhone(raw), account: r[4] || null, fee: tc(t), person: kind === 'sent' || (kind === 'till' && hasPhone(raw)) });
      } else if ((r = t.match(new RegExp('Withdraw ' + A + ' from (.+?) New', 'i')))) {
        txs.push({ ...base, type: 'withdraw', dir: 'out', amt: num(r[1]), party: cleanParty(r[2]).replace(/^\d+\s*-\s*/, ''), fee: tc(t) });
      } else if ((r = t.match(new RegExp('bought ' + A + ' of airtime', 'i')))) {
        txs.push({ ...base, type: 'airtime', dir: 'out', amt: num(r[1]), party: 'Airtime', fee: tc(t) });
      } else if ((r = t.match(new RegExp('transferred to M-Shwari|sent to M-Shwari', 'i'))) && (r = t.match(new RegExp(A)))) {
        txs.push({ ...base, type: 'savings_out', dir: 'none', amt: num(r[1]), party: 'M-Shwari savings' });
      } else if (/reversal|reversed/i.test(t) && code) {
        const a = t.match(new RegExp(A)); const ref = t.match(/Reversal of transaction ([A-Z0-9]{10})/i);
        txs.push({ ...base, type: 'reversal', dir: 'none', amt: a ? num(a[1]) : 0, party: 'Reversal', ref: ref ? ref[1] : null });
      } else {
        if (/Ksh ?[\d,]+\.\d\d/.test(t) && /Confirmed|received|sent|paid|withdraw/i.test(t) && !/^Dear Customer|Pay your loan|loan limit|cashback|Did you know|Hongera|Congratulations/i.test(t)) skipped.push(t.slice(0, 160));
        return;
      }
      if (ts) lastTs = ts;
    });
    // Second pass: fill missing timestamps from paired codes
    txs.forEach((x) => { if (!x.ts && byCode[x.id]) x.ts = byCode[x.id]; });
    // Reversed payments are not spending: mark the original
    const reversed = new Set(txs.filter((x) => x.type === 'reversal' && x.ref).map((x) => x.ref));
    txs.forEach((x) => { if (reversed.has(x.id) && x.type !== 'reversal') x.reversed = true; });
    return { txs: txs.filter((x) => x.ts), skipped };
  };

  /* ---------- M-PESA statement (PDF text or CSV) ---------- */
  P.mpesaStatementText = function (text) {
    const t = text.replace(/\s+/g, ' ');
    const re = /([A-Z0-9]{10}) (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (.*?) (COMPLETED|FAILED|Completed|Failed|PENDING) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)((?: (?![A-Z0-9]{10} \d{4}-)[^\s]+){0,4})/g;
    const rows = []; let m;
    while ((m = re.exec(t))) {
      let tail = (m[8] || '').trim();
      // Cut page headers and footers that pdf text extraction glues onto a wrapped detail line
      tail = tail.replace(/\s*(?:\bM-?PESA\b|\bSTATEMENT\b|Customer Name|Mobile Number|Statement Period|\bPage\s+\d|Receipt No|Completion Time|Disclaimer).*$/i, '').trim();
      rows.push({ receipt: m[1], time: m[2], details: (m[3] + (tail && !/\d{4}-/.test(tail) && tail.length < 30 ? (tail.length <= 4 ? '' : ' ') + tail : '')).trim(), status: m[4].toUpperCase(), paidIn: num(m[5]), withdrawn: Math.abs(num(m[6])), balance: num(m[7]) });
    }
    return P.mpesaStatementRows(rows);
  };
  P.mpesaStatementCsv = function (text) {
    const rows = d3.csvParse(text);
    const k = (o, re) => o[Object.keys(o).find((x) => re.test(x))];
    return P.mpesaStatementRows(rows.map((o) => ({ receipt: k(o, /receipt/i), time: (k(o, /time|date/i) || '').trim(), details: k(o, /detail/i) || '', status: (k(o, /status/i) || 'COMPLETED').toUpperCase(), paidIn: num(k(o, /paid ?in/i)) || 0, withdrawn: Math.abs(num(k(o, /withdrawn/i)) || 0), balance: num(k(o, /balance/i)) })));
  };
  P.mpesaStatementRows = function (rows) {
    const txs = [], skipped = [];
    // statements list newest first; sort oldest first so balances flow
    rows.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
    const feeByReceipt = {};
    rows.forEach((r, i) => {
      if (r.status !== 'COMPLETED') return;
      const d = r.details; const ts = r.time.replace(' ', 'T');
      const amt = r.paidIn || r.withdrawn; const dir = r.paidIn ? 'in' : 'out';
      const base = { id: r.receipt + '-' + i, receipt: r.receipt, ts, amt, src: 'statement', provider: 'M-PESA', cur: 'KES', fee: 0, bal: r.balance, account: null };
      const party = (s) => stripPhone((s || '').replace(/^.*? - /, '').replace(/\s+Acc\.?.*$/i, ''));
      if (/Charge\b|Access Fee/i.test(d)) { feeByReceipt[r.receipt] = (feeByReceipt[r.receipt] || 0) + amt; txs.push({ ...base, type: 'fee', dir: 'none', party: d.replace(/ Charge.*$/i, ' charge') }); return; }
      if (/OverDraft of Credit Party|Fuliza M-?Pesa.*(?:Draw|Overdraft)/i.test(d)) return txs.push({ ...base, type: 'credit_draw', dir: 'none', party: 'Fuliza' });
      if (/OD Loan Repayment|Overdraw|Fuliza.*Repay/i.test(d)) return txs.push({ ...base, type: 'credit_repay', dir: 'none', party: 'Fuliza' });
      if (/M-?Shwari Loan|KCB M-?PESA Loan|Loan Disbursement/i.test(d)) return txs.push({ ...base, type: dir === 'in' ? 'loan_in' : 'loan_repay', dir: 'none', party: /KCB/i.test(d) ? 'KCB M-PESA' : 'M-Shwari', cleared: true });
      if (/M-?Shwari (Withdraw|Deposit)|Lock Savings|Ziidi|MMF/i.test(d)) return txs.push({ ...base, type: dir === 'in' ? 'savings_in' : 'savings_out', dir: 'none', party: 'Savings' });
      if (/Airtime/i.test(d)) return txs.push({ ...base, type: 'airtime', party: 'Airtime', dir });
      if (/Withdrawal At Agent|Agent Withdrawal|Withdraw/i.test(d)) return txs.push({ ...base, type: 'withdraw', dir: 'out', party: party(d) });
      if (/Funds received from|Business Payment from|Received from|Deposit of Funds|Promotion Payment|Reversal/i.test(d) && dir === 'in') return txs.push({ ...base, type: /Reversal/i.test(d) ? 'reversal' : 'received', dir: /Reversal/i.test(d) ? 'none' : 'in', party: /Business Payment from \d+ - (.+?)(?: via| Original|$)/i.test(d) ? d.match(/Business Payment from \d+ - (.+?)(?: via| Original|$)/i)[1] : party(d), person: hasPhone(d) || /Funds received from 2547/i.test(d) });
      if (/Pay Bill/i.test(d)) { const acc = d.match(/Acc\.?\s*(.+)$/i); return txs.push({ ...base, type: 'paybill', dir: 'out', party: party(d), account: acc ? acc[1] : null }); }
      if (/Merchant Payment|Buy Goods|Till/i.test(d)) return txs.push({ ...base, type: 'till', dir: 'out', party: party(d) });
      if (/Customer Transfer to|Send Money|Customer Send Money/i.test(d)) return txs.push({ ...base, type: 'sent', dir: 'out', party: party(d), person: true });
      if (dir === 'in') return txs.push({ ...base, type: 'received', dir: 'in', party: party(d) });
      skipped.push(d.slice(0, 120));
      txs.push({ ...base, type: 'other', dir: 'out', party: party(d) || 'Other' });
    });
    // a reversal row cancels the most recent payment of the same amount
    txs.forEach((x, i) => { if (x.type === 'reversal') { for (let j = i - 1; j >= 0 && j > i - 40; j--) { const y = txs[j]; if (y.dir === 'out' && Math.abs(y.amt - x.amt) < 0.01 && !y.reversed) { y.reversed = true; break; } } } });
    // attach charges to their parent transaction
    txs.forEach((x) => { if (x.type !== 'fee' && feeByReceipt[x.receipt] && !x._feeSet) { x.fee = feeByReceipt[x.receipt]; x._feeSet = true; feeByReceipt[x.receipt] = 0; } });
    return { txs, skipped };
  };

  /* ---------- Generic mobile money SMS (MTN MoMo, Airtel Money and others) — beta ---------- */
  const CUR = '(UGX|GHS|GHC|RWF|ZMW|XAF|XOF|TZS|TSh|KES|Ksh|KSh|MWK|NGN|SLE|LRD|USD)';
  P.genericSms = function (msgs, providerName) {
    const txs = [], skipped = [];
    const amtRe = new RegExp('(?:' + CUR + '\\.?\\s?(-?[\\d,]+(?:\\.\\d+)?))|(?:(-?[\\d,]+(?:\\.\\d+)?)\\s?' + CUR + ')', 'i');
    msgs.forEach((m, i) => {
      const t = m.text.replace(/\s+/g, ' ').trim();
      const am = t.match(amtRe);
      if (!am) return; // no money in it: chats, promotions
      const curRaw = am[1] || am[4]; const amount = num(am[2] || am[3]);
      if (/failed|unsuccessful|declined|insufficient|not successful/i.test(t)) { skipped.push(t.slice(0, 140)); return; }
      let dir = null, type = 'other';
      const isLoan = /\b(loan|mokash|borrow|qwik ?loan|wewole|xtracash|airtel money loan|overdraft)\b/i.test(t);
      if (/(have received|received|credited|deposit(ed)? (of|to your)|cash in|disbursed)/i.test(t)) { dir = 'in'; type = 'received'; }
      if (/(have sent|\bsent\b|sent to|transferred to|transferred|payment of|paid to|payment to|you have paid|debited|withdrawn|withdraw|cash out|bought|purchase|repaid|repayment)/i.test(t) && !/received|credited/i.test(t.slice(0, 40))) {
        dir = 'out'; type = /withdraw|cash out/i.test(t) ? 'withdraw' : /payment|paid|bought|purchase/i.test(t) ? 'till' : 'sent';
      }
      if (isLoan && dir === 'in') { type = 'loan_in'; }
      if (isLoan && dir === 'out' && /repa/i.test(t)) { type = 'loan_repay'; }
      const ts = dateFromText(t) || m.ts;
      if (!dir) { skipped.push(t.slice(0, 140)); return; }
      if (!ts) { skipped.push('(no date) ' + t.slice(0, 130)); return; }
      const cur = curRaw.toUpperCase().replace('KSH', 'KES').replace('TSH', 'TZS').replace('GHC', 'GHS');
      const pm = t.match(dir === 'in' ? /from (?:agent )?([A-Z][A-Za-z .'&-]+?)(?=\s*[(,.]|\s+on\s|\s+\d|\s+Reason|$)/ : /(?:to|agent|from agent|from) ([A-Z][A-Za-z .'&-]+?)(?=\s*[(,.]|\s+on\s|\s+\d|\s+was|\s+Reason|$)/);
      const fee = t.match(new RegExp('(?:Fee|Cost|Charge|Interest)s?:?\\s*(?:' + CUR + ')?\\.?\\s?([\\d,]+(?:\\.\\d+)?)', 'i'));
      const bal = t.match(new RegExp('(?:new balance|balance is|balance:|Bal:?)\\s*(?:' + CUR + ')?\\.?\\s?(-?[\\d,]+(?:\\.\\d+)?)', 'i'));
      const id = t.match(/(?:Transaction Id|TID|Txn ID|ID):?\s*([A-Z0-9.]+)/i) || t.match(/^([A-Z0-9]{8,12})\s/);
      const rawParty = pm ? pm[1] : '';
      const loanT = type === 'loan_in' || type === 'loan_repay';
      txs.push({ id: id ? id[1] : 'g' + i, ts, amt: Math.abs(amount), dir: loanT ? 'none' : dir, type, party: loanT ? 'Mobile loan' : (stripPhone(rawParty) || (type === 'withdraw' ? 'Cash withdrawal' : 'Unknown')), person: !loanT && (hasPhone(t) || type === 'sent'), account: null, fee: fee ? num(fee[fee.length - 1]) : 0, bal: bal ? num(bal[bal.length - 1]) : null, cur, src: 'sms', provider: providerName, cleared: true });
    });
    return { txs, skipped };
  };

  /* ---------- Entry point ---------- */
  P.fromMessages = function (raw, name) {
    const msgs = P.splitMessages(raw, name);
    if (!msgs.length) return { txs: [], skipped: [], provider: null, messages: 0 };
    // CSV statement pasted or uploaded
    if (/Receipt No/i.test(raw.slice(0, 400)) && /,/.test(raw.slice(0, 400))) { const r = P.mpesaStatementCsv(raw); return { ...r, provider: 'M-PESA', messages: r.txs.length, kind: 'statement' }; }
    const prov = P.detect(msgs);
    const r = prov === 'mpesa' ? P.mpesaSms(msgs) : P.genericSms(msgs, prov === 'mtn' ? 'MTN MoMo' : 'Airtel Money');
    return { ...r, provider: prov === 'mpesa' ? 'M-PESA' : prov === 'mtn' ? 'MTN MoMo' : 'Airtel Money', messages: msgs.length, kind: 'sms' };
  };

  let pdfLib = null;
  P.preloadPdf = function () {
    if (!pdfLib) pdfLib = import(window.PD_PDFJS_LIB || new URL('vendor/pdf.min.js', document.baseURI).href).then((lib) => { lib.GlobalWorkerOptions.workerSrc = window.PD_PDFJS_WORKER || new URL('vendor/pdf.worker.min.js', document.baseURI).href; try { lib.__pdWorker = new lib.PDFWorker(); } catch (e) { /* falls back to a worker per document */ } return lib; }).catch((e) => { pdfLib = null; const err = new Error('PDF reader failed to load'); err.pdLoad = true; err.cause = e; throw err; });
    return pdfLib;
  };
  P.fromPdf = async function (arrayBuffer, password) {
    const lib = await P.preloadPdf();
    const doc = await lib.getDocument({ data: arrayBuffer, password: password || undefined, isEvalSupported: false, worker: lib.__pdWorker || undefined }).promise;
    let text = '';
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const c = await page.getTextContent();
      text += ' ' + c.items.map((i) => i.str).join(' ');
    }
    const r = P.mpesaStatementText(text);
    return { ...r, provider: 'M-PESA', messages: r.txs.length, kind: 'statement', pages: doc.numPages };
  };

  window.PDParse = P;
})();
