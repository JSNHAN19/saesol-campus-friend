(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const CFG = window.APP_CONFIG || {};
  const STEPS = ['title', 'intro', 'board', 'q1', 'q2', 'q3', 'game', 'feedback', 'reflect', 'outro'];
  const FULL = new Set(['title', 'intro', 'q1', 'q2', 'q3', 'outro']);
  const cid = new URLSearchParams(location.search).get('c');
  const app = $('#app'), stage = $('.stage'), panel = $('.panel'), top = $('.top');
  const store = {
    get(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  let C, S;

  /* ---------- 음성 + 말하기 애니메이션 ---------- */
  const Speaker = {
    ctx: null, token: 0, audio: null, raf: 0, muted: false,
    unlock() {
      try { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume(); } catch {}
      try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch {}
    },
    stop() {
      this.token++;
      cancelAnimationFrame(this.raf);
      if (this.audio) { this.audio.pause(); this.audio = null; }
      try { speechSynthesis.cancel(); } catch {}
      stage.style.setProperty('--amp', 0);
      app.classList.remove('speaking');
    },
    async loadAudio(id) {
      const a = new Audio(`assets/audio/${cid}/${id}.mp3`);
      a.preload = 'auto';
      await new Promise((ok, no) => { a.onloadedmetadata = ok; a.onerror = no; });
      let an = null;
      if (this.ctx) {
        try {
          const src = this.ctx.createMediaElementSource(a);
          an = this.ctx.createAnalyser(); an.fftSize = 512;
          src.connect(an); an.connect(this.ctx.destination);
        } catch {}
      }
      await a.play();
      return { a, an };
    },
    tts(text, mark) {
      if (!('speechSynthesis' in window)) throw 0;
      const v = speechSynthesis.getVoices().find(v => /^ko/i.test(v.lang));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; if (v) u.voice = v; u.rate = 1.02;
      u.onboundary = e => mark.at = Math.max(mark.at, e.charIndex);
      u.onend = u.onerror = () => mark.end = true;
      speechSynthesis.speak(u);
    },
    async say(line, el, done) {
      this.stop();
      const t = this.token, text = line.text, n = [...text];
      const bubble = el.closest('.bubble');
      bubble.classList.add('typing');
      let mode = 'silent', a, an, mark = { at: 0, end: false };
      if (!this.muted) {
        try { ({ a, an } = await this.loadAudio(line.id)); mode = 'audio'; }
        catch { try { this.tts(text, mark); mode = 'tts'; } catch {} }
      }
      if (t !== this.token) { a?.pause(); return; }
      this.audio = a;
      if (mode !== 'silent') app.classList.add('speaking');
      const est = Math.max(2.4, n.length * (mode === 'silent' ? 0.045 : 0.13));
      const t0 = performance.now(), buf = an && new Uint8Array(an.fftSize);
      const finish = () => {
        el.textContent = text; bubble.classList.remove('typing');
        app.classList.remove('speaking'); stage.style.setProperty('--amp', 0);
        done?.();
      };
      const frame = now => {
        if (t !== this.token) return;
        const el2 = (now - t0) / 1000;
        let p, amp = 0, ended;
        if (mode === 'audio') {
          p = a.duration ? a.currentTime / a.duration : 0; ended = a.ended;
          if (buf) { an.getByteTimeDomainData(buf); let s = 0; for (const b of buf) s += ((b - 128) / 128) ** 2; amp = Math.min(1, Math.sqrt(s / buf.length) * 5); }
          else amp = a.paused ? 0 : 0.4 + 0.3 * Math.abs(Math.sin(el2 * 9));
        } else if (mode === 'tts') {
          p = Math.min(0.97, Math.max(el2 / est, mark.at / n.length)); ended = mark.end;
          amp = ended ? 0 : 0.35 + 0.35 * Math.abs(Math.sin(el2 * 8.3) * Math.sin(el2 * 3.1 + 1));
          if (ended) p = 1;
        } else { p = el2 / est; ended = p >= 1; }
        stage.style.setProperty('--amp', amp.toFixed(3));
        el.textContent = n.slice(0, Math.ceil(Math.min(1, p) * n.length)).join('');
        if (ended || (mode === 'tts' && el2 > est * 2.2)) return finish();
        this.raf = requestAnimationFrame(frame);
      };
      bubble.onclick = e => { if (e.target.closest('.replay')) return; if (bubble.classList.contains('typing')) { this.stop(); finish(); } };
      this.raf = requestAnimationFrame(frame);
    }
  };

  /* ---------- 공통 UI 조각 ---------- */
  const bubble = line => `
    <div class="bubble reveal" style="--i:2">
      <p class="say" aria-label="${esc(line.text)}"></p>
      <button class="replay" type="button" aria-label="다시 듣기">
        <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5" fill="none"/></svg>다시 듣기
      </button>
    </div>`;
  const btn = (go, label, kind = 'primary', i = 4) =>
    `<button class="btn ${kind} reveal" style="--i:${i}" type="button" data-go="${go}">${label}<span class="arr">›</span></button>`;
  const head = (eyebrow, h, i = 0) => `<p class="eyebrow reveal" style="--i:${i}">${eyebrow}</p><h2 class="h reveal" style="--i:${i + 1}">${h}</h2>`;
  const nums = ['①', '②', '③'];
  const gwa = w => ((w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? '과' : '와');

  /* ---------- 화면 ---------- */
  const Screens = {
    title: () => `
      <div class="hero">
        <p class="eyebrow reveal" style="--i:0">SCAN &amp; MEET</p>
        <h1 class="display reveal" style="--i:1">${esc(C.title)}</h1>
        <p class="lead reveal" style="--i:2">${esc(C.subtitle)}</p>
        <ul class="meta reveal" style="--i:3"><li>약 3분</li><li>질문 3개</li><li>선택 게임 1개</li></ul>
        <p class="hint reveal" style="--i:3"><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/></svg>소리를 켜고 참여해 주세요</p>
        ${btn('intro', `${esc(C.name)} 만나러 가기`, 'primary', 4)}
      </div>`,
    intro: () => `${head('WELCOME', esc(C.intro.heading))}${bubble(C.intro)}<div class="actions">${btn('board', '질문 고르러 가기')}</div>`,
    board: () => `
      ${head('QUESTION BOARD', esc(C.boardTitle))}
      <p class="sub reveal" style="--i:2">질문 카드를 누르면 ${esc(C.name)}의 대답을 들을 수 있어.</p>
      <div class="cards">${C.questions.map((q, i) => `
        <button class="qcard reveal ${S.visited.includes(q.id) ? 'done' : ''}" style="--i:${3 + i}" type="button" data-go="${q.id}">
          <span class="qn">Q${i + 1}</span><span class="qt">${esc(q.q)}</span>
          <span class="qs" aria-label="${S.visited.includes(q.id) ? '들음' : ''}"></span>
        </button>`).join('')}</div>
      ${S.visited.length ? `<div class="actions">${btn('game', S.visited.length === 3 ? '상황 게임으로' : '바로 상황 게임으로', S.visited.length === 3 ? 'primary' : 'ghost', 6)}</div>` : ''}`,
    q: q => {
      const i = C.questions.indexOf(q) + 1;
      return `
        <p class="eyebrow reveal" style="--i:0">CHARACTER BRIEFING · Q${i}</p>
        <p class="qline reveal" style="--i:0">${esc(q.q)}</p>
        <p class="kicker reveal" style="--i:1">${esc(q.kicker)}</p>
        <h2 class="h big reveal" style="--i:1">${esc(q.headline)}</h2>
        ${bubble(q)}
        <div class="keys reveal" style="--i:3"><b>핵심</b>${q.keys.map(k => `<span>${esc(k)}</span>`).join('')}</div>
        <div class="actions two">${btn('board', '질문 목록으로', 'ghost', 4)}${btn('game', '상황 게임으로', 'primary', 5)}</div>`;
    },
    game: () => `
      ${head('CHOICE MISSION', '캠퍼스 선택 게임')}
      <p class="sub reveal" style="--i:2">나라면 어떻게 행동할까? 세 가지 중 하나를 골라 보세요.</p>
      <div class="situation reveal" style="--i:3"><span>상황</span>${esc(C.game.situation)}</div>
      <div class="options">${C.game.options.map((o, i) => `
        <button class="opt reveal" style="--i:${4 + i}" type="button" data-pick="${i}"><span class="on">${nums[i]}</span><span>${esc(o.text)}</span></button>`).join('')}</div>`,
    feedback: () => {
      const g = C.game, best = g.options[g.answer], pick = S.pick, mine = pick != null ? g.options[pick] : null;
      return `
        ${head('FEEDBACK', '좋은 선택은 무엇일까?')}
        ${mine ? `<div class="mine reveal ${pick === g.answer ? 'right' : ''}" style="--i:2">
          <small>내가 고른 답 ${nums[pick]}</small><p>${esc(mine.text)}</p><em>${esc(mine.note)}</em></div>` : ''}
        <div class="best reveal" style="--i:3">
          <span class="badge">BEST CHOICE</span>
          <p class="ans">정답은 ${nums[g.answer]} <span>${esc(best.text)}</span></p>
          <p>${esc(g.explain)}</p>
        </div>
        <div class="remember reveal" style="--i:4"><b>기억해 줘!</b>“${esc(g.remember)}”</div>
        <div class="actions">${btn('reflect', '마지막 생각 남기기', 'primary', 5)}</div>`;
    },
    reflect: () => `
      ${head('REFLECTION', '이제, 네 생각을 들려줘.')}
      <form class="reflect" autocomplete="off">
        <label class="reveal" style="--i:2"><span>오늘 나에 대해 새롭게 알게 된 한 가지는?</span>
          <textarea name="learned" rows="4" maxlength="300" placeholder="여기에 네 생각을 적어 줘…">${esc(S.learned || '')}</textarea></label>
        <fieldset class="reveal" style="--i:3"><legend>다음에 캠퍼스에서 만나면? <small>여러 개 골라도 돼</small></legend>
          ${['먼저 인사할래', '필요한 도움을 물어볼래', '함께 활동해 볼래'].map(t => `
            <label class="chk"><input type="checkbox" name="next" value="${t}" ${S.next?.includes(t) ? 'checked' : ''}><span>${t}</span></label>`).join('')}
        </fieldset>
        <div class="actions"><button class="btn primary reveal" style="--i:4" type="submit">친구의 마지막 인사<span class="arr">›</span></button></div>
      </form>`,
    outro: () => `
      ${head('GOODBYE', esc(C.outro.heading))}${bubble(C.outro)}
      <div class="actions"><button class="gift reveal" style="--i:4" type="button" data-reward>
        <svg viewBox="0 0 24 24"><path d="M3 10h18v4H3zM5 14h14v7H5zM12 10v11M12 10S9 3 6.5 5.5 12 10 12 10zm0 0s3-7 5.5-4.5S12 10 12 10z" fill="none"/></svg>
        참여 완료! 소정의 선물 받기</button></div>`
  };

  const reward = () => {
    S.code ||= `${cid.slice(0, 2).toUpperCase()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    S.doneAt ||= new Date().toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    save();
    const d = document.createElement('div');
    d.className = 'modal';
    d.innerHTML = `<div class="ticket" role="dialog" aria-modal="true" aria-label="참여 완료">
      <div class="seal"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none"/></svg></div>
      <h3>${esc(CFG.reward?.title || '참여 완료!')}</h3>
      <p>${esc(CFG.reward?.body || '')}</p>
      <dl><div><dt>캐릭터</dt><dd>${esc(C.name)}</dd></div><div><dt>확인 번호</dt><dd class="code">${S.code}</dd></div><div><dt>완료 시각</dt><dd>${S.doneAt}</dd></div></dl>
      <button class="btn ghost" type="button" data-close>닫기</button>
      <a class="restart" href="?c=${cid}#title" data-restart>처음부터 다시 하기</a></div>`;
    document.body.append(d);
    requestAnimationFrame(() => d.classList.add('in'));
    d.onclick = e => { if (e.target === d || e.target.closest('[data-close]')) d.remove(); if (e.target.closest('[data-restart]')) { sessionStorage.clear(); } };
  };

  const submit = form => {
    const fd = new FormData(form);
    S.learned = (fd.get('learned') || '').trim();
    S.next = fd.getAll('next');
    save();
    const payload = {
      character: cid, visited: S.visited.join(','), pick: S.pick != null ? S.pick + 1 : '',
      correct: S.pick === C.game.answer, learned: S.learned, next: S.next.join(', '),
      ts: new Date().toISOString()
    };
    try { const q = JSON.parse(localStorage.getItem('responses') || '[]'); q.push(payload); localStorage.setItem('responses', JSON.stringify(q)); } catch {}
    if (CFG.endpoint) fetch(CFG.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }).catch(() => {});
    go('outro');
  };

  /* ---------- 라우팅 ---------- */
  const save = () => store.set(`s:${cid}`, S);
  const go = id => { if (location.hash.slice(1) === id) render(); else location.hash = id; };
  const react = cls => { stage.classList.remove('happy', 'nod'); void stage.offsetWidth; stage.classList.add(cls); };

  function render() {
    let id = location.hash.slice(1);
    if (!STEPS.includes(id)) id = 'title';
    Speaker.stop();
    const q = C.questions.find(x => x.id === id);
    if (q && !S.visited.includes(id)) { S.visited.push(id); save(); }
    app.dataset.screen = id;
    stage.classList.toggle('compact', !FULL.has(id));
    top.hidden = id === 'title';
    [...$('.progress').children].forEach((li, i) => li.className = i < STEPS.indexOf(id) ? 'past' : i === STEPS.indexOf(id) ? 'now' : '');
    panel.innerHTML = `<div class="screen">${q ? Screens.q(q) : Screens[id]()}</div>`;
    panel.scrollTop = 0; window.scrollTo({ top: 0, behavior: 'instant' });
    const line = q || (id === 'intro' && C.intro) || (id === 'outro' && C.outro);
    if (line) {
      const el = $('.say', panel), run = () => Speaker.say(line, el, () => panel.classList.add('said'));
      panel.classList.remove('said');
      $('.replay', panel).onclick = run;
      setTimeout(run, 450);
    }
    if (id === 'feedback') react(S.pick === C.game.answer ? 'happy' : 'nod');
    if (id === 'outro') react('happy');
  }

  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-go],[data-pick],[data-reward]');
    if (!b) return;
    Speaker.unlock();
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.reward != null) return reward();
    S.pick = +b.dataset.pick; save();
    panel.querySelectorAll('.opt').forEach(o => o.classList.toggle('sel', o === b));
    setTimeout(() => go('feedback'), 520);
  });
  panel.addEventListener('submit', e => { e.preventDefault(); submit(e.target); });
  $('.sound').onclick = e => {
    Speaker.muted = !Speaker.muted;
    e.currentTarget.setAttribute('aria-pressed', Speaker.muted);
    e.currentTarget.setAttribute('aria-label', Speaker.muted ? '소리 켜기' : '소리 끄기');
    if (Speaker.muted) Speaker.stop(), $('.say', panel) && render();
  };
  addEventListener('hashchange', render);

  /* ---------- 시작 ---------- */
  function chooser(data) {
    app.dataset.screen = 'chooser';
    panel.innerHTML = `<div class="screen chooser">
      <p class="eyebrow reveal" style="--i:0">SCAN &amp; MEET</p>
      <h1 class="display reveal" style="--i:1">캠퍼스 친구를 만나 보세요</h1>
      <p class="lead reveal" style="--i:2">친구의 이야기를 듣고, 질문을 고르고, 함께하는 방법을 찾아보는 3분 활동이에요.</p>
      <div class="pick">${Object.entries(data).map(([k, c], i) => `
        <a class="pcard reveal" style="--i:${3 + i};--p:${c.theme.primary};--s:${c.theme.soft}" href="?c=${k}#title">
          <img src="assets/${k}/full.webp" alt="${esc(c.name)}">
          <span><b>${esc(c.title)}</b><small>${esc(c.name)}${gwa(c.name)} 함께하는 질문 선택 게임</small></span></a>`).join('')}</div></div>`;
  }

  fetch('data/characters.json').then(r => r.json()).then(data => {
    if (!data[cid]) return chooser(data);
    C = data[cid];
    S = Object.assign({ visited: [], pick: null }, store.get(`s:${cid}`, {}));
    const r = document.documentElement.style;
    for (const [k, v] of Object.entries(C.theme)) r.setProperty(`--${k}`, v);
    $('meta[name=theme-color]').content = C.theme.primary;
    document.title = `${C.title} · ${C.name}`;
    stage.style.setProperty('--bg', `url(assets/${cid}/bg.webp)`);
    $('.char img').src = `assets/${cid}/char.webp`;
    $('.nametag b').textContent = C.name;
    $('.progress').innerHTML = STEPS.map(() => '<li></li>').join('');
    stage.hidden = false;
    app.classList.add('ready');
    render();
  });
})();
