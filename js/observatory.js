/* A self-contained point-and-click adventure; native SVG, Pointer Events and Web Audio.
   Dependency chain: desk clues → marked star → symbols → drawer → lens/film → focus. */
(function () {
  'use strict';
  const root = document.getElementById('observatory-game');
  if (!root || !window.ObservatoryArt) return;
  const scene = root.querySelector('.obs-scene');
  const feedback = root.querySelector('.obs-feedback');
  const inventory = root.querySelector('.obs-inventory');
  const footer = root.querySelector('.obs-footer');
  const cue = root.querySelector('.obs-audio-cue');
  const art = window.ObservatoryArt;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'observatory-memory-game:v1';
  const symbols = ['✦', '☾', '✿', '☉', '◇'];
  const symbolNames = ['Ngôi sao', 'Mặt trăng', 'Hoa', 'Mặt trời', 'Hình thoi'];
  const fresh = () => ({ phase: 'intro', clues: { notebook: false, clock: false, photo: false, map: false }, telescope: false, drawer: false, lens: false, film: false, powered: false, focused: false, dials: [3, 3, 3], focus: .12, sound: false, captions: true, musicVolume:.4 });
  let state = fresh(), selected = '', object = 0, photoBack = false, journal = false;
  let pan = 0, drag = null, suppressClick = false, raf = 0, hintLevel = 0, hintTimer = 0, revealTimer = 0;
  let inView = false, audioReady = false;
  let panFrame=0;
  const phases = ['intro','observatory','desk','telescope','drawer','projector','final'];
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && phases.includes(saved.phase)) {
      for (const field of ['telescope','drawer','lens','film','powered','focused','sound','captions']) if (typeof saved[field] === 'boolean') state[field] = saved[field];
      for (const field of Object.keys(state.clues)) state.clues[field] = saved.clues?.[field] === true;
      if (Array.isArray(saved.dials) && saved.dials.length === 3 && saved.dials.every(n => Number.isInteger(n) && n >= 0 && n < 5)) state.dials = saved.dials;
      state.focus = Number.isFinite(saved.focus) ? Math.max(0, Math.min(1, saved.focus)) : .12;
      state.musicVolume = Number.isFinite(saved.musicVolume) ? Math.max(0,Math.min(1,saved.musicVolume)) : .4;
      state.phase = saved.phase;
      // Repair incomplete saves without skipping the dependency chain.
      if (!state.telescope) state.drawer = false;
      if (!state.drawer) state.lens = state.film = state.powered = state.focused = false;
      if (!state.lens || !state.film) state.powered = state.focused = false;
      if (!state.powered) state.focused = false;
      if (state.phase === 'final' && !state.focused) state.phase = 'projector';
      if (state.phase === 'projector' && state.focused) state.phase = 'final';
    }
  } catch (_) { /* Storage may be unavailable; keep the game playable. */ }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} };
  const button = (action, label, cls = '', extra = '') => `<button type="button" class="${cls}" data-obs-action="${action}" ${extra}>${label}</button>`;
  const head = (number, title, copy) => `<div class="obs-scene-head"><span class="obs-kicker">${number} / NHỮNG MẢNH KÝ ỨC</span><h3>${title}</h3><p>${copy}</p></div>`;
  const itemNames = { lens: 'Thấu kính', film: 'Cuộn phim', map: 'Bản đồ sao' };
  const itemIcons = { lens: '◉', film: '▥', map: '✧' };
  function message(text) { feedback.textContent = text; }

  const audio = window.createObservatoryAudio({
    allowed: () => audioReady && state.sound,
    visible: () => inView,
    captions: () => state.captions,
    projectorPowered: () => state.powered && state.phase === 'projector',
    volume: () => state.musicVolume,
    onCue: text => { cue.textContent = text; },
    onMusicReady: duration => { root.dataset.musicReady = duration.toFixed(2); },
  });

  function updateControls() {
    root.querySelector('.obs-music-volume input').value = Math.round(state.musicVolume*100);
    const sound = root.querySelector('[data-obs-action="sound"]');
    sound.textContent = 'Âm thanh: ' + (state.sound ? 'Bật' : 'Tắt'); sound.setAttribute('aria-pressed', state.sound);
    const captions = root.querySelector('[data-obs-action="captions"]');
    captions.textContent = 'Chú thích: ' + (state.captions ? 'Bật' : 'Tắt'); captions.setAttribute('aria-pressed', state.captions);
  }
  function updateInventory() {
    inventory.hidden = !['drawer','projector'].includes(state.phase) || journal;
    inventory.innerHTML = `<span class="obs-inventory-label">TÚI ĐỒ</span>` + ['film','lens','map'].map(item => {
      const exists = state.drawer, used = (item === 'lens' && state.lens) || (item === 'film' && state.film);
      return button('item-' + item, `<span aria-hidden="true">${itemIcons[item]}</span><small>${itemNames[item]}${used ? ' · Đã lắp' : ''}</small>`, 'obs-item' + (selected === item ? ' is-selected' : ''), `aria-pressed="${selected === item}" ${!exists || used ? 'disabled' : ''}`);
    }).join('') + '<span class="obs-empty-slot" aria-hidden="true"></span>';
  }
  function journalMarkup() {
    const entries = [[state.clues.clock,'Đồng hồ dừng ở 21:17.'],[state.clues.notebook,'Có một ngôi sao đã được đánh dấu: ✦ trong một vòng tròn.'],[state.clues.photo,'Lời nhắn sau ảnh: “Đừng nhìn vào thứ sáng nhất.”'],[state.clues.map,'Bản đồ nối bốn sao; ngôi sao thứ ba có dấu khoanh tròn.'],[state.telescope,'Mật mã: ✦ Ngôi sao — ☾ Mặt trăng — ✿ Hoa.'],[state.drawer,'Đã tìm thấy thấu kính, cuộn phim và mảnh bản đồ.'],[state.lens,'Thấu kính đã được lắp vào máy chiếu.'],[state.film,'Cuộn phim đã vào đúng rãnh.']];
    return head('SỔ TAY','Những điều đã tìm thấy','Một ký ức đang được ghép lại, từng chút một.') + `<div class="obs-journal-paper"><ul>${entries.map(([found,text])=>`<li class="${found?'is-found':''}"><span aria-hidden="true">${found?'✓':'○'}</span>${found?text:'Một manh mối còn chờ được tìm thấy.'}</li>`).join('')}</ul></div>` + button('close-journal','Đóng sổ', 'obs-primary');
  }
  function roomMarkup() {
    const locations = [['telescope','Kính thiên văn','✦',30,30],['desk','Bàn làm việc','▱',31,76],['journal','Sổ manh mối','▤',19,67],['drawer','Ngăn kéo','▣',59,65],['projector','Máy chiếu','◉',85,48]];
    return head('01','Căn phòng dưới những vì sao','Chạm vào một đồ vật. Ở đâu đó trong căn phòng này, một ký ức vẫn còn ở lại.') + `<div class="obs-room-art">${art('room')}<div class="obs-room-hotspots">${locations.map(([a,label,icon,x,y])=>button(a,`<span aria-hidden="true">${icon}</span><span class="obs-hotspot-label">${label}</span>`,'obs-hotspot',`style="left:${x}%;top:${y}%" aria-label="${label}"`)).join('')}</div></div><div class="obs-room-cards">${locations.map(([a,label,icon])=>button(a,`<span aria-hidden="true">${icon}</span>${label}`,'obs-location')).join('')}</div><p class="obs-room-note">${state.drawer ? 'Ngăn kéo đã mở. Chiếc máy chiếu đang chờ những phần còn thiếu.' : state.telescope ? 'Ba ký hiệu trong kính thiên văn có lẽ thuộc về khóa ngăn kéo.' : 'Bàn làm việc còn giữ những dấu vết đầu tiên.'}</p>`;
  }
  const objects = [
    { id:'notebook', title:'Cuốn sổ cũ', text:'“Có một ngôi sao anh đã đánh dấu…”', extra:'“Nhưng anh không còn nhớ vì sao mình chọn nó.”', action:'Đọc trang sổ' },
    { id:'clock', title:'Chiếc đồng hồ đã dừng', text:'“Kim đồng hồ đã dừng lại.”', extra:'“Có lẽ thời gian ở đây từng có ý nghĩa.”', action:'Xem đồng hồ' },
    { id:'photo', title:'Tấm ảnh sém cạnh', text:'Một tấm ảnh đã cũ. Có nét chữ ở mặt sau.', extra:'', action:'Lật tấm ảnh' },
    { id:'map', title:'Bản đồ bầu trời', text:'Bốn ngôi sao nối thành một đường gấp khúc.', extra:'Ngôi sao thứ ba được khoanh tròn, cùng ký hiệu trong cuốn sổ.', action:'Đọc bản đồ sao' },
  ];
  function deskMarkup() {
    const obj = objects[object], inspected = state.clues[obj.id];
    return head('02','Bàn làm việc','Những đồ vật nhỏ đôi khi giữ được những điều rất lâu.') + `<div class="obs-desk-layout"><div class="obs-desk-overview">${art('desk')}</div><div class="obs-object-tabs" aria-label="Đồ vật trên bàn">${objects.map((o,i)=>button('object-'+i,o.title,'',`aria-pressed="${object===i}"`)).join('')}</div><div class="obs-object-closeup ${obj.id==='photo' && photoBack?'is-flipped':''}">${obj.id==='photo' && photoBack ? '<div class="obs-photo-back"><p>Đừng nhìn vào thứ sáng nhất.</p><small>Một lời nhắn ở mặt sau.</small></div>' : art(obj.id)}</div><div class="obs-inspect-copy"><h4>${obj.title}</h4>${inspected ? `<p>${obj.id==='photo' && photoBack ? '“Đừng nhìn vào thứ sáng nhất.”' : obj.text}</p><p>${obj.id==='clock' ? '<strong>21:17</strong><br />' : ''}${obj.extra}</p>`:'<p>Chạm để xem kỹ hơn.</p>'}${button('inspect',obj.id==='photo' && photoBack ? 'Xem mặt trước' : obj.action,'obs-primary')}${button('telescope','Đến kính thiên văn →','obs-text-button')}</div></div>`;
  }
  function telescopeMarkup() {
    const targets = [[17,44,false],[37,22,false],[55,47,true],[77,26,false],[29,73,false],[79,73,false]];
    return head('03','Nhìn qua kính thiên văn','Kéo ngang để quan sát bầu trời. Chạm vào một ngôi sao để xem kỹ.') + `<div class="obs-telescope-layout"><div class="obs-viewfinder" tabindex="0" aria-label="Bầu trời. Dùng phím trái, phải để dịch chuyển; Tab để chọn sao."><div class="obs-star-field">${art('sky')}<svg class="obs-constellation-guide" viewBox="0 0 100 100" aria-hidden="true"><path d="M17 44L37 22L55 47L77 26"/></svg>${targets.map(([x,y,correct],i)=>button('star-'+i,`<span aria-hidden="true">${correct?'✦':i===3?'✶':'✧'}</span>`,'obs-star '+(correct?'obs-marked-star':'')+(i===3?' obs-decoy':''),`style="left:${x}%;top:${y}%" aria-label="${i===3?'Ngôi sao sáng nhất':correct?'Ngôi sao thứ ba trên đường gấp khúc, có vòng đánh dấu':'Ngôi sao '+(i+1)}"`)).join('')}</div></div><aside class="obs-clue-aside"><span class="obs-kicker">TRANG SỔ BÊN CẠNH</span><p>${state.clues.photo?'“Đừng nhìn vào thứ sáng nhất.”':'Một lời nhắn phía sau tấm ảnh có thể giúp mình chọn đúng.'}</p><p>${state.clues.map?'Ngôi sao thứ ba trên đường gấp khúc, mang dấu ✦ trong vòng tròn.':'Bản đồ trên bàn có một dấu hiệu quen thuộc.'}</p>${state.telescope?'<div class="obs-code"><span>✦</span><span>☾</span><span>✿</span></div><p>Ngôi sao — Mặt trăng — Hoa.<br />Ba ký hiệu dành cho một ổ khóa.</p>'+button('drawer','Đến ngăn kéo →','obs-primary'):button('desk','Quay lại bàn làm việc','obs-text-button')}</aside></div>`;
  }
  function drawerMarkup() {
    return head('04','Ngăn kéo bị khóa',state.drawer?'Chốt khóa đã bật. Những phần còn thiếu nằm ở đây.':'Ba bánh khóa. Ba ký hiệu. Một điều đang được cất giữ.') + `<div class="obs-drawer ${state.drawer?'is-open':''}"><div class="obs-lock-plate"><div class="obs-dials">${state.dials.map((value,i)=>`<div class="obs-dial">${button('dial-up-'+i,'⌃','',`aria-label="Bánh khóa ${i+1}: ký hiệu trước" ${state.drawer?'disabled':''}`)}<output aria-label="Bánh khóa ${i+1}: ${symbolNames[value]}">${symbols[value]}</output>${button('dial-down-'+i,'⌄','',`aria-label="Bánh khóa ${i+1}: ký hiệu tiếp theo" ${state.drawer?'disabled':''}`)}</div>`).join('')}</div>${button('unlock','Mở khóa','obs-primary',state.drawer?'disabled':'')}</div><div class="obs-drawer-front"><span class="obs-drawer-handle"></span></div>${state.drawer?'<div class="obs-drawer-contents"><span>▥<small>Cuộn phim</small></span><span>◉<small>Thấu kính</small></span><span>✧<small>Mảnh bản đồ</small></span></div>':''}</div><p class="obs-lock-note">${state.telescope?'Trong sổ: ✦ — ☾ — ✿':'Có lẽ kính thiên văn giữ câu trả lời cho ổ khóa này.'}</p>${state.drawer?button('projector','Mang những mảnh này đến máy chiếu →','obs-primary'):button('telescope','Xem lại kính thiên văn','obs-text-button')}`;
  }
  function projectorMarkup() {
    return head('05','Chiếc máy chiếu cũ','Một ký ức vẫn còn ở đây. Chỉ thiếu một chút ánh sáng.') + `<div class="obs-projector-layout"><div class="obs-machine"><div class="obs-projector-art ${state.powered?'is-powered':''}">${art('projector')}</div><div class="obs-machine-targets">${button('socket-lens',`${state.lens?'✓':'◉'} Thấu kính`,'obs-socket',`aria-label="Lắp thấu kính vào hốc máy chiếu" ${state.lens?'disabled':''}`)}${button('socket-film',`${state.film?'✓':'▥'} Cuộn phim`,'obs-socket',`aria-label="Lắp cuộn phim vào rãnh" ${state.film?'disabled':''}`)}${button('power',`⏻ ${state.powered?'Đã bật':'Bật máy'}`,'obs-power',state.powered?'disabled':'')}</div><ol class="obs-repair-list">${[[state.lens,'Lắp thấu kính'],[state.film,'Lắp cuộn phim'],[state.powered,'Bật công tắc'],[state.focused,'Đưa ký ức về tiêu điểm']].map(([done,label])=>`<li class="${done?'is-done':''}">${done?'✓':'○'} ${label}</li>`).join('')}</ol></div><div class="obs-projection-area"><div class="obs-projection ${state.powered?'is-lit':''}"><div class="obs-projected-memory">${art('memory')}</div>${!state.powered?'<span class="obs-screen-off">Màn chiếu đang chờ ánh sáng.</span>':''}</div><div class="obs-focus-control"><label for="obs-focus-knob">Núm lấy nét</label><div id="obs-focus-knob" class="obs-focus-knob" role="slider" tabindex="0" aria-label="Núm lấy nét máy chiếu. Kéo ngang hoặc dùng phím mũi tên." aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(state.focus*100)}" aria-disabled="${!state.powered || state.focused}"><span class="obs-knob-disc" aria-hidden="true"></span><span class="obs-focus-track" aria-hidden="true"><i></i></span></div><div class="obs-focus-buttons">${button('focus-less','←','',`aria-label="Giảm tiêu điểm" ${!state.powered||state.focused?'disabled':''}`)}<span>Kéo ngang để lấy nét</span>${button('focus-more','→','',`aria-label="Tăng tiêu điểm" ${!state.powered||state.focused?'disabled':''}`)}</div></div></div></div>`;
  }
  function render(focusScene = false) {
    cancelAnimationFrame(panFrame);
    const oldBody = scene.querySelector('.obs-scene-body');
    const outgoing = !reduced.matches && inView && oldBody ? oldBody.cloneNode(true) : null;
    const previousAction = document.activeElement?.dataset?.obsAction;
    release(); cancelAnimationFrame(raf); raf = 0;
    root.dataset.phase = state.phase;
    footer.hidden = state.phase === 'intro' || state.phase === 'final';
    updateControls();
    if (journal) scene.innerHTML = journalMarkup();
    else if (state.phase === 'intro') scene.innerHTML = `<div class="obs-intro"><div class="obs-intro-art">${art('intro')}</div><div class="obs-intro-copy"><span class="obs-kicker">MỘT CÂU CHUYỆN DƯỚI BẦU TRỜI ĐÊM</span><h2>The Observatory<br />of Lost Memories</h2><p class="obs-subtitle">Đài quan sát những ký ức thất lạc</p><p>Một ký ức thất lạc đang chờ được tìm thấy.</p><p class="obs-secondary">Có những ký ức không cần được lưu trữ hoàn hảo.<br />Chỉ cần mình vẫn muốn tìm lại chúng.</p>${button('start','Bắt đầu &nbsp; →','obs-primary')}</div></div>`;
    else if (state.phase === 'observatory') scene.innerHTML = roomMarkup();
    else if (state.phase === 'desk') scene.innerHTML = deskMarkup();
    else if (state.phase === 'telescope') { scene.innerHTML = telescopeMarkup(); applyPan(); }
    else if (state.phase === 'drawer') scene.innerHTML = drawerMarkup();
    else if (state.phase === 'projector') { scene.innerHTML = projectorMarkup(); applyFocus(); }
    else if (state.phase === 'final') scene.innerHTML = `<div class="obs-final">${art('memory')}<div class="obs-final-copy"><span class="obs-kicker">MEMORY RECOVERED</span><h3>Ký ức đã tìm thấy.</h3><p>Nếu ký ức là những tia sáng rời rạc,<br /><em>thì em là nơi chúng hội tụ.</em></p>${button('replay','Chơi lại từ đầu ↻','obs-primary')}</div></div>`;
    const body = document.createElement('div');
    body.className = 'obs-scene-body';
    while (scene.firstChild) body.appendChild(scene.firstChild);
    scene.appendChild(body);
    if (outgoing && scene.animate) {
      outgoing.classList.add('obs-scene-ghost');
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.inert = true;
      scene.appendChild(outgoing);
      outgoing.animate([{opacity:1},{opacity:0}],{duration:320,easing:'ease-out',fill:'forwards'}).finished.then(()=>outgoing.remove()).catch(()=>outgoing.remove());
      body.animate([{opacity:.15,translate:'0 5px'},{opacity:1,translate:'0 0'}],{duration:480,easing:'cubic-bezier(.2,.7,.2,1)'});
      if (state.phase === 'desk' && objects[object].id === 'photo') {
        outgoing.querySelector('.obs-object-closeup')?.animate([{transform:'perspective(900px) rotateY(0deg)'},{transform:'perspective(900px) rotateY(85deg)'}],{duration:260,easing:'ease-in',fill:'forwards'});
        body.querySelector('.obs-object-closeup')?.animate([{transform:'perspective(900px) rotateY(-85deg)'},{transform:'perspective(900px) rotateY(0deg)'}],{duration:400,delay:140,easing:'ease-out',fill:'backwards'});
      }
    }
    updateInventory(); save(); resetHint(); audio.update();
    requestAnimationFrame(fitScene);
    if (focusScene) { scene.scrollTop = 0; scene.focus({ preventScroll: true }); }
    else if (previousAction) {
      const replacement = Array.from(body.querySelectorAll('[data-obs-action]')).find(el => el.dataset.obsAction === previousAction && !el.disabled);
      replacement?.focus({ preventScroll: true });
    }
  }
  function go(phase) {
    clearTimeout(revealTimer); journal = false; selected = ''; hintLevel = 0; state.phase = phase;
    if (phase === 'projector' && state.focused) state.phase = 'final';
    message(''); cue.textContent = ''; render(true);
    alignGame();
  }
  function resetHint() {
    clearTimeout(hintTimer);
    if (!['intro','final'].includes(state.phase)) hintTimer = setTimeout(() => {
      if (inView && !document.hidden) hint(); else resetHint();
    }, 45000);
  }
  function hint() {
    hintLevel = Math.min(3, hintLevel + 1);
    const hints = state.phase === 'projector' ? ['Túi đồ giữ những phần còn thiếu của máy chiếu.','Chọn thấu kính, rồi chạm vào hốc máy. Lắp cuộn phim sau đó.','Lắp đủ hai món, bật máy, rồi kéo núm lấy nét sang phải cho đến khi ảnh rõ.'] : state.phase === 'drawer' ? ['Ổ khóa cần ba ký hiệu. Kính thiên văn có thể giữ chúng.','Sổ manh mối lưu lại những gì đã nhìn thấy qua kính.','Sau khi tìm đúng sao, đặt ba bánh khóa theo thứ tự: Ngôi sao, Mặt trăng, Hoa.'] : ['Những đồ vật trên bàn còn giữ một lời nhắn.','Có lẽ tấm ảnh và bản đồ sao có liên quan.','Thử dùng lời nhắn phía sau bức ảnh khi nhìn qua kính thiên văn. Dấu khoanh tròn trên bản đồ chỉ ngôi sao thứ ba.'];
    message(hints[hintLevel-1]);
    root.classList.add('has-hint'); resetHint();
  }
  function inspect() {
    const obj = objects[object];
    state.clues[obj.id] = true;
    if (obj.id === 'photo') photoBack = !photoBack;
    audio.play(obj.id === 'clock' ? 'clock' : 'paper');
    render();
    message(obj.id === 'photo' && photoBack ? 'Đã ghi lời nhắn sau ảnh vào sổ manh mối.' : 'Đã ghi lại manh mối trong sổ.');
  }
  function applyPan() {
    const field = scene.querySelector('.obs-star-field'); if (field) field.style.transform = `translateX(${pan}px)`;
  }
  function alignGame() {
    if (!matchMedia('(max-width: 768px), (min-width: 769px) and (min-height: 620px)').matches) return;
    const header = document.querySelector('.site-header');
    const top = header ? Math.max(0,header.getBoundingClientRect().bottom) + 10 : 16;
    const delta = root.querySelector('.obs-shell').getBoundingClientRect().top - top;
    if (Math.abs(delta)>2) window.scrollBy({top:delta,behavior:reduced.matches?'instant':'smooth'});
  }
  function fitScene() {
    const body=scene.querySelector('.obs-scene-body'),room=body?.querySelector('.obs-room-art');
    const view=body?.querySelector('.obs-viewfinder');
    if (!matchMedia('(min-width:769px) and (min-height:620px)').matches) {
      for (const artwork of [view,room]) if (artwork) {
        artwork.style.width=''; artwork.style.height=''; artwork.style.flex='';
      }
      return;
    }
    if(view){
      const layout=view.parentElement;
      const diameter=Math.min(layout.clientHeight,parseFloat(getComputedStyle(layout).gridTemplateColumns));
      view.style.width=diameter+'px';view.style.height=diameter+'px';
    }
    if(room){
      const headHeight=body.querySelector('.obs-scene-head').getBoundingClientRect().height;
      const noteHeight=body.querySelector('.obs-room-note').getBoundingClientRect().height;
      const width=Math.min(body.clientWidth,Math.max(60,body.clientHeight-headHeight-noteHeight-24)*(1672/941));
      room.style.flex='none';room.style.width=width+'px';room.style.height=width*941/1672+'px';
    }
  }
  function applyFocus() {
    const machine = scene.querySelector('.obs-projector-art');
    if (machine) {
      const svg = machine.querySelector('svg');
      if (!svg.querySelector('.obs-film-group')) {
        const pieces = Array.from(svg.querySelectorAll('circle[cx="836"],g[transform$="836 299)"]'));
        const group = document.createElementNS('http://www.w3.org/2000/svg','g');
        group.classList.add('obs-film-group');
        pieces[0].before(group);
        pieces.forEach(piece => group.appendChild(piece));
      }
      machine.classList.toggle('has-lens', state.lens);
      machine.classList.toggle('has-film', state.film);
    }
    const screen = scene.querySelector('.obs-projected-memory');
    const error = Math.abs(state.focus - .72), blur = state.focused ? 0 : Math.min(1,error/.6)*(matchMedia('(max-width: 768px)').matches?10:16);
    if (screen) screen.style.filter = `blur(${blur.toFixed(2)}px)`;
    const knob = scene.querySelector('.obs-focus-knob');
    if (knob) {
      knob.style.setProperty('--focus-position',state.focus*100+'%');
      knob.style.setProperty('--knob-angle',state.focus*270+'deg');
      knob.setAttribute('aria-valuenow',Math.round(state.focus*100));
      knob.setAttribute('aria-valuetext',state.focused?'Đúng tiêu điểm':error<.13?'Gần tiêu điểm':'Ký ức còn mờ');
    }
  }
  let lastFocusSound = 0;
  function focusTo(value) {
    if (!state.powered || state.focused || state.phase !== 'projector') return;
    const previous = state.focus;
    state.focus = Math.max(0,Math.min(1,value));
    const error = Math.abs(state.focus-.72);
    message(error<.06?'Đúng tiêu điểm.':error<.13?'Thêm một chút nữa…':error<.27?'Gần rồi…':'Mờ quá…');
    if (performance.now()-lastFocusSound>130) { audio.play('focus'); lastFocusSound=performance.now(); }
    if (error < .055 || (previous-.72)*(state.focus-.72)<0) {
      state.focus = .72; state.focused = true; release(); save(); applyFocus();
      scene.querySelector('.obs-focus-knob')?.setAttribute('aria-disabled','true');
      message('Đúng tiêu điểm. Một ký ức đang trở lại.');
      revealTimer = setTimeout(() => { go('final'); audio.play('reveal'); }, reduced.matches ? 120 : 1600);
    } else { if (!raf) raf=requestAnimationFrame(()=>{raf=0;applyFocus();}); save(); }
  }
  root.addEventListener('click', event => {
    const control = event.target.closest('[data-obs-action]'); if (!control || control.disabled) return;
    if(control.closest('.obs-scene-ghost')) return;
    const action = control.dataset.obsAction;
    audioReady = true;
    if (action === 'sound') { state.sound=!state.sound; updateControls(); save(); audio.update(); if(state.sound) audio.play('chime'); return; }
    if (action === 'captions') { state.captions=!state.captions; cue.textContent=''; updateControls(); save(); return; }
    resetHint();
    if (action === 'start') go('observatory');
    else if (action === 'room') go('observatory');
    else if (['desk','telescope','drawer','projector'].includes(action)) go(action);
    else if (action === 'journal' || action === 'close-journal') { journal=!journal; render(true); audio.play('paper'); }
    else if (action === 'hint') hint();
    else if (action.startsWith('object-')) { object=Number(action.slice(7)); render(); }
    else if (action === 'inspect') inspect();
    else if (action.startsWith('star-')) {
      if (suppressClick) { suppressClick=false; return; }
      const star = Number(action.slice(5));
      if (star !== 2) { message('Không phải ngôi sao này.' + (star===3?' Ánh sáng này quá rõ ràng.':'')); audio.play('move'); }
      else if (!state.clues.notebook || !state.clues.photo || !state.clues.map) { message('Dấu này có vẻ quen. Hãy xem cuốn sổ, mặt sau tấm ảnh và bản đồ để hiểu vì sao.'); }
      else { state.telescope=true; render(); message('Ngôi sao này… quen thuộc. Ba ký hiệu hiện lên: Ngôi sao — Mặt trăng — Hoa.'); audio.play('chime'); }
    }
    else if (action.startsWith('dial-') && !state.drawer) {
      const i=Number(action.slice(-1)); state.dials[i]=(state.dials[i]+(action.startsWith('dial-up')?4:1))%5;
      const value=state.dials[i]; const dial=control.closest('.obs-dial');
      dial.querySelector('output').textContent=symbols[value]; dial.querySelector('output').setAttribute('aria-label',`Bánh khóa ${i+1}: ${symbolNames[value]}`);
      if (!reduced.matches) dial.querySelector('output').animate([{transform:'translateY(-3px)',opacity:.5},{transform:'translateY(0)',opacity:1}],{duration:160});
      save(); audio.play('dial');
    }
    else if (action === 'unlock') {
      if (!state.telescope) message('Mình chưa tìm thấy mật mã. Hãy nhìn qua kính thiên văn trước.');
      else if (state.dials.join(',') !== '0,1,2') { message('Chốt khóa chưa khớp. Xem lại ba ký hiệu trong sổ nhé.'); audio.play('dial'); }
      else { state.drawer=true; render(); message('Ngăn kéo đã mở. Thấu kính, cuộn phim và mảnh bản đồ đã được cất vào túi đồ.'); audio.play('drawer'); }
    }
    else if (action.startsWith('item-')) {
      selected=action.slice(5); updateInventory();
      message(selected==='map'?'Mảnh bản đồ ghi: “Ánh sáng cần một thấu kính, ký ức cần một cuộn phim.”':'Đã chọn '+itemNames[selected]+'. Chạm vào vị trí tương ứng trên máy chiếu.');
      const target=scene.querySelector(`[data-obs-action="socket-${selected}"]`) || inventory.querySelector(`[data-obs-action="item-${selected}"]`);
      target?.focus({preventScroll:true}); audio.play('paper');
    }
    else if (action.startsWith('socket-')) {
      const item=action.slice(7);
      if (!state.drawer) message('Những phần còn thiếu có lẽ nằm trong ngăn kéo bị khóa.');
      else if (selected!==item) message('Chọn '+itemNames[item]+' trong túi đồ, rồi chạm vào vị trí này.');
      else if (item==='film' && !state.lens) message('Hãy lắp thấu kính trước để dẫn ánh sáng vào đúng chỗ.');
      else { state[item]=true; selected=''; render(); message(itemNames[item]+' đã khớp vào máy.'); audio.play(item); }
    }
    else if (action === 'power') {
      if (!state.lens || !state.film) message('Máy chiếu còn thiếu '+(!state.lens?'thấu kính':'cuộn phim')+'.');
      else { state.powered=true; render(); message('Một ký ức vẫn còn ở đây. Kéo núm lấy nét để nhìn rõ hơn.'); audio.play('power'); }
    }
    else if (action === 'focus-less' || action === 'focus-more') focusTo(state.focus+(action==='focus-more'?.05:-.05));
    else if (action === 'replay') { const sound=state.sound,captions=state.captions,musicVolume=state.musicVolume; state=fresh();state.sound=sound;state.captions=captions;state.musicVolume=musicVolume;object=0;photoBack=false;pan=0;go('intro'); }
  });
  function release() {
    if (!drag) return; const { element,id }=drag; drag=null;
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    element.classList.remove('is-dragging');
  }
  function settleSky(velocity) {
    if(reduced.matches || state.phase!=='telescope' || Math.abs(velocity)<.025)return;
    const view=scene.querySelector('.obs-viewfinder'),start=pan,limit=view.clientWidth*.12;
    const target=Math.max(-limit,Math.min(limit,pan+velocity*100)),now=performance.now();
    cancelAnimationFrame(panFrame);
    function tick(time){
      const progress=Math.min(1,(time-now)/450);
      pan=start+(target-start)*(1-Math.pow(1-progress,3));applyPan();
      if(progress<1)panFrame=requestAnimationFrame(tick);
    }
    panFrame=requestAnimationFrame(tick);
  }
  root.addEventListener('pointerdown', event => {
    const element=event.target.closest('.obs-viewfinder,.obs-focus-knob');
    if (!element || !event.isPrimary || event.button!==0 || drag) return;
    const type=element.classList.contains('obs-viewfinder')?'sky':'focus';
    if (type==='focus' && (!state.powered || state.focused)) return;
    audioReady=true; suppressClick=false;
    cancelAnimationFrame(panFrame);
    drag={element,id:event.pointerId,x:event.clientX,y:event.clientY,start:type==='sky'?pan:state.focus,type,started:false,width:element.clientWidth,lastDx:0,lastTime:performance.now(),velocity:0};
    // Keep star taps on their button; only capture after a horizontal drag is recognized.
    if (type==='focus') element.focus({preventScroll:true});
  });
  root.addEventListener('pointermove',event=>{
    if (!drag || event.pointerId!==drag.id) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if (!drag.started) {
      if (Math.abs(dy)>8 && Math.abs(dy)>Math.abs(dx)) { release();return; }
      if (Math.abs(dx)<8) return;
      drag.started=true;drag.element.setPointerCapture(event.pointerId);drag.element.classList.add('is-dragging');
      if (drag.type==='sky') audio.play('move');
    }
    if(event.cancelable) event.preventDefault();
    if(drag.type==='sky') {
      const now=performance.now();drag.velocity=.45*(dx-drag.lastDx)/Math.max(8,now-drag.lastTime);drag.lastDx=dx;drag.lastTime=now;
      suppressClick=true;pan=Math.max(-drag.width*.12,Math.min(drag.width*.12,drag.start+dx*.45));if(!raf)raf=requestAnimationFrame(()=>{raf=0;applyPan();});
    }
    else focusTo(drag.start+dx/Math.max(120,drag.width*.75));
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) root.addEventListener(type,event=>{
    // Touch implicitly captures the child hit by pointerdown. Transferring that
    // capture to the drag surface emits a loss on the child, not the surface.
    if (type === 'lostpointercapture' && drag && event.target !== drag.element) return;
    if(drag && event.pointerId===drag.id) {
      const velocity=type==='pointerup' && drag.type==='sky' && drag.started?drag.velocity:0;
      release();settleSky(velocity);
    }
    // Ignore the synthetic click after panning, never the player's next deliberate tap.
    if(suppressClick) setTimeout(()=>{suppressClick=false;},0);
  });
  root.addEventListener('keydown',event=>{
    if(event.target.matches('.obs-focus-knob') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); audioReady=true;
      focusTo(event.key==='Home'?0:event.key==='End'?1:state.focus+(event.key==='ArrowRight'?.025:-.025));
    } else if(event.target.matches('.obs-viewfinder') && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();pan=Math.max(-50,Math.min(50,pan+(event.key==='ArrowRight'?-12:12)));applyPan();
    } else if(event.key==='Escape' && journal) {journal=false;render(true);}
  });
  root.querySelector('.obs-music-volume input').addEventListener('input',event=>{audioReady=true;state.musicVolume=Number(event.target.value)/100;save();audio.update();});
  window.addEventListener('resize',()=>{release();pan=0;applyPan();applyFocus();fitScene();},{passive:true});
  document.addEventListener('visibilitychange',()=>{release();root.classList.toggle('is-active',inView&&!document.hidden);audio.update();});
  window.addEventListener('pagehide',()=>{save();release();inView=false;audio.update();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;root.classList.toggle('is-active',inView&&!document.hidden);audio.update();},{threshold:.08}).observe(root);
  render();
  document.fonts?.ready.then(fitScene);
})();

