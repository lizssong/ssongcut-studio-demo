/* 쏭컷 미디어 엔진: 큰 영상도 통째로 메모리에 올리지 않고 조금씩 읽어서 처리한다.
   - MP4·MOV: 파일 구조(moov)만 읽고, 소리·화면 데이터는 필요한 구간만 잘라 읽어 WebCodecs로 푼다.
   - 그 밖의 형식(WebM 등): 작은 파일만 브라우저 기본 방식(decodeAudioData)으로 처리한다. */
(function () {
  'use strict';
  const LIB = 'https://cdn.jsdelivr.net/npm/mp4box@0.5.3/+esm';
  let MP4BoxP = null;
  const loadBox = () => (MP4BoxP = MP4BoxP || import(LIB).then((m) => m.default || m));
  const cache = new WeakMap();
  const sleep = (ms) => ms > 4 ? new Promise((r) => setTimeout(r, ms)) : new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }); /* 탭이 뒤에 있어도 느려지지 않게 */
  const SMALL_FALLBACK = 700 * 1048576; /* 이보다 큰 비 MP4 파일은 통째로 풀지 않는다 */

  async function readU(file, pos, len) { return new Uint8Array(await file.slice(pos, pos + len).arrayBuffer()); }

  /* 맨 위 상자(ftyp, moov, mdat …) 위치만 훑는다 */
  async function scanBoxes(file) {
    const boxes = []; let pos = 0, guard = 0;
    while (pos + 8 <= file.size && guard++ < 10000) {
      const h = await readU(file, pos, 16), dv = new DataView(h.buffer);
      let size = dv.getUint32(0); const type = String.fromCharCode(h[4], h[5], h[6], h[7]);
      let hdr = 8;
      if (size === 1) { size = Number(dv.getBigUint64(8)); hdr = 16; } else if (size === 0) size = file.size - pos;
      if (size < 8 || !/^[\x20-\x7e]{4}$/.test(type)) break;
      boxes.push({ type, pos, size, hdr }); pos += size;
    }
    return boxes;
  }

  async function probe(file) {
    if (cache.has(file)) { const c = cache.get(file); if (c.err) throw c.err; return c; }
    const job = (async () => {
      const boxes = await scanBoxes(file);
      const moov = boxes.find((b) => b.type === 'moov');
      if (!moov || !boxes.some((b) => b.type === 'ftyp' || b.type === 'mdat')) throw new Error('NOT_MP4');
      if (moov.size > 400 * 1048576) throw new Error('MOOV_TOO_BIG');
      const MP4Box = await loadBox(); const mp = MP4Box.createFile(); mp.discardMdatData = true;
      const info = await new Promise(async (res, rej) => {
        mp.onReady = res; mp.onError = (e) => rej(new Error('DEMUX ' + e));
        for (const b of boxes) {
          const len = b.type === 'mdat' ? Math.min(b.size, b.hdr) : b.size;
          if (b.type !== 'moov' && b.type !== 'ftyp' && b.type !== 'mdat') continue;
          const ab = await file.slice(b.pos, b.pos + len).arrayBuffer(); ab.fileStart = b.pos; mp.appendBuffer(ab);
        }
        mp.flush(); setTimeout(() => rej(new Error('DEMUX_TIMEOUT')), 20000);
      });
      const vt = (info.videoTracks || [])[0], at = (info.audioTracks || [])[0];
      const out = { file, mp, info, MP4Box, dur: info.duration / info.timescale };
      if (vt) {
        const trak = mp.getTrackById(vt.id); let desc;
        for (const en of trak.mdia.minf.stbl.stsd.entries) { const box = en.avcC || en.hvcC || en.vpcC || en.av1C; if (box) { const ds = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN); box.write(ds); desc = new Uint8Array(ds.buffer, 8); break; } }
        const mtx = vt.matrix, rotated = !!(mtx && (mtx[0] !== 65536 || mtx[4] !== 65536));
        out.video = { id: vt.id, T: vt.timescale, samples: trak.samples, rotated, cfg: { codec: vt.codec, codedWidth: vt.video.width, codedHeight: vt.video.height, description: desc, optimizeForLatency: false } };
      }
      if (at) {
        const trak = mp.getTrackById(at.id), en = trak.mdia.minf.stbl.stsd.entries[0]; let desc;
        try { const d = en.esds.esd.descs[0].descs[0]; if (d && d.data) desc = new Uint8Array(d.data); } catch (_) {}
        let shift = 0; try { const el = trak.edts && trak.edts.elst && trak.edts.elst.entries; if (el && el.length) { const e0 = el.find((e) => e.media_time >= 0); if (e0 && e0.media_time > 0) shift = e0.media_time / at.timescale; } } catch (_) {}
        out.audio = { id: at.id, T: at.timescale, samples: trak.samples, shift, sampleRate: at.audio.sample_rate, channels: at.audio.channel_count, cfg: { codec: at.codec, sampleRate: at.audio.sample_rate, numberOfChannels: at.audio.channel_count, description: desc } };
        try { out.audio.ok = !!(window.AudioDecoder && (await AudioDecoder.isConfigSupported(out.audio.cfg)).supported); } catch (_) { out.audio.ok = false; }
      }
      return out;
    })();
    const holder = {}; cache.set(file, holder);
    try { const r = await job; Object.assign(holder, r); return holder; } catch (e) { holder.err = e; throw e; }
  }

  /* 샘플들의 데이터를 연속 구간 단위로 묶어 읽는다 (한 번에 최대 8MB) */
  async function* readSamples(file, samples, i0, i1) {
    let i = i0;
    while (i < i1) {
      let j = i, start = samples[i].offset, end = start + samples[i].size;
      while (j + 1 < i1 && samples[j + 1].offset === end && end - start < 8 * 1048576) { j++; end += samples[j].size; }
      const buf = await file.slice(start, end).arrayBuffer();
      for (let k = i; k <= j; k++) yield { s: samples[k], data: new Uint8Array(buf, samples[k].offset - start, samples[k].size) };
      i = j + 1;
    }
  }

  /* 소리를 구간별로 풀어 onBlock(planarFloat32[], sampleRate, startTimeSec)으로 넘긴다 */
  async function decodeAudioStream(P, t0, t1, onBlock, opt = {}) {
    const A = P.audio, smp = A.samples, T = A.T; if (!smp.length) return;
    let i0 = 0; while (i0 < smp.length && (smp[i0].cts + smp[i0].duration) / T - A.shift < t0 - 0.2) i0++;
    let i1 = i0; while (i1 < smp.length && smp[i1].cts / T - A.shift < t1 + 0.2) i1++;
    if (i0 >= i1) return;
    let err = null; const queue = [];
    const dec = new AudioDecoder({ output: (ad) => queue.push(ad), error: (e) => { err = e; } });
    dec.configure(A.cfg);
    const drain = async () => {
      while (queue.length) {
        const ad = queue.shift(); const n = ad.numberOfFrames, ch = ad.numberOfChannels, planes = [];
        for (let c = 0; c < ch; c++) { const p = new Float32Array(n); ad.copyTo(p, { planeIndex: c, format: 'f32-planar' }); planes.push(p); }
        const ts = ad.timestamp / 1e6; ad.close();
        await onBlock(planes, A.sampleRate, ts);
      }
    };
    let count = 0;
    for await (const { s, data } of readSamples(P.file, smp, i0, i1)) {
      if (opt.signal && opt.signal.aborted) { try { dec.close(); } catch (_) {} throw new Error('CANCEL'); }
      dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: Math.round((s.cts / T - A.shift) * 1e6), duration: Math.round(s.duration / T * 1e6), data }));
      if (++count % 64 === 0) { while (dec.decodeQueueSize > 32) await sleep(1); await drain(); if (err) throw err; if (opt.onProgress) opt.onProgress((s.cts / T - t0) / Math.max(0.001, t1 - t0)); await sleep(0); }
    }
    await dec.flush(); await drain(); dec.close(); if (err) throw err;
  }

  /* 소리 블록을 목표 샘플레이트로 바꾼다 (브라우저 리샘플러 사용) */
  async function resampleBlock(planes, srcRate, dstRate, mono) {
    const n = planes[0].length, ch = mono ? 1 : Math.min(2, planes.length);
    if (srcRate === dstRate) {
      if (!mono) return planes.slice(0, ch);
      if (planes.length === 1) return [planes[0]];
      const o = new Float32Array(n); for (const p of planes) for (let i = 0; i < n; i++) o[i] += p[i] / planes.length; return [o];
    }
    const outN = Math.max(1, Math.round(n * dstRate / srcRate));
    const oc = new OfflineAudioContext(ch, outN, dstRate), b = oc.createBuffer(planes.length, n, srcRate);
    planes.forEach((p, c) => b.copyToChannel(p, c));
    const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(0);
    const r = await oc.startRendering(); return Array.from({ length: ch }, (_, c) => r.getChannelData(c));
  }

  /* 긴 영상의 말소리 추출: 16kHz 모노 Float32 */
  async function speech16k(file, opt = {}) {
    let P = null; try { P = await probe(file); } catch (_) { P = null; }
    if (P && P.audio && P.audio.ok) {
      const dur = P.dur, total = Math.ceil(dur * 16000) + 16000, out = new Float32Array(total); let w = 0;
      let pend = [], pendN = 0, pendRate = P.audio.sampleRate, pendT = null;
      const flush = async () => {
        if (!pendN) return; const ch = pend[0].length, merged = Array.from({ length: ch }, () => new Float32Array(pendN)); let o = 0;
        for (const pl of pend) { for (let c = 0; c < ch; c++) merged[c].set(pl[c], o); o += pl[0].length; }
        const [m] = await resampleBlock(merged, pendRate, 16000, true);
        let at = Math.max(0, Math.round(pendT * 16000)); if (Math.abs(at - w) < 800) at = w; /* 블록 사이 작은 틈은 이어 붙인다 */
        const room = total - at; out.set(room >= m.length ? m : m.subarray(0, room), at); w = Math.min(total, at + m.length);
        pend = []; pendN = 0; pendT = null;
      };
      await decodeAudioStream(P, 0, dur, async (planes, rate, ts) => {
        if (pendT === null) pendT = ts; pend.push(planes); pendN += planes[0].length;
        if (pendN >= rate * 20) await flush();
      }, opt);
      await flush();
      return { pcm: out.subarray(0, Math.max(w, 1)), via: 'stream', dur };
    }
    if (file.size > SMALL_FALLBACK) throw new Error(P && P.audio ? 'AUDIO_CODEC' : (P ? 'NO_AUDIO' : 'TOO_BIG_FORMAT'));
    let buf; try { buf = await new OfflineAudioContext(1, 1, 16000).decodeAudioData(await file.arrayBuffer()); } catch (e) { throw new Error('NO_AUDIO'); }
    const n = buf.length, ch = buf.numberOfChannels; let out;
    if (ch === 1) out = buf.getChannelData(0).slice(); else { out = new Float32Array(n); for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ch; } }
    return { pcm: out, via: 'decodeAudioData', dur: buf.duration };
  }

  /* 구간 소리: 48kHz 스테레오 AudioBuffer (t0~t1초). 길이가 짧을 때만 쓴다 */
  async function range48(file, t0, t1, opt = {}) {
    t0 = Math.max(0, t0); const len = Math.max(0.05, t1 - t0), N = Math.ceil(len * 48000);
    let P = null; try { P = await probe(file); } catch (_) { P = null; }
    if (P && P.audio && P.audio.ok) {
      const ch = Math.min(2, P.audio.channels || 2), L = Array.from({ length: ch }, () => new Float32Array(N));
      let pend = [], pendN = 0, pendT = null;
      const flush = async () => {
        if (!pendN) return; const c0 = pend[0].length, merged = Array.from({ length: c0 }, () => new Float32Array(pendN)); let o = 0;
        for (const pl of pend) { for (let c = 0; c < c0; c++) merged[c].set(pl[c], o); o += pl[0].length; }
        const outs = await resampleBlock(merged, P.audio.sampleRate, 48000, false);
        const at = Math.round((pendT - t0) * 48000);
        for (let c = 0; c < ch; c++) { const src = outs[Math.min(c, outs.length - 1)]; let s0 = 0, d0 = at; if (d0 < 0) { s0 = -d0; d0 = 0; } const n = Math.min(src.length - s0, N - d0); if (n > 0) L[c].set(src.subarray(s0, s0 + n), d0); }
        pend = []; pendN = 0; pendT = null;
      };
      await decodeAudioStream(P, t0, t1, async (planes, rate, ts) => { if (pendT === null) pendT = ts; pend.push(planes); pendN += planes[0].length; if (pendN >= rate * 15) await flush(); }, opt);
      await flush();
      const ab = new AudioBuffer({ length: N, numberOfChannels: ch, sampleRate: 48000 }); L.forEach((d, c) => ab.copyToChannel(d, c)); return ab;
    }
    if (file.size > SMALL_FALLBACK) throw new Error('TOO_BIG_FORMAT');
    const full = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await file.arrayBuffer());
    const ch = Math.min(2, full.numberOfChannels), ab = new AudioBuffer({ length: N, numberOfChannels: ch, sampleRate: 48000 }), a = Math.floor(t0 * 48000);
    for (let c = 0; c < ch; c++) ab.copyToChannel(full.getChannelData(c).subarray(a, a + N), c);
    return ab;
  }

  /* 영상 프레임을 순서대로 푼다 (t0~t1초). push(frame, timeSec)는 frame을 닫지 않아도 된다 */
  async function decodeVideo(file, t0, t1, push, chk) {
    const P = await probe(file); const V = P.video; if (!V) throw new Error('NO_VIDEO');
    if (V.rotated) throw new Error('ROTATED');
    const sup = await VideoDecoder.isConfigSupported(V.cfg); if (!sup.supported) throw new Error('DECODER ' + V.cfg.codec);
    const smp = V.samples, T = V.T;
    let i0 = 0; for (let i = 0; i < smp.length; i++) { if (smp[i].dts / T > t0 + 0.001) break; if (smp[i].is_sync) i0 = i; }
    let i1 = smp.length; for (let i = i0; i < smp.length; i++) { if (smp[i].dts / T > t1 + 0.8) { i1 = i; break; } }
    let decErr = null;
    const dec = new VideoDecoder({ output: (f) => { try { push(f, f.timestamp / 1e6); } finally { f.close(); } }, error: (e) => { decErr = e; } });
    dec.configure(V.cfg);
    for await (const { s, data } of readSamples(file, smp, i0, i1)) {
      dec.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: Math.round(s.cts / T * 1e6), duration: Math.round(s.duration / T * 1e6), data }));
      while (dec.decodeQueueSize > 10 || (chk && chk().queue > 8)) { await sleep(3); if (decErr) break; }
      if (decErr) throw decErr; const ce = chk && chk().err; if (ce) throw ce;
    }
    await dec.flush(); dec.close(); if (decErr) throw decErr;
  }

  /* 소리 크기 흐름(0.1초 단위)만 빠르게: 하이라이트 찾기용 */
  async function energy10(file, opt = {}) {
    const r = await speech16k(file, opt), pcm = r.pcm, n = Math.floor(pcm.length / 1600), e = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = i * 1600; j < i * 1600 + 1600; j += 4) s += pcm[j] * pcm[j]; e[i] = s; }
    return e;
  }

  window.SCMedia = { probe, speech16k, range48, decodeVideo, energy10, scanBoxes };
})();
