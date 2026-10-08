/* ANH + AR — curated choices, local session state, camera overlay (no uploads). */
(function () {
  'use strict';
  const root = document.getElementById('anh-companion');
  if (!root) return;
  const content = root.querySelector('.anh-content');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 768px)');
  const KEY = 'memories.anh-companion:v1';
  const giftText = 'Chúc mừng sinh nhật của bé be';
  const secretText = 'Những trải nghiệm mới cũng sẽ là những kỉ niệm mới của chúng ta';
  const skyText = 'Ngẩng lên bầu trời, để thấy những điều đẹp đẽ luôn ở đấy, dành cho em.';
  const icons = {
    chat: '<path d="M20 11a8 8 0 0 1-8 8H5l-3 3v-7a8 8 0 1 1 18-4Z"/>',
    'gift-box': '<path d="M3 8h18v5H3zm2 5v9h14v-9M12 8v14M12 8C4 9 4 0 9 3l3 5Zm0 0c8 1 8-8 3-5l-3 5Z"/>',
    'star-sky': '<path d="m12 2 3 6.5 7 .9-5 5 .9 7-5.9-3.4-5.9 3.4.9-7-5-5 7-.9Z"/>',
    'hidden-message': '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="m3 6 9 7 9-7"/>'
  };
  const modes = {
    chat: {title:'Chat với Anh', short:'Một vài điều anh muốn kể.'},
    'gift-box': {title:'AR Hộp quà', short:'Một món quà nhỏ đang chờ em.'},
    'star-sky': {title:'AR Bầu trời sao', short:'Một trái tim giữa trời đêm.'},
    'hidden-message': {title:'AR Hidden message', short:'Lau lớp sương, tìm lời nhắn.'}
  };
  // Each chip is an explicit graph edge. There is no free-text or AI input.
  const nodes = {
    hello: {text:'Em muốn nghe một điều dễ thương, xem quà, hay tìm một bí mật?', choices:['comfort','giftInvite','secretInvite']},
    comfort: {label:'Kể em nghe', text:'Nếu hôm nay em mệt, anh ở đây để nghe em kể.', choices:['tired','compliment','thanks']},
    tired: {label:'Em đang mệt…', text:'Vậy thì mình ở đây một chút thôi cũng được. Không cần vội gì cả.', choices:['memory','skyInvite','giftInvite']},
    compliment: {label:'Anh dễ thương thật', text:'Anh ghi nhận lời khen này một cách rất tự hào 😌', choices:['memory','giftInvite','secretInvite']},
    thanks: {label:'Cảm ơn anh', text:'Không có gì. Anh ở đây là để em có thêm một chỗ ghé vào mà.', choices:['memory','skyInvite','secretInvite']},
    memory: {label:'Kể em nghe một kỉ niệm', text:'Anh nhớ một vài điều rất nhỏ về em. Những điều nhỏ mà em có thể quên, nhưng anh vẫn luôn nhớ.', choices:['example','tell','sweet']},
    example: {label:'Thí dụ?', text:'Ví dụ như cách em làm cho những ngày bình thường trở nên đáng nhớ hơn một chút.', choices:['tell','giftInvite','skyInvite']},
    tell: {label:'Kể đi anh', text:'Anh nghĩ em có một kiểu dịu dàng rất riêng. Không cần lúc nào cũng cố gắng nổi bật, vẫn khiến người khác muốn nhớ.', choices:['sweet','comfort','secretInvite']},
    sweet: {label:'Dễ thương quá', text:'Cái này là do em dễ thương nên mới gợi cho anh nói ra được đó.', choices:['comfort','giftInvite','skyInvite']},
    giftInvite: {label:'Có quà gì?', text:'Anh giấu một thứ ở ngoài màn hình. Muốn thử tìm không?', choices:['ar:gift-box','ar:star-sky','ar:hidden-message']},
    skyInvite: {label:'Kể em nghe về bầu trời', text:'Nếu em nhìn lên bầu trời một chút, có khi sẽ thấy anh để lại một thứ ở đó.', choices:['ar:star-sky','skyQuestion','later']},
    skyQuestion: {label:'Có gì trên đó?', text:'Một trái tim được nối từ những ngôi sao. Em ngẩng lên rồi cùng anh nhìn nhé.', choices:['ar:star-sky','giftInvite','later']},
    later: {label:'Để lát nữa nha', text:'Ừ, cứ thong thả thôi. Những điều nhỏ này vẫn ở đây chờ em.', choices:['comfort','memory','secretInvite']},
    secretInvite: {label:'Bí mật ở đâu?', text:'Có một câu anh không muốn viết thẳng ra màn hình. Nên anh giấu nó ở một chỗ khác.', choices:['ar:hidden-message','sayNow','tease']},
    sayNow: {label:'Nói luôn đi', text:'Không được, như vậy mất vui 😌', choices:['ar:hidden-message','tease','memory']},
    tease: {label:'Anh bày trò nữa rồi', text:'Một chút thôi, để em có thêm một điều dễ thương mà nhớ về hôm nay.', choices:['ar:hidden-message','ar:gift-box','skyInvite']}
  };
  const arLabels = {'gift-box':'Mở AR hộp quà','star-sky':'Bầu trời sao đi','hidden-message':'Tìm bí mật'};
  let cached = {};
  try { cached = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
  const transcript = Array.isArray(cached.messages) ? cached.messages.filter(m => m && ['anh','user'].includes(m.role) && typeof m.text==='string' && m.text.length<600).slice(-80) : [];
  const state = {
    mode:cached.entered ? 'hub' : 'opening', entered:cached.entered===true,
    sound:cached.sound===true, node:nodes[cached.node] ? cached.node : 'hello',
    messages:transcript.length ? transcript : [{role:'anh',text:nodes.hello.text}],
    visited:Array.isArray(cached.visited) ? cached.visited.filter(m=>modes[m]) : [],
    giftOpened:cached.giftOpened===true, starRevealed:cached.starRevealed===true,
    secretRevealed:cached.secretRevealed===true
  };
  let visible = false, chatTimer = 0, pendingNode = null, scene = null, activeMode = null;
  let sceneModule = null, scenePromise = null, launchToken = 0, cameraToken = 0, stream = null;
  let cameraPending = false, night = true, scenePhase = '', lastLauncher = null, previousOverflow = '';
  let previousPadding = '', orientationActive = false, orientationBase = null;
  let frostContext = null, wipePointer = null, wipeLast = null, wipeCells = new Set(), wiped = 0, revealTimer = 0;
  let soundContext = null, master = null, soundSuspendTimer = 0, ambient = null, focusReply = false;
  let audioNoise = null, previewCleanup = null;
  const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = mode => `<span class="anh-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[mode] || icons.chat}</svg></span>`;
  const button = (action,label,cls='',extra='') => `<button type="button" data-anh-action="${action}" class="${cls}" ${extra}>${label}</button>`;
  const avatar = '<span class="anh-avatar" aria-hidden="true">A</span>';
  const announce = text => { root.querySelector('.anh-announcement').textContent = text; };
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({...state,messages:state.messages.slice(-80)})); } catch (_) {}
  }
  function previewArt(mode) {
    if(mode==='gift-box') return '<span class="anh-preview-gift"><i></i></span>';
    if(mode==='star-sky') return '<svg viewBox="0 0 100 90" aria-hidden="true"><path d="M50 73 19 43 14 29 20 17 34 14 50 27 66 14 80 17 86 29 81 43Z" fill="none" stroke="#bdcffa" stroke-width=".7"/>'+[[50,73],[19,43],[14,29],[20,17],[34,14],[50,27],[66,14],[80,17],[86,29],[81,43]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.3" fill="#f5eadb"/>`).join('')+'</svg>';
    return '<span class="anh-preview-letter">Có những điều<br />chỉ dành cho em.<br />♡</span>';
  }
  function previews() {
    return '<aside class="anh-previews" aria-label="Ba trải nghiệm"><p class="anh-preview-heading">Một chút bất ngờ, dành cho em.</p>'+Object.keys(modes).filter(m=>m!=='chat').map(m=>button('open:'+m,`<span class="anh-preview-art" data-preview="${m}">${previewArt(m)}</span><span class="anh-preview-copy"><strong>${modes[m].title}</strong><small>${modes[m].short}</small></span>`,'anh-preview')).join('')+'</aside>';
  }
  function navigation() {
    return '<nav class="anh-nav" aria-label="Khám phá cùng Anh"><p class="anh-nav-heading">Một thế giới nhỏ</p>'+Object.keys(modes).map(m=>button(m==='chat'?'chat':'open:'+m,icon(m)+modes[m].title,'',`aria-current="${m==='chat'&&state.mode==='chat'}"`)).join('')+'<p class="anh-nav-foot">Em chọn điều nào trước<br />cũng được.<br /><br />Anh để mọi thứ ở đây,<br />chờ em ghé vào.</p></nav>';
  }
  function welcome() {
    return `<div class="anh-welcome">${avatar}<p class="anh-eyebrow">Dành riêng cho em</p><h3>Em muốn thử<br />điều gì trước?</h3><p>Anh để vài điều thú vị ở đây.<br />Em chọn cái nào trước cũng được.</p>${button('chat','Chat với Anh <span aria-hidden="true">↗</span>','anh-primary')}<div class="anh-mobile-choices">${Object.keys(modes).map(m=>button(m==='chat'?'chat':'open:'+m,`${icon(m)}<span><strong>${modes[m].title}</strong><small>${modes[m].short}</small></span>`)).join('')}</div></div>`;
  }
  function chatMarkup() {
    return `${button('hub','<span aria-hidden="true">←</span> Trở về thế giới nhỏ','anh-mobile-back')}<div class="anh-chat"><header class="anh-chat-head">${avatar}<div><h3>ANH</h3><p><span class="anh-online-dot"></span>Một vài lời anh để lại cho em.</p></div></header><div class="anh-chat-log" role="log" aria-label="Hội thoại với Anh" aria-live="polite" aria-relevant="additions text"></div><div class="anh-chat-choices" aria-label="Chọn lời đáp"></div></div>`;
  }
  function render() {
    previewCleanup?.(); previewCleanup = null;
    if(state.mode==='opening') {
      content.innerHTML=`<div class="anh-opening"><span class="anh-moon" aria-hidden="true"></span><div><p class="anh-eyebrow">A small universe for you</p><h2 id="anh-companion-title">ANH <span>+</span> AR</h2><p class="anh-opening-sub">Một thế giới nhỏ<br />chỉ dành cho em.</p><p class="anh-opening-note">Một vài lời muốn kể.<br />Một món quà. Một bầu trời. Một bí mật.</p>${button('enter','Bắt đầu hành trình cùng Anh nhé! <span aria-hidden="true">→</span>','anh-primary')}<p class="anh-opening-sign">TỪ ANH, VỚI MỘT CHÚT DỊU DÀNG.</p></div></div>`;
    } else {
      content.innerHTML=`<h2 id="anh-companion-title" class="anh-sr-only">ANH + AR — Một thế giới nhỏ chỉ dành cho em.</h2><div class="anh-hub">${navigation()}<div class="anh-center">${state.mode==='chat'?chatMarkup():welcome()}</div>${previews()}</div>`;
      if(state.mode==='chat') drawChat();
      if(visible) loadPreviews();
    }
    root.dataset.mode=state.mode; updateSound(); save();
  }
  function drawChat(typing=false) {
    const log=root.querySelector('.anh-chat-log'), choices=root.querySelector('.anh-chat-choices');
    if(!log || !choices) return;
    log.querySelector('.anh-typing')?.remove();
    const rendered=Number(log.dataset.rendered || 0);
    const reset=rendered>state.messages.length || (log.anhFirstMessage && log.anhFirstMessage!==state.messages[0]);
    if(reset)log.replaceChildren();
    const start=reset?0:rendered;
    log.insertAdjacentHTML('beforeend',state.messages.slice(start).map(m=>`<div class="anh-message ${m.role==='user'?'is-user':''}">${m.role==='anh'?avatar:''}<p class="anh-bubble">${escape(m.text)}</p></div>`).join(''));
    log.dataset.rendered=String(state.messages.length);
    log.anhFirstMessage=state.messages[0];
    if(typing)log.insertAdjacentHTML('beforeend','<div class="anh-message anh-typing" aria-label="Anh đang viết"><i></i><i></i><i></i></div>');
    choices.innerHTML=(nodes[state.node].choices || nodes.hello.choices).map(id=>button('reply:'+id,escape(id.startsWith('ar:')?arLabels[id.slice(3)]:nodes[id].label),'anh-chip',typing?'disabled':'')).join('')+button('hub','Về thế giới nhỏ','anh-chip anh-chip-muted');
    log.scrollTop=log.scrollHeight;
  }
  function finishReply() {
    clearTimeout(chatTimer); chatTimer=0;
    if(!pendingNode) return;
    const node=pendingNode; pendingNode=null; state.node=node;
    state.messages.push({role:'anh',text:nodes[node].text}); state.messages=state.messages.slice(-80);
    drawChat(); save(); if(state.mode==='chat') {playSound('message');if(focusReply)root.querySelector('.anh-chat-choices button')?.focus({preventScroll:true});}focusReply=false;
  }
  function reply(id) {
    if(pendingNode) return;
    if(id.startsWith('ar:')) { const mode=id.slice(3); if(!modes[mode]) return; state.messages.push({role:'user',text:arLabels[mode]}); save(); drawChat(); openExperience(mode); return; }
    if(!nodes[id]) return;
    focusReply=!!document.activeElement?.closest('.anh-chat-choices');
    state.messages.push({role:'user',text:nodes[id].label}); pendingNode=id;
    drawChat(true); playSound('tap');
    chatTimer=setTimeout(finishReply,reduced.matches?40:650);
  }
  function go(mode) {
    finishReply(); state.mode=mode; state.entered=true; render();
    announce(mode==='chat'?'Chat với Anh. Chọn một lời đáp bên dưới.':'Em có thể chọn bất kỳ trải nghiệm nào.');
    root.querySelector(mode==='chat'?'.anh-chat-head':'.anh-welcome h3')?.setAttribute('tabindex','-1');
    root.querySelector(mode==='chat'?'.anh-chat-head':'.anh-welcome h3')?.focus({preventScroll:true});
    if(mobile.matches) root.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  }
  const dialog=document.createElement('dialog'); dialog.className='anh-dialog'; dialog.setAttribute('aria-label','Trải nghiệm cùng Anh'); document.body.appendChild(dialog);
  function updateSound() {
    [root,dialog].forEach(el=>el.querySelectorAll('[data-anh-action="sound"]').forEach(b=>{b.textContent='Âm thanh: '+(state.sound?'Bật':'Tắt');b.setAttribute('aria-pressed',String(state.sound));}));
    refreshAudio();
  }
  function ensureAudio() {
    if(soundContext) return;
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    try {soundContext=new Audio(); master=soundContext.createGain();master.gain.value=0;master.connect(soundContext.destination);} catch(_) {}
  }
  function refreshAudio() {
    if(!soundContext) return;
    const enabled=state.sound && !document.hidden && (visible || dialog.open);
    clearTimeout(soundSuspendTimer);
    const t=soundContext.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(enabled ? .2 : 0,t,.06);
    if(enabled) soundContext.resume().catch(()=>{});
    else soundSuspendTimer=setTimeout(()=>soundContext?.suspend().catch(()=>{}),260);
    if(ambient) {ambient.gain.setTargetAtTime(enabled && dialog.open ? .12 : 0,t,.4);}
  }
  function startAmbient() {
    if(!state.sound) return; ensureAudio(); if(!soundContext || ambient) return;
    ambient=soundContext.createGain();ambient.gain.value=0;ambient.connect(master);
    [130.81,196,261.62].forEach((frequency,i)=>{const o=soundContext.createOscillator(),g=soundContext.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=[.08,.025,.018][i];o.connect(g);g.connect(ambient);o.start();});
    refreshAudio();
  }
  function playSound(kind) {
    if(!state.sound || document.hidden || (!visible && !dialog.open)) return;
    ensureAudio(); if(!soundContext) return; refreshAudio();
    const t=soundContext.currentTime;
    if(kind==='open') {
      if(!audioNoise){audioNoise=soundContext.createBuffer(1,soundContext.sampleRate*.4,soundContext.sampleRate);const d=audioNoise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.3;}
      const source=soundContext.createBufferSource(),filter=soundContext.createBiquadFilter(),gain=soundContext.createGain();source.buffer=audioNoise;filter.type='lowpass';filter.frequency.value=1400;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.15,t+.03);gain.gain.exponentialRampToValueAtTime(.001,t+.35);source.connect(filter);filter.connect(gain);gain.connect(master);source.start();
    }
    const frequencies=kind==='reveal'?[523.25,659.25,783.99]:kind==='star'?[783.99,1046.5]:kind==='place'?[196,261.63]:kind==='message'?[440,659.25]:[329.63];
    frequencies.forEach((f,i)=>{const o=soundContext.createOscillator(),g=soundContext.createGain();o.type='sine';o.frequency.value=f;const start=t+i*.1;o.connect(g);g.connect(master);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.14,start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+(kind==='reveal'?1.8:.5));o.start(start);o.stop(start+2);});
  }
  function loadSceneModule() {
    if(!scenePromise) scenePromise=import('./anh-ar-scene.js').then(m=>{sceneModule=m;return m;}).catch(()=>null);
    return scenePromise;
  }
  async function loadPreviews() {
    if(!visible || state.mode==='opening' || previewCleanup) return;
    const target=root.querySelector('[data-preview="gift-box"]'); if(!target) return;
    const module=await loadSceneModule();
    if(!module || !target.isConnected || previewCleanup) return;
    try { previewCleanup=module.drawGiftPreview(target); } catch(_) { /* CSS illustration remains. */ }
  }
  function phaseText() {
    if(activeMode==='gift-box') return scenePhase==='revealed'?['Món quà nhỏ, dành riêng cho em.','Món quà nhỏ, nhưng là cả tấm lòng lớn dành cho em.']:scenePhase==='opening'?['Một chút bất ngờ đang mở ra…','Anh để một điều nhỏ ở bên trong.']:scenePhase==='placed'?['Chạm vào hộp quà để mở.','Anh để một điều nhỏ ở bên trong.']:['Đặt món quà ở một góc em thích.','Hướng camera về phía bàn, rồi chạm để đặt hộp quà.'];
    if(activeMode==='star-sky') return scenePhase==='revealed'?['Một trái tim giữa bầu trời.',skyText]:['Hướng camera lên bầu trời.','Chờ một chút, những ngôi sao sẽ tìm thấy nhau. Em cũng có thể chạm để hé lộ.'];
    return scenePhase==='revealed'?['Một lời nhắn dành cho chúng ta.','Những điều đẹp đẽ vẫn đang chờ mình ở phía trước.']:['Lau lớp sương, tìm lời nhắn.','Tìm một góc phù hợp để mở khóa thông điệp. Vuốt ngón tay lên lớp kính để lau.'];
  }
  function updatePhase(phase) {
    if(!dialog.open) return;
    scenePhase=phase; dialog.dataset.phase=phase;
    const [title,line]=phaseText(); dialog.querySelector('.anh-foot h3').textContent=title;dialog.querySelector('.anh-foot p').textContent=line;
    const primary=dialog.querySelector('[data-anh-action="experience-primary"]');
    primary.disabled=phase==='opening';
    primary.textContent=activeMode==='gift-box'?(phase==='revealed'?'Mở lại món quà':phase==='placed'?'Mở hộp quà':'Đặt hộp quà'):activeMode==='star-sky'?(phase==='revealed'?'Ngắm lại bầu trời':'Hé lộ trái tim'):(phase==='revealed'?'Lau lại lớp kính':'Hé lộ lời nhắn');
    if(phase==='opening')primary.textContent='Đang mở món quà…';
    dialog.querySelector('.anh-placement-guide')?.toggleAttribute('hidden',phase!=='ready');
    if(activeMode==='gift-box') dialog.querySelector('.anh-gift-letter').hidden=phase!=='revealed';
    if(phase==='revealed') {
      state[activeMode==='gift-box'?'giftOpened':activeMode==='star-sky'?'starRevealed':'secretRevealed']=true;save();
      if(activeMode==='hidden-message') {dialog.querySelector('.anh-secret-pane').classList.add('is-revealed');dialog.querySelector('.anh-secret-text').removeAttribute('aria-hidden');}
      dialog.querySelector('.anh-experience-announcement').textContent=activeMode==='gift-box'?giftText:activeMode==='star-sky'?skyText:secretText;
      playSound('reveal');
    }
  }
  async function openExperience(mode) {
    if(!modes[mode] || mode==='chat') return;
    finishReply(); lastLauncher=document.activeElement;
    if(dialog.open) closeExperience(false);
    activeMode=mode; const token=++launchToken; scenePhase='ready'; night=true;
    delete dialog.dataset.renderer;
    if(!state.visited.includes(mode))state.visited.push(mode);state.entered=true;save();
    dialog.innerHTML=`<header class="anh-dialog-head"><h2 class="anh-dialog-title">${icon(mode)}${modes[mode].title}</h2><div class="anh-dialog-actions">${button('sound','Âm thanh: Tắt','anh-sound','aria-pressed="false"')}${button('close','<span aria-hidden="true">×</span>','','aria-label="Đóng trải nghiệm"')}</div></header><div class="anh-camera-tools">${button('camera','Bật camera','','aria-pressed="false"')}${mode==='star-sky'?button('night','Trời đêm ảo','','aria-pressed="true"')+button('orientation','Nhìn quanh','','aria-pressed="false"'):''}<p class="anh-camera-note">Camera chỉ hiển thị trên máy của em.</p></div><div class="anh-stage ${mode==='star-sky'?'is-night':''}" data-mode="${mode}" tabindex="0" aria-label="${mode==='hidden-message'?'Vuốt để lau lớp kính. Hoặc dùng nút Hé lộ lời nhắn.':mode==='gift-box'?'Chạm để đặt và mở hộp quà. Hoặc dùng nút bên dưới.':'Bầu trời sao. Kéo để nhìn quanh, hoặc dùng phím mũi tên.'}"><video autoplay muted playsinline aria-hidden="true"></video><canvas class="anh-render-canvas" aria-hidden="true"></canvas><div class="anh-stage-status"><span>Đang mở camera…</span></div>${mode==='gift-box'?`<span class="anh-placement-guide" aria-hidden="true"></span><div class="anh-gift-letter" hidden>${giftText}</div>`:''}${mode==='hidden-message'?`<div class="anh-secret-pane"><div class="anh-secret-text" aria-hidden="true">${secretText}</div><canvas class="anh-frost" aria-label="Lớp sương trên kính"></canvas><span class="anh-secret-glass" aria-hidden="true"></span></div>`:''}</div><footer class="anh-foot"><div><h3></h3><p></p></div><div class="anh-foot-actions">${button('experience-primary','','anh-primary')}${button('return-hub','Về thế giới nhỏ','anh-quiet')}</div></footer><p class="anh-experience-announcement anh-sr-only" role="status" aria-live="polite"></p>`;
    previousOverflow=document.body.style.overflow;previousPadding=document.body.style.paddingRight;
    const scrollbar=innerWidth-document.documentElement.clientWidth;document.body.style.overflow='hidden';if(scrollbar>0)document.body.style.paddingRight=scrollbar+'px';
    dialog.showModal();updateSound();startAmbient();updatePhase('ready');
    startCamera();
    if(mode==='hidden-message') {initFrost();if(state.secretRevealed)updatePhase('revealed');}
    const module=await loadSceneModule(); if(token!==launchToken || !dialog.open) return;
    const stage=dialog.querySelector('.anh-stage');
    if(module && mode!=='hidden-message') {
      try {
        scene=module.createScene({canvas:stage.querySelector('.anh-render-canvas'),mode,reduced:reduced.matches,onReveal:()=>updatePhase('revealed')});
        dialog.dataset.renderer='webgl';scene.setActive(!document.hidden);scene.setNight(night);
        if(mode==='gift-box' && state.giftOpened){scene.place();scene.open(true);updatePhase('revealed');}
        if(mode==='star-sky' && state.starRevealed){scene.reveal(true);updatePhase('revealed');}
      } catch(_) {startFallback(mode);}
    } else if(mode==='hidden-message') {
      stage.querySelector('.anh-render-canvas').hidden=true;dialog.dataset.renderer='glass';
    } else startFallback(mode);
    stage.addEventListener('anh-context-lost',()=>{
      scene?.dispose();scene=null;startFallback(mode);
      if(mode==='gift-box' && (scenePhase==='placed' || scenePhase==='opening'))updatePhase('placed');
    },{once:true});
    stage.addEventListener('pointerdown',stagePointerDown);
    stage.addEventListener('keydown',stageKeyDown);
  }
  function status(text) {const el=dialog.querySelector('.anh-stage-status span');if(el)el.textContent=text;}
  async function startCamera() {
    if(!dialog.open || cameraPending || stream) return;
    const token=++cameraToken;cameraPending=true;
    const cameraButton=dialog.querySelector('[data-anh-action="camera"]');cameraButton.disabled=true;cameraButton.textContent='Đang mở camera…';
    if(!navigator.mediaDevices?.getUserMedia) {cameraPending=false;cameraButton.disabled=false;status('Camera chưa khả dụng. Em vẫn có thể khám phá trên bối cảnh này.');cameraButton.textContent='Thử mở camera';return;}
    try {
      const result=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}});
      if(token!==cameraToken || !dialog.open || document.hidden){result.getTracks().forEach(t=>t.stop());return;}
      stream=result; const video=dialog.querySelector('video');video.srcObject=result;
      await video.play(); if(token!==cameraToken || !dialog.open)return;
      dialog.querySelector('.anh-stage').classList.add('has-camera');status(activeMode==='star-sky' && night?'Trời đêm ảo đang bật · Chạm nút phía trên để xem camera.':'Một góc nhỏ của thế giới, qua camera của em.');
      result.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(stream===result){stopCamera();status('Camera đã dừng. Em vẫn có thể tiếp tục.');}}));
    } catch(error) {
      if(token!==cameraToken || !dialog.open) return;
      stopCamera();status(error.name==='NotAllowedError'?'Em chưa cấp quyền camera. Mình vẫn có thể khám phá trên bối cảnh này.':'Không mở được camera. Mình vẫn có thể tiếp tục trên bối cảnh này.');
    } finally {
      if(token===cameraToken){cameraPending=false;updateCameraButton();}
    }
  }
  function updateCameraButton() {
    const b=dialog.querySelector('[data-anh-action="camera"]');if(!b)return;b.disabled=false;b.textContent=stream?'Tắt camera':'Bật camera';b.setAttribute('aria-pressed',String(!!stream));
  }
  function stopCamera() {
    cameraToken++;cameraPending=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
    const video=dialog.querySelector('video');if(video){video.pause();video.srcObject=null;}
    dialog.querySelector('.anh-stage')?.classList.remove('has-camera');updateCameraButton();
  }
  function stopOrientation() {
    window.removeEventListener('deviceorientation',handleOrientation);orientationActive=false;orientationBase=null;
    const b=dialog.querySelector('[data-anh-action="orientation"]');if(b){b.setAttribute('aria-pressed','false');b.textContent='Nhìn quanh';}
    scene?.setOrientation(0,0);
  }
  async function toggleOrientation() {
    if(orientationActive){stopOrientation();return;}
    const token=launchToken;
    if(typeof DeviceOrientationEvent==='undefined'){status('Em có thể kéo màn hình để nhìn quanh bầu trời.');return;}
    try {
      if(typeof DeviceOrientationEvent.requestPermission==='function' && await DeviceOrientationEvent.requestPermission()!=='granted'){status('Em có thể kéo màn hình để nhìn quanh bầu trời.');return;}
      if(token!==launchToken || !dialog.open)return;
      orientationActive=true;window.addEventListener('deviceorientation',handleOrientation);const b=dialog.querySelector('[data-anh-action="orientation"]');b.setAttribute('aria-pressed','true');b.textContent='Đang nhìn quanh';status('Xoay điện thoại nhẹ để nhìn quanh. Em vẫn có thể kéo màn hình.');
    } catch(_) {status('Em có thể kéo màn hình để nhìn quanh bầu trời.');}
  }
  function handleOrientation(event) {
    if(!orientationActive || document.hidden || event.alpha==null || event.beta==null)return;
    if(!orientationBase)orientationBase={a:event.alpha,b:event.beta};
    const delta=((event.alpha-orientationBase.a+540)%360)-180;
    scene?.setOrientation(delta*Math.PI/180,(event.beta-orientationBase.b)*Math.PI/180);
  }
  const frostResize=new ResizeObserver(()=>{if(activeMode==='hidden-message' && dialog.open)initFrost(true);});
  function initFrost(preserve=false) {
    const canvas=dialog.querySelector('.anh-frost');if(!canvas)return;
    const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
    frostContext=canvas.getContext('2d');frostContext.setTransform(dpr,0,0,dpr,0,0);
    const gradient=frostContext.createLinearGradient(0,0,r.width,r.height);gradient.addColorStop(0,'#d5dce9');gradient.addColorStop(.45,'#b5c0d3');gradient.addColorStop(1,'#8a9daf');
    frostContext.globalCompositeOperation='source-over';frostContext.fillStyle=gradient;frostContext.fillRect(0,0,r.width,r.height);
    for(let i=0;i<2200;i++){frostContext.fillStyle=i%3?'#f8f0df16':'#3e577516';frostContext.fillRect(Math.random()*r.width,Math.random()*r.height,1+Math.random()*2,1+Math.random()*2);}
    for(let i=0;i<35;i++){const x=Math.random()*r.width,y=Math.random()*r.height;frostContext.beginPath();frostContext.ellipse(x,y,1+Math.random()*2,3+Math.random()*4,0,0,Math.PI*2);frostContext.fillStyle='#f8f6ec44';frostContext.fill();}
    frostContext.fillStyle='#34455d';frostContext.textAlign='center';frostContext.font='13px "Be Vietnam Pro", sans-serif';frostContext.fillText('Vuốt nhẹ để lau lớp sương',r.width/2,r.height/2);frostContext.font='22px Georgia';frostContext.fillText('✧',r.width/2,r.height/2-28);
    if(!preserve){wipeCells.clear();wiped=0;root.dataset.wipeProgress='0';} else {
      frostContext.globalCompositeOperation='destination-out';wipeCells.forEach(cell=>{const [x,y]=cell.split(',').map(Number);frostContext.fillRect(x*r.width/24,y*r.height/16,r.width/24+1,r.height/16+1);});frostContext.globalCompositeOperation='source-over';
    }
    if(!preserve) {
      canvas.addEventListener('pointerdown',event=>{if(scenePhase==='revealed' || event.button>0)return;wipePointer=event.pointerId;wipeLast=null;canvas.setPointerCapture(event.pointerId);wipe(event);});
      canvas.addEventListener('pointermove',event=>{if(event.pointerId===wipePointer)wipe(event);});
      const release=()=>{wipePointer=null;wipeLast=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
      frostResize.observe(canvas);
    }
  }
  function wipe(event) {
    if(!frostContext || scenePhase==='revealed')return;
    const canvas=event.currentTarget,r=canvas.getBoundingClientRect();const x=event.clientX-r.left,y=event.clientY-r.top;
    const radius=Math.max(24,Math.min(r.width,r.height)*.16),last=wipeLast||{x,y};
    // A soft brush removes the fog; normalized coverage avoids expensive per-frame pixel reads.
    const distance=Math.hypot(x-last.x,y-last.y),steps=Math.max(1,Math.ceil(distance/(radius*.4)));
    frostContext.globalCompositeOperation='destination-out';
    for(let i=0;i<=steps;i++){const px=last.x+(x-last.x)*i/steps,py=last.y+(y-last.y)*i/steps;const brush=frostContext.createRadialGradient(px,py,0,px,py,radius);brush.addColorStop(0,'#000');brush.addColorStop(.75,'#000');brush.addColorStop(1,'#0000');frostContext.fillStyle=brush;frostContext.fillRect(px-radius,py-radius,radius*2,radius*2);
      for(let cy=0;cy<16;cy++)for(let cx=0;cx<24;cx++){if(Math.hypot((cx+.5)*r.width/24-px,(cy+.5)*r.height/16-py)<radius*.8)wipeCells.add(cx+','+cy);}}
    frostContext.globalCompositeOperation='source-over';wipeLast={x,y};wiped=wipeCells.size/(24*16);root.dataset.wipeProgress=String(Math.round(wiped*100));
    if(wiped>.48)updatePhase('revealed');
  }
  function resetExperience() {
    clearTimeout(revealTimer);scene?.reset();
    updatePhase('ready');dialog.querySelector('.anh-experience-announcement').textContent='';
    if(activeMode==='hidden-message'){dialog.querySelector('.anh-secret-pane').classList.remove('is-revealed');dialog.querySelector('.anh-secret-text').setAttribute('aria-hidden','true');frostResize.disconnect();const old=dialog.querySelector('.anh-frost');old.replaceWith(old.cloneNode(false));initFrost();}
    if(!scene && activeMode==='star-sky')revealTimer=setTimeout(()=>updatePhase('revealed'),reduced.matches?100:8500);
  }
  function primaryAction(point) {
    if(activeMode==='gift-box') {
      if(scenePhase==='revealed'){resetExperience();return;}
      if(scenePhase==='ready'){scene?.place(point);updatePhase('placed');playSound('place');}
      else if(scenePhase==='placed'){updatePhase('opening');playSound('open');if(scene)scene.open();else revealTimer=setTimeout(()=>updatePhase('revealed'),reduced.matches?50:1000);}
    } else if(activeMode==='star-sky') {
      if(scenePhase==='revealed'){resetExperience();return;}
      if(scene)scene.reveal();else updatePhase('revealed');playSound('star');
    } else {if(scenePhase==='revealed')resetExperience();else updatePhase('revealed');}
  }
  let skyDrag=null;
  function stagePointerDown(event) {
    if(event.button>0 || event.target.closest('.anh-secret-pane'))return;
    if(activeMode==='gift-box') {
      if(scenePhase==='ready')primaryAction({x:event.offsetX/event.currentTarget.clientWidth,y:event.offsetY/event.currentTarget.clientHeight});
      else if(scenePhase==='placed' && (!scene || scene.hitGift(event.clientX,event.clientY)))primaryAction();
    } else if(activeMode==='star-sky') {
      skyDrag={id:event.pointerId,x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);
      const stage=event.currentTarget;
      const move=e=>{if(!skyDrag || skyDrag.id!==e.pointerId)return;scene?.pan((e.clientX-skyDrag.x)/stage.clientWidth,(e.clientY-skyDrag.y)/stage.clientHeight);skyDrag.x=e.clientX;skyDrag.y=e.clientY;};
      const up=()=>{skyDrag=null;stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',up);stage.removeEventListener('lostpointercapture',up);};
      stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);stage.addEventListener('lostpointercapture',up);
    }
  }
  function stageKeyDown(event) {
    if(activeMode==='star-sky' && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();scene?.pan(event.key==='ArrowLeft'?-.04:event.key==='ArrowRight'?.04:0,event.key==='ArrowUp'?-.04:event.key==='ArrowDown'?.04:0);}
    else if(event.key==='Enter' || event.key===' '){event.preventDefault();primaryAction();}
  }
  function startFallback(mode) {
    dialog.dataset.renderer='fallback';
    const stage=dialog.querySelector('.anh-stage');stage.querySelector('.anh-render-canvas').hidden=true;
    if(mode==='gift-box') {
      const art=document.createElement('div');art.className='anh-webgl-fallback';art.setAttribute('aria-hidden','true');
      // Preserve a real volume on devices which cannot initialize the WebGL renderer.
      art.innerHTML='<div class="anh-fallback-cube"><div class="anh-fallback-body"><i class="gift-front"></i><i class="gift-back"></i><i class="gift-left"></i><i class="gift-right"></i><i class="gift-base"></i></div><div class="anh-fallback-lid"><i class="gift-front"></i><i class="gift-back"></i><i class="gift-left"></i><i class="gift-right"></i><i class="gift-top"><span class="gift-bow"></span></i></div></div>';
      stage.appendChild(art);if(state.giftOpened)updatePhase('revealed');
    }
    if(mode==='star-sky') {
      const canvas=document.createElement('canvas');canvas.className='anh-fallback-canvas';stage.appendChild(canvas);
      scene=createSkyFallback(canvas);
      if(state.starRevealed){scene.reveal(true);updatePhase('revealed');}
    }
  }
  function createSkyFallback(canvas) {
    const ctx=canvas.getContext('2d');let frame=0,elapsed=reduced.matches?10:0,active=true,last=0,done=false;
    const points=Array.from({length:800},()=>({x:Math.random(),y:Math.random(),s:.3+Math.random()**4*1.6,p:Math.random()*6}));
    const heart=Array.from({length:32},(_,i)=>{const t=i/32*Math.PI*2;return [16*Math.sin(t)**3,-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))];});
    function tick(now){if(!active)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=w*dpr;canvas.height=h*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);points.forEach(p=>{ctx.globalAlpha=(.25+.35*(.5+.5*Math.sin(elapsed*.7+p.p)))*Math.min(1,elapsed/2);ctx.fillStyle='#e2e9ff';ctx.beginPath();ctx.arc(p.x*w,p.y*h,p.s,0,Math.PI*2);ctx.fill();});const scale=Math.min(w*.026,h*.026);const count=Math.min(32,Math.floor(Math.max(0,elapsed-2)*6));ctx.globalAlpha=.7;ctx.strokeStyle='#b7cafa';ctx.lineWidth=.7;ctx.beginPath();heart.slice(0,count).forEach(([x,y],i)=>{const px=w/2+x*scale,py=h*.47+y*scale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);ctx.fillStyle='#fff4dc';ctx.fillRect(px-1,py-1,2,2);});if(count===32)ctx.closePath();ctx.stroke();ctx.globalAlpha=1;if(elapsed>8.5&&!done){done=true;updatePhase('revealed');}frame=requestAnimationFrame(tick);}
    frame=requestAnimationFrame(tick);
    return {setActive(value){active=value;cancelAnimationFrame(frame);last=0;if(value)frame=requestAnimationFrame(tick);},setOrientation(){},pan(){},setNight(){},reveal(){elapsed=8.6;},reset(){elapsed=0;done=false;},dispose(){active=false;cancelAnimationFrame(frame);canvas.remove();}};
  }
  function closeExperience(restoreFocus=true,toHub=false) {
    launchToken++;clearTimeout(revealTimer);revealTimer=0;stopCamera();stopOrientation();frostResize.disconnect();wipePointer=null;frostContext=null;skyDrag=null;
    scene?.dispose();scene=null;activeMode=null;scenePhase='';
    if(dialog.open)dialog.close();dialog.innerHTML='';
    document.body.style.overflow=previousOverflow;document.body.style.paddingRight=previousPadding;refreshAudio();
    if(toHub)go('hub');else if(restoreFocus){if(lastLauncher?.isConnected)lastLauncher.focus({preventScroll:true});else root.querySelector('[data-anh-action="chat"]')?.focus({preventScroll:true});}
  }
  function action(event) {
    const b=event.target.closest('[data-anh-action]');if(!b || b.disabled)return;
    const name=b.dataset.anhAction;
    if(name==='sound'){state.sound=!state.sound;if(state.sound){ensureAudio();startAmbient();}save();updateSound();if(state.sound)playSound('tap');}
    else if(name==='enter'){go('hub');playSound('tap');}
    else if(name==='hub')go('hub');else if(name==='chat')go('chat');
    else if(name.startsWith('reply:'))reply(name.slice(6));else if(name.startsWith('open:'))openExperience(name.slice(5));
    else if(name==='close')closeExperience();else if(name==='return-hub')closeExperience(true,true);
    else if(name==='camera'){if(stream || cameraPending){stopCamera();status('Em đang khám phá trên bối cảnh dịu nhẹ.');}else startCamera();}
    else if(name==='night'){night=!night;dialog.querySelector('.anh-stage').classList.toggle('is-night',night);b.setAttribute('aria-pressed',String(night));scene?.setNight(night);status(night?'Một bầu trời đêm nhỏ, dành riêng cho em.':stream?'Những ngôi sao, qua góc nhìn camera của em.':'Bật camera để ngắm sao trên khung cảnh của em.');}
    else if(name==='orientation')toggleOrientation();else if(name==='experience-primary')primaryAction();
  }
  root.addEventListener('click',action);dialog.addEventListener('click',action);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeExperience();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;root.classList.toggle('is-visible',visible);if(visible)loadPreviews();refreshAudio();},{threshold:.05});observer.observe(root);
  document.addEventListener('visibilitychange',()=>{scene?.setActive(!document.hidden);refreshAudio();if(document.hidden){stopCamera();stopOrientation();if(dialog.open)status('Camera đã tạm dừng. Chạm Bật camera khi em muốn tiếp tục.');}});
  window.addEventListener('pagehide',()=>{if(dialog.open)closeExperience(false);previewCleanup?.();soundContext?.suspend();});
  reduced.addEventListener('change',()=>scene?.setReduced?.(reduced.matches));
  render();
})();
