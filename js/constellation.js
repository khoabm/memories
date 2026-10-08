/* QUỲNH CONSTELLATION — SVG + scroll, không cần thư viện animation.
   Tọa độ thuộc viewBox 1000 × 600, không phải pixel của màn hình.
   Các nét chữ chỉ dùng để lấy mẫu; SVG cuối cùng chỉ giữ sao và đường nối. */
(function () {
  'use strict';
  const section = document.getElementById('quynh-constellation');
  if (!section) return;
  const sticky = section.querySelector('.constellation-sticky');
  const svg = section.querySelector('.constellation-svg');
  const starsGroup = svg.querySelector('.constellation-main-stars');
  const linesGroup = svg.querySelector('.constellation-lines');
  const halosGroup = svg.querySelector('.constellation-halos');
  const skyGroup = section.querySelector('.constellation-background-stars');
  const skyCanvas = document.createElement('canvas');
  skyCanvas.className = 'constellation-deep-sky';
  skyCanvas.setAttribute('aria-hidden', 'true');
  sticky.prepend(skyCanvas);
  const copy = Array.from(section.querySelectorAll('[data-scene]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 768px)');
  const NS = 'http://www.w3.org/2000/svg';
  const stars = [], connections = [];
  let active = false, frame = 0, pulsed = false;
  let seed = 90102026;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function element(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  const defs = element('defs', {});
  const glow = element('radialGradient', { id:'quynh-star-glow' });
  [[0,'#fff9ed',1],[.07,'#f3f7ff',.95],[.18,'#c8ddff',.42],[.42,'#9abbea',.12],[1,'#789fcf',0]].forEach(([offset,color,opacity]) => {
    glow.appendChild(element('stop', {offset,'stop-color':color,'stop-opacity':opacity}));
  });
  defs.appendChild(glow); svg.prepend(defs);
  function flareShape(radius) {
    return `M0 ${-radius} L.8 -1 L${radius*.65} 0 L.8 1 L0 ${radius} L-.8 1 L${-radius*.65} 0 L-.8 -1Z`;
  }
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function smooth(start, end, value) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }

  // Q, u, ỳ, n, h: nét viết tay đơn, gồm cả đuôi Q và dấu huyền riêng.
  const strokes = [
    { letter: 'Q', d: 'M230 265 C230 200 198 155 158 155 C115 155 80 200 80 265 C80 340 112 370 158 370 C201 370 230 332 230 265 Z', count: 12, closed: true },
    { letter: 'Q', d: 'M174 322 L252 404', count: 3 },
    { letter: 'u', d: 'M285 240 L285 318 Q285 370 336 370 Q395 370 395 310 L395 240 L395 370', count: 9 },
    { letter: 'ỳ', d: 'M455 240 L519 360', count: 3 },
    { letter: 'ỳ', d: 'M577 240 L519 360', count: 3 },
    { letter: 'ỳ', d: 'M519 360 Q500 411 477 436 Q461 451 448 438', count: 5 },
    { letter: 'ỳ', d: 'M510 170 L542 207', count: 3, accent: true },
    { letter: 'n', d: 'M630 370 L630 240', count: 3 },
    { letter: 'n', d: 'M630 285 Q645 240 681 240 Q740 240 740 299 L740 370', count: 6 },
    { letter: 'h', d: 'M810 165 L810 370', count: 4 },
    { letter: 'h', d: 'M810 285 Q825 240 862 240 Q925 240 925 299 L925 370', count: 6 },
  ];

  strokes.forEach((stroke) => {
    const path = element('path', { d: stroke.d });
    // Path đo hình học được tháo ngay sau khi lấy mẫu, không dùng làm hình chữ.
    svg.appendChild(path);
    const length = path.getTotalLength();
    const sampled = [];
    for (let i = 0; i < stroke.count; i++) {
      const point = path.getPointAtLength(length * i / (stroke.closed ? stroke.count : stroke.count - 1));
      const bright = stroke.accent || stars.length % 5 === 0;
      const star = {
        x: point.x, y: point.y,
        initialX: point.x + (random() - 0.5) * 100,
        initialY: point.y + (random() - 0.5) * 90,
        delay: random() * 0.07,
        node: element('circle', { cx: point.x, cy: point.y, r: bright ? 1.8 : .8 + random() * .65, fill:random()>.76?'#fff0d9':'#f8fbff' }),
      };
      star.node.classList.add('constellation-star-core');
      star.node.style.setProperty('--twinkle-duration',(2.5+random()*4.5)+'s');
      star.node.style.setProperty('--twinkle-delay',(-random()*12)+'s');
      starsGroup.appendChild(star.node);
      {
        star.halo = element('circle', { cx: point.x, cy: point.y, r: bright ? 20 : 9 + random()*6, fill:'url(#quynh-star-glow)' });
        star.halo.classList.add('constellation-star-aura');
        star.halo.style.setProperty('--twinkle-duration',star.node.style.getPropertyValue('--twinkle-duration'));
        star.halo.style.setProperty('--twinkle-delay',star.node.style.getPropertyValue('--twinkle-delay'));
        halosGroup.appendChild(star.halo);
        if (bright) {
          star.flare = element('path', {d:flareShape(stroke.accent ? 18 : 12 + random()*5),fill:'url(#quynh-star-glow)'});
          star.flare.classList.add('constellation-star-flare');
          star.flare.style.setProperty('--twinkle-duration',star.node.style.getPropertyValue('--twinkle-duration'));
          star.flare.style.setProperty('--twinkle-delay',star.node.style.getPropertyValue('--twinkle-delay'));
          star.flareAngle = -12 + random()*24;
          halosGroup.appendChild(star.flare);
        }
      }
      stars.push(star);
      sampled.push(star);
    }
    path.remove();
    const count = stroke.closed ? sampled.length : sampled.length - 1;
    for (let i = 0; i < count; i++) {
      const from = sampled[i], to = sampled[(i + 1) % sampled.length];
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const line = element('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        'stroke-dasharray': distance, 'stroke-dashoffset': distance,
        'data-length': distance,
        'data-letter': stroke.letter,
      });
      linesGroup.appendChild(line);
      connections.push(line);
    }
  });

  function buildSky() {
    skyGroup.replaceChildren();
    const fragment = document.createDocumentFragment();
    const skyDefs = element('defs', {}), skyGlow = glow.cloneNode(true);
    skyGlow.id = 'quynh-distant-glow'; skyDefs.appendChild(skyGlow); fragment.appendChild(skyDefs);
    const count = small.matches ? 110 : 210;
    for (let i = 0; i < count; i++) {
      const dot = element('circle', {
        cx: random() * 1000, cy: random() * 600,
        r: 0.35 + Math.pow(random(),2) * 1.3,
        opacity: 0.3 + random() * 0.65,
        fill:random()>.8?'#f1dcc5':'#d6e5f8',
      });
      const light = element('g', {});
      if (i % 7 === 0) {
        light.appendChild(element('circle',{cx:dot.getAttribute('cx'),cy:dot.getAttribute('cy'),r:5+random()*4,fill:'url(#quynh-distant-glow)',opacity:.7}));
        if (i % 21 === 0) light.appendChild(element('path',{d:flareShape(5+random()*3),transform:`translate(${dot.getAttribute('cx')} ${dot.getAttribute('cy')})`,fill:'url(#quynh-distant-glow)',opacity:.5}));
      }
      if (i % 3 !== 0 || i % 7 === 0) {
        light.classList.add('constellation-twinkle');
        light.style.setProperty('--twinkle-delay', (-random() * 10) + 's');
        light.style.setProperty('--twinkle-duration',(2.1+random()*6)+'s');
      }
      light.appendChild(dot); fragment.appendChild(light);
    }
    skyGroup.appendChild(fragment);
  }

  // Paint distant stars and the galactic dust once; only the nearer SVG stars animate.
  // A local seed keeps the sky stable when resizing, without a large bitmap download.
  function paintDeepSky() {
    const box=sticky.getBoundingClientRect(), w=box.width, h=box.height;
    const dpr=Math.min(devicePixelRatio||1,small.matches?1:1.5);
    skyCanvas.width=Math.round(w*dpr);skyCanvas.height=Math.round(h*dpr);
    const ctx=skyCanvas.getContext('2d');if(!ctx||!w||!h)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    let localSeed=210917;
    const rng=()=>{localSeed=(Math.imul(localSeed,1664525)+1013904223)>>>0;return localSeed/4294967296;};
    const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(.0001,rng())))*Math.cos(2*Math.PI*rng());
    for(let i=0;i<16;i++){
      const t=i/15,x=w*t,y=h*(.86-t*.65),r=h*(.10+rng()*.13);
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(123,143,174,.045)');g.addColorStop(.5,'rgba(95,116,153,.025)');g.addColorStop(1,'rgba(95,116,153,0)');
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    for(let i=0,count=small.matches?1250:2600;i<count;i++){
      const band=i%3!==0,x=rng()*w,y=band?h*(.86-x/w*.65+gaussian()*.075):rng()*h;
      const r=.18+rng()*.48,opacity=band?.04+rng()*.22:.06+rng()*.34;
      ctx.fillStyle=`rgba(${rng()>.8?'225,207,190':'183,202,226'},${opacity})`;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    // Faint point-spread halos make larger stars luminous rather than flat dots.
    for(let i=0,count=small.matches?38:70;i<count;i++){
      const x=rng()*w,y=rng()*h,r=2.5+rng()*4.5,warm=rng()>.78;
      const light=ctx.createRadialGradient(x,y,0,x,y,r);
      light.addColorStop(0,warm?'rgba(255,229,187,.72)':'rgba(231,244,255,.8)');
      light.addColorStop(.12,'rgba(208,225,251,.32)');light.addColorStop(.4,'rgba(158,194,244,.075)');light.addColorStop(1,'rgba(129,170,230,0)');
      ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    // A darker, irregular dust lane interrupts the light, like a real Milky Way.
    for(let i=0;i<24;i++){
      const t=i/23,x=w*t,y=h*(.86-t*.65+(rng()-.5)*.035),r=h*(.025+rng()*.035);
      const dust=ctx.createRadialGradient(x,y,0,x,y,r);
      dust.addColorStop(0,'rgba(4,9,17,.25)');dust.addColorStop(.45,'rgba(4,9,17,.14)');dust.addColorStop(1,'rgba(4,9,17,0)');
      ctx.fillStyle=dust;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  }

  // Lời kể có khoảng lặng ngắn giữa các câu, giữ phần kết đến cuối section.
  const scenes = [[0, .20], [.205, .325], [.33, .45], [.455, .575], [.58, .70], [.705, .80], [.805, .905], [.91, 1]];
  function render() {
    frame = 0;
    const progress = reduced.matches ? 1 : clamp(-section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - sticky.clientHeight));
    section.dataset.progress = progress.toFixed(3);
    const settling = reduced.matches ? 1 : smooth(.16, .45, progress);
    stars.forEach((star) => {
      const x = star.initialX + (star.x - star.initialX) * settling;
      const y = star.initialY + (star.y - star.initialY) * settling;
      const opacity = reduced.matches ? 1 : .025 + .975 * smooth(.14 + star.delay, .41 + star.delay, progress);
      star.node.setAttribute('cx', x.toFixed(2));
      star.node.setAttribute('cy', y.toFixed(2));
      star.node.style.opacity = opacity.toFixed(3);
      if (star.halo) {
        star.halo.setAttribute('cx', x.toFixed(2));
        star.halo.setAttribute('cy', y.toFixed(2));
        star.halo.style.opacity = (opacity * .72).toFixed(3);
      }
      if (star.flare) {
        star.flare.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${star.flareAngle})`);
        star.flare.style.opacity = (opacity * .8).toFixed(3);
      }
    });
    connections.forEach((line, i) => {
      const start = .45 + i / Math.max(1, connections.length - 1) * .25;
      const draw = reduced.matches ? 1 : smooth(start, start + .035, progress);
      line.style.strokeDashoffset = ((1 - draw) * Number(line.dataset.length)).toFixed(4);
      line.style.opacity = draw === 0 ? '0' : '1';
    });
    section.style.setProperty('--constellation-stroke', (1000 / Math.max(1, svg.clientWidth)).toFixed(3));
    section.style.setProperty('--sky-opacity', (.75 - smooth(.70, .90, progress) * .27).toFixed(3));
    section.style.setProperty('--line-opacity', (.64 - smooth(.93, 1, progress) * .15).toFixed(3));
    section.style.setProperty('--word-scale', (.98 + smooth(.70, .85, progress) * .02).toFixed(4));
    section.style.setProperty('--cue-opacity', (1 - smooth(.03, .12, progress)).toFixed(3));
    copy.forEach((paragraph, i) => {
      const [start, end] = scenes[i];
      const opacity = reduced.matches ? 1 : (start === 0 ? 1 : smooth(start, start + .022, progress)) * (end === 1 ? 1 : 1 - smooth(end - .022, end, progress));
      paragraph.style.opacity = opacity.toFixed(3);
      paragraph.style.transform = reduced.matches ? 'none' : 'translateY(' + ((1 - opacity) * 8).toFixed(2) + 'px)';
      paragraph.setAttribute('aria-hidden', opacity < .1 ? 'true' : 'false');
    });
    if (!reduced.matches && progress >= .78 && !pulsed) {
      pulsed = true;
      starsGroup.classList.add('is-revealing');
    }
  }
  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(render);
  }
  function setMotion() {
    section.classList.toggle('is-reduced', reduced.matches);
    schedule();
  }
  buildSky();
  paintDeepSky();
  section.classList.add('is-ready');
  setMotion();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      section.classList.toggle('is-in-view', active && !document.hidden);
      if (active) schedule();
    }, { rootMargin: '100px 0px' });
    observer.observe(section);
  } else active = true;
  window.addEventListener('scroll', () => { if (active && !reduced.matches) schedule(); }, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  new ResizeObserver(paintDeepSky).observe(sticky);
  document.addEventListener('visibilitychange',()=>section.classList.toggle('is-in-view',active&&!document.hidden));
  reduced.addEventListener('change', setMotion);
  small.addEventListener('change', () => { buildSky(); schedule(); });
  window.addEventListener('pageshow', schedule);
})();
