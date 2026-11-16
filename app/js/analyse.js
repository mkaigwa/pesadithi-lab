/* Pesadithi Lab: analysis. Pure functions over normalised transactions. */
(function () {
  const M = window.PDMerchants;
  const day = (ts) => ts.slice(0, 10);
  const pD = (s) => new Date(s.slice(0, 10) + 'T00:00:00Z');
  const addDays = (s, n) => { const d = pD(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const SPEND = new Set(['sent', 'paybill', 'till', 'withdraw', 'airtime', 'other']);
  const norm = (s) => (s || '').toUpperCase().replace(/\s+/g, ' ').replace(/\b(LTD|LIMITED|PLC|CO)\b\.?/g, '').replace(/[-\s]+\d{1,3}$/, '').replace(/[^A-Z0-9 &'.-]/g, '').trim();
  const quantile = (arr, q) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); const i = (a.length - 1) * q; const lo = Math.floor(i); return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo); };

  function analyse(all, opts) {
    opts = opts || {};
    const txs = all.filter((t) => !t.reversed && (!opts.start || t.ts >= opts.start) && (!opts.end || t.ts <= opts.end + 'T23:59:59')).sort((a, b) => (a.ts < b.ts ? -1 : 1));
    if (!txs.length) return null;
    const cur = (d3.rollups(txs, (v) => v.length, (t) => t.cur).sort((a, b) => b[1] - a[1])[0] || ['KES'])[0];
    const start = day(txs[0].ts), end = day(txs[txs.length - 1].ts);
    const nDays = Math.round((pD(end) - pD(start)) / 864e5) + 1;
    const ins = txs.filter((t) => t.dir === 'in' && t.type === 'received');
    const outs = txs.filter((t) => t.dir === 'out' && SPEND.has(t.type));
    outs.forEach((t) => { const k = M.lookup(t.party, t.type, t.person); t.category = t.category || k.category; t.note = k.note; });
    ins.forEach((t) => { const k = M.lookup(t.party, t.type, t.person); t.category = t.category || (k.category === M.categories.banks ? 'From your banks' : t.person ? 'From people' : 'Other income'); t.note = k.note; });
    const sum = (a, f) => d3.sum(a, f || ((t) => t.amt));
    const totalIn = sum(ins), totalOut = sum(outs);
    const ownOut = sum(outs.filter((t) => M.OWN_MONEY.includes(t.category)));

    /* daily series: closing balance, credit owed, flows */
    const days = []; { let d = start; while (d <= end) { days.push(d); d = addDays(d, 1); } }
    const byDay = d3.group(txs, (t) => day(t.ts));
    let bal = null, owed = 0;
    const credit = txs.filter((t) => t.type === 'credit_draw' || t.type === 'credit_repay');
    const hasCredit = credit.length > 0;
    const daily = days.map((d) => {
      const list = byDay.get(d) || [];
      let peakOwed = owed;
      list.forEach((t) => {
        if (t.bal != null) bal = t.bal;
        if (t.type === 'credit_draw') { owed = t.outstanding != null ? t.outstanding : owed + t.amt + (t.fee || 0); peakOwed = Math.max(peakOwed, owed); }
        if (t.type === 'credit_repay') owed = t.full ? 0 : Math.max(0, owed - t.amt);
      });
      if (owed < 1) owed = 0;
      return { date: d, balance: bal, owed, peakOwed, in: sum(list.filter((t) => t.dir === 'in' && t.type === 'received')), out: sum(list.filter((t) => t.dir === 'out' && SPEND.has(t.type))) };
    });
    // statements: balance can be inferred backwards for days before first balance
    const firstBal = daily.find((x) => x.balance != null);
    daily.forEach((x) => { if (x.balance == null) x.balance = firstBal ? firstBal.balance : 0; });

    /* monthly */
    const dim = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
    const months = d3.rollups(daily, (v) => ({ in: d3.sum(v, (x) => x.in), out: d3.sum(v, (x) => x.out), creditDays: v.filter((x) => x.owed > 0).length, days: v.length }), (x) => x.date.slice(0, 7)).map(([m, v]) => ({ month: m, ...v, partial: v.days < dim(m) }));
    const monthsEq = nDays / 30.44;
    const fullMonths = months.filter((m) => !m.partial);

    /* calendar + day-of-month profile */
    const dom = d3.range(1, 32).map((n) => {
      const v = daily.filter((x) => +x.date.slice(8, 10) === n);
      return { day: n, in: d3.sum(v, (x) => x.in), out: d3.sum(v, (x) => x.out), creditDraw: sum(credit.filter((t) => t.type === 'credit_draw' && +t.ts.slice(8, 10) === n)), medianBalance: d3.median(v, (x) => x.balance) || 0, creditShare: v.length ? v.filter((x) => x.owed > 0).length / v.length : 0 };
    });
    const bigInDays = dom.filter((x) => x.in > 0).sort((a, b) => b.in - a.in).slice(0, 3).map((x) => x.day);
    const lowDay = dom.filter((x) => x.day <= 28).sort((a, b) => a.medianBalance - b.medianBalance)[0];

    /* clock heatmap */
    const heat = [];
    for (let w = 0; w < 7; w++) for (let h = 0; h < 24; h++) heat.push({ weekday: w, hour: h, amount: 0, count: 0 });
    outs.filter((t) => !M.OWN_MONEY.includes(t.category) && t.category !== M.categories.business).forEach((t) => {
      const d = new Date(t.ts.slice(0, 19) + 'Z'); const w = (d.getUTCDay() + 6) % 7; const h = d.getUTCHours();
      const c = heat[w * 24 + h]; c.amount += t.amt; c.count++;
    });
    const spendHours = outs.filter((t) => !M.OWN_MONEY.includes(t.category));
    const lateNight = spendHours.filter((t) => { const h = +t.ts.slice(11, 13); return h >= 22 || h < 4; });
    const weekend = spendHours.filter((t) => { const w = new Date(t.ts.slice(0, 10) + 'T00:00:00Z').getUTCDay(); return w === 0 || w === 6; });
    const byHour = d3.range(24).map((h) => d3.sum(heat.filter((c) => c.hour === h), (c) => c.amount));
    const peakHour = byHour.indexOf(d3.max(byHour));
    const byWd = d3.range(7).map((w) => d3.sum(heat.filter((c) => c.weekday === w), (c) => c.amount));
    const peakWd = byWd.indexOf(d3.max(byWd));

    /* money lifespan after big inflows */
    const inAmts = ins.map((t) => t.amt);
    const bigCut = Math.max(quantile(inAmts, 0.9), Math.min(3 * (d3.median(inAmts) || 0), 0.5 * (d3.max(inAmts) || 0)));
    const bigIns = ins.filter((t) => t.amt >= bigCut);
    // Half-life: days until half (and three quarters) of a big inflow has left the wallet
    const walletOut = txs.filter((t) => t.dir === 'out' && SPEND.has(t.type) && !M.OWN_MONEY.includes(t.category) && t.category !== M.categories.business);
    const lifeFor = (share) => bigIns.map((t) => {
      let spent = 0;
      for (const o of walletOut) { if (o.ts <= t.ts) continue; spent += o.amt + (o.fee || 0); if (spent >= t.amt * share) return (new Date(o.ts + 'Z') - new Date(t.ts + 'Z')) / 864e5; }
      return null;
    }).filter((x) => x != null);
    const lifespans = lifeFor(0.5), lifespans75 = lifeFor(0.75);
    // Drain curve: average share of a big inflow still unspent, day by day for 31 days
    const drain = d3.range(0, 31).map((dd) => {
      const vals = bigIns.map((t) => {
        const t0 = new Date(t.ts + 'Z'); let spent = 0;
        for (const o of walletOut) { if (o.ts <= t.ts) continue; const age = (new Date(o.ts + 'Z') - t0) / 864e5; if (age > dd) break; spent += o.amt + (o.fee || 0); }
        return Math.max(0, 1 - spent / t.amt);
      });
      return { day: dd, remaining: vals.length ? d3.mean(vals) : null };
    });
    /* payees */
    const payees = d3.rollups(outs, (v) => ({ total: sum(v), count: v.length, first: v[0].ts, last: v[v.length - 1].ts, category: v[0].category, note: v[0].note, person: !!v[0].person, typical: d3.median(v, (t) => t.amt), type: v[0].type, months: d3.rollups(v, (w) => sum(w), (t) => t.ts.slice(0, 7)) }), (t) => norm(t.party) || 'UNKNOWN')
      .map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
    const people = payees.filter((p) => p.person);
    const merchants = payees.filter((p) => !p.person && !M.OWN_MONEY.includes(p.category));
    const categories = d3.rollups(outs, (v) => ({ total: sum(v), count: v.length }), (t) => t.category).map(([category, v]) => ({ category, ...v, own: M.OWN_MONEY.includes(category) })).sort((a, b) => b.total - a.total);
    const inSources = d3.rollups(ins, (v) => sum(v), (t) => t.category).map(([source, total]) => ({ source, total })).sort((a, b) => b.total - a.total);

    /* credit (overdraft) */
    const draws = credit.filter((t) => t.type === 'credit_draw');
    const creditDays = daily.filter((x) => x.owed > 0).length;
    let redraw = 0;
    txs.forEach((t, i) => { if (t.type === 'credit_repay') { const d = day(t.ts); if (txs.slice(i + 1, i + 60).some((x) => x.type === 'credit_draw' && day(x.ts) === d)) redraw++; } });
    let dailyCharges = 0; { let o = 0; credit.forEach((t) => { if (t.type === 'credit_draw' && t.outstanding != null) { const ch = t.outstanding - (o + t.amt + (t.fee || 0)); if (ch > 0.005 && ch <= Math.max(100, 0.05 * o)) dailyCharges += ch; o = t.outstanding; } else if (t.type === 'credit_repay') { if (t.full && t.amt - o > 0 && t.amt - o <= Math.max(100, 0.05 * o)) dailyCharges += t.amt - o; o = t.full ? 0 : Math.max(0, o - t.amt); } }); }
    const accessKnown = sum(draws, (t) => t.fee || 0) > 0;
    const accessFees = accessKnown ? sum(draws, (t) => t.fee || 0) : Math.round(sum(draws) * 0.01);
    const creditFeesEstimated = hasCredit && !accessKnown;
    const creditFees = accessFees + dailyCharges;

    /* loans (M-Shwari style) */
    const loans = []; let cur_ = null;
    txs.forEach((t) => {
      if (t.type === 'loan_in') { cur_ = { lender: t.party || 'Loan', taken: t.ts, received: t.amt, principal: null, facility: 0, excise: 0, rollover: 0, repaid: null, due: null }; loans.push(cur_); }
      if (t.type === 'loan_terms' && cur_) { cur_.facility = t.facility || 0; cur_.excise = t.excise || 0; cur_.principal = (t.amt || 0) - (t.facility || 0); cur_.due = t.due; }
      if (t.type === 'loan_rollover' && cur_) cur_.rollover += t.amt;
      if (t.type === 'loan_repay' && cur_ && !cur_.repaid) { cur_.repaidAmt = t.amt; if (t.cleared !== false) cur_.repaid = t.ts; }
    });
    loans.forEach((l) => {
      l.principal = l.principal || l.received;
      if (!l.facility && l.repaidAmt) l.facility = Math.max(0, l.repaidAmt - l.received);
      l.days = l.repaid ? Math.round((new Date(l.repaid + 'Z') - new Date(l.taken + 'Z')) / 864e5) : null;
      l.cost = l.facility + l.excise + l.rollover;
      // The 20% early-repayment refund is an M-Shwari rule; other lenders only show their cost
      l.cashbackMissed = l.lender === 'M-Shwari' && l.days != null && l.days > 10 ? Math.round(l.facility * 0.2) : 0;
    });
    const loanCost = sum(loans, (l) => l.cost);

    /* fees */
    const txFees = sum(txs.filter((t) => SPEND.has(t.type) || t.type === 'received'), (t) => t.fee || 0) + sum(txs.filter((t) => t.type === 'fee' && !/access fee/i.test(t.party || '')));
    const feesTotal = txFees + creditFees + loanCost;
    const feeMonths = months.map((m) => ({ month: m.month,
      transaction: sum(txs.filter((t) => t.ts.startsWith(m.month) && (SPEND.has(t.type) || t.type === 'fee')), (t) => (t.type === 'fee' ? t.amt : t.fee || 0)),
      credit: accessKnown ? sum(draws.filter((t) => t.ts.startsWith(m.month)), (t) => t.fee || 0) : Math.round(sum(draws.filter((t) => t.ts.startsWith(m.month))) * 0.01),
      loans: sum(loans.filter((l) => l.taken.startsWith(m.month)), (l) => l.facility + l.excise),
      penalties: sum(loans.filter((l) => l.taken.startsWith(m.month)), (l) => l.rollover) }));

    /* avoidable + outliers */
    const avoidable = [];
    loans.forEach((l) => { if (l.rollover) avoidable.push({ date: l.taken, what: 'Loan rollover penalty', amount: l.rollover, note: `Loan of ${fmt(l.principal, cur)} ran ${l.days} days, past its due date.` }); if (l.cashbackMissed) avoidable.push({ date: l.taken, what: 'Early-repayment cashback missed', amount: l.cashbackMissed, note: `Repaid after ${l.days} days. Repaying within 10 days refunds 20% of the facility fee, where the lender offers it.` }); });
    const dupes = [];
    outs.forEach((t, i) => { const n = outs[i + 1]; if (n && norm(n.party) === norm(t.party) && n.amt === t.amt && (new Date(n.ts + 'Z') - new Date(t.ts + 'Z')) < 30 * 6e4) dupes.push({ date: n.ts, what: 'Possible double payment', amount: n.amt, note: `${n.party}: same amount twice within ${Math.round((new Date(n.ts + 'Z') - new Date(t.ts + 'Z')) / 6e4)} minutes. Check whether it was refunded.`, party: n.party }); });
    avoidable.sort((a, b) => (a.date < b.date ? -1 : 1));
    const outAmts = outs.map((t) => t.amt);
    const payeeStats = d3.rollup(outs, (v) => ({ n: v.length, med: d3.median(v, (t) => t.amt) }), (t) => norm(t.party));
    const biggest = outs.filter((t) => !M.OWN_MONEY.includes(t.category) && t.type !== 'withdraw' && t.category !== M.categories.business).filter((t) => { const p = payeeStats.get(norm(t.party)); return p.n <= 2 || t.amt >= 3 * p.med; }).slice().sort((a, b) => b.amt - a.amt).slice(0, 6);
    const dayOut = daily.map((x) => x.out).filter((v) => v > 0);
    const q3 = quantile(dayOut, 0.75), iqr = q3 - quantile(dayOut, 0.25);
    const spikeDays = daily.filter((x) => x.out > q3 + 3 * iqr).sort((a, b) => b.out - a.out).slice(0, 6);

    /* habits */
    const cafe = outs.filter((t) => t.category === M.categories.eating);
    const smallCut = quantile(outAmts, 0.25);
    const habits = {
      cafeVisits: cafe.length, cafeSpend: sum(cafe), cafePerWeek: cafe.length / (nDays / 7),
      lateNightCount: lateNight.length, lateNightSpend: sum(lateNight), lateNightShare: sum(spendHours) ? sum(lateNight) / sum(spendHours) : 0,
      weekendShare: sum(spendHours) ? sum(weekend) / sum(spendHours) : 0,
      smallPayments: outs.filter((t) => t.amt <= smallCut).length, smallCut,
      peopleSends: outs.filter((t) => t.person).length, peopleFees: sum(outs.filter((t) => t.person), (t) => t.fee || 0),
      drawsAfter7pm: draws.filter((t) => +t.ts.slice(11, 13) >= 19).length, medianDraw: d3.median(draws, (t) => t.amt) || 0,
      redraw, peakHour, peakWeekday: peakWd
    };

    const trend = fullMonths.length >= 2 ? { first: fullMonths[0], last: fullMonths[fullMonths.length - 1] } : null;
    const txCount = ins.length + outs.length;
    return { cur, start, end, nDays, monthsEq, txCount, accessFees, creditFeesEstimated, txs, ins, outs, totalIn, totalOut, ownOut, spend: totalOut - ownOut, daily, months, dom, bigInDays, lowDay, heat, byHour, byWd, lifespans, drain, bigInsCount: bigIns.length, lifespan: d3.median(lifespans) || null, lifespan75: d3.median(lifespans75) || null, bigCut, payees, people, merchants, categories, inSources, hasCredit, draws, creditDays, creditDrawn: sum(draws), creditFees, dailyCharges, loans, loanCost, txFees, feesTotal, feeMonths, avoidable, avoidableTotal: sum(avoidable, (a) => a.amount), toCheck: dupes, biggest, spikeDays, habits, trend };
  }

  function fmt(v, cur) { return (cur || 'KES') + ' ' + d3.format(',.0f')(v || 0); }

  /* Compact, anonymised summary for any AI assistant. Aggregates only; people are never named. */
  function summary(A, opts) {
    opts = opts || {};
    const r = (v) => Math.round(v || 0);
    return {
      tool: 'Pesadithi Lab', ...(opts.demo ? { data: 'DEMO: invented data for a fictional person, not real' } : {}), provider: opts.provider || null, currency: A.cur, period: { from: A.start, to: A.end, days: A.nDays },
      totals: { money_in: r(A.totalIn), money_out: r(A.totalOut), moved_to_own_accounts_or_savings: r(A.ownOut), spending: r(A.spend), fees_and_charges: r(A.feesTotal), avoidable: r(A.avoidableTotal) },
      timing: { days_until_half_of_a_big_inflow_is_spent: A.lifespan ? +A.lifespan.toFixed(1) : null, days_until_three_quarters_spent: A.lifespan75 ? +A.lifespan75.toFixed(1) : null, biggest_inflow_days_of_month: A.bigInDays, lowest_balance_day_of_month: A.lowDay ? A.lowDay.day : null, peak_spend_hour: String(A.habits.peakHour).padStart(2, '0') + ':00-' + String(A.habits.peakHour).padStart(2, '0') + ':59', peak_spend_weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][A.habits.peakWeekday], late_night_share: +(A.habits.lateNightShare * 100).toFixed(1), weekend_share: +(A.habits.weekendShare * 100).toFixed(1) },
      monthly: A.months.map((m) => ({ month: m.month, in: r(m.in), out: r(m.out), days_in_overdraft: m.creditDays, ...(m.partial ? { partial_month: true, days_covered: m.days } : {}) })),
      spending_by_category: A.categories.map((c) => ({ category: c.category, total: r(c.total), payments: c.count })),
      top_merchants: A.merchants.filter((p) => p.category !== M.categories.other && p.category !== M.categories.people).slice(0, opts.merchants || 12).map((p) => ({ name: p.name, category: p.category, total: r(p.total), payments: p.count })),
      other_businesses_not_named: { total: r(d3.sum(A.merchants.filter((p) => p.category === M.categories.other), (p) => p.total)), payees: A.merchants.filter((p) => p.category === M.categories.other).length },
      people: { recipients: A.people.length, sends: A.habits.peopleSends, total: r(d3.sum(A.people, (p) => p.total)), fees: r(A.habits.peopleFees), note: 'names never included' },
      overdraft: A.hasCredit ? { fees_are_estimated: true, access_fees_from: A.creditFeesEstimated ? 'estimated at 1% of amount drawn (statement does not show them)' : 'messages', days_owing: A.creditDays, draws: A.draws.length, drawn: r(A.creditDrawn), median_draw: r(A.habits.medianDraw), draws_after_7pm: A.habits.drawsAfter7pm, repaid_then_redrew_same_day: A.habits.redraw, fees_estimated: r(A.creditFees) } : null,
      loans: A.loans.map((l) => ({ taken: l.taken.slice(0, 10), principal: r(l.principal), days: l.days, cost: r(l.cost), rollover: r(l.rollover) })),
      avoidable: A.avoidable.map((a) => ({ date: a.date.slice(0, 10), what: a.what, amount: r(a.amount) })),
      possible_double_payments: A.toCheck.map((a) => ({ date: a.date.slice(0, 10), amount: r(a.amount) })),
      outliers: { unusual_payments: A.biggest.map((t) => ({ date: t.ts.slice(0, 10), amount: r(t.amt), category: t.category })), spike_days: A.spikeDays.map((d) => ({ date: d.date, out: r(d.out) })) }
    };
  }

  window.PDAnalyse = { analyse, summary, fmt, norm };
})();
