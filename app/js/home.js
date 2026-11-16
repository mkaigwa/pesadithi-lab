/* Pesadithi Lab: home page. Live minis drawn from the demo year, the wallet ticker, shared-money roles and AI logo slots. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const n0 = (v) => Math.round(v).toLocaleString('en-GB');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tc = (s) => String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { in: '#17803f', out: '#d23b2e', credit: '#2457d6', loan: '#e08a00', fee: '#5b6670', ink: '#0f2620', line: '#dce4e0', mint: '#e4f4ec', brand: '#17694e' };
  if (!$('#minis')) return;

  /* ---------- Demo buttons and route shortcuts ---------- */
  ['#btnDemo2', '#btnDemo3'].forEach((id) => { const b = $(id); if (b) b.addEventListener('click', () => { const d = $('#btnDemo'); if (d && !d.disabled) d.click(); }); });
  $$('[data-pick]').forEach((a) => a.addEventListener('click', () => { const k = a.dataset.pick; setTimeout(() => { const s = $(`.source[data-src="${k}"]`); if (s && s.getAttribute('aria-pressed') !== 'true') s.click(); }, 60); }));

  /* ---------- AI logo slots: official files dropped into vendor/logos/ are used; otherwise a neutral lettermark ---------- */
  const LM = { chatgpt: 'GPT', claude: 'Cl', gemini: 'Ge', deepseek: 'DS', copilot: 'Co' };
  const AIS = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', deepseek: 'DeepSeek', copilot: 'Copilot' };
  // vendor/logos/logos.json maps a key to a file, e.g. {"claude": "claude.svg"}. Only listed files are requested.
  const manifest = fetch('vendor/logos/logos.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const logoFor = (k) => manifest.then((m) => (m && m[k] ? 'vendor/logos/' + m[k] : null));
  function fillAi(el) {
    const k = el.dataset.ai; const name = AIS[k] || k;
    el.setAttribute('title', name);
    el.innerHTML = `<span class="lm">${esc(LM[k] || name[0])}</span>`;
    logoFor(k).then((src) => { if (!src) return; const img = new Image(); img.onload = () => { el.innerHTML = ''; img.alt = ''; el.appendChild(img); el.classList.add('has-logo'); }; img.src = src; });
  }
  // Wallet logos: same manifest; the wallet name stays as the image's alt text
  $$('.wl[data-logo]').forEach((el) => logoFor(el.dataset.logo).then((src) => { if (!src) return; const img = new Image(); img.onload = () => { img.alt = el.textContent; el.textContent = ''; el.appendChild(img); el.classList.add('has-logo'); }; img.src = src; }));
  const aiRow = $('#aiRow');
  if (aiRow) aiRow.innerHTML = Object.keys(AIS).map((k) => `<span class="ai-tile"><span class="ai" data-ai="${k}"></span><small>${AIS[k]}</small></span>`).join('');
  $$('.ai[data-ai]').forEach(fillAi);

  /* ---------- Wallet ticker ---------- */
  const TK = [
    ['M-PESA', 'Confirmed. You have received [[Ksh48,500.00]] from {{ACME DESIGN LTD}} on 26/9/26 at 9:14 AM'],
    ['Airtel Money', 'Confirmed. [[Ksh 300.00]] sent to {{WANJIRU ANNE}} on 07/09/26 at 01:00 PM. Cost Ksh 0.00'],
    ['MTN MoMo', 'You have withdrawn [[UGX 100,000]] from agent {{MUKWANO ENTERPRISES}}. Fee: UGX 2,500'],
    ['M-PESA', 'Fuliza M-PESA amount is [[Ksh640.00]]. Access Fee charged Ksh6.40'],
    ['MTN MoMo', 'You have sent [[UGX 5,000]] to {{NAKATO SARAH}} on 2026-09-03. Fee: UGX 500']
  ];
  const mk = (t) => esc(t).replace(/\[\[(.+?)\]\]/g, '<span class="amt">$1</span>').replace(/\{\{(.+?)\}\}/g, '<span class="pay">$1</span>');
  let ti = 0; const tick = $('.ticker');
  const showTk = () => { const [p, m] = TK[ti % TK.length]; $('#tkProv').textContent = p; $('#tkMsg').innerHTML = mk(m); tick.classList.remove('go'); void tick.offsetWidth; tick.classList.add('go'); ti++; };
  if (tick) { showTk(); if (!reduce) setInterval(showTk, 3200); }

  /* ---------- Shared money roles ---------- */
  const ROLES = {
    couple: {
      alt: 'A couple at their dining table in the evening, one pointing at a notebook, the other holding a phone',
      q: 'Are we pulling in the same direction?',
      share: 'One household envelope: rent, school fees, groceries, home help, and support to both families if you both agree.',
      keep: 'Personal spending, gifts, and anything you leave out of the envelope.',
      get: 'A monthly card for a money date: who carried which bills, the week you both ran tight, and one thing to plan together.',
      tension: 'Fairness and autonomy pull against each other. "Ours" should be a choice you make, never an audit.',
      card: ['Ours · October', [['Rent', '45,000', 'You'], ['School fees', '38,500', 'Amina'], ['Groceries', '21,340', 'You 60 · Amina 40'], ['Home help', '12,000', 'Amina']], 'Tightest week together: 22 to 28 Oct']
    },
    flat: {
      alt: 'Three young roommates in their living room, one holding up a phone and another an electricity token receipt',
      q: 'Who owes whom, without the awkward conversation?',
      share: 'Only the flat: rent, KPLC tokens, Wi-Fi, water, gas, the cleaner.',
      keep: 'Everything else. A roommate never sees how you spend.',
      get: 'One line each month, such as "Kevin owes you KES 2,340". Settle up and it clears.',
      tension: 'Roommates need precision, not intimacy. The less that crosses, the better it works.',
      card: ['Flat 4B · October', [['Rent', '36,000', 'Split 3 ways'], ['KPLC tokens', '2,850', ''], ['Wi-Fi', '3,999', ''], ['Your share', '14,283', 'You paid 21,700']], 'Kevin owes you 2,340 · Wanjiru owes you 5,077']
    },
    sib: {
      alt: 'Three adult siblings on a veranda bench at the family home among tea fields, looking at a phone together',
      q: 'Are we carrying Mum and Dad fairly?',
      share: 'The family envelope: upkeep, medical bills, a younger sibling\'s school fees.',
      keep: 'Incomes. Siblings see contributions, never what each person earns.',
      get: 'A family ledger for the year: who covered what, and what is coming next, such as next term\'s fees or a clinic visit.',
      tension: 'Comparing amounts between siblings who earn differently breeds resentment. Showing "on plan" against what each agreed keeps the peace. Your family picks which.',
      card: ['Family · 2026', [['Upkeep for Mum and Dad', '120,000', ''], ['Dad\'s clinic', '18,450', ''], ['Baraka\'s school fees', '64,300', ''], ['Shiro · Kamau · You', 'On plan', 'You ahead by 6,200']], 'Coming up: Term 1 fees, 9 Jan']
    },
    first: {
      alt: 'A woman helping her elderly mother with her shoes before a clinic visit, phone in hand',
      q: 'How much of my income goes to my family, and how much of it catches me off guard?',
      share: 'Nothing, by default. This one is for you first.',
      keep: 'All of it, unless you choose to share the family envelope with your siblings.',
      get: 'The real share of your income that goes to family, split into planned support and sudden requests, and a standing amount with a buffer for the call you know will come.',
      tension: 'Love and obligation look identical on a statement. Separating planned support from emergencies is how the first-born stops running dry by the 20th.',
      card: ['Just you · 2026 · example', [['Came in', '1,920,550', ''], ['To family', '345,700', '18% of income'], ['Planned', '115,200', ''], ['Sudden requests', '230,500', 'Two in every three shillings']], 'Try: a standing 28,800 a month, plus a 40,000 buffer']
    },
    chama: {
      alt: 'A chama meeting of women in a church hall, one holding up her phone to show she has paid',
      q: 'Is my money in the chama safe, and is every shilling counted?',
      share: 'Your contributions to the chama envelope. Members see the group\'s lines: who paid, payouts, loans and the balance. Officers carry the same card, with the duty to keep it current.',
      keep: 'Your personal wallet. The group sees what you put in, and nothing about the rest of your money.',
      get: 'Proof of every contribution you have made, when your payout turn falls, what the group holds today, and an early warning when someone falls behind.',
      tension: 'Members trust their officers, yet trust grows when everyone can see the same numbers. A shared card makes checking normal, not an accusation.',
      card: ['Umoja chama · your card', [['You paid this year', '84,000', '12 of 12 months'], ['Your payout turn', 'March', '7 of 14'], ['Group balance', '412,650', 'As at 31 Oct'], ['Members behind', '2', 'Officers notified']], 'Every contribution matched: yes']
    }
  };
  function renderRole(k) {
    const r = ROLES[k];
    $('#rolePanel').innerHTML = `<div class="rp-l"><p class="rq">${esc(r.q)}</p><dl class="rd"><div><dt>What you'd share</dt><dd>${esc(r.share)}</dd></div><div><dt>What stays private</dt><dd>${esc(r.keep)}</dd></div><div><dt>What you'd get</dt><dd>${esc(r.get)}</dd></div></dl><p class="rt"><b>The tension to design for</b> ${esc(r.tension)}</p></div>
      <div class="rp-r"><figure class="rphoto"><img src="img/roles/${k}.jpg" alt="${esc(r.alt)}" width="960" height="717" loading="lazy"><figcaption>AI-generated illustration</figcaption></figure><div class="receipt" aria-hidden="true"><div class="rh">${esc(r.card[0])}</div>${r.card[1].map(([a, b, c]) => `<div class="rl"><span>${esc(a)}${c ? `<small>${esc(c)}</small>` : ''}</span><b>${esc(b)}</b></div>`).join('')}<div class="rf">${esc(r.card[2])}</div><div class="rc">Pesa<i>dithi</i> · shared card</div></div><p class="small muted">Card with invented figures</p></div>`;
  }
  const tabs = $$('.roles [role="tab"]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { tabs.forEach((x) => { x.setAttribute('aria-selected', String(x === t)); x.tabIndex = x === t ? 0 : -1; }); renderRole(t.dataset.role); });
    t.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click(); });
    t.tabIndex = i ? -1 : 0;
  });
  renderRole('couple');

  /* ---------- Reveal and count-up ---------- */
  function countTo(el, target, fmt, dur) {
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now(); dur = dur || 1100;
    const f = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(f); else el.textContent = fmt(target); };
    requestAnimationFrame(f);
  }
  const onIn = new Map();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add('in'); const f = onIn.get(e.target); if (f) f(); io.unobserve(e.target); }), { threshold: 0.35 }) : null;
  const whenSeen = (el, f) => { if (!io) { el.classList.add('in'); f && f(); return; } if (f) onIn.set(el, f); io.observe(el); };

  /* ---------- Minis from the demo year ---------- */
  fetch('demo/demo-mpesa-sms.json').then((r) => r.text()).then((t) => {
    const R = window.PDParse.fromMessages(t, 'demo');
    const A = window.PDAnalyse.analyse(R.txs, {});
    if (!A) return;
    const K = (k) => $(`.mbig[data-k="${k}"]`);
    const V = (k) => $(`.mv[data-viz="${k}"]`);
    const card = (k) => $(`.mini[data-m="${k}"]`);

    // 1. How long money lasts: payday fills, then drains
    {
      const W = 300, H = 128, P = 6; const pts = A.drain.filter((d) => d.remaining != null);
      const x = (d) => P + (d / 30) * (W - 2 * P), y = (v) => H - 18 - v * (H - 34);
      const line = pts.map((d, i) => `${i ? 'L' : 'M'}${x(d.day).toFixed(1)},${y(d.remaining).toFixed(1)}`).join('');
      const area = `${line}L${x(pts[pts.length - 1].day).toFixed(1)},${H - 18}L${x(0)},${H - 18}Z`;
      const ls = Math.round(A.lifespan);
      V('lasts').innerHTML = `<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="gl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${C.in}" stop-opacity=".32"/><stop offset="1" stop-color="${C.in}" stop-opacity=".04"/></linearGradient><clipPath id="cl"><rect class="wipe" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
        <g clip-path="url(#cl)"><path d="${area}" fill="url(#gl)"/><path d="${line}" fill="none" stroke="${C.in}" stroke-width="2.4" stroke-linejoin="round"/></g>
        <line x1="${x(ls)}" x2="${x(ls)}" y1="${y(1) - 4}" y2="${H - 18}" stroke="${C.out}" stroke-width="1.6" stroke-dasharray="3 3" class="half"/>
        <circle cx="${x(ls)}" cy="${y(0.5)}" r="5" fill="#fff" stroke="${C.out}" stroke-width="2.2" class="half"/>
        <text x="${x(ls) + 9}" y="${y(0.5) - 8}" class="vt half">half gone</text>
        <line x1="${P}" x2="${W - P}" y1="${H - 18}" y2="${H - 18}" stroke="${C.line}"/>
        <text x="${P}" y="${H - 4}" class="vt">payday</text><text x="${W - P}" y="${H - 4}" class="vt" text-anchor="end">day 30</text></svg>`;
      whenSeen(card('lasts'), () => countTo(K('lasts'), ls, (v) => Math.round(v) + ' days'));
    }

    // 2. The month inside the month: 31 days, low balance in red, Fuliza days dotted
    {
      const dom = A.dom; const mx = Math.max(...dom.map((d) => d.medianBalance)) || 1;
      const cells = dom.map((d, i) => {
        const c = i % 7, r = Math.floor(i / 7); const low = 1 - d.medianBalance / mx;
        const fill = low > 0.75 ? '#f3b8b1' : low > 0.5 ? '#fadcd8' : low > 0.25 ? '#eef3f0' : C.mint;
        const isLow = d.day === A.lowDay.day;
        return `<g class="cell" style="--d:${i * 22}ms"><rect x="${c * 42 + 2}" y="${r * 25 + 2}" width="38" height="21" rx="4" fill="${fill}" ${isLow ? `stroke="${C.out}" stroke-width="2"` : ''}/><text x="${c * 42 + 8}" y="${r * 25 + 16}" class="vt ${isLow ? 'b' : ''}">${d.day}</text>${d.creditShare > 0.15 ? `<circle cx="${c * 42 + 33}" cy="${r * 25 + 12}" r="3.4" fill="${C.credit}"/>` : ''}</g>`;
      }).join('');
      V('cal').innerHTML = `<svg viewBox="0 0 296 128">${cells}</svg><div class="vkey"><span><i style="background:#f3b8b1"></i>runs low</span><span><i class="dot" style="background:${C.credit}"></i>Fuliza day</span></div>`;
      const d = A.lowDay.day; const ord = d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
      K('cal').textContent = 'The ' + ord;
    }

    // 3. Money clock: 24 radial bars, after 10pm in red
    {
      const S = 150, cx = S / 2, cy = S / 2, r0 = 24, r1 = 70; const mx = Math.max(...A.byHour) || 1;
      const late = (h) => h >= 22 || h < 5;
      const bars = A.byHour.map((v, h) => {
        const a = (h / 24) * Math.PI * 2 - Math.PI / 2; const len = 3 + (v / mx) * (r1 - r0);
        const x1 = cx + Math.cos(a) * r0, y1 = cy + Math.sin(a) * r0, x2 = cx + Math.cos(a) * (r0 + len), y2 = cy + Math.sin(a) * (r0 + len);
        return `<line class="hb" style="--d:${h * 30}ms" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${late(h) ? C.out : C.brand}" stroke-width="5.2" stroke-linecap="round"/>`;
      }).join('');
      V('clock').innerHTML = `<svg viewBox="0 0 ${S} ${S}"><circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="${C.mint}"/>${bars}<text x="${cx}" y="${cy - 1}" text-anchor="middle" class="vt">24</text><text x="${cx}" y="${cy + 10}" text-anchor="middle" class="vt">hours</text><text x="${cx}" y="10" text-anchor="middle" class="vt">midnight</text><text x="${cx}" y="${S - 2}" text-anchor="middle" class="vt">noon</text></svg>`;
      const share = A.habits.lateNightShare * 100;
      whenSeen(card('clock'), () => countTo(K('clock'), share, (v) => v.toFixed(1) + '% after 10pm'));
    }

    // 4. The price you paid: one bar, three kinds of cost, the avoidable slice marked
    {
      const parts = [['Transaction fees', A.txFees, C.fee], ['Fuliza charges', A.creditFees, C.credit], ['Loan costs', A.loanCost, C.loan]].filter((p) => p[1] > 0);
      const tot = parts.reduce((s, p) => s + p[1], 0) || 1; let acc = 0;
      const segs = parts.map(([l, v, c], i) => { const w = (v / tot) * 100; const s = `<span class="seg" style="--w:${w}%;--l:${acc}%;background:${c};--d:${i * 160}ms" title="${esc(l)}"></span>`; acc += w; return s; }).join('');
      V('fees').innerHTML = `<div class="feebar">${segs}</div><div class="feekey">${parts.map(([l, v, c]) => `<span><i style="background:${c}"></i>${esc(l)}<b>${n0(v)}</b></span>`).join('')}</div><div class="avoid"><b>KES ${n0(A.avoidableTotal)}</b> of it was avoidable</div>`;
      whenSeen(card('fees'), () => countTo(K('fees'), A.feesTotal, (v) => 'KES ' + n0(v)));
    }

    // 5. Sort your people: names flick into categories
    {
      const ppl = A.people.slice(0, 4); const cats = ['Family support', 'Household and home help', 'Friends and social', 'Work and business'];
      V('sort').innerHTML = `<div class="deckm">${ppl.map((p, i) => `<div class="pc" style="--i:${i}"><b>${esc(tc(p.name))}</b><small>${p.count} sends · KES ${n0(p.total)}</small></div>`).join('')}</div><div class="chips">${cats.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`;
      K('sort').textContent = A.people.length + ' people';
      const deck = $('.deckm', V('sort')); const chips = $$('.chips span', V('sort'));
      let j = 0;
      const flick = () => { const cardsEl = $$('.pc', deck); const top = cardsEl[cardsEl.length - 1 - (j % cardsEl.length)]; chips.forEach((c) => c.classList.remove('hit')); const ci = j % chips.length; top.classList.add('out'); chips[ci].classList.add('hit'); setTimeout(() => { top.classList.remove('out'); deck.prepend(top); }, 700); j++; };
      if (!reduce) whenSeen(card('sort'), () => setInterval(flick, 1900));
    }

    // 6. Ask your AI: a typed prompt and the size of the summary
    {
      let tokens = 0; try { tokens = Math.round(JSON.stringify(window.PDAnalyse.summary(A, { merchants: 8, demo: true, provider: 'M-PESA' })).length / 3.6); } catch (e) { tokens = 0; }
      const line = `Here is a year of my mobile money: KES ${n0(A.totalIn)} in, ${A.creditDays} days on Fuliza, half of each payday gone in ${Math.round(A.lifespan)} days. What should I change first?`;
      const tEl = $('#aiType');
      const type = () => { if (reduce) { tEl.textContent = line; return; } let i = 0; const f = () => { tEl.textContent = line.slice(0, i); i += 2; if (i <= line.length + 1) setTimeout(f, 28); }; f(); };
      whenSeen(card('ai'), () => { type(); if (tokens) countTo(K('ai'), tokens, (v) => n0(v) + ' tokens'); else K('ai').textContent = 'Free-plan sized'; });
      K('ai').textContent = tokens ? n0(tokens) + ' tokens' : 'Free-plan sized';
    }

    // Share card preview
    {
      const sc = $('#shareCard');
      sc.innerHTML = `<div class="sc-top">Amani's year in mobile money</div><div class="sc-big" id="scBig">KES ${n0(A.totalIn)}</div><div class="sc-sub">came in</div>
        <div class="sc-lines"><div><b>${Math.round(A.lifespan)} days</b><span>until half of payday is gone</span></div><div><b>${A.creditDays} days</b><span>on Fuliza</span></div><div><b>KES ${n0(A.feesTotal)}</b><span>in charges</span></div></div>
        <div class="sc-foot"><span class="lock">Pesa<i>dithi</i></span><span>made by Mark Kaigwa · mark.co.ke</span></div>`;
      whenSeen(sc, () => countTo($('#scBig'), A.totalIn, (v) => 'KES ' + n0(v), 1400));
    }

    $$('.mini').forEach((m) => { if (!onIn.has(m)) whenSeen(m); });
  }).catch(() => { $$('.mbig').forEach((b) => { if (b.textContent === '…') b.textContent = ''; }); });
})();
