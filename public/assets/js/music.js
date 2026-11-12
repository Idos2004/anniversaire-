/*! Éclat — petite boîte à musique générée par le navigateur (aucun fichier audio). */
(function (root) {
  'use strict';

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // Do – La m – Fa – Sol, en arpèges lents.
  const PROG = [
    [60, 67, 72, 76, 79, 76, 72, 67],
    [57, 64, 69, 72, 76, 72, 69, 64],
    [53, 60, 65, 69, 72, 69, 65, 60],
    [55, 62, 67, 71, 74, 71, 67, 62]
  ];
  // « Joyeux anniversaire » (domaine public) : [note MIDI, durée en temps]
  const BIRTHDAY = [
    [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
    [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
    [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
    [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3]
  ];
  const TRACKS = {
    boite: { label: 'Boîte à musique', shift: 12, step: .32, decay: 1.7, vol: .07, partial: 3, pvol: .12, beat: .42 },
    piano: { label: 'Piano feutré', shift: 0, step: .44, decay: 2.8, vol: .1, partial: 2, pvol: .2, beat: .5 }
  };

  function create() {
    let ctx = null, out = null, bus = null, timer = null, track = null;
    let next = 0, i = 0, holdUntil = 0, muted = false;

    function ensure() {
      if (ctx) return true;
      const C = root.AudioContext || root.webkitAudioContext;
      if (!C) return false;
      ctx = new C();
      out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
      bus = ctx.createGain(); bus.connect(out);
      // Écho doux pour donner de l'espace.
      const delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
      delay.delayTime.value = .29; fb.gain.value = .28; lp.type = 'lowpass'; lp.frequency.value = 2200; wet.gain.value = .35;
      bus.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(out);
      return true;
    }

    function tone(m, t, T, mul) {
      const f = hz(m + T.shift);
      const g = ctx.createGain();
      g.connect(bus);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine'; o2.frequency.value = f * T.partial; g2.gain.value = T.pvol; o2.connect(g2); g2.connect(g);
      const peak = Math.max(.0002, T.vol * (mul || 1));
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + T.decay);
      o.start(t); o2.start(t); o.stop(t + T.decay + .05); o2.stop(t + T.decay + .05);
    }

    function tick() {
      if (!ctx || !track) return;
      const T = TRACKS[track];
      while (next < ctx.currentTime + .3) {
        if (next >= holdUntil) {
          const bar = PROG[Math.floor(i / 8) % PROG.length];
          tone(bar[i % 8], next, T, i % 8 === 0 ? 1.15 : .8);
          i++;
        }
        next += T.step;
      }
    }

    function fade(to, time) {
      if (!ctx) return;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(to, ctx.currentTime, time);
    }

    return {
      start(name) {
        if (!TRACKS[name] || !ensure()) return false;
        track = name;
        if (ctx.state !== 'running') ctx.resume();
        next = ctx.currentTime + .12; i = 0; holdUntil = 0;
        fade(muted ? 0 : 1, .6);
        clearInterval(timer);
        timer = setInterval(tick, 70);
        tick();
        return true;
      },
      melody() {
        if (!ctx || !track) return;
        const T = TRACKS[track];
        let t = ctx.currentTime + .2;
        holdUntil = t + 30;
        for (const [m, d] of BIRTHDAY) { tone(m, t, T, 1.7); t += d * T.beat; }
        holdUntil = t + .8;
        next = Math.max(next, holdUntil);
      },
      stop() {
        clearInterval(timer); timer = null; track = null;
        fade(0, .2);
      },
      setMuted(m) { muted = !!m; fade(muted ? 0 : 1, .15); },
      get muted() { return muted; },
      get playing() { return !!track; },
      suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
      resume() { if (ctx && track && ctx.state !== 'running') ctx.resume(); }
    };
  }

  root.EclatMusic = { create, TRACKS };
})(typeof window !== 'undefined' ? window : globalThis);
