/* Original, gently paced score: soft felt-piano harmonics, warm pads, room tone.
   Render once into a seamless loop; keep its playhead across scene changes.
   No downloads, third-party library, or continuously scheduled note timers. */
(function () {
  'use strict';
  window.createObservatoryAudio = function ({ allowed, visible, captions, onCue, onMusicReady, projectorPowered = () => false, volume = () => .4 }) {
    let ctx, master, roomFilter, motorGain, musicBuffer, musicSource, musicGain, rendering;
    const active = new Set();
    let noise;
    const live = () => allowed() && visible() && !document.hidden;
    function ensure() {
      if (!allowed()) return false;
      try {
        if (!ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return false;
          ctx = new Ctx(); master = ctx.createGain(); master.gain.value = .32; master.connect(ctx.destination);
          noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
          const data = noise.getChannelData(0);
          for (let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
          const air=ctx.createBufferSource(), airGain=ctx.createGain();
          air.buffer=noise;air.loop=true;roomFilter=ctx.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=160;
          airGain.gain.value=.012;air.connect(roomFilter);roomFilter.connect(airGain);airGain.connect(master);air.start();
          const motor=ctx.createOscillator();motor.type='sine';motor.frequency.value=54;
          motorGain=ctx.createGain();motorGain.gain.value=0;motor.connect(motorGain);motorGain.connect(master);motor.start();
        }
        if(ctx.state==='suspended')ctx.resume().catch(()=>{});
        return true;
      } catch (_) { return false; }
    }
    async function score() {
      const Offline=window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if(!Offline) return null;
      const sr=22050, beat=60/58, bar=beat*4, duration=bar*16, tail=6;
      const off=new Offline(2,Math.ceil((duration+tail)*sr),sr);
      const bus=off.createGain(), lowpass=off.createBiquadFilter();
      bus.gain.value=.6;lowpass.type='lowpass';lowpass.frequency.value=2400;
      bus.connect(lowpass);lowpass.connect(off.destination);
      // Two soft echoes are cheaper than a long convolution reverb.
      for(const [seconds,amount] of [[.31,.16],[.68,.08]]){
        const delay=off.createDelay(1),gain=off.createGain();delay.delayTime.value=seconds;gain.gain.value=amount;
        lowpass.connect(delay);delay.connect(gain);gain.connect(off.destination);
      }
      const chords=[[130.81,196,246.94,293.66],[110,164.81,196,246.94],[87.31,130.81,174.61,220],[98,146.83,196,261.63]];
      for(let b=0;b<16;b+=2){
        const chord=chords[(b/2)%4],start=b*bar,length=bar*2+3;
        chord.forEach((f,i)=>{
          const osc=off.createOscillator(),gain=off.createGain(),pan=off.createStereoPanner();
          osc.type='sine';osc.frequency.value=f;osc.detune.value=i%2?3:-3;pan.pan.value=(i-1.5)*.18;
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.025,start+1.7);gain.gain.setValueAtTime(.025,start+bar*2-1.3);gain.gain.linearRampToValueAtTime(0,start+length);
          osc.connect(gain);gain.connect(pan);pan.connect(bus);osc.start(start);osc.stop(start+length);
        });
      }
      // Deliberately sparse, original melody; silence between phrases matters.
      const phrases=[[0,4,7,11,7],[9,7,4,2,4],[5,9,12,9,7],[7,2,5,4,2],[4,7,11,14,11],[9,12,7,4,2],[5,4,9,7,4],[7,5,2,4,0]];
      const times=[.45,1.9,3.4,5.1,6.8];
      phrases.forEach((notes,p)=>notes.forEach((n,i)=>{
        const start=p*bar*2+times[i]*beat,f=261.63*Math.pow(2,n/12);
        [1,2,3].forEach((harmonic,h)=>{
          const osc=off.createOscillator(),gain=off.createGain(),pan=off.createStereoPanner();
          osc.type='sine';osc.frequency.value=f*harmonic;pan.pan.value=Math.sin(p*1.7)*.22;
          const strength=[.11,.023,.007][h];
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(strength,start+.018);gain.gain.exponentialRampToValueAtTime(.00001,start+3.8);
          osc.connect(gain);gain.connect(pan);pan.connect(bus);osc.start(start);osc.stop(start+4);
        });
      }));
      const rendered=await off.startRendering(), frames=Math.floor(duration*sr);
      const loop=ctx.createBuffer(2,frames,sr);
      for(let channel=0;channel<2;channel++){
        const input=rendered.getChannelData(channel),output=loop.getChannelData(channel);
        output.set(input.subarray(0,frames));
        // Fold the final chord's decay into the beginning of the next cycle.
        for(let i=frames;i<input.length;i++)output[i-frames]+=input[i];
      }
      return loop;
    }
    function startMusic() {
      if(musicSource || !musicBuffer || !live())return;
      musicSource=ctx.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;
      musicGain=ctx.createGain();musicGain.gain.setValueAtTime(0,ctx.currentTime);musicGain.gain.linearRampToValueAtTime(volume()*3,ctx.currentTime+2);
      musicSource.connect(musicGain);musicGain.connect(master);musicSource.start();
      onMusicReady?.(musicBuffer.duration);
    }
    function update() {
      const powered=projectorPowered();
      if(!live()) {
        active.forEach(source=>{try{source.stop();}catch(_) {}});
        if(ctx?.state==='running')ctx.suspend().catch(()=>{});
        return;
      }
      if(!ensure())return;
      musicGain?.gain.setTargetAtTime(volume()*3,ctx.currentTime,.25);
      motorGain.gain.setTargetAtTime(powered?.012:0,ctx.currentTime,.5);
      roomFilter.frequency.setTargetAtTime(powered?220:160,ctx.currentTime,.5);
      if(!rendering){rendering=score().then(buffer=>{musicBuffer=buffer;startMusic();}).catch(()=>{});}
      startMusic();
    }
    function tone(frequency,duration,volume,delay=0){
      const osc=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+delay;
      osc.frequency.value=frequency;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.025);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      osc.connect(gain);gain.connect(master);osc.start(time);osc.stop(time+duration+.03);active.add(osc);
      osc.onended=()=>{active.delete(osc);osc.disconnect();gain.disconnect();};
    }
    function rustle(frequency,duration,volume){
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.6;
      const now=ctx.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.stop(now+duration);active.add(source);
      source.onended=()=>{active.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
    }
    const names={paper:'Giấy khẽ sột soạt.',clock:'Một tiếng tích tắc ngắn.',move:'Ống kính khẽ chuyển động.',chime:'Một tiếng ngân trong trẻo.',dial:'Bánh khóa khẽ nảy một nấc.',drawer:'Chốt khóa bật, ngăn kéo trượt mở.',lens:'Thấu kính khớp vào máy.',film:'Cuộn phim chuyển động.',power:'Máy chiếu bắt đầu chạy.',focus:'Núm lấy nét khẽ nảy.',reveal:'Âm thanh dịu dần, ký ức hiện lên.'};
    function play(type){
      onCue(captions()?names[type]||'':'');
      if(!live() || !ensure())return;
      update();
      if(type==='reveal')[196,246.94,293.66].forEach((f,i)=>tone(f,2.2,.055,i*.12));
      else if(type==='chime'){tone(659.25,.7,.075);tone(987.77,.9,.035,.1);}
      else if(type==='paper')rustle(1350,.5,.12);
      else if(type==='drawer'){rustle(360,.65,.14);tone(140,.15,.06);}
      else if(type==='film'||type==='move')rustle(650,.3,.08);
      else{rustle(type==='lens'?1900:850,.1,.1);tone(type==='power'?110:210,.12,.025);}
    }
    return {play,update};
  };
})();
