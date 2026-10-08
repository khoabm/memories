/* A future-memory exhibition, following the supplied museum wireframe. */
(function () {
  'use strict';
  const root = document.getElementById('future-museum');
  if (!root) return;
  const shell = root.querySelector('.museum-shell'), viewport = root.querySelector('.museum-viewport');
  const announcement = root.querySelector('.museum-announcement'), canvas = root.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'), mobile = matchMedia('(max-width: 768px)');
  const asset = './assets/images/museum/';
  const exhibits = [
    { id:'ticket', title:'TẤM VÉ CHỜ ĐỢI', short:'Một tấm vé chưa có điểm đến.', status:'Chờ điểm đến', alt:'Vé du lịch bằng giấy ngà, bản đồ và la bàn nhỏ bằng đồng.', lines:['Một tấm vé chưa có điểm đến.','Có lẽ vì nơi đẹp nhất của tuổi mới vẫn chưa được gọi tên.'], secondary:'Hy vọng tuổi mới sẽ có ít nhất một nơi khiến em muốn xách đồ lên và đi.' },
    { id:'photos', title:'TẤM ẢNH CHƯA CHỤP', short:'Một bộ ảnh chưa được chụp.', status:'Chờ đợi ánh sáng', alt:'Dải phim âm bản với những khung hình còn trống, chờ ánh sáng.', lines:['Một bộ ảnh chưa được chụp.','Hy vọng tuổi mới sẽ có đủ những ngày đẹp đến mức em muốn giữ lại chúng.'], secondary:'Không phải mọi khoảnh khắc đẹp đều cần máy ảnh. Nhưng mong rằng sẽ có thật nhiều khoảnh khắc đáng để nhớ.' },
    { id:'milestone', title:'CỘT MỐC QUAN TRỌNG', short:'Dành cho ngày em bảo vệ thạc sĩ.', status:'Sắp rồi nhỉ', alt:'Bìa luận văn thạc sĩ trong khung đồng, bút máy và bảng Reserved.', lines:['Một khung trưng bày được để trống cho ngày em bước lên bảo vệ.','Có những điều chưa xảy ra, nhưng chỉ cần nhìn thôi cũng biết chúng đang đến rất gần.'], secondary:'Mong rằng khi ngày ấy đến, em sẽ nhìn lại và thấy mình đã đi xa đến thế nào.' },
    { id:'card', title:'TẤM THIỆP TRỐNG', short:'Một tấm thiệp gửi cho tương lai.', status:'Chờ đượt điền', alt:'Tấm thiệp giấy cao cấp hé mở, phần bên trong còn để trống.', lines:['Một tấm thiệp gửi cho tương lai, vẫn chưa được điền.','Có những lời chúc không nên được viết hộ. Chúng nên được tuổi mới tự hoàn thành từng dòng một.'], secondary:'' },
    { id:'flower', title:'BÔNG HOA ÉP', short:'Một bông hoa từ ngày chưa đến.', status:'Từ quá khứ', alt:'Một bông hoa được ép trong khung kính lưu trữ thực vật.', lines:['Một bông hoa được ép lại từ một ngày chưa đến.','Có lẽ vì tuổi mới sẽ có ít nhất một ngày đẹp đến mức đáng được giữ lại như thế.'], secondary:'Không phải ngày nào cũng nở hoa. Nhưng mong tuổi mới sẽ có những ngày đẹp một cách dịu dàng và bền lâu.' },
    { id:'wish', title:'ĐIỀU ƯỚC CHỜ EM', short:'Một điều ước chưa được điền.', status:'Chỉ nên điền khi sẵn sàng', alt:'Lọ kính lưu trữ quý giá chứa một mảnh giấy trắng gấp lại.', lines:['Có một điều ước vẫn chưa được điền.','Không phải vì nó không tồn tại, mà vì đôi khi những điều quan trọng nhất cần thêm thời gian để được gọi tên.'], secondary:'Mong rằng tuổi mới sẽ cho em đủ thời gian để hiểu mình thực sự muốn điều gì.' },
    { id:'unknown', title:'CHƯA RÕ', short:'Những điều chưa ai đoán được.', status:'Not catalogued yet', alt:'Tủ kính và bệ trưng bày trống dưới một chùm sáng ấm.', lines:['Khoảng trống này được dành cho những điều tốt đẹp mà hiện tại chưa ai nghĩ tới.'], secondary:'Không phải điều quý nhất lúc nào cũng được chuẩn bị trước. Đôi khi nó chỉ đến rất khẽ, vào một ngày bình thường.' }
  ];
  let stored = {}; try { stored = JSON.parse(sessionStorage.getItem('future-museum:v1') || '{}'); } catch (_) {}
  const state = { scene:'opening', selected:0, visited:new Set(Array.isArray(stored.visited) ? stored.visited.filter(n=>Number.isInteger(n)&&n>=0&&n<7) : []), sound:stored.sound === true };
  const audio = window.createMuseumAudio?.({onMusicReady:duration=>{root.dataset.musicReady=duration.toFixed(1);}});
  let visible = false, changing = false, transitionTimer, dustFrame = 0, motionFrame = 0, gesture, rect, suppressClickUntil = 0;
  function save() { try { sessionStorage.setItem('future-museum:v1', JSON.stringify({sound:state.sound,visited:[...state.visited]})); } catch (_) {} }
  const number = i => String(i + 1).padStart(2, '0');
  const button = (action, text, extra='') => `<button type="button" data-museum-action="${action}" ${extra}>${text}</button>`;
  function picture(name, cls='museum-backdrop', alt='') {
    return `<img class="${cls}" src="${asset}${name}-840.webp" srcset="${asset}${name}-840.webp 840w, ${asset}${name}-1600.webp 1600w" sizes="${cls==='museum-object'?'(max-width:768px) 85vw, 520px':'(max-width:768px) 100vw, 1200px'}" alt="${alt}" loading="lazy" decoding="async" draggable="false" />`;
  }
  function artwork(i, detail=false) {
    const item=exhibits[i];
    return i===6 ? `<div class="museum-empty" role="img" aria-label="${item.alt}"><span></span></div>` : picture(item.id,'museum-object',item.alt);
  }
  function dots() {
    return `<nav class="museum-dots" aria-label="Chọn hiện vật">${exhibits.map((e,i)=>button('select-'+i,`<span aria-hidden="true"></span><span class="museum-sr-only">${number(i)} — ${e.title}</span>`,`aria-current="${state.selected===i?'true':'false'}"`)).join('')}</nav>`;
  }
  function opening() {
    return `<div class="museum-opening museum-room">${picture('opening')}<div class="museum-shade"></div><div class="museum-opening-copy"><p class="museum-kicker"></p><h2 id="museum-title">MUSEUM<br />OF THINGS<br />THAT DON’T<br />EXIST YET</h2><p class="museum-subtitle">BẢO TÀNG CỦA NHỮNG THỨ<br />CHƯA TỒN TẠI</p><div class="museum-opening-text"><p>Triển lãm này không lưu giữ quá khứ.<br />Nó trưng bày những điều có thể sẽ thuộc về tuổi mới của em.</p></div>${button('enter','BẮT ĐẦU THAM QUAN','class="museum-primary"')}<span class="museum-scroll" aria-hidden="true">SCROLL<br />↓</span></div></div>`;
  }
  function hall() {
    return `<div class="museum-hall museum-room">${picture('hall')}<div class="museum-hall-shade"></div><header class="museum-hall-heading"><p class="museum-kicker"></p><h2>MỘT SỐ ĐIỀU ĐẸP NHẤT CỦA TUỔI MỚI<br />HIỆN VẪN CHƯA TỒN TẠI.</h2></header><div class="museum-cases" role="group" aria-label="Bảy hiện vật trưng bày">${exhibits.map((e,i)=>`<button type="button" class="museum-case ${state.selected===i?'is-selected':''}" data-museum-action="case-${i}" aria-pressed="${state.selected===i}" aria-label="${number(i)} — ${e.title}. ${e.short}"><span class="museum-case-light"></span><span class="museum-case-glass"><span class="museum-case-shine"></span>${artwork(i)}</span><span class="museum-pedestal"><span class="museum-case-number">${number(i)}</span><span class="museum-case-title">${e.title}</span><span class="museum-case-short">${e.short}</span></span></button>`).join('')}</div><div class="museum-hall-caption"><span class="museum-kicker museum-current-number">OBJECT ${number(state.selected)} / 07</span><h3 class="museum-current-title">${exhibits[state.selected].title}</h3><p class="museum-current-status">${exhibits[state.selected].status}</p>${button('detail','Xem chi tiết <span aria-hidden="true">↗</span>','class="museum-detail-link"')}</div><footer class="museum-hall-nav">${button('previous','←','aria-label="Hiện vật trước"')}<p class="museum-hall-instruction">Chọn một hiện vật để xem chi tiết</p><p class="museum-mobile-instruction">Vuốt ngang để khám phá</p>${button('next','→',`aria-label="${state.selected===6?'Sang phòng In Progress':'Hiện vật tiếp theo'}"`)}</footer>${dots()}</div>`;
  }
  function detail() {
    const i=state.selected,e=exhibits[i];
    const artifactText=i===0?'<dl class="museum-artifact-text"><div><dt>PASSENGER</dt><dd>QUỲNH</dd></div><div><dt>DESTINATION</dt><dd>______</dd></div><div><dt>DATE</dt><dd>SOMEDAY</dd></div><div><dt>STATUS</dt><dd>PENDING</dd></div></dl>':i===3?'<p class="museum-card-inscription">Dear Future…<br /><span>Gửi Quỳnh của một ngày nào đó,</span></p>':'';
    return `<div class="museum-detail museum-room" data-exhibit="${e.id}">${picture('hall')}<div class="museum-detail-shade"></div><header class="museum-detail-top"><span class="museum-kicker">${number(i)} / 07 &nbsp; · &nbsp; FUTURE COLLECTION</span>${button('close','<span aria-hidden="true">×</span>','aria-label="Đóng chi tiết, về sảnh trưng bày"')}</header><div class="museum-detail-layout"><div class="museum-focus-display"><div class="museum-display-light"></div><div class="museum-focus-glass"><div class="museum-case-shine"></div>${artwork(i,true)}</div><div class="museum-focus-base"><span>OBJECT ${number(i)}</span></div></div><article class="museum-label"><p class="museum-kicker">OBJECT ${number(i)}</p><h2>${e.title}</h2><p class="museum-status">Trạng thái: ${e.status}</p><div class="museum-romantic-copy">${e.lines.map(line=>`<p>${line}</p>`).join('')}</div>${e.secondary?`<p class="museum-secondary">${e.secondary}</p>`:''}${artifactText}<nav class="museum-detail-nav" aria-label="Duyệt hiện vật">${button('previous','←','aria-label="Hiện vật trước"')}${button('next',i===6?'Phòng tiếp theo <span aria-hidden="true">→</span>':'Hiện vật tiếp theo <span aria-hidden="true">→</span>','class="museum-next"')}</nav></article></div>${dots()}</div>`;
  }
  function finalHall() {
    return `<div class="museum-final museum-room">${picture('final')}<div class="museum-shade"></div><div class="museum-final-copy"><p class="museum-kicker">COLLECTION STATUS</p><h2>ĐANG THỰC HIỆN</h2><p class="museum-final-lead">Tuổi mới hiện vẫn còn gần như trống.</p><p class="museum-lucky">May thật.</p><p class="museum-future-lines">Vẫn còn những ngày chưa tới.<br />Những nơi chưa đi.<br />Những bức ảnh chưa chụp.<br />Những điều tốt đẹp chưa kịp có tên.</p><p class="museum-final-line">Triển lãm vẫn đang được hoàn thiện.</p>${button('continue','TIẾP TỤC HÀNH TRÌNH <span aria-hidden="true">↓</span>','class="museum-primary"')}${button('hall','Trở lại sảnh trưng bày','class="museum-return"')}</div></div>`;
  }
  function soundUI() {
    const el=root.querySelector('[data-museum-action="sound"]');
    el.setAttribute('aria-pressed',String(state.sound)); el.textContent='Âm thanh: '+(state.sound?'Bật':'Tắt');
    audio?.update({enabled:state.sound,visible,scene:state.scene,selected:state.selected});
  }
  function render(focus=true) {
    cancelAnimationFrame(motionFrame); shell.style.setProperty('--mx','0'); shell.style.setProperty('--my','0');
    shell.dataset.scene=state.scene;
    viewport.innerHTML=state.scene==='opening'?opening():state.scene==='hall'?hall():state.scene==='detail'?detail():finalHall();
    soundUI(); save();
    announcement.textContent=state.scene==='detail'?`Hiện vật ${number(state.selected)}: ${exhibits[state.selected].title}`:state.scene==='hall'?'Sảnh trưng bày — bảy điều dành cho tuổi mới.':state.scene==='final-hall'?'Collection Status: In Progress. Triển lãm vẫn đang được hoàn thiện.':'';
    if(focus) viewport.focus({preventScroll:true});
  }
  function align() {
    const top=document.querySelector('.site-header')?.getBoundingClientRect().bottom || 68;
    const delta=shell.getBoundingClientRect().top-top-8;
    if(Math.abs(delta)>20) window.scrollBy({top:delta,behavior:reduced.matches?'instant':'smooth'});
  }
  function change(scene,selected=state.selected) {
    if(changing) return;
    state.scene=scene; state.selected=Math.max(0,Math.min(6,selected));
    if(scene==='detail')state.visited.add(state.selected);
    audio?.update({scene,selected:state.selected});
    audio?.play(scene==='detail'?'open':'step',state.selected);
    changing=true; shell.classList.add('is-changing');
    clearTimeout(transitionTimer);
    transitionTimer=setTimeout(()=>{
      render();align();shell.classList.remove('is-changing');shell.classList.add('is-arriving');
      transitionTimer=setTimeout(()=>{changing=false;shell.classList.remove('is-arriving');},reduced.matches?0:480);
    },reduced.matches?0:280);
  }
  function select(i,focus=false) {
    state.selected=Math.max(0,Math.min(6,i));
    viewport.querySelectorAll('.museum-case').forEach((el,n)=>{el.classList.toggle('is-selected',n===state.selected);el.setAttribute('aria-pressed',String(n===state.selected));});
    viewport.querySelectorAll('.museum-dots button').forEach((el,n)=>el.setAttribute('aria-current',String(n===state.selected)));
    const e=exhibits[state.selected];
    const title=viewport.querySelector('.museum-current-title'),status=viewport.querySelector('.museum-current-status'),num=viewport.querySelector('.museum-current-number');
    if(title)title.textContent=e.title;if(status)status.textContent=e.status;if(num)num.textContent=`OBJECT ${number(state.selected)} / 07`;
    const next=viewport.querySelector('[data-museum-action="next"]');if(next)next.setAttribute('aria-label',state.selected===6?'Sang phòng In Progress':'Hiện vật tiếp theo');
    if(focus)viewport.querySelector(`[data-museum-action="case-${state.selected}"]`)?.focus({preventScroll:true});
    audio?.update({selected:state.selected});save();
  }
  function navigate(direction) {
    if(direction>0&&state.selected===6){change('final-hall');return;}
    const next=Math.max(0,Math.min(6,state.selected+direction));
    if(state.scene==='detail')change('detail',next);else{select(next);announcement.textContent=`${number(next)} — ${exhibits[next].title}`;}
  }
  root.addEventListener('click',event=>{
    if(Date.now()<suppressClickUntil){event.preventDefault();return;}
    const target=event.target.closest('[data-museum-action]');if(!target||!root.contains(target))return;
    const action=target.dataset.museumAction;
    audio?.update({gesture:true});
    if(action==='sound'){state.sound=!state.sound;soundUI();save();return;}
    if(changing)return;
    if(action==='enter')change('hall',0);
    else if(action==='opening')change('opening');
    else if(action==='hall'||action==='close')change('hall');
    else if(action==='detail')change('detail');
    else if(action==='next')navigate(1);
    else if(action==='previous')navigate(-1);
    else if(action.startsWith('case-'))select(Number(action.split('-')[1]));
    else if(action.startsWith('select-')){const i=Number(action.split('-')[1]);if(state.scene==='detail')change('detail',i);else select(i);}
    else if(action==='continue'){
      const next=root.nextElementSibling;
      next?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
      const focusable=next?.querySelector('h2,button,a,[tabindex]');if(focusable){if(!focusable.hasAttribute('tabindex'))focusable.tabIndex=-1;focusable.focus({preventScroll:true});}
    }
  });
  root.addEventListener('keydown',event=>{
    if(changing||event.target.closest('[data-museum-action="sound"]'))return;
    if(event.key==='Escape'&&state.scene==='detail'){event.preventDefault();change('hall');}
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&['hall','detail'].includes(state.scene)){
      event.preventDefault();audio?.update({gesture:true});
      if(event.key==='Home'||event.key==='End'){const i=event.key==='Home'?0:6;if(state.scene==='detail')change('detail',i);else select(i,true);}
      else navigate(event.key==='ArrowRight'?1:-1);
    }
  });
  viewport.addEventListener('pointerdown',event=>{
    if(!mobile.matches||changing||!['hall','detail'].includes(state.scene)||(event.target.closest('button')&&!event.target.closest('.museum-case')))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,swiping:false};
  });
  viewport.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.swiping&&Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
    if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*1.5){gesture.swiping=true;try{viewport.setPointerCapture(event.pointerId);}catch(_){};}
  });
  viewport.addEventListener('pointerup',event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.x,swiping=gesture.swiping;gesture=null;
    if(swiping&&Math.abs(dx)>48){suppressClickUntil=Date.now()+500;audio?.update({gesture:true});navigate(dx<0?1:-1);}
  });
  viewport.addEventListener('pointercancel',()=>{gesture=null;});
  viewport.addEventListener('lostpointercapture',event=>{if(event.target===viewport)gesture=null;});
  root.addEventListener('pointerover',event=>{
    if(mobile.matches||event.pointerType==='touch'||changing)return;
    const el=event.target.closest('.museum-case');
    if(el&&!el.contains(event.relatedTarget)){const index=Number(el.dataset.museumAction.split('-')[1]);if(index!==state.selected){select(index);audio?.play('hover');}}
  });
  root.addEventListener('focusin',event=>{const el=event.target.closest('.museum-case');if(el&&state.scene==='hall')select(Number(el.dataset.museumAction.split('-')[1]));});
  shell.addEventListener('pointerenter',()=>{rect=shell.getBoundingClientRect();});
  shell.addEventListener('pointermove',event=>{
    if(reduced.matches||mobile.matches||event.pointerType!=='mouse'||!visible)return;
    rect ||= shell.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
    const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    cancelAnimationFrame(motionFrame);motionFrame=requestAnimationFrame(()=>{shell.style.setProperty('--mx',x.toFixed(3));shell.style.setProperty('--my',y.toFixed(3));});
  });
  shell.addEventListener('pointerleave',()=>{cancelAnimationFrame(motionFrame);shell.style.setProperty('--mx','0');shell.style.setProperty('--my','0');});
  const ctx=canvas.getContext('2d');let width=0,height=0,last=0;
  const particles=Array.from({length:28},(_,i)=>({x:(i*.618+.17)%1,y:(i*.371+.12)%1,r:.4+(i%4)*.3,speed:2+i%5,phase:i*1.9}));
  function resize(){rect=null;const box=shell.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,mobile.matches?1:1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);if(reduced.matches)draw(0);}
  function draw(time){
    if(!ctx)return;ctx.clearRect(0,0,width,height);
    const count=mobile.matches?14:28;
    for(let i=0;i<count;i++){
      const p=particles[i],t=reduced.matches?0:time/1000;
      let x=(p.x+Math.sin(t/19+p.phase)*.015)*width,y=((p.y-t*p.speed/height)%1+1)%1*height;
      const beam=state.scene==='hall'&&!mobile.matches?Math.pow(Math.max(0,Math.cos((x/width-.115)*Math.PI*7.7)),8):Math.max(0,1-Math.abs(x/width-.5)*2.2);
      const alpha=(.07+beam*.2)*Math.max(.15,Math.sin(y/height*Math.PI));
      ctx.fillStyle=`rgba(228,204,166,${alpha})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
    }
  }
  function tick(time){if(!visible||document.hidden||reduced.matches){dustFrame=0;return;}if(time-last>32){draw(time);last=time;}dustFrame=requestAnimationFrame(tick);}
  function activity(){const live=visible&&!document.hidden;root.classList.toggle('is-active',live);audio?.update({visible:live});cancelAnimationFrame(dustFrame);dustFrame=0;if(live&&!reduced.matches)dustFrame=requestAnimationFrame(tick);else draw(0);}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activity();},{threshold:.12}).observe(shell);
  new ResizeObserver(resize).observe(shell);
  document.addEventListener('visibilitychange',activity);
  reduced.addEventListener('change',activity);
  mobile.addEventListener('change',()=>{resize();select(state.selected);});
  window.addEventListener('pagehide',()=>{save();audio?.update({visible:false});cancelAnimationFrame(dustFrame);cancelAnimationFrame(motionFrame);clearTimeout(transitionTimer);});
  render(false);resize();
})();
