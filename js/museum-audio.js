/* Original gallery score and quiet acoustics. Render once; no audio download. */
(function () {
  'use strict';
  window.createMuseumAudio = function ({ onMusicReady } = {}) {
    let context, master, airGain, resonanceGain, reverb, noise, enabled = false, visible = false, activated = false;
    let scene = 'opening', selected = 0, suspension = 0;
    const sources = new Set();
    let musicBuffer, musicSource, musicGain, rendering;
    const live = () => enabled && activated && visible && !document.hidden;
    function ensure() {
      if (context) return true;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      try {
        context = new Audio();
        master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
        reverb = context.createConvolver();
        const impulse = context.createBuffer(2, context.sampleRate * 1.8, context.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = impulse.getChannelData(ch);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * .24;
        }
        reverb.buffer = impulse;
        const wet = context.createGain(); wet.gain.value = .2; reverb.connect(wet); wet.connect(master);
        noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const air = context.createBufferSource(), low = context.createBiquadFilter();
        air.buffer = noise; air.loop = true; low.type = 'lowpass'; low.frequency.value = 370;
        airGain = context.createGain(); airGain.gain.value = .065;
        air.connect(low); low.connect(airGain); airGain.connect(master); air.start();
        const resonance = context.createOscillator(); resonance.type = 'sine'; resonance.frequency.value = 58;
        resonanceGain = context.createGain(); resonanceGain.gain.value = .011;
        resonance.connect(resonanceGain); resonanceGain.connect(master); resonance.start();
        return true;
      } catch (_) { return false; }
    }
    async function score() {
      const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!Offline) return null;
      const sr=22050, beat=60/54, bar=beat*4, duration=bar*24, tail=7;
      const off=new Offline(2,Math.ceil((duration+tail)*sr),sr);
      const bus=off.createGain(), warm=off.createBiquadFilter();
      bus.gain.value=.6;warm.type='lowpass';warm.frequency.value=2300;
      bus.connect(warm);warm.connect(off.destination);
      for (const [seconds,amount] of [[.37,.14],[.79,.07]]) {
        const echo=off.createDelay(1),gain=off.createGain();
        echo.delayTime.value=seconds;gain.gain.value=amount;
        warm.connect(echo);echo.connect(gain);gain.connect(off.destination);
      }
      // Major sevenths and added ninths: warm, open chords with a hopeful cadence.
      const chords=[[130.81,196,246.94,293.66],[98,146.83,196,220],[110,164.81,196,261.63],[87.31,130.81,174.61,220],[146.83,174.61,220,261.63],[98,146.83,196,246.94]];
      chords.forEach((chord,p)=>chord.forEach((f,i)=>{
        const start=p*bar*4,length=bar*4+3,osc=off.createOscillator(),gain=off.createGain(),pan=off.createStereoPanner();
        osc.type='sine';osc.frequency.value=f;osc.detune.value=i%2?2:-2;pan.pan.value=(i-1.5)*.16;
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.025,start+2);
        gain.gain.setValueAtTime(.025,start+bar*4-2);gain.gain.linearRampToValueAtTime(0,start+length);
        osc.connect(gain);gain.connect(pan);pan.connect(bus);osc.start(start);osc.stop(start+length);
      }));
      const phrases=[[4,7,14,11,7],[2,7,9,7,4],[9,12,7,4,2],[5,9,12,9,7],[2,5,9,7,4],[7,11,14,7,2]];
      const times=[.65,3.4,6.1,9.4,12.2];
      phrases.forEach((notes,p)=>notes.forEach((note,i)=>{
        const start=p*bar*4+times[i]*beat,f=261.63*Math.pow(2,note/12);
        [1,2,3].forEach((harmonic,h)=>{
          const osc=off.createOscillator(),gain=off.createGain(),pan=off.createStereoPanner();
          osc.type='sine';osc.frequency.value=f*harmonic;pan.pan.value=Math.sin(p*1.4)*.2;
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime([.12,.023,.006][h],start+.025);
          gain.gain.exponentialRampToValueAtTime(.00001,start+4.6);
          osc.connect(gain);gain.connect(pan);pan.connect(bus);osc.start(start);osc.stop(start+4.8);
        });
      }));
      const rendered=await off.startRendering(),frames=Math.round(duration*sr);
      const loop=context.createBuffer(2,frames,sr);
      for(let channel=0;channel<2;channel++){
        const input=rendered.getChannelData(channel),output=loop.getChannelData(channel);
        output.set(input.subarray(0,frames));
        // Carry the last chord's decay across the loop boundary without a hard cut.
        for(let i=frames;i<input.length;i++)output[i-frames]+=input[i];
      }
      return loop;
    }
    function startMusic() {
      if (musicSource || !musicBuffer || !live()) return;
      musicSource=context.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;
      musicGain=context.createGain();musicGain.gain.setValueAtTime(0,context.currentTime);
      musicGain.gain.linearRampToValueAtTime(1.4,context.currentTime+2.5);
      musicSource.connect(musicGain);musicGain.connect(master);musicSource.start();
      onMusicReady?.(musicBuffer.duration);
    }
    function update(options = {}) {
      if (options.gesture) activated = true;
      if ('enabled' in options) enabled = options.enabled;
      if ('visible' in options) visible = options.visible;
      if (options.scene) scene = options.scene;
      if ('selected' in options) selected = options.selected;
      clearTimeout(suspension);
      if (!live()) {
        sources.forEach(source=>{try{source.stop();}catch(_) {}});
        if (context?.state === 'running') {
          master.gain.setTargetAtTime(0, context.currentTime, .08);
          suspension = setTimeout(() => { if (!(enabled && activated && visible && !document.hidden)) context.suspend().catch(() => {}); }, 300);
        }
        return;
      }
      if (!ensure()) return;
      context.resume().catch(() => {});
      if (!rendering) rendering=score().then(buffer=>{musicBuffer=buffer;startMusic();}).catch(()=>{});
      startMusic();
      const quiet = selected === 6 || scene === 'final-hall';
      master.gain.setTargetAtTime(quiet ? .09 : .22, context.currentTime, .45);
      airGain.gain.setTargetAtTime(scene === 'detail' ? .037 : .065, context.currentTime, .6);
      resonanceGain.gain.setTargetAtTime(scene === 'detail' ? .007 : .011, context.currentTime, .6);
    }
    function texture(frequency, duration, level, delay = 0) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = noise; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
      const now = context.currentTime + delay;
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + .025); gain.gain.exponentialRampToValueAtTime(.00001, now + duration);
      source.connect(filter); filter.connect(gain); gain.connect(master); gain.connect(reverb);
      source.start(now); source.stop(now + duration + .04); sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    function glass() {
      const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
      osc.frequency.value = 1046; gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.012, now + .018); gain.gain.exponentialRampToValueAtTime(.00001, now + .75);
      osc.connect(gain); gain.connect(master); gain.connect(reverb); osc.start(); osc.stop(now + .8); sources.add(osc);
      osc.onended = () => { sources.delete(osc); osc.disconnect(); gain.disconnect(); };
    }
    return {
      update,
      play(kind, index = selected) {
        if (!(enabled && activated && visible && !document.hidden) || !ensure()) return;
        update();
        if (kind === 'step') { texture(145, .32, .12); texture(175, .34, .07, .38); }
        else if (kind === 'hover') texture(480, .18, .012);
        else if (kind === 'open') {
          if (index === 0) { texture(1200, .55, .07); texture(260, 1.5, .015); }
          if (index === 1) { texture(2100, .1, .075); texture(850, .45, .035, .09); }
          if (index === 2) texture(1100, .7, .04);
          if (index === 3) { texture(1050, .8, .065); texture(1600, .28, .02, .3); }
          if (index === 4) glass();
          if (index === 5) { glass(); texture(1250, .5, .035); }
          // Unknown intentionally has no object sound.
        }
      }
    };
  };
})();
