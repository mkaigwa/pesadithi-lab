/* Pesadithi Lab: app controller, story, game, budget, AI hand-off, story mode. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const P = window.PDParse, AN = window.PDAnalyse, MC = window.PDMerchants;
  const C = { in: '#00968f', out: '#b8454f', credit: '#b97a10', loan: '#7d5db5', bad: '#c0262d', good: '#2e7d4f', ink: '#16161a', grid: '#ececf1', muted: '#9b9ba8' };
  const S = { raw: null, A: null, demo: false, period: 12, src: null, busy: false, token: 0, lastInput: null, pwFails: 0, game: null, targets: {}, ai: {} };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('pesadithi:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('pesadithi:salt', SALT); localStorage.setItem('pesadithi:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    any() { try { return Object.keys(localStorage).some((k) => k.startsWith('pesadithi:') && k !== 'pesadithi:salt'); } catch (e) { return false; } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('pesadithi:')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } }
  };
  // People's names are never stored: only a scrambled code (FNV-1a hash) for each name you sorted
  // A random salt per browser, so the codes can't be matched against a list of common names
  let SALT = ''; try { SALT = localStorage.getItem('pesadithi:salt') || ''; if (!SALT) { SALT = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { SALT = String(Math.random()).slice(2); }
  const h = (s0) => { const s = SALT + '|' + s0; let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
  const n0 = d3.format(',.0f');
  const cur = () => (S.A ? S.A.cur : 'KES');
  const F = (v) => AN.fmt(v, cur());
  const FB = (v) => cur() + ' ' + (Math.abs(v) >= 1e6 ? d3.format('.2f')(v / 1e6) + 'm' : n0(v));
  const pct = (v) => Math.round(v * 100) + '%';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pl = (n, one, many) => n0(n) + ' ' + (Math.round(n) === 1 ? one : (many || one + 's'));
  const WD = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
  const ord = (v) => { const s = ['th', 'st', 'nd', 'rd'], m = v % 100; return v + (s[(m - 20) % 10] || s[m] || s[0]); };
  const hourLabel = (hh) => (hh === 0 ? '12am' : hh < 12 ? hh + 'am' : hh === 12 ? '12pm' : (hh - 12) + 'pm');
  const titleCase = (s) => (s || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bM-pesa\b/g, 'M-PESA');
  const credit = () => (S.A && S.A.provider === 'M-PESA' ? 'Fuliza' : 'overdraft');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  const fmtDate = (ts) => d3.utcFormat('%-d %b %Y')(new Date(ts.slice(0, 10) + 'T00:00:00Z'));
  const dt = (s) => new Date(s.slice(0, 10) + 'T00:00:00Z');
  const kfmt = (v) => (Math.abs(v) >= 1e6 ? d3.format('.1f')(v / 1e6) + 'm' : Math.abs(v) >= 1000 ? n0(v / 1000) + 'k' : n0(v));

  /* ---------------- Routing ---------------- */
  let firstRoute = true;
  function show(view) {
    $$('[data-v]').forEach((s) => (s.hidden = s.dataset.v !== view));
    $$('.nav a').forEach((a) => (a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#demoBadge').hidden = !(S.A && S.demo && view !== 'start');
    if (view === 'sort') renderGame();
    if (view === 'budget') renderBudget();
    if (view === 'ai') renderAI();
    if (view === 'story' && !$('#story').childElementCount) renderStory();
    window.scrollTo(0, 0);
    if (!firstRoute) { const hd = $('[data-v="' + view + '"] h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }
    firstRoute = false;
  }
  function route() {
    const v = (location.hash || '#home').slice(1).split('/')[0];
    const ok = ['home', 'start', 'story', 'sort', 'budget', 'ai', 'privacy'];
    if (['story', 'sort', 'budget', 'ai'].includes(v) && !S.A) { $('#notice').hidden = false; history.replaceState(null, '', '#start'); show('start'); return; }
    if (ok.includes(v)) show(v);
    else if (document.getElementById(v) && S.A) { show('story'); setTimeout(() => document.getElementById(v).scrollIntoView(), 50); }
    else if (!S.A && v && v !== 'home' && v !== 'main') { $('#notice').hidden = false; history.replaceState(null, '', '#start'); show('start'); }
    else show('home');
  }
  window.addEventListener('hashchange', route);
  function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }
  function setDataUI(on) { $$('[data-needs-data]').forEach((e) => (e.hidden = !on)); $('#btnClear').hidden = !(on || store.any()); }

  /* ---------------- Sources ---------------- */
  const HELP = {
    pdf: `<b>Get your statement (free)</b><ol><li>Open the <b>M-PESA app</b> and go to <b>Statements</b>, or dial <b>*334#</b> and look for <b>My Account → M-PESA Statement</b>.</li><li>Ask for a <b>full statement</b> for the months you want. 12 months shows the most patterns.</li><li>It arrives by <b>email as a PDF</b>. The <b>password arrives by SMS</b>.</li><li>Open that email on this device and save the PDF, or email it to yourself here.</li><li>Choose the file below and type the password from the SMS.</li></ol><p class="small muted" style="margin:8px 0 0">These were Safaricom's steps in November 2026. Menus change; if yours look different, follow the steps in the M-PESA app.</p>`,
    mac: `<b>For iPhone users with a Mac</b><ol><li>On your iPhone, check <b>Settings → Messages → Text Message Forwarding</b> is on for your Mac, so M-PESA texts reach it.</li><li>Download <code>extract_mobile_money.py</code> from the <a href="https://github.com/mkaigwa/pesadithi-lab/tree/main/tools/mac" rel="noopener">tools/mac</a> folder on GitHub.</li><li>Give <b>Terminal</b> Full Disk Access (System Settings → Privacy &amp; Security → Full Disk Access). <b>This lets Terminal read every file on your Mac</b>, so switch it off again afterwards.</li><li>Run <code>python3 extract_mobile_money.py</code>. It saves <code>pesadithi-messages.json</code> in your Downloads folder.</li><li>Choose that file below. Then switch Full Disk Access off and delete the file when you're done.</li></ol>`,
    android: `<b>For Android phones</b><ol><li>Install <b>SMS Backup &amp; Restore</b> (by SyncTech) from Google Play.</li><li>Back up <b>messages only</b> to your phone's storage. It saves a file ending in <code>.xml</code>.</li><li>Choose that file below, on your phone or a computer.</li><li>Delete the backup file afterwards. It contains <b>all</b> your texts, including bank codes.</li></ol>`,
    paste: `<b>Quick try</b><ol><li>Open your messages and the <b>M-PESA</b> conversation.</li><li>Copy as many messages as you like and paste them in the box below.</li></ol><p class="small muted" style="margin:8px 0 0">The more months you paste, the better the patterns. For a whole year, a statement is faster.</p>`,
    momo: `<b>MTN MoMo and Airtel Money (beta)</b><ol><li>Paste your MoMo or Airtel Money texts below, or choose an Android SMS backup (<code>.xml</code>).</li><li>Formats differ between countries. After reading, we show how many messages we read and list the ones we couldn't.</li></ol><p class="small muted" style="margin:8px 0 0">Help us improve: open an issue on GitHub with a message whose names and numbers you've replaced.</p>`
  };
  let FILE = null;
  function resetLoader() {
    FILE = null; S.lastInput = null; S.pwFails = 0; $('#file').value = ''; $('#fileName').textContent = 'PDF, JSON, XML, CSV or TXT. Up to 25 MB.';
    $('#found').hidden = true; status('');
  }
  $$('.source').forEach((b) => b.addEventListener('click', () => {
    $$('.source').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    S.src = b.dataset.src; S.token++; resetLoader();
    $('#srcHelp').innerHTML = HELP[S.src]; $('#srcHelp').hidden = false; $('#loader').hidden = false;
    $('#pwField').hidden = S.src !== 'pdf';
    $('#pasteField').hidden = S.src === 'pdf';
    $('#btnSample').hidden = !['paste', 'momo'].includes(S.src);
    if (S.src === 'pdf') P.preloadPdf().catch(() => {});
    $('#srcHelp').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (ev) => { const f = ev.dataTransfer.files[0]; if (f) setFile(f); });
  $('#file').addEventListener('change', (e) => { if (e.target.files[0]) setFile(e.target.files[0]); });
  $('#paste').addEventListener('input', () => { S.lastInput = $('#paste').value.trim() ? 'paste' : (FILE ? 'file' : null); });
  $('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); readData(); } });
  function setFile(f) {
    FILE = f; S.lastInput = 'file'; $('#found').hidden = true;
    $('#fileName').innerHTML = 'Chosen: <b>' + esc(f.name) + '</b> (' + Math.max(1, Math.round(f.size / 1024)) + ' KB) · <button type="button" class="linkbtn" id="rmFile">Remove</button>';
    $('#rmFile').addEventListener('click', () => { FILE = null; $('#file').value = ''; S.lastInput = $('#paste').value.trim() ? 'paste' : null; $('#fileName').textContent = 'PDF, JSON, XML, CSV or TXT. Up to 25 MB.'; });
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { $('#pwField').hidden = false; P.preloadPdf().catch(() => {}); status('Now type the password from the M-PESA SMS, then press "Read my data".'); $('#pw').focus(); }
    else status('');
  }
  $('#btnSample').addEventListener('click', async () => {
    const name = S.src === 'momo' ? 'demo/demo-mtn-momo-uganda.txt' : 'demo/demo-mpesa-sms.txt';
    try { const t = await (await fetch(name)).text(); $('#paste').value = S.src === 'momo' ? t : t.split('\n\n').slice(0, 220).join('\n\n'); S.lastInput = 'paste'; status('Sample pasted. It is invented data. Press "Read my data".', 'ok'); } catch (e) { status('Could not load the sample.', 'err'); }
  });
  function status(msg, kind) { const s = $('#status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }

  $('#btnRead').addEventListener('click', readData);
  async function readData() {
    if (S.busy) return;
    const pasted = $('#paste').value.trim();
    const useFile = FILE && (S.lastInput === 'file' || !pasted);
    if (!useFile && !pasted) { status('Choose a file or paste some messages first.', 'err'); return; }
    if (useFile && FILE.size > 25 * 1024 * 1024) { status('That file is over 25 MB. Choose a shorter period, or split it.', 'err'); return; }
    const token = ++S.token;
    S.busy = true; $('#found').hidden = true; const btn = $('#btnRead'); btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Reading…'; status('Reading your data on this device…');
    try {
      let r;
      if (useFile && (/\.pdf$/i.test(FILE.name) || FILE.type === 'application/pdf')) {
        const pw = $('#pw').value.trim();
        try { r = await P.fromPdf(await FILE.arrayBuffer(), pw); }
        catch (e) {
          if (token !== S.token) return;
          if (e && e.name === 'PasswordException') {
            S.pwFails += e.code === 2 ? 1 : 0;
            status(e.code === 2 ? 'That password didn\'t open the PDF. Use the code from the SMS that came with this statement (not your M-PESA PIN).' + (S.pwFails >= 3 ? ' Still stuck? Each new request makes a new PDF and a new code, so match the newest SMS to the newest email.' : '') : 'This PDF is locked. Type the password from the M-PESA SMS, then press "Read my data".', 'err');
            $('#pwField').hidden = false; $('#pw').focus(); return;
          }
          if (e && e.pdLoad) { status('The PDF reader didn\'t load. Connect to the internet, reload the page once, then try again. Your file stays on this device either way.', 'err'); return; }
          status('We couldn\'t open that PDF. Is it an M-PESA statement? Try downloading it again from your email.', 'err'); return;
        }
        if (!r.txs.length) { status('The PDF opened, but we found no M-PESA transactions in it. Scanned images and other banks\' statements won\'t work here.', 'err'); return; }
      } else {
        let text = pasted;
        if (useFile) {
          if (!/\.(json|xml|txt|csv)$/i.test(FILE.name) && !/json|xml|text|csv/.test(FILE.type)) { status('This file type isn\'t supported. Use a PDF statement, a .json or .xml export, or paste the messages.', 'err'); return; }
          text = await FILE.text();
        }
        r = P.fromMessages(text, useFile ? FILE.name : 'pasted');
        if (!r.txs.length) { status(r.messages ? `We looked at ${pl(r.messages, 'block')} of text, but none looked like mobile money transactions. Copy money messages, not chats.` : 'We couldn\'t find any messages in that. Check the file or what you pasted.', 'err'); if (r.skipped.length) showSkipped(r.skipped); return; }
      }
      if (token !== S.token) return;
      S.demo = false; loaded(r);
    } catch (e) {
      console.error(e); if (token === S.token) status('Something went wrong while reading. Nothing was sent anywhere. Try again, or use a different source.', 'err');
    } finally { S.busy = false; btn.removeAttribute('aria-busy'); btn.textContent = 'Read my data'; }
  }
  function showSkipped(list) {
    $('#skippedBox').hidden = !list.length;
    $('#skippedList').innerHTML = list.slice(0, 40).map((s) => '<li>' + esc(s) + '…</li>').join('') + (list.length > 40 ? `<li>and ${list.length - 40} more</li>` : '');
    if (list.length) $('#skippedBox summary').textContent = `${pl(list.length, 'message')} we couldn't read`;
  }

  function loaded(r) {
    S.A = null; $('#story').innerHTML = ''; setDataUI(false); $('#demoBadge').hidden = true;
    const curs = d3.rollups(r.txs, (v) => v.length, (t) => t.cur).sort((a, b) => b[1] - a[1]);
    let note = '';
    if (curs.length > 1) { const main = curs[0][0]; const other = r.txs.filter((t) => t.cur !== main); r.skipped = r.skipped.concat(other.map((t) => `(${t.cur}, not used: this story is in ${main}) ${t.party} ${t.amt}`)); r.txs = r.txs.filter((t) => t.cur === main); note = ` We found more than one currency; this story uses ${main} only.`; }
    S.raw = r; S.game = null; $('#notice').hidden = true;
    const ts = r.txs.map((t) => t.ts).sort();
    const span = Math.round((dt(ts[ts.length - 1]) - dt(ts[0])) / 864e5) + 1;
    const nTx = r.txs.filter((t) => t.dir === 'in' || t.dir === 'out').length;
    $('#found').hidden = false;
    $('#foundTitle').textContent = `We found ${pl(nTx, r.provider + ' transaction')}`;
    $('#foundText').textContent = (r.kind === 'statement' ? 'Read from your statement' : `${n0(r.txs.length)} of ${pl(r.messages, 'message')} were transactions or loan updates`) + `, from ${fmtDate(ts[0])} to ${fmtDate(ts[ts.length - 1])} (${pl(span, 'day')}). Everything stayed on this device.${note}`;
    showSkipped(r.skipped);
    const months = span / 30.44;
    $$('#periods button').forEach((b) => { const p = +b.dataset.p; b.disabled = p > 1 && p > Math.ceil(months) + 1; });
    S.period = months >= 11 ? 12 : months >= 5 ? 6 : months >= 2 ? 3 : 0;
    $$('#periods button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.p === S.period)));
    periodText();
    status('Done. Choose a period and read your story.', 'ok');
    $('#found').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#btnStory').focus({ preventScroll: true });
  }
  function periodRange() {
    const last = S.raw.txs.map((t) => t.ts).sort().pop().slice(0, 10);
    if (!S.period) return { start: null, last };
    const d = dt(last); d.setUTCMonth(d.getUTCMonth() - S.period); d.setUTCDate(d.getUTCDate() + 1);
    return { start: d.toISOString().slice(0, 10), last };
  }
  function periodText() { if (!S.raw) return; const { start, last } = periodRange(); const first = S.raw.txs.map((t) => t.ts.slice(0, 10)).filter((d) => !start || d >= start).sort()[0]; $('#periodText').textContent = `Your story will cover ${fmtDate(first)} to ${fmtDate(last)}.`; }
  $$('#periods button').forEach((b) => b.addEventListener('click', () => { S.period = +b.dataset.p; $$('#periods button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); periodText(); }));
  $('#btnStory').addEventListener('click', () => { if (!S.raw) return; compute(); go('story'); });
  function compute() {
    S.A = AN.analyse(S.raw.txs, { start: periodRange().start });
    S.A.provider = S.raw.provider;
    $('#story').innerHTML = ''; setDataUI(true); resetGame(); S.targets = store.get('targets') || {};
  }

  $('#btnDemo').addEventListener('click', async (e) => {
    if (S.busy) return; S.busy = true; e.target.setAttribute('aria-busy', 'true'); e.target.textContent = 'Loading the demo…';
    try { const t = await (await fetch('demo/demo-mpesa-sms.json')).text(); S.raw = P.fromMessages(t, 'demo'); S.demo = true; S.period = 12; compute(); go('story'); }
    catch (err) { e.target.insertAdjacentHTML('afterend', '<p class="small status err">The demo could not load. If you opened this file straight from your computer, use the hosted version or run a local web server.</p>'); }
    finally { S.busy = false; e.target.removeAttribute('aria-busy'); e.target.textContent = 'See a demo story'; }
  });
  let clearArm = 0;
  $('#btnClear').addEventListener('click', (e) => {
    // Two taps instead of confirm(): confirm dialogs are blocked inside some embedded viewers
    if (Date.now() - clearArm > 5000) { clearArm = Date.now(); e.target.textContent = 'Tap again to clear everything'; setTimeout(() => { if (clearArm && Date.now() - clearArm >= 5000) { clearArm = 0; e.target.textContent = 'Clear my data'; } }, 5100); return; }
    clearArm = 0; e.target.textContent = 'Clear my data';
    S.raw = null; S.A = null; S.demo = false; S.targets = {}; S.game = null; store.clear(); $('#remember').checked = false;
    resetLoader(); $('#paste').value = ''; $('#pw').value = ''; $$('.source').forEach((x) => x.setAttribute('aria-pressed', 'false')); $('#srcHelp').hidden = true; $('#loader').hidden = true; $('#story').innerHTML = ''; $('#skippedBox').hidden = true;
    setDataUI(false); go('home');
  });

  /* ---------------- Chart helpers ---------------- */
  function svgIn(el, hgt, label, minW) { el.innerHTML = ''; const w = Math.max(minW || 300, el.clientWidth || 700); const svg = d3.select(el).on('pointerdown.miss', (ev) => { if (ev.target.tagName === 'svg') el.querySelectorAll('.tip').forEach((t) => (t.hidden = true)); }).append('svg').attr('width', minW && minW > (el.clientWidth || 0) ? minW : '100%').attr('viewBox', `0 0 ${w} ${hgt}`).attr('role', 'img').attr('aria-label', label); return { svg, w }; }
  const TIPS = [];
  function tipFor(el) {
    const t = document.createElement('div'); t.className = 'tip'; t.hidden = true; el.appendChild(t); TIPS.push(t);
    return {
      show(ev, html) { t.innerHTML = html; t.hidden = false; const r = el.getBoundingClientRect(); let x = ev.clientX - r.left + el.scrollLeft + 14, y = ev.clientY - r.top + 14; if (x + t.offsetWidth > r.width + el.scrollLeft) x = Math.max(0, ev.clientX - r.left + el.scrollLeft - t.offsetWidth - 14); t.style.left = x + 'px'; t.style.top = y + 'px'; },
      hide(ev) { if (ev && ev.pointerType === 'touch') return; t.hidden = true; }
    };
  }
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.chart')) TIPS.forEach((t) => { if (t.isConnected) t.hidden = true; }); });
  const hit = (sel, show, tip) => sel.style('touch-action', 'pan-y').style('cursor', 'pointer').on('pointermove', show).on('pointerdown', show).on('pointerleave', (ev) => tip.hide(ev));
  function dataTable(el, caption, head, rows) {
    const d = document.createElement('details'); d.className = 'datatable';
    d.innerHTML = `<summary>See the numbers</summary><div class="scrollx"><table><caption class="sr">${esc(caption)}</caption><thead><tr>${head.map((x, i) => `<th${i ? ' class="n"' : ''}>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td${i ? ' class="n"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    el.after(d);
  }

  function riverChart(el, A) {
    const hgt = 340; const { svg, w } = svgIn(el, hgt, `Daily balance${A.hasCredit ? ' above the line and ' + credit() + ' owed below it' : ''}`);
    const top = 18, bot = hgt - 24, mid = A.hasCredit ? top + (bot - top) * 0.7 : bot;
    const yb = d3.scaleLinear().domain([0, d3.max(A.daily, (d) => d.balance) || 1]).nice().range([mid, top]);
    const yf = d3.scaleLinear().domain([0, d3.max(A.daily, (d) => d.owed) || 1]).nice().range([mid, bot]);
    const ml = Math.max(36, d3.max(yb.ticks(3).concat(A.hasCredit ? yf.ticks(2) : []), (v) => kfmt(v).length) * 7 + 10);
    const x = d3.scaleUtc().domain(d3.extent(A.daily, (d) => dt(d.date))).range([ml, w - 6]);
    yb.ticks(3).filter((v) => v > 0).forEach((v) => { svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', yb(v)).attr('y2', yb(v)).style('stroke', C.grid); svg.append('text').attr('x', ml - 6).attr('y', yb(v) + 4).attr('text-anchor', 'end').text(kfmt(v)); });
    if (A.hasCredit) yf.ticks(2).filter((v) => v > 0).forEach((v) => { svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', yf(v)).attr('y2', yf(v)).style('stroke', C.grid); svg.append('text').attr('x', ml - 6).attr('y', yf(v) + 4).attr('text-anchor', 'end').text(kfmt(v)); });
    svg.append('path').datum(A.daily).attr('d', d3.area().x((d) => x(dt(d.date))).y0(mid).y1((d) => yb(d.balance)).curve(d3.curveStepAfter)).style('fill', C.in).style('opacity', .85);
    if (A.hasCredit) svg.append('path').datum(A.daily).attr('d', d3.area().x((d) => x(dt(d.date))).y0(mid).y1((d) => yf(d.owed)).curve(d3.curveStepAfter)).style('fill', C.credit);
    svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', mid).attr('y2', mid).style('stroke', '#8a8a96');
    svg.append('g').selectAll('line').data(A.daily.filter((d) => d.in > 0 && d.in >= A.bigCut)).join('line').attr('x1', (d) => x(dt(d.date))).attr('x2', (d) => x(dt(d.date))).attr('y1', 2).attr('y2', 12).style('stroke', C.ink).style('stroke-width', 1.5);
    const short = A.nDays < 100;
    svg.append('g').attr('transform', `translate(0,${bot})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(w / 90))).tickSizeOuter(0).tickFormat(d3.utcFormat(short ? '%-d %b' : '%b'))).call((g) => g.select('.domain').remove());
    const t = tipFor(el), rule = svg.append('line').attr('y1', top).attr('y2', bot).style('stroke', '#999').attr('visibility', 'hidden'), bis = d3.bisector((d) => dt(d.date)).center;
    const showD = (ev) => { const d = A.daily[bis(A.daily, x.invert(d3.pointer(ev)[0]))]; rule.attr('x1', x(dt(d.date))).attr('x2', x(dt(d.date))).attr('visibility', 'visible'); t.show(ev, `<b>${fmtDate(d.date)}</b><br><span>Balance</span> ${F(d.balance)}${A.hasCredit ? `<br><span>Owed to ${credit()}</span> ${F(d.owed)}` : ''}${d.in ? `<br><span>In</span> ${F(d.in)}` : ''}${d.out ? `<br><span>Out</span> ${F(d.out)}` : ''}`); };
    hit(svg.append('rect').attr('x', ml).attr('width', w - ml).attr('height', bot).style('fill', 'transparent'), showD, t);
    dataTable(el, 'Monthly money in and out', ['Month', 'In', 'Out', `Days owing ${credit()}`], A.months.map((m) => [d3.utcFormat('%b %Y')(dt(m.month + '-01')) + (m.partial ? ' (part)' : ''), n0(m.in), n0(m.out), m.creditDays]));
  }
  function drainChart(el, A) {
    const hgt = 240; const { svg, w } = svgIn(el, hgt, 'Share of a big payment still unspent, day by day');
    const ml = 42, x = d3.scaleLinear().domain([0, 30]).range([ml, w - 10]), y = d3.scaleLinear().domain([0, 1]).range([hgt - 26, 10]);
    [0, .25, .5, .75, 1].forEach((v) => { svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', y(v)).attr('y2', y(v)).style('stroke', C.grid); svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(pct(v)); });
    const data = A.drain.filter((d) => d.remaining != null);
    svg.append('path').datum(data).attr('d', d3.area().x((d) => x(d.day)).y0(y(0)).y1((d) => y(d.remaining)).curve(d3.curveMonotoneX)).style('fill', C.in).style('opacity', .18);
    svg.append('path').datum(data).attr('d', d3.line().x((d) => x(d.day)).y((d) => y(d.remaining)).curve(d3.curveMonotoneX)).style('fill', 'none').style('stroke', C.in).style('stroke-width', 2.5);
    if (A.lifespan != null && A.lifespan <= 30) { svg.append('line').attr('x1', x(A.lifespan)).attr('x2', x(A.lifespan)).attr('y1', y(0)).attr('y2', y(.5)).style('stroke', C.ink).style('stroke-dasharray', '3 3'); svg.append('circle').attr('cx', x(A.lifespan)).attr('cy', y(.5)).attr('r', 5).style('fill', C.ink); svg.append('text').attr('class', 'ink').attr('x', x(A.lifespan) + 8).attr('y', y(.5) - 8).text('Half gone: day ' + A.lifespan.toFixed(1)); }
    svg.append('g').attr('transform', `translate(0,${hgt - 26})`).call(d3.axisBottom(x).ticks(w < 500 ? 4 : 6).tickFormat((d) => 'day ' + d).tickSizeOuter(0)).call((g) => g.select('.domain').remove());
    const t = tipFor(el);
    hit(svg.append('rect').attr('x', ml).attr('width', w - ml).attr('height', hgt - 26).style('fill', 'transparent'), (ev) => { const dd = Math.max(0, Math.min(30, Math.round(x.invert(d3.pointer(ev)[0])))); const d = data.find((q) => q.day === dd); if (d) t.show(ev, `<b>Day ${dd}</b><br><span>Still unspent</span> ${pct(d.remaining)}`); }, t);
    dataTable(el, 'Share still unspent by day', ['Day', 'Still unspent'], data.filter((d) => d.day % 5 === 0).map((d) => ['Day ' + d.day, pct(d.remaining)]));
  }
  function calendarChart(el, A) {
    const rows = A.daily; const months = Array.from(new Set(rows.map((d) => d.date.slice(0, 7))));
    const ml = 66, cell = Math.max(14, Math.min(24, Math.floor(((el.clientWidth || 700) - ml) / 31)));
    const wNeed = ml + 31 * cell + 6, gh = months.length * cell, barH = 80, hgt = gh + barH + 36;
    const crd = A.hasCredit; const { svg } = svgIn(el, hgt, `Calendar of days by month, shaded by ${crd ? credit() + ' owed' : 'spending'}, with totals by date`, wNeed);
    const val = (d) => (crd ? d.owed : d.out);
    const op = d3.scaleSqrt().domain([0, d3.quantile(rows.map(val).filter((v) => v > 0).sort(d3.ascending), 0.97) || 1]).range([0.15, 1]).clamp(true);
    const col = crd ? C.credit : C.out;
    months.forEach((m, j) => svg.append('text').attr('x', ml - 8).attr('y', j * cell + cell / 2 + 4).attr('text-anchor', 'end').text(d3.utcFormat('%b %Y')(dt(m + '-01'))));
    const t = tipFor(el);
    hit(svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (d) => ml + (+d.date.slice(8, 10) - 1) * cell + 1).attr('y', (d) => months.indexOf(d.date.slice(0, 7)) * cell + 1).attr('width', cell - 2).attr('height', cell - 2).attr('rx', 2)
      .style('fill', (d) => (val(d) > 0 ? col : C.grid)).style('opacity', (d) => (val(d) > 0 ? op(val(d)) : 1)),
    (ev, d) => t.show(ev, `<b>${fmtDate(d.date)}</b><br>${crd ? `<span>Owed to ${credit()}</span> ${F(d.owed)}<br>` : ''}<span>Spent</span> ${F(d.out)}${d.in ? `<br><span>Received</span> ${F(d.in)}` : ''}<br><span>Balance</span> ${F(d.balance)}`), t);
    svg.append('g').selectAll('circle').data(rows.filter((d) => d.in > 0 && d.in >= A.bigCut)).join('circle').attr('cx', (d) => ml + (+d.date.slice(8, 10) - 0.5) * cell).attr('cy', (d) => months.indexOf(d.date.slice(0, 7)) * cell + cell / 2).attr('r', Math.max(2.5, cell * .17)).style('fill', C.ink).style('pointer-events', 'none');
    const y0 = gh + barH + 6, key = crd ? 'creditDraw' : 'out';
    const yb = d3.scaleLinear().domain([0, d3.max(A.dom, (d) => d[key]) || 1]).range([y0, gh + 14]);
    hit(svg.append('g').selectAll('rect').data(A.dom).join('rect').attr('x', (d) => ml + (d.day - 1) * cell + 1).attr('width', cell - 2).attr('y', (d) => yb(d[key])).attr('height', (d) => y0 - yb(d[key])).attr('rx', 2).style('fill', col),
      (ev, d) => t.show(ev, `<b>The ${ord(d.day)}</b><br><span>${crd ? credit() + ' used' : 'Spent'}, whole period</span> ${F(d[key])}<br><span>Received, whole period</span> ${F(d.in)}`), t);
    [1, 10, 20, 31].forEach((d) => svg.append('text').attr('x', ml + (d - .5) * cell).attr('y', y0 + 16).attr('text-anchor', 'middle').text(d));
    svg.append('text').attr('x', ml - 8).attr('y', y0 - 2).attr('text-anchor', 'end').text('By date');
    if (wNeed > (el.clientWidth || 0) + 4) { const hnt = document.createElement('p'); hnt.className = 'small muted scrollhint'; hnt.textContent = 'Swipe sideways to see the rest of the month →'; el.before(hnt); }
    dataTable(el, 'Totals by date of the month', ['Date', 'Received', 'Spent'].concat(crd ? [credit() + ' used'] : []), A.dom.map((d) => [ord(d.day), n0(d.in), n0(d.out)].concat(crd ? [n0(d.creditDraw)] : [])));
  }
  function heatChart(el, A) {
    const ml = 40, cw = Math.max(12, Math.floor(((el.clientWidth || 700) - ml) / 24)), ch = Math.max(20, Math.min(30, cw)), hgt = ch * 7 + 28;
    const { svg } = svgIn(el, hgt, 'Heatmap of spending by weekday and hour', ml + 24 * cw + 4);
    const op = d3.scaleSqrt().domain([0, d3.max(A.heat, (d) => d.amount) || 1]).range([0, 1]);
    const D = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    D.forEach((d, i) => svg.append('text').attr('x', ml - 8).attr('y', i * ch + ch / 2 + 4).attr('text-anchor', 'end').text(d));
    [0, 6, 12, 18, 23].forEach((hh) => svg.append('text').attr('x', ml + hh * cw + cw / 2).attr('y', 7 * ch + 18).attr('text-anchor', 'middle').text(hourLabel(hh)));
    const t = tipFor(el);
    hit(svg.append('g').selectAll('rect').data(A.heat).join('rect').attr('x', (d) => ml + d.hour * cw + 1).attr('y', (d) => d.weekday * ch + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3)
      .style('fill', (d) => (d.amount ? C.out : C.grid)).style('opacity', (d) => (d.amount ? Math.max(.1, op(d.amount)) : .7)),
    (ev, d) => t.show(ev, `<b>${D[d.weekday]}, ${hourLabel(d.hour)} to ${hourLabel((d.hour + 1) % 24)}</b><br><span>Spent</span> ${F(d.amount)}<br><span>Payments</span> ${d.count}`), t);
    dataTable(el, 'Spending by weekday', ['Day', 'Spent', 'Busiest hour'], D.map((d, i) => { const c = A.heat.filter((q) => q.weekday === i); const b = d3.greatest(c, (q) => q.amount); return [d, n0(d3.sum(c, (q) => q.amount)), b && b.amount ? hourLabel(b.hour) : '–']; }));
  }
  function unitChart(el, A) {
    const spend = A.categories.filter((c) => !c.own); const tot = d3.sum(spend, (c) => c.total) || 1;
    const rows = spend.map((c) => ({ ...c, n: Math.round(c.total / tot * 100) })).filter((c) => c.total > 0);
    const w0 = Math.max(300, el.clientWidth || 700); const stacked = w0 < 560;
    const lab = stacked ? 0 : Math.min(230, w0 * .36);
    const sq = Math.max(6, Math.min(13, Math.floor((w0 - lab - 90) / 30 / 1.15))); const rowH = sq + (stacked ? 30 : 12), hgt = rows.length * rowH + 8;
    const { svg } = svgIn(el, hgt, 'For every 100 spent, squares per category');
    const t = tipFor(el);
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * rowH + (stacked ? 16 : 4)})`);
    if (stacked) g.append('text').attr('x', 0).attr('y', -4).attr('class', 'ink').text((d) => d.category);
    else g.append('text').attr('x', lab - 8).attr('y', sq).attr('text-anchor', 'end').text((d) => d.category);
    g.each(function (d) { d3.select(this).selectAll('rect').data(d3.range(Math.max(d.n, 1))).join('rect').attr('x', (i) => lab + i * (sq + 2)).attr('width', sq).attr('height', sq).attr('rx', 2).style('fill', C.out).style('opacity', d.n ? 1 : .35); });
    g.append('text').attr('class', 'ink').attr('x', (d) => lab + Math.max(d.n, 1) * (sq + 2) + 6).attr('y', sq).text((d) => (d.n || '<1') + ' · ' + kfmt(d.total));
    hit(g.append('rect').attr('width', w0).attr('height', rowH).attr('y', stacked ? -16 : -4).style('fill', 'transparent'), (ev, d) => t.show(ev, `<b>${esc(d.category)}</b><br><span>Spent</span> ${F(d.total)}<br><span>Payments</span> ${d.count}<br><span>Share</span> ${(d.total / tot * 100).toFixed(1)}%`), t);
    dataTable(el, 'Spending by category', ['Category', 'Spent', 'Payments', 'Share'], rows.map((d) => [d.category, n0(d.total), d.count, (d.total / tot * 100).toFixed(1) + '%']));
  }
  function feesChart(el, A) {
    const all = [['transaction', 'Transaction costs', '#8a8a96'], ['credit', credit() + ' fees', C.credit], ['loans', 'Loan fees', C.loan], ['penalties', 'Penalties', C.bad]];
    const keys = all.filter((k) => d3.sum(A.feeMonths, (r) => r[k[0]]) > 0);
    if (!keys.length) { el.innerHTML = '<p class="muted">No fees found in this period.</p>'; return []; }
    const rows = A.feeMonths; const st = d3.stack().keys(keys.map((k) => k[0]))(rows);
    const hgt = 220; const { svg, w } = svgIn(el, hgt, 'Fees by month and type');
    const ml = 42, y = d3.scaleLinear().domain([0, d3.max(st[st.length - 1], (d) => d[1]) || 1]).nice().range([hgt - 24, 8]);
    const x = d3.scaleBand().domain(rows.map((r) => r.month)).range([ml, w]).padding(.28);
    y.ticks(4).forEach((v) => { svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', y(v)).attr('y2', y(v)).style('stroke', C.grid); svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(kfmt(v)); });
    st.forEach((layer, i) => svg.append('g').selectAll('rect').data(layer).join('rect').attr('x', (d) => x(d.data.month)).attr('width', x.bandwidth()).attr('y', (d) => y(d[1]) + 1).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]) - 1)).style('fill', keys[i][2]));
    const every = Math.ceil(rows.length / Math.max(2, Math.floor(w / 50)));
    svg.append('g').attr('transform', `translate(0,${hgt - 24})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat((m, i) => (i % every ? '' : d3.utcFormat('%b')(dt(m + '-01'))))).call((g) => g.select('.domain').remove());
    const t = tipFor(el);
    hit(svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.month) - x.step() * .14).attr('width', x.step()).attr('height', hgt - 24).style('fill', 'transparent'), (ev, r) => t.show(ev, `<b>${d3.utcFormat('%B %Y')(dt(r.month + '-01'))}</b>` + keys.filter((k) => r[k[0]]).map((k) => `<br><span>${k[1]}</span> ${F(r[k[0]])}`).join('') || '<br>No fees'), t);
    dataTable(el, 'Fees by month', ['Month'].concat(keys.map((k) => k[1])), rows.map((r) => [d3.utcFormat('%b %Y')(dt(r.month + '-01'))].concat(keys.map((k) => n0(r[k[0]])))));
    return keys;
  }
  function loanChart(el, A) {
    const rows = A.loans.filter((l) => l.days != null); const rowH = 22, top = 26, hgt = top + rows.length * rowH + 30;
    const { svg, w } = svgIn(el, hgt, 'Each loan from the day borrowed to the day repaid');
    const lab = (l) => d3.utcFormat('%b %Y')(dt(l.taken)) + ' · ' + kfmt(l.principal), ml = 116;
    const x = d3.scaleLinear().domain([0, Math.max(40, d3.max(rows, (l) => l.days))]).range([ml, w - 56]);
    svg.append('rect').attr('x', x(0)).attr('width', x(10) - x(0)).attr('y', top - 4).attr('height', rows.length * rowH + 4).style('fill', C.good).style('opacity', .09);
    svg.append('text').attr('x', x(5)).attr('y', top - 10).attr('text-anchor', 'middle').text('First 10 days');
    svg.append('line').attr('x1', x(29)).attr('x2', x(29)).attr('y1', top - 6).attr('y2', top + rows.length * rowH).style('stroke', '#888').style('stroke-dasharray', '3 3');
    svg.append('text').attr('x', x(29)).attr('y', top - 10).attr('text-anchor', 'middle').text('Due');
    const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${top + i * rowH})`);
    g.append('text').attr('x', ml - 8).attr('y', rowH - 7).attr('text-anchor', 'end').text(lab);
    g.append('rect').attr('x', x(0)).attr('y', 4).attr('height', rowH - 8).attr('rx', 3).attr('width', (l) => Math.max(3, x(l.days) - x(0))).style('fill', (l) => (l.rollover ? C.bad : l.days <= 10 ? C.good : C.loan));
    g.filter((l) => l.rollover).append('text').attr('class', 'ink').attr('x', (l) => x(l.days) + 6).attr('y', rowH - 7).text((l) => '+' + kfmt(l.rollover));
    svg.append('g').attr('transform', `translate(0,${top + rows.length * rowH + 4})`).call(d3.axisBottom(x).ticks(w < 500 ? 3 : 5).tickFormat((d) => d + 'd').tickSizeOuter(0));
    const t = tipFor(el);
    hit(g.append('rect').attr('width', w).attr('height', rowH).style('fill', 'transparent'), (ev, l) => t.show(ev, `<b>${F(l.principal)} borrowed ${fmtDate(l.taken)}</b><br><span>Repaid after</span> ${pl(l.days, 'day')}<br><span>Cost</span> ${F(l.cost)}${l.rollover ? `<br><span>Penalty</span> ${F(l.rollover)}` : ''}`), t);
    dataTable(el, 'Every loan', ['Taken', 'Borrowed', 'Days', 'Cost', 'Penalty'], rows.map((l) => [fmtDate(l.taken), n0(l.principal), l.days, n0(l.cost), n0(l.rollover)]));
  }

  /* ---------------- Story ---------------- */
  function ch(id, kicker, title, body, tag) { return `<section class="chapter" id="${id}" aria-labelledby="${id}-h"><div class="k">${kicker}</div><${tag || 'h2'} id="${id}-h">${title}</${tag || 'h2'}>${body}</section>`; }
  function big(v, l) { return `<div class="big"><div class="v">${v}</div><div class="l">${l}</div></div>`; }
  function suggestions(A) {
    const out = [];
    if (A.hasCredit && A.lowDay && A.bigInDays.some((d) => d >= 20) && A.lowDay.day <= 22) out.push(`Most of the money arrives around the ${A.bigInDays.slice(0, 2).map(ord).join(' and ')}, but the balance is lowest around the ${ord(A.lowDay.day)}. Moving part of it to land around the ${ord(Math.max(1, A.lowDay.day - 2))} could close the gap that ${credit()} fills.`);
    if (A.loans.some((l) => l.rollover || l.cashbackMissed)) { const pen = d3.sum(A.loans, (l) => l.rollover), cb = d3.sum(A.loans, (l) => l.cashbackMissed); out.push(`Set a phone reminder for day 8 of every loan. In this period, repayment timing cost ${F(pen + cb)}${pen && cb ? ` (${F(pen)} in late penalties and ${F(cb)} in missed early-repayment refunds)` : pen ? ' in late penalties' : ' in missed early-repayment refunds'}.`); }
    if (A.habits.peopleFees > A.txFees * 0.3 && A.habits.peopleFees > 0) out.push(`Sending money to people cost ${F(A.habits.peopleFees)} in fees across ${pl(A.habits.peopleSends, 'send')}. Fewer, larger transfers to the same person cost less than many small ones.`);
    if (A.habits.cafePerWeek >= 3) out.push(`Café and restaurant payments come to about ${F(A.habits.cafeSpend / A.monthsEq)} a month. Pick one or two days a week to bring your own.`);
    if (A.habits.lateNightShare > 0.12) out.push(`${pct(A.habits.lateNightShare)} of spending happens between 10pm and 4am. Decide on a late-night limit before going out.`);
    if (A.habits.redraw >= 5) out.push(`${pl(A.habits.redraw, 'time')}, money arrived, cleared ${credit()} and ${credit()} was used again the same day. Keep a small buffer after each repayment.`);
    if (!out.length) out.push('Sort the people who receive money. It is the quickest way to see what spending really is.');
    return out.slice(0, 3);
  }
  function renderStory() {
    const A = S.A; if (!A) return; const el = $('#story');
    const spendCats = A.categories.filter((c) => !c.own); const topCat = spendCats[0];
    const ownShare = A.totalOut ? A.ownOut / A.totalOut : 0; const their = S.demo ? 'her' : 'your';
    const tl = A.trend; const cn = credit(); const sug = suggestions(A);
    let n = 0; const num = () => 'Chapter ' + (++n) + ' · ';
    const chapters = [];
    chapters.push(['cover', 'Overview', ch('cover', `${S.demo ? '<span>Demo: invented data</span> · ' : ''}${A.cur} · ${fmtDate(A.start)} to ${fmtDate(A.end)}`, A.hasCredit ? `${n0(A.creditDays)} of ${pl(A.nDays, 'day')} ended owing ${cn}` : `${FB(A.totalIn)} in, ${FB(A.totalOut)} out`,
      `<p class="lede">${S.demo ? 'Meet Amani, a fictional person with invented data, so you can see how the story reads. ' : ''}Here is what ${pl(A.txCount, 'transaction')} say about timing: when money arrives, how fast it goes, and what filling the gaps costs.</p>
      <div class="bigs">${big(FB(A.totalIn), 'came in')}${big(FB(A.totalOut), 'went out' + (ownShare > 0.05 ? `, ${pct(ownShare)} of it to ${their} own banks, cards or savings` : ''))}${A.lifespan != null ? big(A.lifespan.toFixed(1) + ' days', 'until half of a big payment is spent (typical)') : ''}${big(FB(A.feesTotal), 'in fees and charges' + (A.avoidableTotal ? `, ${F(A.avoidableTotal)} avoidable` : ''))}</div>
      <div class="btn-row">${S.demo ? '<a class="btn" href="#start">Now try it with my own data</a>' : ''}<button class="btn ghost small" type="button" data-act="storymode">Story mode (vertical)</button><a class="btn ghost small" href="#sort">Sort the people</a><a class="btn ghost small" href="#ai">Ask your AI</a></div>`, 'h1')]);
    chapters.push(['shape', 'The shape', ch('shape', num() + 'the shape of the period', A.hasCredit ? `Above the line, money held. Below it, money owed to ${cn}.` : 'The balance, day by day', `<p class="muted">Each day's closing balance${A.hasCredit ? ` rises above the line; ${cn} owed drops below it` : ''}. Ticks along the top mark money coming in of ${F(A.bigCut)} or more.</p><div class="chart" data-c="river"></div><div class="legend"><span><i style="background:${C.in}"></i>Balance</span>${A.hasCredit ? `<span><i style="background:${C.credit}"></i>Owed to ${cn}</span>` : ''}<span><i style="background:${C.ink}"></i>Big payment in</span></div>${tl ? `<p class="insight">Between ${d3.utcFormat('%B %Y')(dt(tl.first.month + '-01'))} and ${d3.utcFormat('%B %Y')(dt(tl.last.month + '-01'))}, money in per month ${tl.first.in === tl.last.in ? `stayed at ${F(tl.first.in)}` : `moved from ${F(tl.first.in)} to ${F(tl.last.in)}`}, and money out ${tl.first.out === tl.last.out ? `stayed at ${F(tl.first.out)}` : `moved from ${F(tl.first.out)} to ${F(tl.last.out)}`}. (Full months only.)</p>` : ''}`)]);
    if (A.lifespan != null) chapters.push(['drain', 'How long it lasts', ch('drain', num() + 'how long money lasts', `Half of a big payment is spent within ${A.lifespan.toFixed(1)} days`, `<p class="muted">For each payment in of ${F(A.bigCut)} or more (${pl(A.bigInsCount, 'payment')}), how much is still unspent, day by day. Transfers to ${their} own banks, savings and business payroll don't count as spending.</p><div class="chart" data-c="drain"></div>${A.lifespan75 != null ? `<p class="insight">Three quarters is gone by day ${A.lifespan75.toFixed(1)}. ${A.lifespan75 < 15 ? 'That leaves the rest of the month running on what is left, or on credit.' : 'That is a steady pace.'}</p>` : ''}`)]);
    chapters.push(['month', 'The month', ch('month', num() + 'the month inside the month', A.lowDay ? `The balance is usually lowest around the ${ord(A.lowDay.day)}` : 'When in the month money moves', `<p class="muted">Each square is a day, shaded by ${A.hasCredit ? `how much was owed to ${cn} at the end of it` : 'how much was spent'}. Black dots mark big payments in. The bars underneath add up each date across the period.</p><div class="chart scrollx" data-c="cal"></div>${A.bigInDays.length ? `<p class="insight">The biggest payments in land around the ${A.bigInDays.map(ord).join(', ')}.${A.hasCredit && A.dom.some((d) => d.creditDraw) ? ` ${cn} is used most on the ${ord(d3.greatest(A.dom, (d) => d.creditDraw).day)}.` : ''}</p>` : ''}`)]);
    chapters.push(['clock', 'Money clock', ch('clock', num() + 'the money clock', `Spending peaks on ${WD[A.habits.peakWeekday]}, around ${hourLabel(A.habits.peakHour)}`, `<p class="muted">Payments by day and hour. Darker squares hold more money. Transfers to ${their} own accounts are left out.</p><div class="chart scrollx" data-c="heat"></div><div class="bigs">${big(pct(A.habits.lateNightShare), 'of spending happens between 10pm and 4am')}${big(pct(A.habits.weekendShare), 'happens at weekends')}${A.habits.cafeVisits ? big(n0(A.habits.cafeVisits), `café and restaurant payments, about ${Math.round(A.habits.cafePerWeek)} a week`) : ''}</div>`)]);
    chapters.push(['where', 'Where it goes', ch('where', num() + 'where it goes', topCat ? `Of every ${A.cur} 100 spent, ${Math.round(topCat.total / d3.sum(spendCats, (c) => c.total) * 100)} went to ${topCat.category.toLowerCase()}` : 'Where it goes', `<p class="muted">Spending only.${A.ownOut ? ` Money moved to ${their} own banks, cards and savings (${F(A.ownOut)}) is left out.` : ''} Each square is 1 in every 100.</p><div class="chart" data-c="units"></div><h3 style="margin-top:30px">Who got paid most</h3><p class="small muted">With a note on who each business is. Payment platforms hide the real shop behind them.</p><div class="mcards">${A.merchants.slice(0, 9).map((m) => `<div class="mcard"><div class="n">${esc(titleCase(m.name))}</div><div class="c">${esc(m.category)} · ${pl(m.count, 'payment')}</div><div class="a">${F(m.total)}</div>${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}</div>`).join('')}</div><p class="small muted">${pl(A.people.length, 'person', 'people')} received ${F(d3.sum(A.people, (p) => p.total))} across ${pl(A.habits.peopleSends, 'send')}. <a href="#sort">Sort them</a> to see what that money really is.</p>`)]);
    if (A.hasCredit || A.loans.length) {
      const loanP = d3.sum(A.loans, (l) => l.principal);
      chapters.push(['credit', 'Borrowing', ch('credit', num() + 'borrowing', A.hasCredit ? `${pl(A.draws.length, cn + ' top-up')}, typically ${F(A.habits.medianDraw)}${A.draws.length && A.habits.drawsAfter7pm / A.draws.length > .3 ? ', often in the evening' : ''}` : pl(A.loans.length, 'loan'), `<div class="bigs">${A.hasCredit ? big(F(A.creditDrawn), `${cn} used across ${pl(A.draws.length, 'top-up')}`) + big(n0(A.habits.drawsAfter7pm), 'top-ups after 7pm') + big(n0(A.habits.redraw), `times money came in, cleared ${cn}, and ${cn} was used again the same day`) : ''}${A.loans.length ? big(F(loanP), `borrowed in ${pl(A.loans.length, 'loan')}, costing ${F(A.loanCost)}`) : ''}</div>${A.loans.filter((l) => l.days != null).length ? `<h3>Every loan, side by side</h3><p class="small muted">Each bar runs from the day of borrowing to the day of repaying. Green: repaid inside 10 days. Purple: by the due date. Red: late, with a penalty.</p><div class="chart" data-c="loans"></div>` : ''}${A.hasCredit ? `<p class="insight">${cn} cost about ${F(A.creditFees)}: ${F(A.accessFees)} in access fees${A.creditFeesEstimated ? ' (estimated at 1% of what was used, because statements don\'t list it)' : ''} ${A.dailyCharges > 0 ? ` plus an estimated ${F(A.dailyCharges)} in daily charges` : ''}${A.creditFeesEstimated ? '. Statements don\'t show daily charges, so the real cost is higher' : ''}.${A.loans.length ? ` Per ${A.cur} 100 borrowed, ${cn} cost about ${(A.creditFees / (A.creditDrawn || 1) * 100).toFixed(1)} and loans about ${(A.loanCost / (loanP || 1) * 100).toFixed(1)}.` : ''}</p>` : ''}${S.raw.kind === 'statement' && A.loans.length ? '<p class="small muted">Statements show the total repaid, not the penalty on its own, so late fees are included in loan costs here but not listed separately.</p>' : ''}`)]);
    }
    chapters.push(['price', 'The price', ch('price', num() + 'the price paid', A.avoidableTotal ? `${F(A.avoidableTotal)} that could have been kept` : `${F(A.feesTotal)} in fees and charges`, `${S.raw.kind === 'statement' ? '<p class="small muted">Read from a statement. Statements list every transaction cost line by line but leave out Fuliza daily charges and loan penalties, while SMS show those but not every cost. So the same months can give a different fee total from each source.</p>' : ''}<div class="chart" data-c="fees"></div><div class="legend" id="feesLegend"></div>${A.avoidable.length ? `<h3 style="margin-top:26px">Avoidable</h3><div class="ledger">${A.avoidable.map((a) => `<div class="row"><div class="d">${fmtDate(a.date)}</div><div><div class="w">${esc(a.what)}</div><div class="nt">${esc(a.note)}</div></div><div class="a ${/penalty/i.test(a.what) ? 'bad' : ''}">${F(a.amount)}</div></div>`).join('')}</div>` : ''}${A.toCheck.length ? `<h3 style="margin-top:26px">Worth checking</h3><p class="small muted">The same amount to the same place within 30 minutes. It may be deliberate, or a payment that went through twice. Reversed payments are already left out.</p><div class="ledger">${A.toCheck.map((a) => `<div class="row"><div class="d">${fmtDate(a.date)}</div><div><div class="w">${esc(titleCase(a.party))}</div><div class="nt">${esc(a.note)}</div></div><div class="a">${F(a.amount)}</div></div>`).join('')}</div>` : ''}`)]);
    if (A.biggest.length) chapters.push(['outliers', 'Stand-outs', ch('outliers', num() + 'payments that stood out', 'Unusual payments', `<p class="muted">Payments much bigger than usual for that place, or to places paid only once or twice. Regular bills, rent and cash withdrawals are left out.</p><div class="ledger">${A.biggest.map((t) => `<div class="row"><div class="d">${fmtDate(t.ts)}</div><div><div class="w">${esc(t.person ? 'A person' : titleCase(t.party))}</div><div class="nt">${esc(t.category)}${t.note ? ' · ' + esc(t.note) : ''}</div></div><div class="a">${F(t.amt)}</div></div>`).join('')}</div>${A.spikeDays.length ? `<p class="insight">The heaviest days were ${A.spikeDays.slice(0, 3).map((d) => `${fmtDate(d.date)} (${F(d.out)})`).join(', ')}.</p>` : ''}`)]);
    chapters.push(['try', 'What to try', ch('try', num() + 'what to try', sug.length === 1 ? 'One small change the data points to' : `${['', 'One', 'Two', 'Three'][sug.length]} small changes the data points to`, sug.map((s, i) => `<div class="try"><b>Try ${i + 1}</b>${esc(s)}</div>`).join('') + `<div class="next">${S.demo ? '<a href="#start"><b>Try it with my data</b><span class="small muted">Statement PDF, SMS export or pasted messages. Stays on your device.</span></a>' : ''}<a href="#sort"><b>Sort the people</b><span class="small muted">Label who gets sent money, in a quick swipe game.</span></a><a href="#budget"><b>Build a budget</b><span class="small muted">Monthly averages and targets by category.</span></a><a href="#ai"><b>Ask your AI</b><span class="small muted">A prompt and summary for Claude, ChatGPT or Gemini, with no people's names.</span></a><button type="button" data-act="storymode"><b>Story mode (vertical)</b><span class="small muted">A tall 9:16 version to screen-record and share.</span></button></div>`)]);
    el.innerHTML = chapters.map((c) => c[2]).join('');
    $('#chapterNav').innerHTML = chapters.map((c) => `<a href="#${c[0]}" data-ch="${c[0]}">${c[1]}</a>`).join('');
    drawCharts();
    $$('[data-act="storymode"]').forEach((b) => b.addEventListener('click', openStoryMode));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) $$('#chapterNav a').forEach((a) => { const on = a.dataset.ch === e.target.id; a.classList.toggle('on', on); if (on) a.scrollIntoView({ block: 'nearest', inline: 'center' }); }); }), { rootMargin: '-30% 0px -60% 0px' });
    $$('.chapter').forEach((c) => io.observe(c));
    $$('#chapterNav a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(a.dataset.ch).scrollIntoView({ behavior: 'smooth' }); }));
  }
  function drawCharts() {
    const A = S.A; if (!A) return;
    $$('.datatable, .scrollhint').forEach((d) => d.remove());
    $$('[data-c]').forEach((el) => {
      const c = el.dataset.c;
      try {
        if (c === 'river') riverChart(el, A); if (c === 'drain') drainChart(el, A); if (c === 'cal') calendarChart(el, A); if (c === 'heat') heatChart(el, A); if (c === 'units') unitChart(el, A); if (c === 'loans') loanChart(el, A);
        if (c === 'fees') { const keys = feesChart(el, A); const lg = $('#feesLegend'); if (lg) lg.innerHTML = keys.map((k) => `<span><i style="background:${k[2]}"></i>${k[1]}</span>`).join(''); }
      } catch (e) { console.error(e); el.innerHTML = '<p class="small muted">This chart couldn\'t be drawn for this data.</p>'; }
    });
  }
  let rw = 0, lastW = window.innerWidth; window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 30) return; lastW = window.innerWidth; clearTimeout(rw); rw = setTimeout(() => { if (!$('#v-story').hidden) drawCharts(); }, 200); });

  /* ---------------- Sort game ---------------- */
  const GCATS = ['Household and home help', 'Family support', 'Friends and social', 'Work and business', 'Services and transport', 'Giving and community', 'Savings group or chama', 'Lending or repaying'];
  function resetGame() { const saved = store.get('game') || {}; S.game = { assign: {}, saved: saved.assign || {}, history: [], last: null, skipped: [], extra: saved.extra || [] }; }
  const catOf = (name) => S.game.assign[name] || S.game.saved[h(name)] || null;
  function gameDeck() { return S.A ? S.A.people.filter((p) => p.total > 0) : []; }
  function nextPerson() { const deck = gameDeck(); return deck.find((p) => !catOf(p.name) && !S.game.skipped.includes(p.name)) || deck.find((p) => !catOf(p.name)) || null; }
  function renderGame(focus) {
    if (!S.game) resetGame();
    const deck = gameDeck(); const g = S.game; const cats = GCATS.concat(g.extra);
    if (deck.length && deck.every((p) => catOf(p.name) || g.skipped.includes(p.name)) && g.skipped.length) g.skipped = [];
    const done = deck.filter((p) => catOf(p.name)).length;
    $('#gameBar').style.width = (deck.length ? done / deck.length * 100 : 100) + '%';
    $('#gameCount').textContent = deck.length ? `${done} of ${pl(deck.length, 'person', 'people')} sorted` : '';
    const p = nextPerson(); const ctrls = $('#gameCtrls');
    if (!deck.length) { $('#deck').innerHTML = '<div class="pcard"><div class="who">No money sent to people in this period</div><p class="muted">Nothing to sort. Try a longer period on the Load data page.</p></div>'; ctrls.hidden = true; }
    else if (!p) { $('#deck').innerHTML = `<div class="pcard" tabindex="-1" id="pcard"><div class="who">All sorted</div><p class="muted">You labelled ${pl(done, 'person', 'people')}. The budget now shows what that money is for.</p></div>`; ctrls.hidden = true; $('#narr').textContent = ''; }
    else {
      ctrls.hidden = false; const m = S.A.monthsEq; const idx = deck.indexOf(p) + 1;
      $('#deck').innerHTML = `<div class="pcard" id="pcard" tabindex="-1" aria-labelledby="pwho" aria-describedby="pfacts"><div class="small muted">Person ${idx} of ${deck.length}${g.skipped.includes(p.name) ? ' · skipped earlier' : ''}</div><div class="who" id="pwho">${esc(titleCase(p.name))}</div><div id="pfacts"><div class="facts"><div><b>${p.count}</b><span>${p.count === 1 ? 'send' : 'sends'}</span></div><div><b>${kfmt(p.total)}</b><span>${cur()} total</span></div><div><b>${kfmt(p.total / m)}</b><span>a month</span></div></div><p class="small muted" style="margin:0">Usually ${F(p.typical)} · first ${fmtDate(p.first)} · last ${fmtDate(p.last)}</p></div><div class="cats" role="group" aria-label="Choose a category">${cats.map((c, i) => `<button type="button" data-cat="${esc(c)}"><span>${esc(c)}</span>${i < 9 && !coarse() ? `<kbd aria-hidden="true">${i + 1}</kbd>` : ''}</button>`).join('')}</div></div>`;
      $$('#deck [data-cat]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.cat)));
      swipe($('#pcard'));
    }
    $('#toBudget').className = 'btn small' + (done ? '' : ' ghost');
    renderTally();
    if (focus) { const c = $('#pcard'); if (c) c.focus({ preventScroll: true }); }
  }
  function pick(cat, dir) {
    const p = nextPerson(); if (!p) return;
    const card = $('#pcard'); if (card) card.classList.add(dir === 'l' ? 'fly-l' : 'fly-r');
    if (cat === null) { if (!S.game.skipped.includes(p.name)) S.game.skipped.push(p.name); S.game.history.push({ name: p.name, skip: true }); $('#narr').textContent = `Skipped ${titleCase(p.name)}. They'll come back at the end.`; }
    else {
      S.game.assign[p.name] = cat; S.game.history.push({ name: p.name }); S.game.last = cat;
      const same = gameDeck().filter((q) => catOf(q.name) === cat); const tot = d3.sum(same, (q) => q.total);
      $('#narr').textContent = `${titleCase(p.name)} → ${cat}. That now holds ${F(tot)} across ${pl(same.length, 'person', 'people')}, about ${F(tot / S.A.monthsEq)} a month.`;
    }
    saveGame(); setTimeout(() => renderGame(true), card ? 200 : 0);
  }
  function saveGame() { if (!$('#remember').checked) return; const hashed = { ...S.game.saved }; Object.entries(S.game.assign).forEach(([nm, c]) => { hashed[h(nm)] = c; }); store.set('game', { assign: hashed, extra: S.game.extra }); setDataUI(!!S.A); }
  function renderTally() {
    const deck = gameDeck(); const m = S.A ? S.A.monthsEq : 1;
    const rows = d3.rollups(deck.filter((p) => catOf(p.name)), (v) => d3.sum(v, (p) => p.total), (p) => catOf(p.name)).sort((a, b) => b[1] - a[1]);
    $('#tally').innerHTML = rows.length ? rows.map(([c, v]) => `<div class="row"><span>${esc(c)}</span><span class="num">${F(v / m)} a month</span></div>`).join('') : '<p class="small muted">Nothing sorted yet.</p>';
  }
  function swipe(card) {
    if (!card) return; let x0 = null, dx = 0;
    card.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`; });
    const end = () => { if (x0 == null) return; card.style.transition = ''; x0 = null; if (dx > 90) { if (S.game.last) pick(S.game.last, 'r'); else { card.style.transform = ''; $('#narr').textContent = 'Pick a category first. After that, swiping right repeats your last choice.'; } } else if (dx < -90) pick(null, 'l'); else card.style.transform = ''; };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  }
  document.addEventListener('keydown', (e) => {
    if ($('#v-sort').hidden || !$('#sm').hidden || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') { e.preventDefault(); undo(); return; }
    if (!nextPerson()) return;
    const cats = GCATS.concat(S.game.extra); const k = parseInt(e.key, 10);
    if (k >= 1 && k <= Math.min(9, cats.length)) { e.preventDefault(); pick(cats[k - 1]); }
    else if (e.key === 'ArrowRight' && S.game.last) { e.preventDefault(); pick(S.game.last, 'r'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pick(null, 'l'); }
  });
  function undo() {
    const last = S.game && S.game.history.pop(); if (!last) { $('#narr').textContent = 'Nothing to undo.'; return; }
    if (last.skip) S.game.skipped = S.game.skipped.filter((nm) => nm !== last.name); else { delete S.game.assign[last.name]; delete S.game.saved[h(last.name)]; }
    $('#narr').textContent = `Undone: ${titleCase(last.name)} is back in the pile.`; saveGame(); renderGame(true);
  }
  $('#gUndo').addEventListener('click', undo);
  $('#gSkip').addEventListener('click', () => pick(null, 'l'));
  $('#gAdd').addEventListener('click', () => { $('#addCat').hidden = false; $('#addCatIn').focus(); });
  const closeAdd = () => { $('#addCat').hidden = true; $('#addCatIn').value = ''; $('#gAdd').focus(); };
  $('#addCatCancel').addEventListener('click', closeAdd);
  $('#addCatIn').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeAdd(); } });
  $('#addCat').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const c = $('#addCatIn').value.trim().replace(/\s+/g, ' ');
    if (!c) { $('#narr').textContent = 'A category needs a name.'; return; }
    if (c.length > 40) { $('#narr').textContent = 'Please keep category names to 40 characters.'; return; }
    if (GCATS.concat(S.game.extra).some((x) => x.toLowerCase() === c.toLowerCase())) { $('#narr').textContent = `"${c}" is already a category.`; return; }
    S.game.extra.push(c); saveGame(); $('#addCat').hidden = true; $('#addCatIn').value = ''; renderGame(true); $('#narr').textContent = `Added "${c}". It is now a choice on the card.`;
  });
  $('#toBudget').addEventListener('click', () => go('budget'));

  /* ---------------- Budget ---------------- */
  function budgetRows() {
    const A = S.A; const m = A.monthsEq; const rows = {};
    if (!S.game) resetGame();
    A.outs.forEach((t) => { if (MC.OWN_MONEY.includes(t.category)) return; let c = t.category; if (t.person) { const a = catOf(AN.norm(t.party)); c = a ? 'People: ' + a : 'People: not sorted yet'; } rows[c] = (rows[c] || 0) + t.amt; });
    return Object.entries(rows).map(([c, v]) => ({ category: c, monthly: v / m })).sort((a, b) => b.monthly - a.monthly);
  }
  function renderBudget() {
    const A = S.A; if (!A) return; const m = A.monthsEq; const rows = budgetRows();
    const income = A.totalIn / m, ownIn = d3.sum(A.ins.filter((t) => t.category === 'From your banks'), (t) => t.amt) / m;
    $('#budgetBigs').innerHTML = big(F(income), 'average money in per month' + (ownIn > income * .2 ? `, ${pct(ownIn / income)} of it moved in from ${S.demo ? 'her' : 'your'} own bank accounts` : '')) + big(F(d3.sum(rows, (r) => r.monthly)), 'average spending per month') + `<div class="big"><div class="v" id="tSum">–</div><div class="l">your targets add up to</div></div>`;
    $('#budgetTable tbody').innerHTML = rows.map((r, i) => `<tr><td data-l="Category">${esc(r.category)}</td><td class="n" data-l="Monthly average">${F(r.monthly)}</td><td class="n" data-l="Target"><input type="text" inputmode="numeric" value="${S.targets[r.category] != null ? S.targets[r.category] : ''}" placeholder="Set" data-i="${i}" aria-label="Monthly target for ${esc(r.category)}"></td><td class="n" data-l="Difference" id="bd${i}"></td></tr>`).join('');
    const upd = () => {
      let sum = 0, any = false;
      rows.forEach((r, i) => { const v = S.targets[r.category]; const cell = $('#bd' + i); if (v == null) { cell.textContent = '–'; cell.className = 'n'; return; } any = true; sum += v; const d = v - r.monthly; cell.textContent = (d < 0 ? 'over by ' : 'under by ') + F(Math.abs(d)); cell.className = 'n ' + (d < 0 ? 'over' : 'under'); });
      $('#tSum').textContent = any ? F(sum) : '–';
    };
    $$('#budgetTable input').forEach((inp) => inp.addEventListener('input', () => {
      const r = rows[+inp.dataset.i]; const raw = inp.value.trim(); const cell = $('#bd' + inp.dataset.i);
      if (!raw) { delete S.targets[r.category]; }
      else {
        // Accept "1,500", "KES 1500", "1500.50" and "2.5k"; refuse anything else instead of guessing
        const m = raw.replace(/^(kes|ksh|ugx|tzs|rwf|ghs|zmw)\.?\s*/i, '').replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(k|m)?$/i);
        if (!m) { delete S.targets[r.category]; upd(); cell.textContent = 'Type a whole amount, like 15000 or 15k'; cell.className = 'n over'; return; }
        let v = Math.round(parseFloat(m[1]) * (m[2] ? (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1));
        if (v > 1e9) { v = 1e9; }
        S.targets[r.category] = v;
      }
      if ($('#remember').checked) store.set('targets', S.targets); upd();
    }));
    upd();
  }
  function download(name, text, type) {
    // Some embedded viewers block downloads, so copy as well and say so
    $('#dlState').textContent = `Saved ${name}.`;
    try { navigator.clipboard.writeText(text).then(() => { $('#dlState').textContent = `Saved ${name}. It is also copied, so you can paste it into a spreadsheet if no file appeared.`; }, () => {}); } catch (e) { /* no clipboard */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  const csv = (rows) => rows.map((r) => r.map((v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',')).join('\n');
  $('#bCsv').addEventListener('click', () => { const rows = budgetRows(); download('pesadithi-budget.csv', csv([['category', 'monthly_average', 'monthly_target']].concat(rows.map((r) => [r.category, Math.round(r.monthly), S.targets[r.category] != null ? S.targets[r.category] : '']))), 'text/csv'); });
  $('#bLedger').addEventListener('click', () => { const A = S.A; download('pesadithi-transactions.csv', csv([['date_time', 'direction', 'type', 'party', 'category', 'amount', 'fee', 'balance', 'currency']].concat(A.txs.map((t) => [t.ts, t.dir, t.type, t.party || '', t.category || '', t.amt, t.fee || 0, t.bal == null ? '' : t.bal, t.cur]))), 'text/csv'); });
  $('#remember').addEventListener('change', (e) => { if (e.target.checked) { if (S.game) saveGame(); store.set('targets', S.targets); } else store.clear(); setDataUI(!!S.A); });
  $('#remember').checked = store.any();

  /* ---------------- Ask your AI ---------------- */
  $$('.choices').forEach((g) => g.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); S.ai[g.dataset.q] = b.dataset.a; renderAI(); }); }));
  $('#incMerchants').addEventListener('change', renderAI);
  function aiPlan(a) {
    // Same rules as prompts/any-llm.md
    const lvl = a.budget === '50' ? 'a lot' : a.budget === '20' ? 'some' : 'a little';
    const free = a.plan !== 'paid';
    const words = lvl === 'a little' || free ? 300 : lvl === 'some' ? 600 : 1000;
    const months = free || lvl === 'a little' ? 1 : lvl === 'some' ? 3 : 12;
    return { lvl, free, words, months };
  }
  function renderAI() {
    const A = S.A; if (!A) return; const a = S.ai; const plan = aiPlan(a);
    const sum = AN.summary(A, { merchants: plan.free ? 8 : 15, demo: S.demo, provider: A.provider });
    if (!$('#incMerchants').checked) sum.top_merchants = sum.top_merchants.map((m) => ({ category: m.category, total: m.total, payments: m.payments }));
    const json = JSON.stringify(sum);
    const adv = [];
    if (!a.platform || !a.plan || !a.budget || !a.share) adv.push('Answer the four questions above to tailor this.');
    if (!a.share || a.share === 'summary') adv.push('The summary below fits comfortably in a free plan.');
    if (a.share === 'pdf') adv.push(plan.months === 12 ? 'Attach your statement PDF with this prompt. Up to 12 months is reasonable on your plan.' : `On your answers, attach at most ${plan.months === 1 ? '1 month' : plan.months + ' months'} of statement (a 12-month PDF can be 60,000 to 150,000 tokens), or use the summary instead.`);
    if (a.share === 'pdf' || a.share === 'sms') adv.push('A statement or raw messages include people\'s names and phone numbers. The summary doesn\'t.');
    if (a.share === 'sms') adv.push(`Paste your money messages where the prompt says, ${plan.months === 1 ? 'one month at most' : 'one month at a time, up to ' + plan.months + ' months'}. Never paste bank codes or chats.`);
    if (a.platform) adv.push(`Check ${a.platform === 'another assistant' ? 'its' : a.platform + '\'s'} data settings first: on some plans, chats can be used to improve models unless you switch that off.`);
    $('#aiAdvice').textContent = adv.join(' ');
    const mp = A.provider === 'M-PESA';
    const what = a.share === 'pdf' ? 'I have attached my statement PDF. The summary below covers the same period.' : a.share === 'sms' ? 'My money messages are pasted at the end, after the summary.' : 'Below is an anonymised summary: totals and patterns only, with no names of people.';
    const prompt = `${S.demo ? 'NOTE: this is DEMO data for a fictional person, invented to show how the tool works. It is not real.\n\n' : ''}You are a calm, practical money coach who understands mobile money in Africa${mp ? ' (M-PESA, Fuliza, M-Shwari, KCB M-PESA)' : ` (${A.provider}, mobile loans and agent fees)`}. Use British English and plain words.

I used Pesadithi Lab (an open-source tool that runs in my browser) to analyse my ${A.provider} money. ${what}

I'm on ${a.platform || 'an AI assistant'}${a.plan ? ` (${a.plan} plan)` : ''} and want to spend ${plan.lvl} of my usage on this, so keep your answer under ${plan.words} words. Don't ask for more data unless it's essential.

Please:
1. The three most important things about my TIMING: when money arrives, how fast it goes, the days I run low, and the hours I spend.
${A.hasCredit || A.loans.length ? `2. What my ${mp ? 'Fuliza and loans' : 'borrowing'} really cost per 100 borrowed, and which costs were avoidable.\n` : '2. Which fees and charges I could cut, with amounts.\n'}3. Anything unusual worth a second look.
4. Three small, specific changes to try next month, each with the amount it could save.
5. One question that would help you advise me better next time.

Rules: use only numbers in the data and never invent any. Months marked partial_month cover only part of the month, so don't compare them with full months. Say "estimate" where the data says so. This is not financial advice; I'll decide.

SUMMARY (${A.cur}, ${A.start} to ${A.end}):
${json}${a.share === 'sms' ? '\n\nMY MONEY MESSAGES:\n[Paste them here]' : ''}`;
    $('#aiOut').textContent = prompt;
    $('#aiSize').textContent = `About ${n0(Math.round(prompt.length / 4))} tokens${a.share === 'pdf' ? ' plus your PDF' : a.share === 'sms' ? ' plus your messages' : ''}`;
    $('#copyState').textContent = '';
  }
  $('#copyPrompt').addEventListener('click', async () => { const t = $('#aiOut').textContent; try { await navigator.clipboard.writeText(t); $('#copyState').textContent = 'Copied. Paste it into your assistant.'; } catch (e) { const r = document.createRange(); r.selectNodeContents($('#aiOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('#copyState').textContent = 'Selected. Press Ctrl+C or Cmd+C to copy.'; } });

  /* ---------------- Story mode (tall 9:16, for screen recording) ---------------- */
  const SM = { i: 0, slides: [], timer: null, opener: null, rec: false, count: null };
  function stopCount() { clearInterval(SM.count); SM.count = null; $('#smCount').hidden = true; }
  function slides() {
    const A = S.A; const s = []; const d = S.demo; const cn = credit(); const their = d ? 'her' : 'your';
    if (A.hasCredit) s.push({ k: d ? 'Meet Amani · invented data' : 'Your money story', v: `${A.creditDays} days`, t: `of ${A.nDays} ended owing ${cn}.`, dd: d ? 'Amani is fictional. Her patterns are the kind this tool finds.' : 'Here is why, in under a minute.' });
    else s.push({ k: d ? 'Meet Amani · invented data' : 'Your money story', v: n0(A.txCount), t: `transactions in ${pl(Math.round(A.monthsEq), 'month')}.`, dd: 'Here is what they say about timing.' });
    s.push({ k: 'Money in, money out', v: FB(A.totalIn), t: `came in. ${FB(A.totalOut)} went out.`, dd: A.ownOut > A.totalOut * .05 ? `${pct(A.ownOut / A.totalOut)} of what went out moved to ${their} own banks, cards or savings.` : `Net: ${A.totalIn >= A.totalOut ? '+' : '−'}${kfmt(Math.abs(A.totalIn - A.totalOut))}.` });
    if (A.lifespan != null) s.push({ k: 'How long it lasts', v: A.lifespan.toFixed(1) + ' days', t: 'until half of a big payment is spent.', dd: A.lifespan75 ? `Three quarters gone by day ${A.lifespan75.toFixed(1)}.` : '', viz: 'drain' });
    if (A.hasCredit && A.lowDay) s.push({ k: 'The gap', v: `The ${ord(A.lowDay.day)}`, t: `is when ${their} balance is usually lowest.`, dd: A.bigInDays.length ? `Money lands around the ${ord(A.bigInDays[0])}. ${cn} fills the gap.` : '', viz: 'dom' });
    s.push({ k: 'The money clock', v: hourLabel(A.habits.peakHour), t: `on ${WD[A.habits.peakWeekday]} is peak spending time.`, dd: `${pct(A.habits.lateNightShare)} of spending happens between 10pm and 4am.` });
    if (A.habits.cafeVisits > 10) s.push({ k: 'A habit', v: `${Math.round(A.habits.cafePerWeek)} a week`, t: 'café and restaurant visits.', dd: `${F(A.habits.cafeSpend / A.monthsEq)} a month.` });
    if (A.loans.length) s.push({ k: 'Borrowing', v: `${A.cur} ${Math.round(A.loanCost / (d3.sum(A.loans, (l) => l.principal) || 1) * 100)}`, t: 'paid for every 100 borrowed on loans.', dd: A.hasCredit ? `${cn}: about ${A.cur} ${(A.creditFees / (A.creditDrawn || 1) * 100).toFixed(1)} per 100.` : '' });
    s.push({ k: 'The price', v: F(A.feesTotal), t: 'in fees and charges.', dd: A.avoidableTotal ? `${F(A.avoidableTotal)} of it was avoidable.` : '' });
    const tip = A.loans.some((l) => l.rollover || l.cashbackMissed) ? { v: 'Repay by day 10', t: d3.sum(A.loans, (l) => l.rollover) ? 'Avoid late penalties and earn the early-repayment refund.' : 'Earn back part of the loan fee with the early-repayment refund.' } : A.hasCredit && A.lowDay ? { v: `Move money to the ${ord(Math.max(1, A.lowDay.day - 2))}`, t: `Close the gap before ${cn} has to.` } : { v: 'Sort your people', t: 'See what the money you send really is.' };
    s.push({ k: 'Try this', v: tip.v, t: tip.t, dd: '', small: true });
    s.push({ k: 'Pesadithi Lab', v: 'Read your own', t: 'Free, open source, and your data stays on your device.', dd: '', url: 'github.com/mkaigwa/pesadithi-lab' });
    return s;
  }
  function miniViz(kind) {
    const A = S.A; const w = 400, hh = 150;
    if (kind === 'drain') { const x = d3.scaleLinear().domain([0, 30]).range([0, w]), y = d3.scaleLinear().domain([0, 1]).range([hh, 6]); const dd = A.drain.filter((q) => q.remaining != null); return `<svg viewBox="0 0 ${w} ${hh + 4}" aria-hidden="true"><path d="${d3.area().x((q) => x(q.day)).y0(hh).y1((q) => y(q.remaining)).curve(d3.curveMonotoneX)(dd)}" fill="${C.in}" opacity=".85"/></svg>`; }
    if (kind === 'dom') { const x = d3.scaleBand().domain(d3.range(1, 32)).range([0, w]).padding(.2), y = d3.scaleLinear().domain([0, d3.max(A.dom, (q) => q.creditDraw) || 1]).range([hh, 6]); return `<svg viewBox="0 0 ${w} ${hh + 4}" aria-hidden="true">${A.dom.map((q) => `<rect x="${x(q.day)}" width="${x.bandwidth()}" y="${y(q.creditDraw)}" height="${hh - y(q.creditDraw)}" rx="2" fill="${C.credit}"/>`).join('')}</svg>`; }
    return '';
  }
  function openStoryMode(ev) {
    if (!S.A) return; SM.opener = (ev && ev.currentTarget) || document.activeElement; SM.slides = slides(); SM.i = 0;
    stopCount(); stopPlay(); SM.rec = false; $('#sm').hidden = false; document.body.style.overflow = 'hidden'; $('#smDemo').hidden = !S.demo; $('#sm').classList.remove('rec', 'playing');
    history.pushState({ sm: 1 }, ''); drawSlide(); $('#smPlay').focus();
  }
  function closeStoryMode(fromPop) {
    if ($('#sm').hidden) return; $('#sm').hidden = true; document.body.style.overflow = ''; stopCount(); stopPlay(); SM.rec = false; $('#sm').classList.remove('rec', 'playing');
    if (!fromPop && history.state && history.state.sm) history.back();
    const op = SM.opener && SM.opener.isConnected && SM.opener.offsetParent ? SM.opener : $('#btnStoryMode');
    setTimeout(() => { if (op && op.offsetParent) { op.focus({ preventScroll: true }); op.scrollIntoView({ block: 'center' }); } }, 80);
  }
  window.addEventListener('popstate', () => { if (!$('#sm').hidden) closeStoryMode(true); });
  function drawSlide() {
    const s = SM.slides[SM.i];
    $('#smBar').innerHTML = SM.slides.map((_, i) => `<i class="${i <= SM.i ? 'on' : ''}"></i>`).join('');
    $('#smSlide').innerHTML = `<div class="sk">${esc(s.k)}</div><div class="sv${s.small ? ' small' : ''}">${esc(s.v)}</div><div class="st">${esc(s.t)}</div>${s.dd ? `<div class="sd">${esc(s.dd)}</div>` : ''}${s.viz ? miniViz(s.viz) : ''}${s.url ? `<div class="surl">${esc(s.url)}</div>` : ''}`;
    $('#smLive').textContent = `Slide ${SM.i + 1} of ${SM.slides.length}: ${s.v} ${s.t}`;
  }
  const dwell = (s) => Math.max(3000, Math.min(6500, 1600 + ((s.v + ' ' + s.t + ' ' + (s.dd || '')).split(/\s+/).length) * 220));
  function stopPlay() { clearTimeout(SM.timer); SM.timer = null; $('#smPlay').textContent = 'Auto-play'; $('#sm').classList.remove('playing'); }
  function schedule() { clearTimeout(SM.timer); SM.timer = setTimeout(() => { if (SM.i < SM.slides.length - 1) { SM.i++; drawSlide(); schedule(); } else { stopPlay(); /* in Record mode the last frame holds, chrome hidden, until a tap or H */ } }, dwell(SM.slides[SM.i])); }
  function play() { if (SM.i >= SM.slides.length - 1) { SM.i = 0; drawSlide(); } $('#smPlay').textContent = 'Pause'; $('#sm').classList.add('playing'); schedule(); }
  function step(nn) { if (SM.rec && !SM.timer && !SM.count) { SM.rec = false; $('#sm').classList.remove('rec'); $('#smPlay').focus(); return; } SM.i = Math.max(0, Math.min(SM.slides.length - 1, SM.i + nn)); drawSlide(); if (SM.timer) schedule(); }
  $('#smNext').addEventListener('click', () => step(1)); $('#smPrev').addEventListener('click', () => step(-1)); $('#smClose').addEventListener('click', () => closeStoryMode());
  $('#smPlay').addEventListener('click', () => (SM.timer ? stopPlay() : play()));
  $('#smRec').addEventListener('click', () => { stopCount(); SM.rec = true; SM.i = 0; drawSlide(); stopPlay(); $('#sm').classList.add('rec'); let c = 3; $('#smCount').hidden = false; $('#smCount').textContent = c; SM.count = setInterval(() => { c--; if (c > 0) $('#smCount').textContent = c; else { stopCount(); play(); } }, 1000); });
  $('#btnStoryMode').addEventListener('click', openStoryMode);
  document.addEventListener('keydown', (e) => {
    if ($('#sm').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeStoryMode(); return; }
    if (e.key === 'Tab') { const f = $$('#sm button').filter((b) => b.offsetParent !== null); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } return; }
    if (e.key === 'ArrowRight' || (e.key === ' ' && !(document.activeElement && document.activeElement.tagName === 'BUTTON'))) { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'h' || e.key === 'H') { $('#sm').classList.toggle('rec'); if (!$('#sm').classList.contains('rec')) SM.rec = false; }
  });

  /* ---------------- Start ---------------- */
  setDataUI(false);
  $('#btnDemo').disabled = false; $('#btnDemo').textContent = 'See a demo story';
  route();
})();
