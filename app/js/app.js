/* Pesadithi Lab: app controller, story, game, budget, AI hand-off, story mode. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const P = window.PDParse, AN = window.PDAnalyse, MC = window.PDMerchants;
  // Money in is green, money out is red, credit violet, loans amber (validated for colour-blind separation; in and out also differ by position)
  const C_LIGHT = { in: '#1f8a4c', out: '#d23b2e', credit: '#7a4fd0', loan: '#e08a00', fee: '#5b6670', bad: '#a3170f', good: '#1f8a4c', ink: '#0f2318', grid: '#e6eee9', muted: '#8c9d93', surface: '#ffffff', axis: '#8a8a96' };
  const C_DARK = { in: '#36a865', out: '#ee5a4c', credit: '#8f74ee', loan: '#cf8519', fee: '#a4adb5', bad: '#ff8a80', good: '#36a865', ink: '#eef2f0', grid: '#2b3033', muted: '#8d9894', surface: '#121416', axis: '#6b7478' };
  const C = Object.assign({}, document.documentElement.getAttribute('data-theme') === 'dark' ? C_DARK : C_LIGHT);
  window.addEventListener('pd-theme', (e) => { Object.assign(C, e.detail === 'dark' ? C_DARK : C_LIGHT); if (typeof drawCharts === 'function' && S && S.A && !document.getElementById('v-story').hidden) drawCharts(); });
  const S = { calMode: null, raw: null, A: null, demo: false, period: 12, src: null, busy: false, token: 0, lastInput: null, pwFails: 0, game: null, targets: {}, ai: { plan: 'free', budget: '5', share: 'summary' } };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('pesadithi:' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('pesadithi:salt', SALT); localStorage.setItem('pesadithi:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    any() { try { return Object.keys(localStorage).some((k) => k.startsWith('pesadithi:') && k !== 'pesadithi:salt' && k !== 'pesadithi:type'); } catch (e) { return false; } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('pesadithi:')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } }
  };
  // People's names are never stored: only a scrambled code (FNV-1a hash) for each name you sorted
  // A random salt per browser, so the codes can't be matched against a list of common names
  let SALT = ''; try { SALT = localStorage.getItem('pesadithi:salt') || ''; if (!SALT) { SALT = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); } } catch (e) { SALT = String(Math.random()).slice(2); }
  const h = (s0) => { const s = SALT + '|' + s0; let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
  const n0 = d3.format(',.0f');
  const cur = () => (window.PD_FX && window.PD_FX.to) || (S.A ? S.A.cur : 'KES');
  // Indicative mid rates, units per US dollar, around 10 November 2026 (CBK/KRA, Bank of Tanzania, Bank of Uganda quotes)
  const FX = { KES: 129.91, TZS: 2640.44, UGX: 4050, USD: 1 };
  const FX_NAME = { KES: 'Kenya shilling', TZS: 'Tanzania shilling', UGX: 'Uganda shilling', USD: 'US dollar' };
  const FX_DATE = 'mid-November 2026';
  const fxv = (v) => (window.PD_FX ? v * window.PD_FX.rate : v);
  const F = (v) => AN.fmt(v, S.A ? S.A.cur : 'KES');
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
  const kfmt = (v0) => { const v = fxv(v0); return (Math.abs(v) >= 1e6 ? d3.format('.1f')(v / 1e6) + 'm' : Math.abs(v) >= 1000 ? n0(v / 1000) + 'k' : n0(v)); };

  /* ---------------- Currency display ---------------- */
  function fxUI(view) {
    const wrap = $('#curWrap'), sel = $('#curSel'); if (!wrap) return;
    const on = !!S.A && ['story', 'sort', 'budget'].includes(view || (location.hash || '#home').slice(1));
    wrap.hidden = !on;
    if (S.A) {
      const nat = S.A.cur;
      if (sel.dataset.nat !== nat) {
        sel.dataset.nat = nat;
        sel.innerHTML = [nat].concat(Object.keys(FX).filter((c) => c !== nat && FX[nat])).map((c) => `<option value="${c === nat ? '' : c}">${c}${c === nat ? '' : ''}</option>`).join('');
        sel.value = window.PD_FX && window.PD_FX.from === nat ? window.PD_FX.to : '';
      }
    }
    const note = $('#fxNote'); const fx = window.PD_FX;
    note.hidden = !on; note.classList.toggle('conv', !!fx);
    if (on) {
      if (!note.contains(wrap)) { note.innerHTML = '<div class="wrap fxin"><span class="fxmsg" id="fxMsg"></span></div>'; note.querySelector('.fxin').appendChild(wrap); }
      $('#fxMsg').innerHTML = fx ? `Shown in <b>${fx.to}</b> at about ${fx.rate >= 1 ? d3.format(',.2f')(fx.rate) + ' ' + fx.to + ' to 1 ' + fx.from : '1 ' + fx.to + ' to ' + d3.format(',.2f')(1 / fx.rate) + ' ' + fx.from}, ${FX_DATE} rates. Your records are in ${fx.from}; treat this as a guide. <button type="button" class="linkbtn small" id="fxOff">Back to ${fx.from}</button>` : `Amounts in ${S.A.cur}, as in your records.`;
    }
    const off = $('#fxOff'); if (off) off.onclick = () => setFx('');
  }
  function setFx(to) {
    const nat = S.A ? S.A.cur : 'KES';
    window.PD_FX = to && FX[to] && FX[nat] ? { from: nat, to, rate: FX[to] / FX[nat] } : null;
    try { localStorage.setItem('pesadithi:fx', to || ''); } catch (e) { /* fine */ }
    const v = (location.hash || '#home').slice(1);
    if (S.A) { $('#story').innerHTML = ''; $('#chapterNav') && ($('#chapterNav').innerHTML = ''); }
    if (v === 'story' && S.A) renderStory(); else if (v === 'sort') renderGame(); else if (v === 'budget') renderBudget();
    $('#curSel').value = to || ''; fxUI(v);
  }
  $('#curSel') && $('#curSel').addEventListener('change', (e) => setFx(e.target.value));

  $('#openLegal') && $('#openLegal').addEventListener('click', (e) => { e.preventDefault(); const d = document.querySelector('details.legal'); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  /* ---------------- Routing ---------------- */
  let firstRoute = true;
  function show(view) {
    $$('[data-v]').forEach((s) => (s.hidden = s.dataset.v !== view));
    $$('.nav a').forEach((a) => (a.dataset.view === view ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $('#demoBadge').hidden = !(S.A && S.demo && view !== 'start');
    fxUI(view);
    if (view === 'sort') renderGame();
    if (view === 'budget') renderBudget();
    if (view === 'ai') {
      if (!S.A) { $('#aiEmpty').hidden = true; $('#aiBody').hidden = true; loadDemoForAI(); }
      else { $('#aiEmpty').hidden = true; $('#aiBody').hidden = false; renderAI(); }
    }
    if (view === 'story' && !$('#story').childElementCount) renderStory();
    window.scrollTo(0, 0);
    if (!firstRoute) { const hd = $('[data-v="' + view + '"] h1'); if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); } }
    firstRoute = false;
  }
  function route() {
    const v = (location.hash || '#home').slice(1).split('/')[0];
    const ok = ['home', 'start', 'story', 'sort', 'budget', 'ai', 'privacy'];
    if (['story', 'sort', 'budget'].includes(v) && !S.A) { $('#notice').hidden = false; history.replaceState(null, '', '#start'); show('start'); return; }
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
    pdf: `<b>Get your statement (free)</b><ol><li>Open the <b>M-PESA app</b> and go to <b>Statements</b>, or dial <b>*334#</b> and look for <b>My Account → M-PESA Statement</b>.</li><li>Ask for a <b>full statement</b> for the months you want. 12 months shows the most patterns.</li><li>It arrives by <b>email as a PDF</b>. The <b>password arrives by SMS</b>.</li><li>Open that email on this device and save the PDF, or email it to yourself here.</li><li>Choose the file below and type the password from the SMS.</li></ol><details class="rescue"><summary>I got the SMS with the password. Now what?</summary><ol><li>Open your email app on this phone and search for <b>M-PESA statement</b>. Check Spam or Promotions too.</li><li>Tap the PDF and choose <b>Download</b> or <b>Save to Files</b>. Don't open it in the email app.</li><li>Come back to this page, tap <b>Choose a file</b>, and pick the PDF from Downloads or Files.</li><li>Type the code from the SMS. It's a one-off code, not your M-PESA PIN.</li></ol><p class="small muted">Lost the SMS? Request the statement again; each request sends a new code.</p></details><p class="small muted" style="margin:8px 0 0">These were Safaricom's steps in November 2026. Menus change; if yours look different, follow the steps in the M-PESA app.</p>`,
    mac: `<b>For iPhone users with a Mac</b><ol><li>On your iPhone, check <b>Settings → Messages → Text Message Forwarding</b> is on for your Mac, so M-PESA texts reach it.</li><li>Download <code>extract_mobile_money.py</code> from the <a href="https://github.com/mkaigwa/pesadithi-lab/tree/main/tools/mac" rel="noopener">tools/mac</a> folder on GitHub.</li><li>Give <b>Terminal</b> Full Disk Access (System Settings → Privacy &amp; Security → Full Disk Access). <b>This lets Terminal read every file on your Mac</b>, so switch it off again afterwards.</li><li>Run <code>python3 extract_mobile_money.py</code>. It saves <code>pesadithi-messages.json</code> in your Downloads folder.</li><li>Choose that file below. Then switch Full Disk Access off and delete the file when you're done.</li></ol>`,
    android: `<b>For Android phones</b><ol><li>Install <b>SMS Backup &amp; Restore</b> by SyncTech from Google Play (<a href="https://synctech.com.au/sms-backup-restore/" target="_blank" rel="noopener">their guide</a>, <a href="https://synctech.com.au/sms-faqs/" target="_blank" rel="noopener">help</a>).</li><li>Back up <b>messages only</b> to your phone's storage. It saves a file ending in <code>.xml</code>.</li><li>Choose that file below, on your phone or a computer.</li><li>Delete the backup file afterwards. It contains <b>all</b> your texts, including bank codes.</li></ol>`,
    shots: `<b>Screenshots of your SMS</b><ol><li>Open your messages and the <b>M-PESA</b> conversation.</li><li>Take screenshots as you scroll up. Ten screenshots covers about a month for most people.</li><li>Tap <b>Choose a file</b> below and select all of them at once.</li><li>Press <b>Read my data</b>. The text is read here, on this device; the first time, the reader takes a few seconds to load.</li></ol><p class="small muted" style="margin:8px 0 0">Screenshots work best when they're sharp and the text isn't cut off. For a whole year, the statement PDF is faster.</p>`,
    paste: `<b>Quick try</b><ol><li>Open your messages and the <b>M-PESA</b> conversation.</li><li>Copy as many messages as you like and paste them in the box below.</li></ol><p class="small muted" style="margin:8px 0 0">The more months you paste, the better the patterns. For a whole year, a statement is faster.</p>`,
    momo: `<b>MTN MoMo and Airtel Money (beta)</b><ol><li>Paste your MoMo or Airtel Money texts below, or choose an Android SMS backup (<code>.xml</code>).</li><li>Formats differ between countries. After reading, we show how many messages we read and list the ones we couldn't.</li></ol><p class="small muted" style="margin:8px 0 0">Help us improve: open an issue on GitHub with a message whose names and numbers you've replaced.</p>`
  };
  let FILE = null; let FILES = [];
  const isImg = (f) => f && (/^image\//.test(f.type) || /\.(png|jpe?g|webp|heic)$/i.test(f.name));
  function stepTo(n) { $$('#stepper li').forEach((li, i) => { li.classList.toggle('on', i < n); li.classList.toggle('now', i === n - 1); if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); }); }
  function resetLoader() {
    FILE = null; S.lastInput = null; S.pwFails = 0; $('#file').value = ''; $('#fileName').textContent = 'PDF statement, screenshots of your SMS, or a JSON, XML, CSV or TXT export. Up to 25 MB.';
    $('#found').hidden = true; status('');
  }
  $$('.source').forEach((b) => b.addEventListener('click', () => {
    $$('.source').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    S.src = b.dataset.src; S.token++; resetLoader(); stepTo(2);
    $('#srcHelp').innerHTML = HELP[S.src]; $('#srcHelp').hidden = false; $('#loader').hidden = false;
    $('#pwField').hidden = S.src !== 'pdf';
    $('#pasteField').hidden = S.src === 'pdf' || S.src === 'shots';
    $('#drop').hidden = S.src === 'paste';
    $('#pasteLbl').textContent = S.src === 'paste' ? 'Paste your messages here' : 'Or paste messages';
    $('#btnSample').hidden = !['paste', 'momo'].includes(S.src);
    if (S.src === 'pdf') P.preloadPdf().catch(() => {});
    $('#srcHelp').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (ev) => { const fs = Array.from(ev.dataTransfer.files); if (fs[0]) setFile(fs[0], fs); });
  $('#file').addEventListener('change', (e) => { const fs = Array.from(e.target.files); if (fs[0]) setFile(fs[0], fs); });
  $('#paste').addEventListener('input', () => { S.lastInput = $('#paste').value.trim() ? 'paste' : (FILE ? 'file' : null); });
  $('#pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); readData(); } });
  function setFile(f, all) {
    FILE = f; FILES = (all || [f]).filter(isImg); S.lastInput = 'file'; $('#found').hidden = true;
    $('#fileName').innerHTML = (isImg(f) && FILES.length > 1 ? 'Chosen: <b>' + FILES.length + ' screenshots</b>' : 'Chosen: <b>' + esc(f.name) + '</b> (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)') + ' · <button type="button" class="linkbtn" id="rmFile">Remove</button>';
    if (isImg(f)) { status('Screenshots are read on this device, never uploaded. Press "Read my data". The first time takes a little longer while the text reader loads.'); }
    $('#rmFile').addEventListener('click', () => { FILE = null; $('#file').value = ''; S.lastInput = $('#paste').value.trim() ? 'paste' : null; $('#fileName').textContent = 'PDF statement, screenshots of your SMS, or a JSON, XML, CSV or TXT export. Up to 25 MB.'; });
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
        if (useFile && isImg(FILE)) {
          text = await ocrImages(FILES.length ? FILES : [FILE], (m) => { if (token === S.token) status(m); });
          if (token !== S.token) return;
        } else if (useFile) {
          if (!/\.(json|xml|txt|csv)$/i.test(FILE.name) && !/json|xml|text|csv/.test(FILE.type)) { status('This file type isn\'t supported. Use a PDF statement, screenshots of your SMS, a .json or .xml export, or paste the messages.', 'err'); return; }
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
  /* Screenshots: read the text on this device with Tesseract (loaded only when needed, from this site) */
  let OCR = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function ocrImages(files, say) {
    say('Loading the text reader (about 7 MB, once)…');
    if (!window.Tesseract) await loadScript(window.PD_OCR_BASE ? window.PD_OCR_BASE + 'tesseract.min.js' : 'vendor/ocr/tesseract.min.js');
    const base = window.PD_OCR_BASE || new URL('vendor/ocr/', location.href).href;
    if (!OCR) {
      // The language file ships as .wasm (some hosts refuse .gz); seed the reader's own cache with it so nothing is fetched elsewhere
      const lang = new Uint8Array(await (await fetch(base + 'eng-traineddata.wasm')).arrayBuffer());
      await new Promise((ok) => { try { const rq = indexedDB.open('keyval-store'); rq.onupgradeneeded = () => rq.result.createObjectStore('keyval'); rq.onsuccess = () => { const tx = rq.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(lang, './eng.traineddata'); tx.oncomplete = ok; tx.onerror = ok; }; rq.onerror = ok; } catch (e) { ok(); } });
      OCR = await window.Tesseract.createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base, gzip: true, workerBlobURL: false });
    }
    let out = '';
    for (let i = 0; i < files.length; i++) {
      say(`Reading screenshot ${i + 1} of ${files.length} on this device…`);
      const { data } = await OCR.recognize(files[i]);
      out += '\n' + data.text;
    }
    if (window.PD_OCR_DEBUG) console.log('OCR', out);
    // Screenshots break each SMS across lines; join them so each message starts at its code
    return out.replace(/\r/g, '').replace(/([^\n])\n(?!\n)/g, '$1 ').replace(/\bKsh\s+(?=\d)/g, 'Ksh').replace(/\s+/g, ' ');
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
    $('#found').hidden = false; stepTo(3); requestAnimationFrame(() => $('#found').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })); window.pdTrack && pdTrack('Data loaded', { route: S.src || 'unknown', kind: r.kind || 'sms', months: String(Math.max(1, Math.round(span / 30))) });
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
    { let pf = ''; try { pf = localStorage.getItem('pesadithi:fx') || ''; } catch (e) { /* fine */ } window.PD_FX = pf && pf !== S.A.cur && FX[pf] && FX[S.A.cur] ? { from: S.A.cur, to: pf, rate: FX[pf] / FX[S.A.cur] } : null; const cs = $('#curSel'); if (cs) cs.dataset.nat = ''; }
    $('#story').innerHTML = ''; setDataUI(true); resetGame(); S.targets = store.get('targets') || {};
  }

  $('#btnDemo').addEventListener('click', async (e) => {
    if (S.busy) return; S.busy = true; e.target.setAttribute('aria-busy', 'true'); e.target.textContent = 'Loading the demo…';
    try { const t = await (await fetch('demo/demo-mpesa-sms.json')).text(); S.raw = P.fromMessages(t, 'demo'); S.demo = true; S.period = 12; compute(); go('story'); window.pdTrack && pdTrack('Demo opened'); }
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
    svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', mid).attr('y2', mid).style('stroke', C.axis);
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
    const mode = S.calMode || (A.hasCredit ? 'credit' : 'net');
    const ml = 66, cell = Math.max(14, Math.min(24, Math.floor(((el.clientWidth || 700) - ml) / 31)));
    const wNeed = ml + 31 * cell + 6, gh = months.length * cell, barH = 80, hgt = gh + barH + 36;
    const LBL = { in: 'money in', out: 'money out', net: 'net (in minus out)', credit: credit() + ' owed' };
    const { svg } = svgIn(el, hgt, `Calendar of days by month, shaded by ${LBL[mode]}, with totals by date`, wNeed);
    const val = (d) => (mode === 'in' ? d.in : mode === 'out' ? d.out : mode === 'credit' ? d.owed : d.in - d.out);
    const q = d3.quantile(rows.map((d) => Math.abs(val(d))).filter((v) => v > 0).sort(d3.ascending), 0.95) || 1;
    const op = d3.scaleSqrt().domain([0, q]).range([0.16, 1]).clamp(true);
    const colOf = (v) => (mode === 'in' ? C.in : mode === 'out' ? C.out : mode === 'credit' ? C.credit : v >= 0 ? C.in : C.out);
    months.forEach((m, j) => svg.append('text').attr('x', ml - 8).attr('y', j * cell + cell / 2 + 4).attr('text-anchor', 'end').text(d3.utcFormat('%b %Y')(dt(m + '-01'))));
    const t = tipFor(el);
    hit(svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (d) => ml + (+d.date.slice(8, 10) - 1) * cell + 1).attr('y', (d) => months.indexOf(d.date.slice(0, 7)) * cell + 1).attr('width', cell - 2).attr('height', cell - 2).attr('rx', 2)
      .style('fill', (d) => (val(d) ? colOf(val(d)) : C.grid)).style('opacity', (d) => (val(d) ? op(Math.abs(val(d))) : 1)),
    (ev, d) => t.show(ev, `<b>${fmtDate(d.date)}</b><br><span>In</span> ${F(d.in)}<br><span>Out</span> ${F(d.out)}<br><span>Net</span> ${d.in - d.out >= 0 ? '+' : '−'}${F(Math.abs(d.in - d.out))}${A.hasCredit ? `<br><span>Owed to ${credit()}</span> ${F(d.owed)}` : ''}<br><span>Balance</span> ${F(d.balance)}`), t);
    svg.append('g').selectAll('circle').data(rows.filter((d) => d.in > 0 && d.in >= A.bigCut)).join('circle').attr('cx', (d) => ml + (+d.date.slice(8, 10) - 0.5) * cell).attr('cy', (d) => months.indexOf(d.date.slice(0, 7)) * cell + cell / 2).attr('r', Math.max(2.5, cell * .17)).style('fill', C.ink).style('stroke', C.surface).style('stroke-width', 1).style('pointer-events', 'none');
    // Bars by date of the month: in up and out down for in/out/net, credit drawn for credit
    const y0 = gh + barH / 2 + 10;
    if (mode === 'credit') {
      const yb = d3.scaleLinear().domain([0, d3.max(A.dom, (d) => d.creditDraw) || 1]).range([gh + barH + 6, gh + 14]);
      hit(svg.append('g').selectAll('rect').data(A.dom).join('rect').attr('x', (d) => ml + (d.day - 1) * cell + 1).attr('width', cell - 2).attr('y', (d) => yb(d.creditDraw)).attr('height', (d) => gh + barH + 6 - yb(d.creditDraw)).attr('rx', 2).style('fill', C.credit),
        (ev, d) => t.show(ev, `<b>The ${ord(d.day)}</b><br><span>${credit()} used, whole period</span> ${F(d.creditDraw)}`), t);
    } else {
      const v = (d) => (mode === 'in' ? d.in : mode === 'out' ? -d.out : d.in - d.out);
      const mx = d3.max(A.dom, (d) => Math.abs(v(d))) || 1; const yb = d3.scaleLinear().domain([0, mx]).range([0, barH / 2 - 4]);
      svg.append('g').selectAll('rect').data(A.dom).join('rect').attr('x', (d) => ml + (d.day - 1) * cell + 1).attr('width', cell - 2).attr('y', (d) => (v(d) >= 0 ? y0 - yb(v(d)) : y0 + 1)).attr('height', (d) => yb(Math.abs(v(d)))).attr('rx', 2).style('fill', (d) => (v(d) >= 0 ? C.in : C.out));
      svg.append('line').attr('x1', ml).attr('x2', ml + 31 * cell).attr('y1', y0 + .5).attr('y2', y0 + .5).style('stroke', C.muted);
      hit(svg.append('g').selectAll('rect').data(A.dom).join('rect').attr('x', (d) => ml + (d.day - 1) * cell).attr('width', cell).attr('y', gh + 8).attr('height', barH).style('fill', 'transparent'),
        (ev, d) => t.show(ev, `<b>The ${ord(d.day)}, whole period</b><br><span>In</span> ${F(d.in)}<br><span>Out</span> ${F(d.out)}<br><span>Net</span> ${d.in - d.out >= 0 ? '+' : '−'}${F(Math.abs(d.in - d.out))}`), t);
    }
    [1, 10, 20, 31].forEach((d) => svg.append('text').attr('x', ml + (d - .5) * cell).attr('y', gh + barH + 22).attr('text-anchor', 'middle').text(d));
    svg.append('text').attr('x', ml - 8).attr('y', gh + barH / 2 + 14).attr('text-anchor', 'end').text('By date');
    if (wNeed > (el.clientWidth || 0) + 4) { const hnt = document.createElement('p'); hnt.className = 'small muted scrollhint'; hnt.textContent = 'Swipe sideways to see the rest of the month →'; el.before(hnt); }
    dataTable(el, 'Totals by date of the month', ['Date', 'In', 'Out', 'Net'].concat(A.hasCredit ? [credit() + ' used'] : []), A.dom.map((d) => [ord(d.day), n0(d.in), n0(d.out), n0(d.in - d.out)].concat(A.hasCredit ? [n0(d.creditDraw)] : [])));
  }
  function flowChart(el, A) {
    const rows = A.months; const hgt = 300; const { svg, w } = svgIn(el, hgt, 'Money in above the line and money out below it, by month, with the net as a dot');
    const mx = d3.max(rows, (m) => Math.max(m.in, m.out)) || 1;
    const ml = 48, top = 16, bot = hgt - 26, mid = (top + bot) / 2;
    const y = d3.scaleLinear().domain([-mx, mx]).nice().range([bot, top]);
    const x = d3.scaleBand().domain(rows.map((m) => m.month)).range([ml, w - 4]).padding(.24);
    y.ticks(4).forEach((v) => { svg.append('line').attr('x1', ml).attr('x2', w).attr('y1', y(v)).attr('y2', y(v)).style('stroke', v === 0 ? C.muted : C.grid); svg.append('text').attr('x', ml - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text((v > 0 ? '+' : v < 0 ? '−' : '') + kfmt(Math.abs(v))); });
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (m) => x(m.month)).attr('width', x.bandwidth()).attr('y', (m) => y(m.in)).attr('height', (m) => y(0) - y(m.in)).attr('rx', 3).style('fill', C.in).style('opacity', (m) => (m.partial ? .45 : 1));
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (m) => x(m.month)).attr('width', x.bandwidth()).attr('y', y(0) + 1).attr('height', (m) => y(-m.out) - y(0)).attr('rx', 3).style('fill', C.out).style('opacity', (m) => (m.partial ? .45 : 1));
    svg.append('path').datum(rows).attr('d', d3.line().x((m) => x(m.month) + x.bandwidth() / 2).y((m) => y(m.in - m.out))).style('fill', 'none').style('stroke', C.ink).style('stroke-width', 1.2).style('stroke-dasharray', '2 3');
    svg.append('g').selectAll('circle').data(rows).join('circle').attr('cx', (m) => x(m.month) + x.bandwidth() / 2).attr('cy', (m) => y(m.in - m.out)).attr('r', 4.5).style('fill', C.ink).style('stroke', C.surface).style('stroke-width', 2);
    const every = Math.ceil(rows.length / Math.max(2, Math.floor(w / 52)));
    svg.append('g').attr('transform', `translate(0,${bot})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8).tickFormat((m, i) => (i % every ? '' : d3.utcFormat('%b')(dt(m + '-01'))))).call((g) => g.select('.domain').remove());
    const t = tipFor(el);
    hit(svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (m) => x(m.month) - x.step() * .12).attr('width', x.step()).attr('y', top).attr('height', bot - top).style('fill', 'transparent'),
      (ev, m) => t.show(ev, `<b>${d3.utcFormat('%B %Y')(dt(m.month + '-01'))}${m.partial ? ' (part month)' : ''}</b><br><span>In</span> +${F(m.in)}<br><span>Out</span> −${F(m.out)}<br><span>Net</span> ${m.in - m.out >= 0 ? '+' : '−'}${F(Math.abs(m.in - m.out))}`), t);
    dataTable(el, 'Money in, out and net by month', ['Month', 'In', 'Out', 'Net'], rows.map((m) => [d3.utcFormat('%b %Y')(dt(m.month + '-01')) + (m.partial ? ' (part)' : ''), n0(m.in), n0(m.out), n0(m.in - m.out)]));
  }
  function heatChart(el, A) {
    const ml = (el.clientWidth || 700) < 380 ? 34 : 40, cw = Math.max(10, Math.floor(((el.clientWidth || 700) - ml - 4) / 24)), ch = Math.max(20, Math.min(30, cw)), hgt = ch * 7 + 28;
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
    const all = [['transaction', 'Transaction costs', C.fee], ['credit', credit() + ' fees', C.credit], ['loans', 'Loan fees', C.loan], ['penalties', 'Penalties', C.bad]];
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
  function big(v, l, cls) { return `<div class="big${cls ? ' ' + cls : ''}"><div class="v">${v}</div><div class="l">${l}</div></div>`; }
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
    const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen']; let n = 0; const num = () => WORDS[n++] + ' · ';
    const chapters = [];
    chapters.push(['cover', 'Overview', ch('cover', `${S.demo ? '<span>Demo: invented data</span> · ' : ''}${window.PD_OWNER ? `<span>${esc(window.PD_OWNER)}'s money story</span> · ` : ''}${A.cur} · ${fmtDate(A.start)} to ${fmtDate(A.end)}`, A.hasCredit ? `${n0(A.creditDays)} of ${pl(A.nDays, 'day')} <em>ended owing ${cn}</em>` : `${FB(A.totalIn)} in, <em>${FB(A.totalOut)} out</em>`,
      `<p class="lede">${S.demo ? 'Meet Amani, a fictional person with invented data, so you can see how the story reads. ' : ''}Here is what ${pl(A.txCount, 'transaction')} say about timing: when money arrives, how fast it goes, and what filling the gaps costs.</p>
      <div class="bigs">${big('+' + FB(A.totalIn), 'came in', 'in')}${big('−' + FB(A.totalOut), 'went out' + (ownShare > 0.05 ? `, ${pct(ownShare)} of it to ${their} own banks, cards or savings` : ''), 'out')}${A.hasCredit ? big(n0(A.creditDays) + ' days', `ended owing ${cn}, which cost about ${F(A.creditFees)}`, 'credit') : A.lifespan != null ? big(A.lifespan.toFixed(1) + ' days', 'until half of a big payment is spent (typical)') : ''}${big(FB(A.feesTotal), 'in fees and charges' + (A.avoidableTotal ? `, ${F(A.avoidableTotal)} avoidable` : ''), 'fee')}</div>
      <div class="btn-row">${S.demo ? '<a class="btn" href="#start">Now try it with my own data</a>' : ''}<button class="btn ghost small" type="button" data-act="storymode">Story mode (vertical)</button><a class="btn ghost small" href="#sort">Sort the people</a><a class="btn ghost small" href="#ai">Ask your AI</a></div>`, 'h1')]);
    chapters.push(['flow', 'In and out', ch('flow', num() + 'in and out, month by month', (() => { const fm = A.months.filter((m) => !m.partial); const neg = fm.filter((m) => m.in < m.out).length; return fm.length ? (neg ? `${neg} of ${pl(fm.length, 'full month')} <em>spent more than came in</em>` : `Every full month <em>took in more than it spent</em>`) : 'Money in and out by month'; })(), `<p class="muted">Green bars rise with money in; red bars drop with money out. The dot is what was left: above the line, money kept; below it, money drawn down or borrowed.${A.ownOut ? ` Transfers between ${their} own accounts count on both sides.` : ''}</p><div class="legend"><span><i style="background:${C.in}"></i>Money in</span><span><i style="background:${C.out}"></i>Money out</span><span><i style="background:${C.ink};border-radius:50%"></i>Net</span></div><div class="chart" data-c="flow"></div>`)]);
    chapters.push(['shape', 'The shape', ch('shape', num() + 'the shape of the period', A.hasCredit ? `Above the line, money held. Below it, money owed to ${cn}.` : 'The balance, day by day', `<p class="muted">Each day's closing balance${A.hasCredit ? ` rises above the line; ${cn} owed drops below it` : ''}. Ticks along the top mark money coming in of ${F(A.bigCut)} or more.</p><div class="chart" data-c="river"></div><div class="legend"><span><i style="background:${C.in}"></i>Balance</span>${A.hasCredit ? `<span><i style="background:${C.credit}"></i>Owed to ${cn}</span>` : ''}<span><i style="background:${C.ink}"></i>Big payment in</span></div>${tl ? `<p class="insight">Between ${d3.utcFormat('%B %Y')(dt(tl.first.month + '-01'))} and ${d3.utcFormat('%B %Y')(dt(tl.last.month + '-01'))}, money in per month ${tl.first.in === tl.last.in ? `stayed at ${F(tl.first.in)}` : `moved from ${F(tl.first.in)} to ${F(tl.last.in)}`}, and money out ${tl.first.out === tl.last.out ? `stayed at ${F(tl.first.out)}` : `moved from ${F(tl.first.out)} to ${F(tl.last.out)}`}. (Full months only.)</p>` : ''}`)]);
    if (A.lifespan != null) chapters.push(['drain', 'How long it lasts', ch('drain', num() + 'how long money lasts', `Half of a big payment is spent <em>within ${A.lifespan.toFixed(1)} days</em>`, `<p class="muted">For each payment in of ${F(A.bigCut)} or more (${pl(A.bigInsCount, 'payment')}), how much is still unspent, day by day. Transfers to ${their} own banks, savings and business payroll don't count as spending.</p><div class="chart" data-c="drain"></div>${A.lifespan75 != null ? `<p class="insight">Three quarters is gone by day ${A.lifespan75.toFixed(1)}. ${A.lifespan75 < 15 ? 'That leaves the rest of the month running on what is left, or on credit.' : 'That is a steady pace.'}</p>` : ''}`)]);
    chapters.push(['month', 'The month', ch('month', num() + 'the month inside the month', A.lowDay ? `The balance is usually lowest <em>around the ${ord(A.lowDay.day)}</em>` : 'When in the month money moves', `<p class="muted">Each square is a day. Switch what it shows: money in, money out, the net of the two, ${A.hasCredit ? `or what was owed to ${cn}` : 'or the balance'}. Black dots mark big payments in. The bars underneath add up each date across the period.</p><div class="toggle" role="group" aria-label="Calendar shows" id="calToggle"><button type="button" data-m="in">Money in</button><button type="button" data-m="out">Money out</button><button type="button" data-m="net">Net</button>${A.hasCredit ? `<button type="button" data-m="credit">Owed to ${cn}</button>` : ''}</div><div class="chart scrollx" data-c="cal"></div>${A.bigInDays.length ? `<p class="insight">The biggest payments in land around the ${A.bigInDays.map(ord).join(', ')}.${A.hasCredit && A.dom.some((d) => d.creditDraw) ? ` ${cn} is used most on the ${ord(d3.greatest(A.dom, (d) => d.creditDraw).day)}.` : ''}</p>` : ''}`)]);
    chapters.push(['clock', 'Money clock', ch('clock', num() + 'the money clock', `Spending peaks on ${WD[A.habits.peakWeekday]}, <em>around ${hourLabel(A.habits.peakHour)}</em>`, `<p class="muted">Payments by day and hour. Darker squares hold more money. Transfers to ${their} own accounts are left out.</p><div class="chart scrollx" data-c="heat"></div><div class="bigs">${big(pct(A.habits.lateNightShare), 'of spending happens between 10pm and 4am')}${big(pct(A.habits.weekendShare), 'happens at weekends')}${A.habits.cafeVisits ? big(n0(A.habits.cafeVisits), `café and restaurant payments, about ${Math.round(A.habits.cafePerWeek)} a week`) : ''}</div>`)]);
    chapters.push(['where', 'Where it goes', ch('where', num() + 'where it goes', topCat ? `Of every ${cur()} 100 spent, ${Math.round(topCat.total / d3.sum(spendCats, (c) => c.total) * 100)} went to ${topCat.category.toLowerCase()}` : 'Where it goes', `<p class="muted">Spending only.${A.ownOut ? ` Money moved to ${their} own banks, cards and savings (${F(A.ownOut)}) is left out.` : ''} Each square is 1 in every 100.</p><div class="chart" data-c="units"></div><h3 style="margin-top:30px">Who got paid most</h3><p class="small muted">With a note on who each business is. Payment platforms hide the real shop behind them.</p><div class="mcards">${A.merchants.slice(0, 6).map((m) => `<div class="mcard"><div class="n">${esc(titleCase(m.name))}</div><div class="c">${esc(m.category)} · ${pl(m.count, 'payment')}</div><div class="a">${F(m.total)}</div>${m.note ? `<div class="note">${esc(m.note)}</div>` : ''}</div>`).join('')}</div>${A.merchants.length > 6 ? `<details class="datatable"><summary>All ${pl(Math.min(25, A.merchants.length), 'place')} paid most</summary><div class="scrollx"><table class="merch"><thead><tr><th>Paid to</th><th>Category</th><th class="n">Payments</th><th class="n">${A.cur}</th></tr></thead><tbody>${A.merchants.slice(0, 25).map((m) => `<tr><td>${esc(titleCase(m.name))}${m.note ? `<span class="note">${esc(m.note)}</span>` : ''}</td><td>${esc(m.category)}</td><td class="n">${m.count}</td><td class="n">${n0(m.total)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}<p class="small muted">${pl(A.people.length, 'person', 'people')} received ${F(d3.sum(A.people, (p) => p.total))} across ${pl(A.habits.peopleSends, 'send')}. <a href="#sort">Sort them</a> to see what that money really is.</p>`)]);
    { const H = A.habits; const small = A.draws ? A.draws.filter((d) => d.amt < 500).length : 0; const cards = [];
      if (H.cafeVisits) cards.push(['Café and restaurant payments', n0(H.cafeVisits), `${F(H.cafeSpend)} in all, about ${Math.round(H.cafePerWeek)} a week`]);
      if (A.hasCredit) cards.push([`${cn} top-ups after 7pm`, n0(H.drawsAfter7pm), `Typical top-up ${F(H.medianDraw)}; ${pl(small, 'top-up')} under ${cur()} 500`]);
      if (A.hasCredit && H.redraw) cards.push([`Repaid ${cn}, then used it again the same day`, n0(H.redraw), 'Money arrived, cleared what was owed, and a new top-up followed within hours']);
      if (H.peopleSends) cards.push(['Sends to people', n0(H.peopleSends), `${F(H.peopleFees)} in transaction costs`]);
      cards.push(['Late-night spending', pct(H.lateNightShare), 'of spending between 10pm and 4am']);
      cards.push(['Weekend spending', pct(H.weekendShare), 'of spending on Saturdays and Sundays']);
      chapters.push(['habits', 'Habits', ch('habits', num() + 'habits in the data', 'Small, frequent, <em>and often in the evening</em>', `<div class="habits">${cards.map(([t, v, s2]) => `<div class="habit"><div class="t">${esc(t)}</div><div class="v">${v}</div><div class="s">${esc(s2)}</div></div>`).join('')}</div>`)]); }
    if (A.hasCredit || A.loans.length) {
      const loanP = d3.sum(A.loans, (l) => l.principal);
      chapters.push(['credit', 'Borrowing', ch('credit', num() + 'borrowing', A.hasCredit ? `${pl(A.draws.length, cn + ' top-up')}, typically ${F(A.habits.medianDraw)}${A.draws.length && A.habits.drawsAfter7pm / A.draws.length > .3 ? ', often in the evening' : ''}` : pl(A.loans.length, 'loan'), `<div class="bigs">${A.hasCredit ? big(F(A.creditDrawn), `${cn} used across ${pl(A.draws.length, 'top-up')}`) + big(n0(A.habits.drawsAfter7pm), 'top-ups after 7pm') + big(n0(A.habits.redraw), `times money came in, cleared ${cn}, and ${cn} was used again the same day`) : ''}${A.loans.length ? big(F(loanP), `borrowed in ${pl(A.loans.length, 'loan')}, costing ${F(A.loanCost)}`) : ''}</div>${A.loans.filter((l) => l.days != null).length ? `<h3>Every loan, side by side</h3><p class="small muted">Each bar runs from the day of borrowing to the day of repaying. Green: repaid inside 10 days. Purple: by the due date. Red: late, with a penalty.</p><div class="chart" data-c="loans"></div>` : ''}${A.hasCredit ? `<p class="insight">${cn} cost about ${F(A.creditFees)}: ${F(A.accessFees)} in access fees${A.creditFeesEstimated ? ' (estimated at 1% of what was used, because statements don\'t list it)' : ''} ${A.dailyCharges > 0 ? ` plus an estimated ${F(A.dailyCharges)} in daily charges` : ''}${A.creditFeesEstimated ? '. Statements don\'t show daily charges, so the real cost is higher' : ''}.${A.loans.length ? ` Per ${A.cur} 100 borrowed, ${cn} cost about ${(A.creditFees / (A.creditDrawn || 1) * 100).toFixed(1)} and loans about ${(A.loanCost / (loanP || 1) * 100).toFixed(1)}.` : ''}</p>` : ''}${S.raw.kind === 'statement' && A.loans.length ? '<p class="small muted">Statements show the total repaid, not the penalty on its own, so late fees are included in loan costs here but not listed separately.</p>' : ''}`)]);
    }
    chapters.push(['price', 'The price', ch('price', num() + 'the price paid', A.avoidableTotal ? `${F(A.avoidableTotal)} <em>that could have been kept</em>` : `${F(A.feesTotal)} in fees and charges`, `${S.raw.kind === 'statement' ? '<p class="small muted">Read from a statement. Statements list every transaction cost line by line but leave out Fuliza daily charges and loan penalties, while SMS show those but not every cost. So the same months can give a different fee total from each source.</p>' : ''}<div class="chart" data-c="fees"></div><div class="legend" id="feesLegend"></div>${A.avoidable.length ? `<h3 style="margin-top:26px">Avoidable</h3><div class="ledger">${A.avoidable.map((a) => `<div class="row"><div class="d">${fmtDate(a.date)}</div><div><div class="w">${esc(a.what)}</div><div class="nt">${esc(a.note)}</div></div><div class="a ${/penalty/i.test(a.what) ? 'bad' : ''}">${F(a.amount)}</div></div>`).join('')}</div>` : ''}${A.toCheck.length ? `<h3 style="margin-top:26px">Worth checking</h3><p class="small muted">The same amount to the same place within 30 minutes. It may be deliberate, or a payment that went through twice. Reversed payments are already left out.</p><div class="ledger">${A.toCheck.map((a) => `<div class="row"><div class="d">${fmtDate(a.date)}</div><div><div class="w">${esc(titleCase(a.party))}</div><div class="nt">${esc(a.note)}</div></div><div class="a">${F(a.amount)}</div></div>`).join('')}</div>` : ''}`)]);
    if (A.biggest.length) chapters.push(['outliers', 'Stand-outs', ch('outliers', num() + 'payments that stood out', 'Unusual payments', `<p class="muted">Payments much bigger than usual for that place, or to places paid only once or twice. Regular bills, rent and cash withdrawals are left out.</p><div class="ledger">${A.biggest.map((t) => `<div class="row"><div class="d">${fmtDate(t.ts)}</div><div><div class="w">${esc(t.person ? 'A person' : titleCase(t.party))}</div><div class="nt">${esc(t.category)}${t.note ? ' · ' + esc(t.note) : ''}</div></div><div class="a">${F(t.amt)}</div></div>`).join('')}</div>${A.spikeDays.length ? `<p class="insight">The heaviest days were ${A.spikeDays.slice(0, 3).map((d) => `${fmtDate(d.date)} (${F(d.out)})`).join(', ')}.</p>` : ''}`)]);
    if (Array.isArray(window.PD_NOTES) && window.PD_NOTES.length && !S.demo) chapters.push(['notes', 'Your questions', ch('notes', num() + 'your questions, answered from the data', 'What the texts say about the questions you asked', window.PD_NOTES.map((q) => `<div class="qa"><b>${esc(q.q)}</b>${esc(q.a)}</div>`).join(''))]);
    // Which of the six patterns show up in this person's own data
    {
      const pats = []; const spendPeople = d3.sum(A.people, (p) => p.total); const pochiIn = d3.sum(A.ins.filter((t) => t.pochi), (t) => t.amt); const borrowCost = A.creditFees + A.loanCost;
      if (A.lifespan != null && A.lifespan <= 10) pats.push(['flat', 'The dry week', `Half of ${their} big payments were gone in ${A.lifespan.toFixed(1)} days.`]);
      if (A.hasCredit && A.creditDays >= 10) pats.push(['fuliza', 'The Fuliza bridge', `${pl(A.creditDays, 'day')} owing Fuliza, for ${F(A.creditFees)} in charges.`]);
      if (A.spend > 0 && spendPeople / A.spend >= 0.12) pats.push(['first', 'The family bank', `${pct(spendPeople / A.spend)} of spending went to people. Sort them to see how much is family.`]);
      if (pochiIn > 0) pats.push(['hustle', 'Two wallets, one phone', `${F(pochiIn)} came in through Pochi la Biashara.`]);
      if (A.ownOut > 0 && borrowCost > 0) pats.push(['chama', 'Saving while borrowing', `${F(A.ownOut)} went to savings and banks while borrowing cost ${F(borrowCost)}.`]);
      if (A.txFees > 0 && A.spend > 0 && A.txFees / A.spend >= 0.005) pats.push(['sib', 'The small charges', `${F(A.txFees)} in transaction charges${A.avoidableTotal ? `, and ${F(A.avoidableTotal)} that could have been avoided` : ''}.`]);
      if (A.habits.lateNightShare >= 0.08) pats.push([null, 'The 2am wallet', `${pct(A.habits.lateNightShare)} of spending happened between 10pm and 4am.`]);
      if (pats.length) chapters.push(['you', 'Which ones are you', ch('you', num() + 'which ones are you', `${pats.length === 1 ? 'One pattern shows' : ['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][pats.length] + ' patterns show'} up in ${S.demo ? 'Amani\'s' : 'your'} money`, `<p class="muted">The same patterns show up in wallets across Kenya. Here's the evidence from ${S.demo ? 'her' : 'your'} own SMS.</p><div class="pats">${pats.map(([img, t, ev]) => `<div class="pat">${img ? `<img src="img/roles/${img}.jpg" alt="" loading="lazy">` : '<div class="pat-noimg" aria-hidden="true">10pm–4am</div>'}<div><b>${esc(t)}</b><span>${ev}</span></div></div>`).join('')}</div>`)]);
    }
    chapters.push(['try', 'What to try', ch('try', num() + 'what to try', sug.length === 1 ? 'One small change the data points to' : `${['', 'One', 'Two', 'Three'][sug.length]} small changes the data points to`, sug.map((s, i) => `<div class="try"><b>Try ${i + 1}</b>${esc(s)}</div>`).join('') + `<div class="next">${S.demo ? '<a href="#start"><b>Try it with my data</b><span class="small muted">Statement PDF, SMS export or pasted messages. Stays on your device.</span></a>' : ''}<a href="#sort"><b>Sort the people</b><span class="small muted">Label who gets sent money, in a quick swipe game.</span></a><a href="#budget"><b>Build a budget</b><span class="small muted">Monthly averages and targets by category.</span></a><a href="#ai"><b>Ask your AI</b><span class="small muted">A prompt and summary for Claude, ChatGPT or Gemini, with no people's names.</span></a><button type="button" data-act="storymode"><b>Story mode (vertical)</b><span class="small muted">A tall 9:16 version to screen-record and share.</span></button></div>`)]);
    el.innerHTML = chapters.map((c) => c[2]).join('') + (S.demo ? '' : worthHTML());
    if (!S.demo) wireWorth();
    $('#chapterNav').innerHTML = chapters.map((c) => `<a href="#${c[0]}" data-ch="${c[0]}">${c[1]}</a>`).join('');
    drawCharts();
    $$('#cover .big .v').forEach(countUp);
    $$('[data-act="storymode"]').forEach((b) => b.addEventListener('click', openStoryMode));
    if (!S.calMode) S.calMode = A.hasCredit ? 'credit' : 'net';
    $$('#calToggle button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.m === S.calMode)); b.addEventListener('click', () => { S.calMode = b.dataset.m; $$('#calToggle button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); const el = $('[data-c="cal"]'); el.previousElementSibling && el.previousElementSibling.classList.contains('scrollhint') && el.previousElementSibling.remove(); if (el.nextElementSibling && el.nextElementSibling.classList.contains('datatable')) el.nextElementSibling.remove(); calendarChart(el, S.A); }); });
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
        if (c === 'flow') flowChart(el, A); if (c === 'river') riverChart(el, A); if (c === 'drain') drainChart(el, A); if (c === 'cal') calendarChart(el, A); if (c === 'heat') heatChart(el, A); if (c === 'units') unitChart(el, A); if (c === 'loans') loanChart(el, A);
        if (c === 'fees') { const keys = feesChart(el, A); const lg = $('#feesLegend'); if (lg) lg.innerHTML = keys.map((k) => `<span><i style="background:${k[2]}"></i>${k[1]}</span>`).join(''); }
      } catch (e) { console.error(e); el.innerHTML = '<p class="small muted">This chart couldn\'t be drawn for this data.</p>'; }
      animate(el, c);
    });
  }
  // Reveal: bars grow, lines draw, cells fade in and dots drop as each chart scrolls into view
  const SEEN = new Set();
  const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); SEEN.add(e.target.dataset.c); revealIO.unobserve(e.target); } }), { threshold: 0.2 }) : null;
  function animate(el, c) {
    const svg = el.querySelector('svg'); if (!svg || !revealIO || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const marks = Array.from(svg.querySelectorAll('rect, path, circle')).filter((m) => { const f = m.style.fill; return f !== 'transparent' && !m.closest('.tick'); });
    const W = +svg.getAttribute('viewBox').split(' ')[2] || 700;
    marks.forEach((m, i) => {
      const tag = m.tagName.toLowerCase(); const x = +(m.getAttribute('x') || m.getAttribute('cx') || 0);
      const d = Math.round((x / W) * 700);
      if (tag === 'circle') { m.classList.add('p'); m.style.setProperty('--d', (700 + d) + 'ms'); return; }
      if (tag === 'path') { if (m.style.fill === 'none') { try { const len = Math.ceil(m.getTotalLength()); m.classList.add('ln'); m.style.setProperty('--len', len); m.style.setProperty('--d', '300ms'); } catch (e) { /* no length */ } } else { m.classList.add('f'); m.style.setProperty('--d', (i * 120) + 'ms'); } return; }
      if (c === 'cal' || c === 'heat') { m.classList.add('f'); m.style.setProperty('--d', d + 'ms'); return; }
      if (c === 'units' || c === 'loans') { m.classList.add('gx'); m.style.setProperty('--d', Math.min(900, i * 4) + 'ms'); return; }
      if (c === 'flow' || c === 'fees') { const dn = m.style.fill.replace(/\s/g, '') === 'rgb(210,59,46)' || m.style.fill === C.out; m.classList.add('g'); if (dn) m.classList.add('dn'); m.style.setProperty('--d', d + 'ms'); return; }
      m.classList.add('f'); m.style.setProperty('--d', d + 'ms');
    });
    el.classList.add('anim'); if (SEEN.has(c)) el.classList.add('in'); else revealIO.observe(el);
  }
  // Count-up for the big figures
  function countUp(el) {
    const txt = el.textContent; const m = txt.match(/(\d[\d,]*\.?\d*)/); if (!m || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = parseFloat(m[1].replace(/,/g, '')); const dec = (m[1].split('.')[1] || '').length; const t0 = performance.now(); const dur = 1100;
    const fmtN = (v) => (dec ? v.toFixed(dec) : d3.format(',')(Math.round(v)));
    const tick = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = txt.replace(m[1], fmtN(target * e)); if (p < 1) requestAnimationFrame(tick); else el.textContent = txt; };
    requestAnimationFrame(tick);
  }
  let rw = 0, lastW = window.innerWidth; window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - lastW) < 30) return; lastW = window.innerWidth; clearTimeout(rw); rw = setTimeout(() => { if (!$('#v-story').hidden) drawCharts(); }, 200); });

  /* ---------------- What was it worth? Asked once, after someone has seen their own story ---------------- */
  function worthHTML() {
    let done = false; try { done = !!localStorage.getItem('pesadithi:worth'); } catch (e) { /* ask again */ }
    if (done) return '';
    const amt = [['0', 'Nothing, glad it\'s free'], ['200', 'KES 200'], ['500', 'KES 500'], ['1000', 'KES 1,000'], ['3000', 'KES 3,000']];
    const cad = [['once', 'Once'], ['year', 'Every year'], ['month', 'Every month']];
    const use = ['How long money lasts', 'Fuliza and borrowing', 'Where it goes', 'The patterns', 'Fees and charges', 'Sorting my people', 'The story to share', 'Budget', 'Ask your AI'];
    return `<section class="worth" id="worth" aria-labelledby="worth-h"><div class="k">Before you go</div><h2 id="worth-h">What was this worth to you?</h2>
      <p class="muted">Pesadithi is free. Your honest answer shapes what stays free and what gets built next. It's anonymous, and it contains none of your money data.</p>
      <p class="wq"><b>If it weren't free, what would you pay?</b></p><div class="choices opts wamt" data-w="amount">${amt.map(([v, l]) => `<button type="button" data-a="${v}" aria-pressed="false"><b>${l}</b></button>`).join('')}</div>
      <div class="wmore" hidden><p class="wq"><b>How would you rather pay?</b></p><div class="choices opts wcad" data-w="cadence">${cad.map(([v, l]) => `<button type="button" data-a="${v}" aria-pressed="false"><b>${l}</b></button>`).join('')}</div></div>
      <p class="wq"><b>What was most useful?</b> <span class="small muted">Pick any</span></p><div class="wuse">${use.map((u) => `<button type="button" aria-pressed="false">${esc(u)}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:18px"><button class="btn" id="wSend" type="button" disabled>Send my answer</button><span class="small muted" id="wState" role="status" aria-live="polite"></span></div>
      <div class="wthanks" hidden><b>Thank you.</b> <span>If one person you know would find this useful, sending it to them is worth more than any price.</span><div class="btn-row"><a class="btn small" id="wWa" target="_blank" rel="noopener">Share on WhatsApp</a><a class="btn ghost small" id="wX" target="_blank" rel="noopener">Post on X</a></div></div></section>`;
  }
  function wireWorth() {
    const box = $('#worth'); if (!box) return; const W = { amount: null, cadence: null, useful: [] };
    const pick = (grp, key) => $$('button', grp).forEach((b) => b.addEventListener('click', () => { $$('button', grp).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); W[key] = b.dataset.a; $('.wmore', box).hidden = W.amount === '0' || !W.amount; $('#wSend').disabled = !W.amount; }));
    pick($('.wamt', box), 'amount'); pick($('.wcad', box), 'cadence');
    $$('.wuse button', box).forEach((b) => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); W.useful = $$('.wuse button[aria-pressed="true"]', box).map((x) => x.textContent); }));
    $('#wSend').addEventListener('click', () => {
      if (window.pdTrack) pdTrack('Worth', { amount: W.amount, cadence: W.cadence || 'n/a', useful: W.useful.join(', ') || 'none' });
      try { localStorage.setItem('pesadithi:worth', JSON.stringify({ ...W, at: new Date().toISOString().slice(0, 10) })); } catch (e) { /* fine */ }
      const url = window.PD_SHARE_URL || location.href.split('#')[0];
      const line = 'Pesadithi turned my M-PESA SMS into a story about my money. It runs on your phone and nothing is uploaded. Try it: ' + url;
      $('#wWa').href = 'https://wa.me/?text=' + encodeURIComponent(line);
      $('#wX').href = 'https://x.com/intent/post?text=' + encodeURIComponent((W.amount && W.amount !== '0' ? `I'd pay KES ${n0(+W.amount)}${W.cadence === 'year' ? ' a year' : W.cadence === 'month' ? ' a month' : ''} for this, and it's free. ` : '') + line + ' via @mkaigwa');
      $$('.wq, .choices, .wuse, .wmore, .btn-row', box).forEach((e) => { if (!e.closest('.wthanks')) e.hidden = true; });
      $('.wthanks', box).hidden = false;
    });
  }
  /* ---------------- Sort your people: set up categories, then swipe ---------------- */
  const AREAS = [
    ['Household and home help', '🧺'], ['Kids and school', '🎒'], ['Parents and family back home', '👵'], ['Partner', '💞'],
    ['Friends and social', '🎉'], ['Church and giving', '⛪'], ['Chama or savings group', '🤝'], ['Services and transport', '🛵'],
    ['Lending or repaying', '💸'], ['Gifts and celebrations', '🎁'], ['Health and care', '🩺'], ['Rent and landlord', '🔑']
  ];
  const BIZ = [['Suppliers and stock', '📦'], ['Staff and casuals', '👷'], ['Customers and refunds', '🧾'], ['Other business costs', '💼']];
  const PRESETS = [
    ['Young professional', '🧑‍💻', ['Household and home help', 'Parents and family back home', 'Friends and social', 'Services and transport', 'Rent and landlord', 'Lending or repaying'], false],
    ['Parent', '👨‍👩‍👧', ['Household and home help', 'Kids and school', 'Parents and family back home', 'Partner', 'Services and transport', 'Health and care', 'Church and giving'], false],
    ['Business owner or hustler', '🛍️', ['Household and home help', 'Parents and family back home', 'Friends and social', 'Services and transport', 'Lending or repaying'], true],
    ['Student', '📚', ['Friends and social', 'Parents and family back home', 'Services and transport', 'Rent and landlord', 'Lending or repaying'], false],
    ['Church or community leader', '⛪', ['Household and home help', 'Church and giving', 'Parents and family back home', 'Gifts and celebrations', 'Chama or savings group', 'Services and transport'], false]
  ];
  const EMO = Object.fromEntries(AREAS.concat(BIZ).concat([['Business or side hustle', '💼'], ['Family support', '👪'], ['Work and business', '💼'], ['Giving and community', '🙏'], ['Savings group or chama', '🤝']]));
  const emo = (c) => EMO[c] || '🏷️';
  const SORT_COL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
  const colFor = (() => { const m = {}; let n = 0; return (c) => (m[c] || (m[c] = n < SORT_COL.length ? SORT_COL[n++] : '#8a8f98')); })();
  function resetGame() {
    const saved = store.get('game') || {};
    S.game = { assign: {}, saved: saved.assign || {}, history: [], skipped: [], extra: saved.extra || [], setup: saved.setup || null, stage: null, last: null };
  }
  const catOf = (name) => S.game.assign[name] || S.game.saved[h(name)] || null;
  function gameDeck() { return S.A ? S.A.people.filter((p) => p.total > 0) : []; }
  function nextPerson() { const deck = gameDeck(); return deck.find((p) => !catOf(p.name) && !S.game.skipped.includes(p.name)) || deck.find((p) => !catOf(p.name)) || null; }
  function personalCats() { const st = S.game.setup; return (st ? st.areas : AREAS.slice(0, 6).map((a) => a[0])).concat(S.game.extra); }
  function saveGame() { if (!$('#remember').checked) return; const hashed = { ...S.game.saved }; Object.entries(S.game.assign).forEach(([nm, c]) => { hashed[h(nm)] = c; }); store.set('game', { assign: hashed, extra: S.game.extra, setup: S.game.setup }); setDataUI(!!S.A); }

  /* Setup */
  let draft = null;
  function renderSetup() {
    const g = S.game; draft = draft || { areas: (g.setup ? g.setup.areas : PRESETS[0][2]).slice(), biz: g.setup ? g.setup.biz : null, preset: g.setup ? g.setup.preset : null };
    $('#presets').innerHTML = PRESETS.map(([n, e]) => `<button type="button" data-p="${esc(n)}" aria-pressed="${draft.preset === n}"><span class="em">${e}</span>${esc(n)}</button>`).join('');
    const all = AREAS.map((a) => a[0]).concat(g.extra);
    $('#areas').innerHTML = all.map((c) => `<button type="button" data-c="${esc(c)}" aria-pressed="${draft.areas.includes(c)}"><span class="em">${emo(c)}</span>${esc(c)}</button>`).join('');
    $$('#bizYN button').forEach((b) => b.setAttribute('aria-pressed', String(draft.biz === (b.dataset.v === '1'))));
    $$('#presets button').forEach((b) => b.onclick = () => { const p = PRESETS.find((x) => x[0] === b.dataset.p); draft.preset = p[0]; draft.areas = p[2].slice(); draft.biz = p[3]; renderSetup(); });
    $$('#areas button').forEach((b) => b.onclick = () => { const c = b.dataset.c; draft.areas = draft.areas.includes(c) ? draft.areas.filter((x) => x !== c) : draft.areas.concat(c); b.setAttribute('aria-pressed', String(draft.areas.includes(c))); setupNote(); });
    $$('#bizYN button').forEach((b) => b.onclick = () => { draft.biz = b.dataset.v === '1'; renderSetup(); });
    setupNote();
  }
  function setupNote() { $('#sortGoNote').textContent = draft.areas.length ? `${pl(draft.areas.length, 'category', 'categories')}${draft.biz ? ', plus business' : ''}. ${pl(gameDeck().length, 'person', 'people')} to sort.` : 'Pick at least one category.'; $('#sortGo').disabled = !draft.areas.length; }
  $('#addArea').addEventListener('submit', (ev) => {
    ev.preventDefault(); const c = $('#addAreaIn').value.trim().replace(/\s+/g, ' ').slice(0, 32); if (!c) return;
    if (!AREAS.some((a) => a[0].toLowerCase() === c.toLowerCase()) && !S.game.extra.some((x) => x.toLowerCase() === c.toLowerCase())) S.game.extra.push(c);
    if (!draft.areas.includes(c)) draft.areas.push(c); $('#addAreaIn').value = ''; renderSetup();
  });
  $('#sortGo').addEventListener('click', () => { if (!draft.areas.length) return; S.game.setup = { areas: draft.areas.slice(), biz: !!draft.biz, preset: draft.preset }; S.game.editing = false; draft = null; saveGame(); renderGame(true); });
  $('#sortEdit').addEventListener('click', () => { draft = null; S.game.editing = true; renderGame(); $('#sortSetup').scrollIntoView({ block: 'start' }); });

  /* Play */
  function initials(nm) { return titleCase(nm).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); }
  function renderGame(focus) {
    if (!S.game) resetGame();
    const g = S.game;
    if (!g.setup || g.editing) { $('#sortSetup').hidden = false; $('#sortPlay').hidden = true; renderSetup(); return; }
    $('#sortSetup').hidden = true; $('#sortPlay').hidden = false;
    const deck = gameDeck();
    if (deck.length && deck.every((p) => catOf(p.name) || g.skipped.includes(p.name)) && g.skipped.length) g.skipped = [];
    const done = deck.filter((p) => catOf(p.name)).length;
    $('#gameBar').style.width = (deck.length ? done / deck.length * 100 : 100) + '%';
    $('#gameCount').textContent = deck.length ? `${done} of ${pl(deck.length, 'person', 'people')} sorted` : '';
    const p = nextPerson(); const ctrls = $('#gameCtrls');
    if (!deck.length) { $('#deck').innerHTML = '<div class="pcard"><div class="who">No money sent to people in this period</div><p class="muted">Nothing to sort. Try a longer period on the Attach SMS page.</p></div>'; ctrls.hidden = true; }
    else if (!p) { $('#deck').innerHTML = `<div class="pcard done" tabindex="-1" id="pcard"><div class="big-emo">🎉</div><div class="who">All sorted</div><p class="muted">You labelled ${pl(done, 'person', 'people')}. Your budget now shows what that money is really for.</p><button class="btn" type="button" id="doneBudget">See my budget</button></div>`; ctrls.hidden = true; $('#narr').textContent = ''; $('#doneBudget').onclick = () => go('budget'); }
    else {
      ctrls.hidden = false; const m = S.A.monthsEq; const idx = deck.indexOf(p) + 1;
      const twoStep = g.setup.biz && !g.stage;
      const cats = g.stage === 'biz' ? BIZ.map((b) => b[0]) : personalCats();
      const col = colFor(p.name);
      const body = twoStep
        ? `<p class="ask">Business or personal?</p><div class="bp"><button type="button" class="bp-p" data-bp="p"><span>👈</span> Personal</button><button type="button" class="bp-b" data-bp="b">Business <span>👉</span></button></div><p class="small muted swipe-hint">Swipe the card left or right, or tap.</p>`
        : `<p class="ask">${g.stage === 'biz' ? 'Which part of the business?' : g.setup.biz ? 'Personal. What is it for?' : 'What is this money for?'}</p><div class="cats emo-cats" role="group" aria-label="Choose a category">${cats.map((c, i) => `<button type="button" data-cat="${esc(c)}"><span class="em">${emo(c)}</span><span class="cl">${esc(c)}</span>${i < 9 && !coarse() ? `<kbd aria-hidden="true">${i + 1}</kbd>` : ''}</button>`).join('')}</div>${g.stage ? '<button type="button" class="linkbtn small" id="backStage">← Back</button>' : (g.last && !g.setup.biz ? `<p class="small muted swipe-hint">Swipe right for ${emo(g.last)} ${esc(g.last)} again, left to skip.</p>` : '')}`;
      $('#deck').innerHTML = `<div class="pstack" aria-hidden="true"><i></i><i></i></div><div class="pcard" id="pcard" tabindex="-1" aria-labelledby="pwho" aria-describedby="pfacts"><span class="stamp st-l">${twoStep ? 'PERSONAL' : 'SKIP'}</span><span class="stamp st-r">${twoStep ? 'BUSINESS' : g.last ? 'SAME AGAIN' : ''}</span>
        <div class="phead"><span class="avatar" style="--c:${col}">${esc(initials(p.name))}</span><div><div class="small muted">Person ${idx} of ${deck.length}${g.skipped.includes(p.name) ? ' · skipped earlier' : ''}</div><div class="who" id="pwho">${esc(titleCase(p.name))}</div></div></div>
        <div id="pfacts"><div class="facts"><div><b>${p.count}</b><span>${p.count === 1 ? 'send' : 'sends'}</span></div><div><b>${kfmt(p.total)}</b><span>${cur()} total</span></div><div><b>${kfmt(p.total / m)}</b><span>a month</span></div></div><p class="small muted" style="margin:0">Usually ${F(p.typical)} · first ${fmtDate(p.first)} · last ${fmtDate(p.last)}</p></div>${body}</div>`;
      $$('#deck [data-cat]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.cat, 'r')));
      $$('#deck [data-bp]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.bp === 'b' ? 'biz' : 'personal')));
      const bk = $('#backStage'); if (bk) bk.onclick = () => { g.stage = null; renderGame(true); };
      swipe($('#pcard'), twoStep);
    }
    $('#toBudget').className = 'btn small' + (done ? '' : ' ghost');
    renderTally();
    if (focus) { const c = $('#pcard'); if (c) c.focus({ preventScroll: true }); }
  }
  function choose(stage) { S.game.stage = stage; const c = $('#pcard'); if (c) { c.classList.add(stage === 'biz' ? 'nudge-r' : 'nudge-l'); } setTimeout(() => renderGame(true), 160); }
  function pick(cat, dir) {
    const p = nextPerson(); if (!p) return; const g = S.game;
    const card = $('#pcard'); if (card) card.classList.add(dir === 'l' ? 'fly-l' : 'fly-r');
    if (cat === null) { if (!g.skipped.includes(p.name)) g.skipped.push(p.name); g.history.push({ name: p.name, skip: true }); $('#narr').textContent = `Skipped ${titleCase(p.name)}. They'll come back at the end.`; }
    else {
      const full = g.stage === 'biz' ? cat : cat; g.assign[p.name] = full; g.history.push({ name: p.name }); g.last = full;
      const same = gameDeck().filter((q) => catOf(q.name) === full); const tot = d3.sum(same, (q) => q.total);
      $('#narr').innerHTML = `${emo(full)} <b>${esc(titleCase(p.name))}</b> → ${esc(full)}. That now holds ${F(tot)} across ${pl(same.length, 'person', 'people')}, about <b>${F(tot / S.A.monthsEq)}</b> a month.`;
    }
    g.stage = null; saveGame(); setTimeout(() => renderGame(true), card ? 220 : 0);
  }
  function renderTally() {
    const deck = gameDeck(); const m = S.A ? S.A.monthsEq : 1;
    const rows = d3.rollups(deck.filter((p) => catOf(p.name)), (v) => d3.sum(v, (p) => p.total), (p) => catOf(p.name)).sort((a, b) => b[1] - a[1]);
    const mx = d3.max(rows, (r) => r[1]) || 1;
    $('#tally').innerHTML = rows.length ? rows.map(([c, v]) => `<div class="trow"><div class="tl"><span class="em">${emo(c)}</span><span class="tn">${esc(c)}</span><span class="num">${F(v / m)}<small> a month</small></span></div><div class="tbar"><i style="width:${Math.max(4, v / mx * 100)}%;background:${colFor('cat:' + c)}"></i></div></div>`).join('') : '<p class="small muted">Nothing sorted yet. Each person you sort lands here.</p>';
  }
  function swipe(card, twoStep) {
    if (!card) return; let x0 = null, dx = 0;
    const sl = $('.st-l', card), sr = $('.st-r', card);
    card.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = 'none'; });
    card.addEventListener('pointermove', (e) => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`; sl.style.opacity = Math.min(1, Math.max(0, -dx / 90)); sr.style.opacity = Math.min(1, Math.max(0, dx / 90)); });
    const end = () => {
      if (x0 == null) return; card.style.transition = ''; x0 = null; sl.style.opacity = 0; sr.style.opacity = 0;
      if (twoStep) { if (dx > 90) choose('biz'); else if (dx < -90) choose('personal'); else card.style.transform = ''; return; }
      if (dx > 90) { if (S.game.last && !S.game.stage) pick(S.game.last, 'r'); else { card.style.transform = ''; $('#narr').textContent = 'Tap a category first. After that, swiping right repeats it.'; } }
      else if (dx < -90) pick(null, 'l'); else card.style.transform = '';
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  }
  document.addEventListener('keydown', (e) => {
    if ($('#v-sort').hidden || $('#sortPlay').hidden || !$('#sm').hidden || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') { e.preventDefault(); undo(); return; }
    if (!nextPerson()) return; const g = S.game;
    if (g.setup.biz && !g.stage) { if (e.key === 'ArrowLeft') { e.preventDefault(); choose('personal'); } else if (e.key === 'ArrowRight') { e.preventDefault(); choose('biz'); } else if (e.key.toLowerCase() === 's') pick(null, 'l'); return; }
    const cats = g.stage === 'biz' ? BIZ.map((b) => b[0]) : personalCats(); const k = parseInt(e.key, 10);
    if (k >= 1 && k <= Math.min(9, cats.length)) { e.preventDefault(); pick(cats[k - 1], 'r'); }
    else if (e.key === 'ArrowRight' && g.last && !g.setup.biz) { e.preventDefault(); pick(g.last, 'r'); }
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 's') { e.preventDefault(); if (g.stage) { g.stage = null; renderGame(true); } else pick(null, 'l'); }
  });
  function undo() {
    const last = S.game && S.game.history.pop(); if (!last) { $('#narr').textContent = 'Nothing to undo.'; return; }
    if (last.skip) S.game.skipped = S.game.skipped.filter((nm) => nm !== last.name); else { delete S.game.assign[last.name]; delete S.game.saved[h(last.name)]; }
    S.game.stage = null; $('#narr').textContent = `Undone: ${titleCase(last.name)} is back on top.`; saveGame(); renderGame(true);
  }
  $('#gUndo').addEventListener('click', undo);
  $('#gSkip').addEventListener('click', () => { S.game.stage = null; pick(null, 'l'); });
  $('#toBudget').addEventListener('click', () => go('budget'));

  /* ---------------- Budget ---------------- */
  function budgetRows() {
    const A = S.A; const m = A.monthsEq; const rows = {};
    if (!S.game) resetGame();
    A.outs.forEach((t) => { if (MC.OWN_MONEY.includes(t.category)) return; let c = t.category; if (t.person) { const a = catOf(AN.norm(t.party)); c = a ? 'People: ' + a : 'People: not sorted yet'; } rows[c] = (rows[c] || 0) + t.amt; });
    return Object.entries(rows).map(([c, v]) => ({ category: c, monthly: v / m })).sort((a, b) => b.monthly - a.monthly);
  }
  const BEMO = { 'Groceries & household': '🛒', 'Eating out & coffee': '☕', 'Going out': '🎶', 'Transport & fuel': '🚕', 'Car & parking': '🚗', 'Bills & utilities': '💡', 'Rent & housing': '🏠', 'Health': '🩺', 'Education': '🎓', 'Savings & investing': '🌱', 'Banks & cards': '🏦', 'Borrowing': '💳', 'Shopping': '🛍️', 'Subscriptions & entertainment': '📺', 'Giving & community': '🙏', 'Business & payroll': '💼', 'Cash': '💵', 'Airtime & data': '📶', 'Government & tax': '🏛️', 'Payment platforms': '🔗', 'Other': '📦', 'People: not sorted yet': '👥' };
  const bemo = (c) => (c.startsWith('People: ') && c !== 'People: not sorted yet' ? emo(c.slice(8)) : BEMO[c] || '🏷️');
  const blabel = (c) => (c === 'People: not sorted yet' ? 'People you haven\'t sorted yet' : c.startsWith('People: ') ? c.slice(8) + ' (people)' : c);
  const BCOL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
  function renderBudget() {
    const A = S.A; if (!A) return; const m = A.monthsEq; const rows = budgetRows();
    const income = A.totalIn / m, ownIn = d3.sum(A.ins.filter((t) => t.category === 'From your banks'), (t) => t.amt) / m;
    const spend = d3.sum(rows, (r) => r.monthly);
    $('#budgetBigs').innerHTML = big(F(income), 'average money in per month' + (ownIn > income * .2 ? `, ${pct(ownIn / income)} of it moved in from ${S.demo ? 'her' : 'your'} own bank accounts` : ''), 'b-in') + big(F(spend), 'average spending per month', 'b-out') + `<div class="big b-tgt"><div class="v" id="tSum">–</div><div class="l">your targets add up to</div></div>`;
    const col = (i) => (i < BCOL.length ? BCOL[i] : '#9aa3ab');
    // Stacked bar: top 7 plus Other
    const top = rows.slice(0, 7), rest = d3.sum(rows.slice(7), (r) => r.monthly);
    const seg = top.map((r, i) => ({ l: blabel(r.category), e: bemo(r.category), v: r.monthly, c: col(i) })).concat(rest > 0 ? [{ l: 'Everything else', e: '➕', v: rest, c: '#9aa3ab' }] : []);
    $('#bStack').innerHTML = seg.map((sg) => `<i style="flex-grow:${sg.v};background:${sg.c}" title="${esc(sg.l)}: ${F(sg.v)}"></i>`).join('');
    $('#bStack').setAttribute('aria-label', 'Monthly spending split: ' + seg.map((sg) => `${sg.l} ${pct(sg.v / spend)}`).join(', '));
    $('#bLegend').innerHTML = seg.map((sg) => `<span><i style="background:${sg.c}"></i>${sg.e} ${esc(sg.l)} <b>${pct(sg.v / spend)}</b></span>`).join('');
    const unsorted = rows.find((r) => r.category === 'People: not sorted yet');
    $('#bSorted').innerHTML = unsorted ? `${F(unsorted.monthly)} a month goes to people you haven't sorted. <a href="#sort">Sort them</a> to see what it's for.` : '';
    const mx = d3.max(rows, (r) => Math.max(r.monthly, S.targets[r.category] || 0)) || 1;
    $('#bList').innerHTML = rows.map((r, i) => {
      const t = S.targets[r.category];
      return `<div class="brow" style="--c:${col(i)}"><div class="bname"><span class="em">${bemo(r.category)}</span><span>${esc(blabel(r.category))}</span></div>
        <div class="btrack"><i class="bavg" style="width:${r.monthly / mx * 100}%"></i><i class="btgt" id="bt${i}" style="left:${t != null ? Math.min(100, t / mx * 100) : 0}%" ${t == null ? 'hidden' : ''}></i></div>
        <div class="bnum"><b>${F(r.monthly)}</b><small>a month</small></div>
        <label class="bin"><span class="sr">Monthly target for ${esc(blabel(r.category))}</span><input type="text" inputmode="numeric" value="${t != null ? Math.round(fxv(t)) : ''}" placeholder="Target" data-i="${i}"></label>
        <div class="bdiff" id="bd${i}"></div></div>`;
    }).join('');
    const upd = () => {
      let sum = 0, any = false;
      rows.forEach((r, i) => { const v = S.targets[r.category]; const cell = $('#bd' + i); const mk = $('#bt' + i); if (v == null) { cell.textContent = ''; cell.className = 'bdiff'; mk.hidden = true; return; } any = true; sum += v; const d = v - r.monthly; cell.textContent = (d < 0 ? 'Over by ' : 'Under by ') + F(Math.abs(d)); cell.className = 'bdiff ' + (d < 0 ? 'over' : 'under'); mk.hidden = false; mk.style.left = Math.min(100, v / mx * 100) + '%'; mk.className = 'btgt ' + (d < 0 ? 'over' : 'under'); });
      $('#tSum').textContent = any ? F(sum) : '–';
    };
    $$('#bList input').forEach((inp) => inp.addEventListener('input', () => {
      const r = rows[+inp.dataset.i]; const raw = inp.value.trim(); const cell = $('#bd' + inp.dataset.i);
      if (!raw) { delete S.targets[r.category]; }
      else {
        // Accept "1,500", "KES 1500", "1500.50" and "2.5k"; refuse anything else instead of guessing
        const mm = raw.replace(/^(kes|ksh|ugx|tzs|usd|rwf|ghs|zmw)\.?\s*/i, '').replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(k|m)?$/i);
        if (!mm) { delete S.targets[r.category]; upd(); cell.textContent = 'Type an amount, like 15000 or 15k'; cell.className = 'bdiff over'; return; }
        let v = parseFloat(mm[1]) * (mm[2] ? (mm[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1);
        if (window.PD_FX) v = v / window.PD_FX.rate; // targets are kept in the statement's own currency
        S.targets[r.category] = Math.min(1e9, Math.round(v));
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
  $$('.choices').forEach((g) => g.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', String(S.ai[g.dataset.q] === b.dataset.a)); b.addEventListener('click', () => { g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); S.ai[g.dataset.q] = b.dataset.a; renderAI(); }); }));
  $('#incMerchants').addEventListener('change', renderAI);
  async function loadDemoForAI() {
    try { const t = await (await fetch('demo/demo-mpesa-sms.json')).text(); S.raw = P.fromMessages(t, 'demo'); S.demo = true; S.period = 12; compute(); $('#demoBadge').hidden = false; $('#aiBody').hidden = false; renderAI(); }
    catch (e) { $('#aiEmpty').hidden = false; }
  }
  $('#aiDemo').addEventListener('click', async () => { try { const t = await (await fetch('demo/demo-mpesa-sms.json')).text(); S.raw = P.fromMessages(t, 'demo'); S.demo = true; S.period = 12; compute(); show('ai'); } catch (e) { /* stays on the empty state */ } });
  function aiPlan(a) {
    // Same rules as prompts/any-llm.md
    const lvl = a.budget === '50' ? 'a lot' : a.budget === '20' ? 'some' : 'a little';
    const free = a.plan !== 'paid';
    const words = lvl === 'a little' || free ? 300 : lvl === 'some' ? 600 : 1000;
    const months = free || lvl === 'a little' ? 1 : lvl === 'some' ? 3 : 12;
    return { lvl, free, words, months };
  }
  const AI_INFO = {
    ChatGPT: ['chatgpt', 'https://chatgpt.com', 'chatgpt.com', 'Before you paste, open Settings, then Data controls, and switch off "Improve the model for everyone" if you don\'t want your chats used for training.'],
    Claude: ['claude', 'https://claude.ai', 'claude.ai', 'Before you paste, open Settings, then Privacy, and check "Help improve Claude" if you don\'t want your chats used for training.'],
    Gemini: ['gemini', 'https://gemini.google.com', 'gemini.google.com', 'Before you paste, open Settings, then Activity, and turn off "Keep Activity" if you don\'t want your chats used to train Google\'s models.'],
    DeepSeek: ['deepseek', 'https://chat.deepseek.com', 'chat.deepseek.com', 'DeepSeek\'s own apps store chats on servers in China. Share only the anonymised summary, never your statement or SMS.'],
    Copilot: ['copilot', 'https://copilot.microsoft.com', 'copilot.microsoft.com', 'Before you paste, open your profile, then Privacy, and switch off "Training on conversation activity" if you don\'t want your chats used for training.']
  };
  function aiNext(p) {
    const box = $('#aiNext'); if (!box) return;
    const inf = AI_INFO[p];
    const logo = $('#aiNextLogo');
    if (inf) { logo.hidden = false; if (logo.dataset.ai !== inf[0]) { logo.dataset.ai = inf[0]; logo.className = 'ai'; window.pdFillAi && window.pdFillAi(logo); } }
    else logo.hidden = true;
    $('#aiNextTitle').textContent = inf ? 'Next, in ' + p : 'Next, in your assistant';
    const o = $('#aiOpen');
    if (inf) { o.href = inf[1]; o.textContent = inf[2]; o.hidden = false; o.nextSibling.textContent = ' or the app, and start a new chat.'; }
    else { o.hidden = true; o.nextSibling.textContent = 'your assistant and start a new chat.'; }
    $('#aiPriv').textContent = inf ? inf[3] : 'Before you paste, check its settings for an option that lets your chats train its models, and switch it off if you prefer.';
  }
  $$('#aiFq button').forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.textContent); $('#fqState').textContent = 'Copied: ' + b.textContent; } catch (e) { $('#fqState').textContent = 'Copy this: ' + b.textContent; } }));
  function renderAI() { const fxKeep = window.PD_FX; window.PD_FX = null; try { renderAI0(); } finally { window.PD_FX = fxKeep; } }
  function aiShow(A, p) {
    const inf = AI_INFO[p] || AI_INFO.ChatGPT; const name = AI_INFO[p] ? p : 'ChatGPT';
    const lg = $('#aiShowLogo'); if (lg.dataset.ai !== inf[0]) { lg.dataset.ai = inf[0]; lg.className = 'ai'; window.pdFillAi && window.pdFillAi(lg); }
    $('#aiShowName').textContent = name;
    $('#aiDemoNote').hidden = !S.demo; $('#aiShowWho').textContent = S.demo ? "Amani's" : 'Your';
    const her = S.demo ? 'Amani' : 'You'; const pts = [];
    if (A.lifespan) pts.push(`<b>Payday runs out fast.</b> Half of each big payment is gone in about ${Math.round(A.lifespan)} days. Pay rent and the must-pays on payday, before anything else moves.`);
    if (A.hasCredit && A.creditDays) pts.push(`<b>Fuliza is a habit, not an emergency.</b> ${A.creditDays} days ended owing it. Clearing it the day money lands would shorten each loan.`);
    if (A.avoidableTotal) pts.push(`<b>${F(A.avoidableTotal)} could have been kept.</b> Mostly late repayments and missed cashback. Repay within 10 days where the lender offers it.`);
    else if (A.feesTotal) pts.push(`<b>Charges add up to ${F(A.feesTotal)}.</b> Paying tills directly and withdrawing less often trims most of it.`);
    $('#aiShowReply').innerHTML = `<span class="small">${esc(name)} replies</span><p>Here's what stands out in ${S.demo ? 'Amani\'s' : 'your'} year, and 3 things to try:</p><ol>${pts.slice(0, 3).map((x) => `<li>${x}</li>`).join('')}</ol><p class="small" style="margin:0;opacity:.8">Want me to turn this into a plan for the week ${her === 'You' ? 'you usually run' : 'she usually runs'} low?</p>`;
  }
  function renderAI0() {
    const A = S.A; if (!A) return; const a = S.ai; const plan = aiPlan(a);
    const sum = AN.summary(A, { merchants: plan.free ? 8 : 15, demo: S.demo, provider: A.provider });
    if (!$('#incMerchants').checked) sum.top_merchants = sum.top_merchants.map((m) => ({ category: m.category, total: m.total, payments: m.payments }));
    const json = JSON.stringify(sum);
    const adv = [];
    if (!a.platform) adv.push('Pick your assistant above, then copy the prompt and paste it into a new chat.');
    if (a.plan !== 'paid' && a.budget !== '5') adv.push('On a free plan the prompt still asks for about 300 words, so you don\'t run out of messages halfway through. Choose Paid for the longer read.');
    if (!a.share || a.share === 'summary') adv.push('The summary below fits comfortably in a free plan.');
    if (a.share === 'pdf') adv.push(plan.months === 12 ? 'Attach your statement PDF with this prompt. Up to 12 months is reasonable on your plan.' : `On your answers, attach at most ${plan.months === 1 ? '1 month' : plan.months + ' months'} of statement (a 12-month PDF can be 60,000 to 150,000 tokens), or use the summary instead.`);
    if (a.share === 'pdf' || a.share === 'sms') adv.push('A statement or raw messages include people\'s names and phone numbers. The summary doesn\'t.');
    if (a.share === 'sms') adv.push(`Paste your money messages where the prompt says, ${plan.months === 1 ? 'one month at most' : 'one month at a time, up to ' + plan.months + ' months'}. Never paste bank codes or chats.`);
    $('#aiAdvice').textContent = adv.join(' ');
    aiNext(a.platform);
    aiShow(A, a.platform);
    const mp = A.provider === 'M-PESA';
    const what = a.share === 'pdf' ? 'I have attached my statement PDF. The summary below covers the same period.' : a.share === 'sms' ? 'My money messages are pasted at the end, after the summary.' : 'Below is an anonymised summary: totals and patterns only, with no names of people.';
    const prompt = `${S.demo ? 'NOTE: this is DEMO data for a fictional person, invented to show how the tool works. It is not real.\n\n' : ''}You are a calm, practical money coach who understands mobile money in Africa${mp ? ' (M-PESA, Fuliza, M-Shwari, KCB M-PESA)' : ` (${A.provider}, mobile loans and agent fees)`}. Use plain words.

I used Pesadithi Lab (an open-source tool that runs in my browser) to analyse my ${A.provider} money. ${what}

I'm on ${a.platform || 'an AI assistant'}${a.plan ? ` (${a.plan} plan)` : ''} and want ${a.budget === '50' ? 'a deep dive' : a.budget === '20' ? 'a proper review' : 'a quick read'}, so keep your answer under ${plan.words} words. Don't ask for more data unless it's essential.

Please:
1. The three most important things about my TIMING: when money arrives, how fast it goes, the days I run low, and the hours I spend.
${A.hasCredit || A.loans.length ? `2. What my ${mp ? 'Fuliza and loans' : 'borrowing'} really cost per 100 borrowed, and which costs were avoidable.\n` : '2. Which fees and charges I could cut, with amounts.\n'}3. Anything unusual worth a second look.
4. Three small, specific changes to try next month, each with the amount it could save.
5. One question that would help you advise me better next time.

Rules: use only numbers in the data and never invent any. Months marked partial_month cover only part of the month, so don't compare them with full months. Say "estimate" where the data says so. This is not financial advice; I'll decide.

SUMMARY (${A.cur}, ${A.start} to ${A.end}):
${json}${a.share === 'sms' ? '\n\nMY MONEY MESSAGES:\n[Paste them here]' : ''}`;
    $('#aiOut').textContent = prompt;
    $('#aiShowWords').textContent = `about ${n0(Math.round(prompt.split(/\s+/).length / 10) * 10)} words`;
    $('#aiSize').textContent = `About ${n0(Math.round(prompt.split(/\s+/).length / 10) * 10)} words, small enough for a free plan${a.share === 'pdf' ? ' plus your PDF' : a.share === 'sms' ? ' plus your messages' : ''}`;
    $('#copyState').textContent = '';
  }
  $('#copyPrompt').addEventListener('click', async () => { const t = $('#aiOut').textContent; try { await navigator.clipboard.writeText(t); $('#copyState').textContent = 'Copied. Paste it into your assistant.'; } catch (e) { const r = document.createRange(); r.selectNodeContents($('#aiOut')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('#copyState').textContent = 'Selected. Press Ctrl+C or Cmd+C to copy.'; } });

  /* ---------------- Story mode (tall 9:16, for screen recording) ---------------- */
  const SM = { i: 0, slides: [], timer: null, opener: null, rec: false, count: null };
  function stopCount() { clearInterval(SM.count); SM.count = null; $('#smCount').hidden = true; }
  function slides() {
    const A = S.A; const s = []; const d = S.demo; const cn = credit(); const their = d ? 'her' : 'your';
    if (A.hasCredit) s.push({ k: d ? 'Meet Amani · invented data' : 'Your money story', v: `${A.creditDays} days`, cls: 'credit', t: `of ${A.nDays} ended owing ${cn}.`, dd: d ? 'Amani is fictional. Her patterns are the kind this tool finds.' : 'Here is why, in under a minute.' });
    else s.push({ k: d ? 'Meet Amani · invented data' : 'Your money story', v: n0(A.txCount), t: `transactions in ${pl(Math.round(A.monthsEq), 'month')}.`, dd: 'Here is what they say about timing.' });
    s.push({ k: 'Money in', tone: 'in', v: '+' + FB(A.totalIn), t: 'came in.', dd: `Most of it around the ${A.bigInDays.slice(0, 2).map(ord).join(' and ') || 'same few days'}.` });
    s.push({ k: 'Money out', tone: 'out', v: '−' + FB(A.totalOut), t: 'went out.', dd: A.ownOut > A.totalOut * .05 ? `${pct(A.ownOut / A.totalOut)} of it moved to ${their} own banks, cards or savings.` : `Net: ${A.totalIn >= A.totalOut ? '+' : '−'}${kfmt(Math.abs(A.totalIn - A.totalOut))}.` });
    // Brag stats: things people are happy to post
    if (A.hasCredit) s.push({ k: 'Fuliza-free days', tone: 'mint', v: `${A.nDays - A.creditDays} of ${A.nDays}`, t: `days ${d ? 'she' : 'you'} owed Fuliza nothing.`, dd: `That's ${pct((A.nDays - A.creditDays) / A.nDays)} of the year.` });
    if (A.totalIn > 0 && A.ownOut / A.totalIn >= 0.05) s.push({ k: 'Savings rate', tone: 'mint', v: pct(A.ownOut / A.totalIn), t: `of what came in went to ${their} savings, banks or investments.`, dd: `${F(A.ownOut)} moved out of the wallet on purpose.` });
    if (A.lifespan != null) s.push({ k: 'How long it lasts', v: A.lifespan.toFixed(1) + ' days', t: 'until half of a big payment is spent.', dd: A.lifespan75 ? `Three quarters gone by day ${A.lifespan75.toFixed(1)}.` : '', viz: 'drain' });
    if (A.hasCredit && A.lowDay) s.push({ k: 'The gap', v: `The ${ord(A.lowDay.day)}`, t: `is when ${their} balance is usually lowest.`, dd: A.bigInDays.length ? `Money lands around the ${ord(A.bigInDays[0])}. ${cn} fills the gap.` : '', viz: 'dom' });
    s.push({ k: 'The money clock', v: hourLabel(A.habits.peakHour), t: `on ${WD[A.habits.peakWeekday]} is peak spending time.`, dd: `${pct(A.habits.lateNightShare)} of spending happens between 10pm and 4am.` });
    if (A.habits.cafeVisits > 10) s.push({ k: 'A habit', v: `${Math.round(A.habits.cafePerWeek)} a week`, t: 'café and restaurant visits.', dd: `${F(A.habits.cafeSpend / A.monthsEq)} a month.` });
    if (A.loans.length) s.push({ k: 'Borrowing', v: `${A.cur} ${Math.round(A.loanCost / (d3.sum(A.loans, (l) => l.principal) || 1) * 100)}`, t: 'paid for every 100 borrowed on loans.', dd: A.hasCredit ? `${cn}: about ${A.cur} ${(A.creditFees / (A.creditDrawn || 1) * 100).toFixed(1)} per 100.` : '' });
    s.push({ k: 'The price', cls: 'out', v: F(A.feesTotal), t: 'in fees and charges.', dd: A.avoidableTotal ? `${F(A.avoidableTotal)} of it was avoidable.` : '' });
    const tip = A.loans.some((l) => l.rollover || l.cashbackMissed) ? { v: 'Repay by day 10', t: d3.sum(A.loans, (l) => l.rollover) ? 'Avoid late penalties and earn the early-repayment refund.' : 'Earn back part of the loan fee with the early-repayment refund.' } : A.hasCredit && A.lowDay ? { v: `Move money to the ${ord(Math.max(1, A.lowDay.day - 2))}`, t: `Close the gap before ${cn} has to.` } : { v: 'Sort your people', t: 'See what the money you send really is.' };
    s.push({ k: 'Try this', v: tip.v, t: tip.t, dd: '', small: true });
    s.push({ k: 'Pesadithi Lab', v: 'Read your own', t: 'Free, open source, and your data stays on your device.', dd: 'Made by Mark Kaigwa · mark.co.ke', url: 'github.com/mkaigwa/pesadithi-lab' });
    return s;
  }
  function miniViz(kind) {
    const A = S.A; const w = 400, hh = 150;
    if (kind === 'drain') { const x = d3.scaleLinear().domain([0, 30]).range([0, w]), y = d3.scaleLinear().domain([0, 1]).range([hh, 6]); const dd = A.drain.filter((q) => q.remaining != null); return `<svg viewBox="0 0 ${w} ${hh + 4}" aria-hidden="true"><path d="${d3.area().x((q) => x(q.day)).y0(hh).y1((q) => y(q.remaining)).curve(d3.curveMonotoneX)(dd)}" fill="${C.in}" opacity=".85"/></svg>`; }
    if (kind === 'dom') { const x = d3.scaleBand().domain(d3.range(1, 32)).range([0, w]).padding(.2), y = d3.scaleLinear().domain([0, d3.max(A.dom, (q) => q.creditDraw) || 1]).range([hh, 6]); return `<svg viewBox="0 0 ${w} ${hh + 4}" aria-hidden="true">${A.dom.map((q) => `<rect x="${x(q.day)}" width="${x.bandwidth()}" y="${y(q.creditDraw)}" height="${hh - y(q.creditDraw)}" rx="2" fill="${C.credit}"/>`).join('')}</svg>`; }
    return '';
  }
  function openStoryMode(ev) {
    if (!S.A) return; window.pdTrack && pdTrack('Story mode opened', { demo: String(!!S.demo) }); SM.opener = (ev && ev.currentTarget) || document.activeElement; SM.slides = slides(); SM.i = 0;
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
    const TONES = { 'Fuliza-free days': 'mint', 'Savings rate': 'mint', 'Your money story': 'ink', 'Meet Amani · invented data': 'ink', 'How long it lasts': 'mint', 'The gap': 'credit', 'The money clock': 'ink', 'A habit': 'mint', 'Borrowing': 'credit', 'The price': 'out', 'Try this': 'mint', 'Pesadithi Lab': 'ink' };
    $('#smFrame').dataset.tone = s.tone || TONES[s.k] || 'mint';
    $('#smSlide').innerHTML = `<div class="sk">${esc(s.k)}</div><div class="sv${s.small ? ' small' : ''}${s.cls ? ' ' + s.cls : ''}${/KES|Ksh|UGX|TZS|USD|[+−-]?\d{1,3}(?:,\d{3})|\d(?:\.\d+)?[km]\b/.test(s.v) ? ' money' : ''}">${esc(s.v)}</div><div class="st">${esc(s.t)}</div>${s.dd ? `<div class="sd">${esc(s.dd)}</div>` : ''}${s.viz ? miniViz(s.viz) : ''}${s.url ? `<div class="surl">${esc(s.url)}</div>` : ''}`;
    const sv = $('#smSlide .sv'); if (sv && /\d/.test(sv.textContent)) countUp(sv);
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
  // Story mode looks: a wallpaper for every slide, and a way to hide amounts before posting
  const WKEY = 'pesadithi:wall';
  const setWall = (w) => { $('#smFrame').dataset.wall = w; $$('.wsw').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wall === w))); try { localStorage.setItem(WKEY, w); } catch (e) { /* not remembered */ } };
  $$('.wsw').forEach((b) => b.addEventListener('click', () => setWall(b.dataset.wall)));
  try { setWall(localStorage.getItem(WKEY) || 'auto'); } catch (e) { setWall('auto'); }
  // Amounts start hidden, so nobody posts their income by accident
  const HKEY = 'pesadithi:hideamt';
  const setHide = (on) => { $('#smFrame').classList.toggle('hideamt', on); $('#smHide').setAttribute('aria-pressed', String(on)); $('#smHide').textContent = on ? 'Show amounts' : 'Hide amounts'; try { localStorage.setItem(HKEY, on ? '1' : '0'); } catch (e) { /* not remembered */ } };
  $('#smHide').addEventListener('click', () => setHide(!$('#smFrame').classList.contains('hideamt')));
  let hide0 = true; try { hide0 = localStorage.getItem(HKEY) !== '0'; } catch (e) { /* default hidden */ } setHide(hide0);
  $('#btnStoryMode').addEventListener('click', openStoryMode);
  document.addEventListener('keydown', (e) => {
    if ($('#sm').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeStoryMode(); return; }
    if (e.key === 'Tab') { const f = $$('#sm button').filter((b) => b.offsetParent !== null); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } return; }
    if (e.key === 'ArrowRight' || (e.key === ' ' && !(document.activeElement && document.activeElement.tagName === 'BUTTON'))) { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'h' || e.key === 'H') { $('#sm').classList.toggle('rec'); if (!$('#sm').classList.contains('rec')) SM.rec = false; }
  });

  /* ---------------- Hero: an Android phone whose M-PESA texts are read and labelled ---------------- */
  function heroAnim() {
    const feed = $('#heroFeed'); if (!feed) return;
    const box = $('#devbox'), dev = $('#dev');
    const fit = () => { const w = box.closest('.inhand') ? 412 : 432; dev.style.setProperty('--s', (box.clientWidth / w).toFixed(4)); };
    fit(); window.addEventListener('resize', fit);
    const G = { in: '#17803f', out: '#d23b2e', credit: '#2457d6', who: '#b26a00', saved: '#7c4ddb', move: '#5b6670' };
    // [day label, time, text with [[amount]] and {{payee}} marks, tag, colour key, in, out, fuliza, fee, saved]
    const M = [
      ['Fri, 26 Sep', '9:14 am', 'TIQ4H2KL7S Confirmed.You have received [[Ksh48,500.00]] from {{ACME DESIGN LTD}} on 26/9/26 at 9:14 AM New M-PESA balance is Ksh49,180.00.', 'Salary in', 'in', 48500, 0, 0, 0, 0],
      ['', '9:14 am', 'TIQ4H2KL7T Confirmed. Fuliza M-PESA amount is [[Ksh180.00]] repaid. Available Fuliza M-PESA limit is Ksh5,000.00.', 'Fuliza repaid', 'credit', 0, 0, 0, 0, 0],
      ['', '9:20 am', 'TIQ5J7XW2B Confirmed. [[Ksh5,000.00]] sent to {{ZIIDI MONEY MARKET FUND}} for account 0712xxx486 on 26/9/26 at 9:20 AM. New M-PESA balance is Ksh44,000.00. Transaction cost, Ksh0.00.', 'Saved · Ziidi', 'saved', 0, 0, 0, 0, 5000],
      ['', '6:41 pm', 'TIR2B7MX0P Confirmed. [[Ksh2,350.00]] paid to {{NAIVAS WESTLANDS}}. on 26/9/26 at 6:41 PM.New M-PESA balance is Ksh41,650.00. Transaction cost, Ksh0.00.', 'Groceries', 'out', 0, 2350, 0, 0, 0],
      ['Sat, 27 Sep', '11:05 am', 'TIS4P8KD2N Confirmed. You have received [[Ksh1,850.00]] from {{AMINA WANJIRU}} to your Pochi la Biashara on 27/9/26 at 11:05 AM. New Pochi balance is Ksh6,420.00.', 'Side hustle · Pochi', 'in', 1850, 0, 0, 0, 0],
      ['', '7:02 pm', 'TIS9C3QW1E Confirmed. [[Ksh1,500.00]] sent to {{WANJIRU KAMAU}} 0712xxx486 on 27/9/26 at 7:02 PM. New M-PESA balance is Ksh40,127.00. Transaction cost, Ksh23.00.', 'A person: who?', 'who', 0, 1500, 0, 23, 0],
      ['Fri, 3 Oct', '9:47 pm', 'TJV6E2NB3D Confirmed. Fuliza M-PESA amount is [[Ksh640.00]]. Access Fee charged Ksh6.40. Total Fuliza M-PESA outstanding amount is Ksh646.40 due on 2/11/26.', 'Fuliza borrowed', 'credit', 0, 0, 640, 6, 0],
      ['', '9:48 pm', 'TJW3F5YC8L Confirmed. [[Ksh640.00]] paid to {{KPLC PREPAID}} for account 37185520496 on 3/10/26 at 9:48 PM New M-PESA balance is Ksh0.00. Transaction cost, Ksh0.00.', 'Electricity', 'out', 0, 640, 0, 0, 0],
      ['Sat, 4 Oct', '8:05 am', 'TJX7G9HA2M Confirmed. [[Ksh3,000.00]] moved from {{Pochi la Biashara}} to M-PESA on 4/10/26 at 8:05 AM. Fuliza M-PESA amount of Ksh646.40 repaid. New M-PESA balance is Ksh2,353.60.', 'Pochi → M-PESA', 'move', 0, 0, 0, 0, 0]
    ];
    const mark = (t) => esc(t).replace(/\[\[(.+?)\]\]/g, '<span class="amt">$1</span>').replace(/\{\{(.+?)\}\}/g, '<span class="pay">$1</span>');
    let html = '';
    M.forEach((m, i) => {
      const next = M[i + 1]; const groupStart = i === 0 || m[0]; const groupEnd = !next || next[0];
      if (m[0]) html += `<div class="day">${esc(m[0])} · ${esc(m[1])}</div>`;
      html += `<div class="row has-tag ${groupStart ? 'first' : 'mid'}${groupEnd ? ' last' : ''}" style="--c:${G[m[4]]}" data-i="${i}"><span class="ava">M</span><div class="bub">${mark(m[2])}<span class="tag">${esc(m[3])}</span></div></div>`;
    });
    feed.innerHTML = html;
    const T = [['in', 'came in', G.in, 5], ['out', 'went out', G.out, 6], ['saved', 'saved to Ziidi', G.saved, 9], ['credit', 'Fuliza', G.credit, 7], ['fee', 'in charges', '#5b6670', 8]];
    // Each tile carries a mark as well as a colour: arrows for money in and out, the Ziidi and Fuliza logos when their files are in vendor/logos, a coin for charges
    const IC = {
      in: '<svg viewBox="0 0 24 24"><path d="M12 4v12M6.5 10.5 12 16l5.5-5.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      out: '<svg viewBox="0 0 24 24"><path d="M12 20V8M6.5 13.5 12 8l5.5 5.5M5 4h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      saved: '<span class="lm">Z</span>', credit: '<span class="lm">F</span>',
      fee: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.6 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2c1.5.3 2.7.8 2.7 2.1s-1.2 2.1-2.7 2.1c-1.2 0-2.2-.5-2.7-1.5M12 6v1.8M12 16v1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };
    const LOGO = { saved: 'ziidi', credit: 'fuliza' };
    $('#heroTally').innerHTML = T.map(([k, l, c]) => `<div style="--c:${c}"><span class="tl-ic${LOGO[k] ? ' tl-brand' : ''}" data-k="${k}" aria-hidden="true">${IC[k]}</span><b id="ht-${k}">KES 0</b><small>${l}</small></div>`).join('');
    fetch('vendor/logos/logos.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((m) => {
      Object.entries(LOGO).forEach(([k, key]) => { if (!m || !m[key]) return; const slot = $(`#heroTally .tl-ic[data-k="${k}"]`); const img = new Image(); img.alt = ''; img.onload = () => { slot.innerHTML = ''; slot.appendChild(img); slot.classList.add('has-logo'); }; img.src = 'vendor/logos/' + m[key]; });
    });
    const rows = $$('#heroFeed .row'); const scan = $('#heroScan'); const convo = feed.parentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = { in: 0, out: 0, credit: 0, fee: 0, saved: 0 };
    const paint = () => T.forEach(([k]) => { $('#ht-' + k).textContent = 'KES ' + n0(run[k]); });
    const step = (i) => {
      if (i >= rows.length) { scan.style.opacity = 0; return; }
      const r = rows[i]; const m = M[i];
      // keep the row being read in view, as the chat would scroll
      const bottom = r.offsetTop + r.offsetHeight + 24; const h = convo.clientHeight;
      feed.style.transform = `translateY(${Math.min(0, h - bottom)}px)`;
      setTimeout(() => {
        const y = r.offsetTop + Math.min(0, h - bottom);
        scan.style.top = (y + r.offsetHeight / 2) + 'px'; scan.style.opacity = 1;
        setTimeout(() => {
          r.classList.add('on');
          run.in += m[5]; run.out += m[6]; run.credit += m[7]; run.fee += m[8]; run.saved += m[9]; paint();
          setTimeout(() => step(i + 1), 520);
        }, 380);
      }, 420);
    };
    if (reduce) { rows.forEach((r, i) => { r.classList.add('on'); run.in += M[i][5]; run.out += M[i][6]; run.credit += M[i][7]; run.fee += M[i][8]; run.saved += M[i][9]; }); paint(); return; }
    paint(); setTimeout(() => step(0), 700);
  }
  heroAnim();


  /* ---------------- Start ---------------- */
  setDataUI(false);
  $('#btnDemo').disabled = false; $('#btnDemo').textContent = 'See a demo story';
  if (window.PD_PRELOAD) {
    // A private copy that opens straight onto its owner's own data
    fetch(window.PD_PRELOAD).then((r) => r.text()).then((t) => { S.raw = P.fromMessages(t, 'preloaded'); S.demo = false; S.period = window.PD_PERIOD || 12; compute(); if (!location.hash || location.hash === '#home' || location.hash === '#start') history.replaceState(null, '', '#story'); route(); })
      .catch(() => route());
  } else route();
})();
