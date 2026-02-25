import { useState, useRef, useCallback, useEffect } from "react";

function createAudioCtx() {
  return new (window.AudioContext || window.webkitAudioContext)();
}

// 🌧️ Rain — white noise filtered to sound like rain
function createRainNodes(ctx) {
  const bufSize = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const hipass = ctx.createBiquadFilter();
  hipass.type = "highpass"; hipass.frequency.value = 800;
  const lopass = ctx.createBiquadFilter();
  lopass.type = "lowpass"; lopass.frequency.value = 4000;
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  const panner = ctx.createStereoPanner();
  panner.pan.value = 0;
  src.connect(hipass); hipass.connect(lopass); lopass.connect(gainNode); gainNode.connect(panner); panner.connect(ctx.destination);
  src.start();
  return { gainNode, src };
}

// ☕ Coffee Shop — warm ambient crowd hum with slow ebb & flow
function createCoffeeNodes(ctx) {
  const sr = ctx.sampleRate;
  const bufSize = sr * 8;
  const buf = ctx.createBuffer(1, bufSize, sr);
  const data = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < bufSize; i++) {
    const w = Math.random() * 2 - 1;
    b = (b + 0.02 * w) / 1.02;
    data[i] = b * 18;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 120; hp.Q.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 3500; lp.Q.value = 0.5;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking"; mid.frequency.value = 700; mid.gain.value = 5; mid.Q.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.value = 0.04;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.12;
  lfo.connect(lfoG);
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  lfoG.connect(gainNode.gain);
  src.connect(hp); hp.connect(lp); lp.connect(mid); mid.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start(); lfo.start();
  return { gainNode, src, lfo };
}

// 🔥 Fireplace — warm crackling fire with realistic crackle bursts
function createFireNodes(ctx) {
  const sr = ctx.sampleRate;
  const bufSize = sr * 6;
  const buf = ctx.createBuffer(1, bufSize, sr);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, popEnv = 0;
  for (let i = 0; i < bufSize; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.990 * b0 + 0.010 * w;
    b1 = 0.970 * b1 + 0.030 * w;
    b2 = 0.900 * b2 + 0.100 * w;
    const pink = (b0 + b1 + b2) * 2.5;
    if (Math.random() < 0.0004) popEnv = 0.8 + Math.random() * 1.5;
    const crackle = popEnv > 0.001 ? (Math.random() * 2 - 1) * popEnv : 0;
    popEnv *= 0.9985;
    data[i] = pink + crackle;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2800;
  const warmth = ctx.createBiquadFilter();
  warmth.type = "peaking"; warmth.frequency.value = 160; warmth.gain.value = 14; warmth.Q.value = 1.2;
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking"; presence.frequency.value = 650; presence.gain.value = 5; presence.Q.value = 1;
  const lfo = ctx.createOscillator();
  lfo.type = "sine"; lfo.frequency.value = 0.08;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.15;
  lfo.connect(lfoG);
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  lfoG.connect(gainNode.gain);
  src.connect(lp); lp.connect(warmth); warmth.connect(presence); presence.connect(gainNode);
  gainNode.connect(ctx.destination);
  src.start(); lfo.start();
  return { gainNode, src, lfo };
}

// 🌊 Ocean — slow swooshing waves
function createOceanNodes(ctx) {
  const bufSize = ctx.sampleRate * 6;
  const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lopass = ctx.createBiquadFilter();
  lopass.type = "lowpass"; lopass.frequency.value = 600;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.35;
  lfo.connect(lfoGain);
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;
  lfoGain.connect(gainNode.gain);
  src.connect(lopass); lopass.connect(gainNode); gainNode.connect(ctx.destination);
  src.start(); lfo.start();
  return { gainNode, src, lfo };
}

export const SOUNDS = {
  rain:   { emoji:"🌧️", label:"Yağmur",  create: createRainNodes,   vol: 0.35 },
  coffee: { emoji:"☕",  label:"Kahve",    create: createCoffeeNodes, vol: 0.45 },
  fire:   { emoji:"🔥",  label:"Şömine",   create: createFireNodes,   vol: 0.40 },
  ocean:  { emoji:"🌊",  label:"Okyanus",  create: createOceanNodes,  vol: 0.38 },
};

export function useAsmr() {
  const ctxRef   = useRef(null);
  const nodesRef = useRef({});
  const [active,  setActive]  = useState(null);
  const [volume,  setVolume]  = useState(0.7);
  const [loading, setLoading] = useState(false);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = createAudioCtx();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const stopAll = useCallback(() => {
    Object.values(nodesRef.current).forEach(n => {
      if (n.gainNode) { n.gainNode.gain.setTargetAtTime(0, ctxRef.current?.currentTime || 0, 0.4); }
      if (n.lfo) { try { n.lfo.stop(ctxRef.current?.currentTime + 0.5); } catch(e){} }
    });
    nodesRef.current = {};
  }, []);

  const play = useCallback((key) => {
    const ctx = ensureCtx();
    setLoading(true);
    if (active && nodesRef.current[active]) {
      const cur = nodesRef.current[active];
      cur.gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => { try { cur.src.stop(); } catch(e){} }, 1500);
    }
    if (active === key) {
      setActive(null); setLoading(false); return;
    }
    const sound = SOUNDS[key];
    const nodes = sound.create(ctx);
    const targetVol = sound.vol * volume;
    nodes.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    nodes.gainNode.gain.setTargetAtTime(targetVol, ctx.currentTime + 0.1, 0.8);
    nodesRef.current[key] = nodes;
    setActive(key); setLoading(false);
  }, [active, volume, ensureCtx]);

  const adjustVolume = useCallback((v) => {
    setVolume(v);
    if (active && nodesRef.current[active]) {
      const sound = SOUNDS[active];
      nodesRef.current[active].gainNode.gain.setTargetAtTime(sound.vol * v, ctxRef.current?.currentTime || 0, 0.2);
    }
  }, [active]);

  const autoPlay = useCallback((shouldPlay, preferredKey = "rain") => {
    if (shouldPlay && !active) play(preferredKey);
    else if (!shouldPlay && active) {
      if (nodesRef.current[active]) {
        const ctx = ctxRef.current;
        nodesRef.current[active].gainNode.gain.setTargetAtTime(0, ctx?.currentTime || 0, 0.8);
        const { src, lfo } = nodesRef.current[active];
        setTimeout(() => {
          try { src.stop(); } catch(e){}
          if (lfo) { try { lfo.stop(); } catch(e){} }
        }, 2000);
      }
      nodesRef.current = {};
      setActive(null);
    }
  }, [active, play]);

  useEffect(() => () => stopAll(), []);

  return { active, volume, loading, play, adjustVolume, autoPlay };
}
