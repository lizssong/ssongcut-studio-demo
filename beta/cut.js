/* 쏭컷 웹 편집기 — 공백 찾기 · 구간 고치기 · 쇼츠 그리기 · 내보내기를 브라우저 안에서만 한다.
 * 공백 계산은 클로드 스킬(songcut.mjs)의 남길구간()과 같은 규칙이다: 무음 앞뒤로 pad 초를 남기고 0.1초 미만 조각은 버린다. */
(() => {
  const $ = (id) => document.getElementById(id);
  const 창 = 0.01;                       // 소리 크기를 재는 칸(초)
  let 글꼴 = "Pretendard Variable";
  const 폰트값 = () => `"${글꼴}", "Pretendard Variable", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  const 상태 = { 파일: null, 길이: 0, 크기: null, 구간: [], 자막: [], 소리있음: true, 내보내는중: false };
  const video = $("src"), view = $("view"), vctx = view.getContext("2d"), tl = $("timeline"), tctx = tl.getContext("2d");
  let 오디오, 소스, 녹음목적지;

  const 시각 = (s) => { const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`; };
  const 값 = () => ({ db: Number($("db").value), min: Number($("min").value), pad: Number($("pad").value) });
  const 남긴것 = () => 상태.구간.filter((g) => g.살림);
  const 반올림 = (n) => Number(n.toFixed(3));

  /* ── 1. 영상 열기 ─────────────────────────────── */
  const drop = $("drop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) 열기(e.dataTransfer.files[0]); });
  $("file").addEventListener("change", (e) => e.target.files[0] && 열기(e.target.files[0]));

  async function 열기(파일) {
    상태.파일 = 파일;
    drop.querySelector("h3").textContent = "소리를 읽는 중…";
    video.src = URL.createObjectURL(파일);
    await new Promise((ok, no) => { video.onloadedmetadata = ok; video.onerror = () => no(new Error("이 브라우저가 열 수 없는 영상 형식입니다")); }).catch((e) => { alert(e.message); throw e; });
    상태.길이 = video.duration;
    오디오 = 오디오 || new AudioContext();
    try {
      let 소리;
      if (window.SCMedia && (파일.size > 150 * 1048576 || 상태.길이 > 600)) {
        /* 긴 영상은 통째로 풀지 않고 조금씩 읽어 16kHz 소리만 만든다 */
        drop.querySelector("h3").textContent = "긴 영상의 소리를 읽는 중… (1시간 영상은 약 1분)";
        const r = await window.SCMedia.speech16k(파일);
        소리 = { duration: r.pcm.length / 16000, sampleRate: 16000, numberOfChannels: 1, getChannelData: () => r.pcm };
      } else 소리 = await 오디오.decodeAudioData(await 파일.arrayBuffer());
      상태.크기 = 소리크기(소리);
      상태.소리있음 = true;
    } catch {
      상태.크기 = null;
      상태.소리있음 = false;
      alert("소리를 읽지 못했습니다(소리가 없는 영상일 수 있습니다). 공백 자르기 없이 화면·글자만 바꿀 수 있습니다.");
    }
    if (!소스) {
      소스 = 오디오.createMediaElementSource(video);
      녹음목적지 = 오디오.createMediaStreamDestination();
      소스.connect(오디오.destination);
      소스.connect(녹음목적지);
    }
    await 글꼴준비();
    drop.classList.add("hidden");
    $("work").classList.remove("hidden");
    ["export", "json", "ffcmd"].forEach((id) => ($(id).disabled = false));
    다시계산();
    화면크기();
    video.currentTime = 0;
    video.onseeked = 그리기;
  }

  /* 칸마다 가장 큰 소리(dB) — ffmpeg silencedetect 처럼 표본의 크기를 본다 */
  function 소리크기(buf) {
    const n = Math.ceil(buf.duration / 창), 칸 = Math.floor(buf.sampleRate * 창), out = new Float32Array(n);
    const ch = [...Array(buf.numberOfChannels).keys()].map((i) => buf.getChannelData(i));
    for (let i = 0; i < n; i++) {
      let 최대 = 0;
      for (const d of ch) for (let k = i * 칸, e = Math.min(d.length, k + 칸); k < e; k++) { const v = Math.abs(d[k]); if (v > 최대) 최대 = v; }
      out[i] = 20 * Math.log10(최대 + 1e-9);
    }
    return out;
  }

  /* ── 2. 공백 → 남길 구간 ─────────────────────────── */
  function 무음찾기(크기, db, min) {
    const 구간 = [];
    let 시작 = -1;
    for (let i = 0; i <= 크기.length; i++) {
      const 조용 = i < 크기.length && 크기[i] < db;
      if (조용 && 시작 < 0) 시작 = i;
      if (!조용 && 시작 >= 0) { if ((i - 시작) * 창 >= min) 구간.push([시작 * 창, i * 창]); 시작 = -1; }
    }
    return 구간;
  }
  function 남길구간(무음, 길이, pad) {
    const 남김 = [];
    let 앞 = 0;
    for (const [s, e] of 무음) {
      const 끝 = Math.min(길이, s + pad);
      if (끝 - 앞 > 0.1) 남김.push([앞, 끝]);
      앞 = Math.max(앞, Math.min(길이, e - pad));
    }
    if (길이 - 앞 > 0.1) 남김.push([앞, 길이]);
    return 남김;
  }
  function 다시계산() {
    const { db, min, pad } = 값();
    $("dbV").textContent = `${db} dB`; $("minV").textContent = `${min.toFixed(2)}초`; $("padV").textContent = `${pad.toFixed(2)}초`;
    const 남김 = 상태.크기 ? 남길구간(무음찾기(상태.크기, db, min), 상태.길이, pad) : [[0, 상태.길이]];
    상태.구간 = [];
    let 앞 = 0;
    for (const [a, b] of 남김) { if (a > 앞) 상태.구간.push({ a: 앞, b: a, 살림: false }); 상태.구간.push({ a, b, 살림: true }); 앞 = b; }
    if (앞 < 상태.길이) 상태.구간.push({ a: 앞, b: 상태.길이, 살림: false });
    통계(); 타임라인();
  }
  function 통계() {
    const 새 = 남긴것().reduce((n, g) => n + g.b - g.a, 0);
    $("sBefore").textContent = 시각(상태.길이);
    $("sAfter").textContent = 시각(새);
    $("sPct").textContent = 상태.길이 ? `${Math.round((1 - 새 / 상태.길이) * 100)}%` : "-";
  }
  ["db", "min", "pad"].forEach((id) => $(id).addEventListener("input", () => 상태.길이 && 다시계산()));

  /* ── 3. 타임라인 ─────────────────────────────── */
  const 띠 = 28;   // 아래쪽 살리기/자르기 띠 높이(CSS px)
  function 타임라인() {
    const dpr = devicePixelRatio || 1, W = tl.clientWidth, H = tl.clientHeight;
    tl.width = W * dpr; tl.height = H * dpr; tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement), 잉크 = css.getPropertyValue("--ink"), 붉 = css.getPropertyValue("--brand"), 민트 = css.getPropertyValue("--mint");
    tctx.clearRect(0, 0, W, H);
    if (!상태.길이) return;
    const x = (t) => (t / 상태.길이) * W, 위 = H - 띠 - 6;
    for (const g of 상태.구간) if (!g.살림) { tctx.fillStyle = css.getPropertyValue("--cut"); tctx.fillRect(x(g.a), 0, Math.max(1, x(g.b) - x(g.a)), 위); }
    if (상태.크기) {
      tctx.fillStyle = 잉크;
      const 한칸 = 상태.크기.length / W;
      for (let px = 0; px < W; px++) {
        let m = -90;
        for (let i = Math.floor(px * 한칸), e = Math.floor((px + 1) * 한칸); i <= e && i < 상태.크기.length; i++) m = Math.max(m, 상태.크기[i]);
        const h = Math.max(1, ((m + 60) / 60) * (위 - 8));
        tctx.globalAlpha = .7; tctx.fillRect(px, (위 - h) / 2 + 4, 1, h);
      }
      tctx.globalAlpha = 1;
    }
    for (const g of 상태.구간) {
      tctx.fillStyle = g.살림 ? 민트 : 붉;
      tctx.fillRect(x(g.a) + .5, H - 띠, Math.max(1, x(g.b) - x(g.a) - 1), 띠);
    }
    tctx.fillStyle = 붉; tctx.fillRect(x(video.currentTime) - 1, 0, 2, H);
  }
  tl.addEventListener("pointerdown", (e) => {
    if (!상태.길이 || 상태.내보내는중) return;
    const r = tl.getBoundingClientRect(), t = ((e.clientX - r.left) / r.width) * 상태.길이;
    if (e.clientY - r.top > r.height - 띠) {
      const g = 상태.구간.find((g) => t >= g.a && t < g.b);
      if (g) { g.살림 = !g.살림; 통계(); 타임라인(); }
    } else video.currentTime = Math.max(0, Math.min(상태.길이 - 0.01, t));
  });
  addEventListener("resize", () => { 타임라인(); 화면크기(); });

  /* ── 4. 그리기(미리보기와 내보내기가 같은 함수를 쓴다) ───── */
  function 화면크기() {
    const 판 = $("layout").value;
    if (판 === "shorts") { view.width = 1080; view.height = 1920; }
    else if (판 === "square") { view.width = 1080; view.height = 1080; }
    else { view.width = video.videoWidth || 1280; view.height = video.videoHeight || 720; }
    그리기();
  }
  function 줄나누기(ctx, 글, 폭) {
    const 줄 = [];
    for (const 문단 of String(글).split("\n")) {
      let 지금 = "";
      for (const 낱 of 문단.split(/(\s+)/)) {
        if (ctx.measureText(지금 + 낱).width <= 폭) { 지금 += 낱; continue; }
        if (지금.trim()) 줄.push(지금.trim());
        지금 = "";
        for (const 자 of 낱.trimStart()) { if (ctx.measureText(지금 + 자).width > 폭 && 지금) { 줄.push(지금); 지금 = ""; } 지금 += 자; }
      }
      if (지금.trim()) 줄.push(지금.trim());
    }
    return 줄;
  }
  function 글자(ctx, 글, cx, y, 크기, 폭, 아래부터) {
    ctx.font = `${글꼴굵기()} ${크기}px ${폰트값()}`;
    ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.lineJoin = "round";
    const 줄 = 줄나누기(ctx, 글, 폭), 높이 = 크기 * 1.3, 시작 = 아래부터 ? y - 줄.length * 높이 : y;
    줄.forEach((l, i) => {
      ctx.lineWidth = 크기 * 0.16; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(l, cx, 시작 + i * 높이);
      ctx.fillStyle = "#fff"; ctx.fillText(l, cx, 시작 + i * 높이);
    });
  }
  function 그리기(나온시간, 원본, 원본시간) {
    const 그림 = 원본 || video;
    if (!원본 && !video.videoWidth) return;
    const W = view.width, H = view.height, vw = 원본 ? (원본.displayWidth || 원본.codedWidth) : video.videoWidth, vh = 원본 ? (원본.displayHeight || 원본.codedHeight) : video.videoHeight;
    const 지금 = 원본시간 ?? video.currentTime;
    vctx.save();
    vctx.fillStyle = "#000"; vctx.fillRect(0, 0, W, H);
    if (Math.abs(W / H - vw / vh) > 0.01) {
      const 덮 = Math.max(W / vw, H / vh);
      vctx.filter = "blur(28px) brightness(0.8)";
      vctx.drawImage(그림, (W - vw * 덮) / 2, (H - vh * 덮) / 2, vw * 덮, vh * 덮);
      vctx.filter = "none";
    }
    const 맞 = Math.min(W / vw, H / vh);
    vctx.drawImage(그림, (W - vw * 맞) / 2, (H - vh * 맞) / 2, vw * 맞, vh * 맞);
    const 기준 = Math.min(W, H) / 1080, 제목 = $("title").value.trim();
    const t = 나온시간 ?? 출력시간(지금);
    if (제목 && t < Number($("titleSec").value)) 글자(vctx, 제목, W / 2, H * (H > W ? 0.12 : 0.08), 84 * 기준, W * 0.86, false);
    const 큐 = 상태.자막.find((c) => 지금 >= c.a && 지금 < c.b);
    if (큐) 글자(vctx, 큐.글, W / 2, H * (H > W ? 0.8 : 0.92), 62 * 기준, W * 0.86, true);
    vctx.restore();
  }
  /* 원본 시간 → 자른 결과의 시간(미리보기에서 제목이 언제 사라질지 계산할 때 쓴다) */
  function 출력시간(t) {
    let n = 0;
    for (const g of 남긴것()) { if (t >= g.b) n += g.b - g.a; else { if (t > g.a) n += t - g.a; break; } }
    return n;
  }
  ["layout"].forEach((id) => $(id).addEventListener("change", 화면크기));
  ["title", "titleSec"].forEach((id) => $(id).addEventListener("input", () => { $("titleSecV").textContent = `${$("titleSec").value}초`; 그리기(); }));

  /* 글꼴 — 고르면 그때 내려받는다 */
  const 굵기표 = { "Pretendard Variable": 900, "Noto Sans KR": 900, "Black Han Sans": 400, "Do Hyeon": 400, "Jua": 400, "Bagel Fat One": 400, "Noto Serif KR": 900, "Nanum Pen Script": 400, "Gaegu": 700 };
  const 글꼴굵기 = () => 굵기표[글꼴] || 700;
  const 받은글꼴 = new Set(["Pretendard Variable"]);
  async function 글꼴준비() {
    if (!받은글꼴.has(글꼴)) {
      받은글꼴.add(글꼴);
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + 글꼴.replace(/ /g, "+") + ":wght@" + 글꼴굵기() + "&display=swap";
      await new Promise((ok) => { l.onload = ok; l.onerror = ok; document.head.appendChild(l); });
    }
    const 글 = $("title").value + 상태.자막.map((c) => c.글).join("") + "쏭컷0123456789";
    await document.fonts.load(`${글꼴굵기()} 72px "${글꼴}"`, 글).catch(() => {});
  }
  $("font").addEventListener("change", async (e) => { 글꼴 = e.target.value; await 글꼴준비(); 그리기(); });
  $("title").addEventListener("change", async () => { await 글꼴준비(); 그리기(); });

  /* 자막 */
  $("srt").addEventListener("change", async (e) => {
    const 글 = await e.target.files[0].text();
    const 초 = (h, m, s, ms) => +h * 3600 + +m * 60 + +s + +ms / 1000;
    상태.자막 = 글.replace(/\r/g, "").split(/\n\s*\n/).map((b) => {
      const m = b.match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
      if (!m) return null;
      const 줄 = b.split("\n"), i = 줄.findIndex((l) => l.includes("-->"));
      return { a: 초(m[1], m[2], m[3], m[4]), b: 초(m[5], m[6], m[7], m[8]), 글: 줄.slice(i + 1).join("\n").trim() };
    }).filter(Boolean);
    $("srtInfo").textContent = `자막 ${상태.자막.length}개를 읽었습니다.`;
    await 글꼴준비();
    그리기();
  });

  /* ── 5. 미리보기 ─────────────────────────────── */
  function 다음남김(t) { return 남긴것().find((g) => g.b > t + 0.001); }
  function 돌기() {
    if (!video.paused && !상태.내보내는중 && $("skip").checked) {
      const 지금 = 상태.구간.find((g) => video.currentTime >= g.a && video.currentTime < g.b);
      if (지금 && !지금.살림) { const n = 다음남김(video.currentTime); if (n) video.currentTime = n.a; else video.pause(); }
    }
    그리기(상태.내보내는중 ? 내보내기시간() : undefined);
    타임라인();
    $("clock").textContent = 시각(video.currentTime);
    $("play").textContent = video.paused ? "▶ 미리보기" : "❚❚ 멈춤";
    requestAnimationFrame(돌기);
  }
  requestAnimationFrame(돌기);
  $("play").addEventListener("click", async () => {
    if (상태.내보내는중) return;
    await 오디오?.resume();
    if (video.paused) { if (video.currentTime >= 상태.길이 - 0.05) video.currentTime = 남긴것()[0]?.a || 0; video.play(); } else video.pause();
  });

  /* ── 6. 내보내기 ─────────────────────────────── */
  let 녹화시작 = 0, 녹화누적 = 0;
  const 내보내기시간 = () => 녹화누적 + (녹화시작 ? (performance.now() - 녹화시작) / 1000 : 0);
  const 기다려 = (el, ev) => new Promise((ok) => el.addEventListener(ev, ok, { once: true }));
  function 형식() {
    const 후보 = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return 후보.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  }
  /* 빠르고 정확한 저장: 남길 조각만 풀어서 그리고 MP4(H.264+AAC)로 바로 만든다. 탭을 옮겨도 멈추지 않는다 */
  async function 내보내기WC(조각, 총) {
    if (!window.SCMedia || !window.VideoEncoder || !window.AudioEncoder) throw new Error('NO_WC');
    const 파일 = 상태.파일, P = await window.SCMedia.probe(파일);
    if (!P.video || P.video.rotated) throw new Error('NO_WC');
    const M = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm');
    const W = view.width - view.width % 2, H = view.height - view.height % 2, FPS = 30;
    let vcfg = null;
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.640033']) { const c = { codec, width: W, height: H, bitrate: Math.max(W, H) >= 1900 ? 8e6 : 5e6, framerate: FPS, avc: { format: 'avc' } }; try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch (_) {} }
    if (!vcfg) throw new Error('NO_WC');
    const 소리켬 = 상태.소리있음 && P.audio && P.audio.ok, acfg = { codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 };
    const 소리됨 = 소리켬 && (await AudioEncoder.isConfigSupported(acfg)).supported;
    const 긴 = 총 > 300; let target, fh = null, ws = null;
    if (긴) { const root = await navigator.storage.getDirectory(); for await (const [n] of root.entries()) if (/^cut-/.test(n)) { try { await root.removeEntry(n); } catch (_) {} } fh = await root.getFileHandle('cut-' + Date.now() + '.mp4', { create: true }); ws = await fh.createWritable(); target = new M.FileSystemWritableFileStreamTarget(ws); }
    else target = new M.ArrayBufferTarget();
    const mux = new M.Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: 소리됨 ? { codec: 'aac', sampleRate: 48000, numberOfChannels: 2 } : undefined, fastStart: 긴 ? false : 'in-memory', firstTimestampBehavior: 'offset' });
    let 오류 = null;
    const ve = new VideoEncoder({ output: (c, m) => mux.addVideoChunk(c, m), error: (e) => { 오류 = e; } }); ve.configure(vcfg);
    const ae = 소리됨 ? new AudioEncoder({ output: (c, m) => mux.addAudioChunk(c, m), error: (e) => { 오류 = e; } }) : null; if (ae) ae.configure(acfg);
    let 나간 = 0, 장 = 0, 마지막 = -1;
    for (const [i, [a, b]] of 조각.entries()) {
      const 기준 = 나간;
      if (ae) { /* 조각 소리: 이음새에서 딸깍 소리가 나지 않게 아주 짧게 줄였다 키운다 */
        const buf = await window.SCMedia.range48(파일, a, b), sr = 48000, n = Math.round((b - a) * sr), c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : c0, f = 240;
        for (let off = 0; off < n; off += 1024) { const k = Math.min(1024, n - off), d = new Float32Array(k * 2); for (let j = 0; j < k; j++) { const p = off + j, g = Math.min(1, p / f, (n - p) / f); d[j] = (c0[p] || 0) * g; d[k + j] = (c1[p] || 0) * g; }
          const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round((기준 + off / sr) * 1e6), data: d }); ae.encode(ad); ad.close(); if (오류) throw 오류; }
      }
      await window.SCMedia.decodeVideo(파일, a, b, (frame, t) => {
        if (t < a - 0.001 || t >= b) return; const ot = 기준 + (t - a); if (ot - 마지막 < 1 / (FPS + 1)) return;
        그리기(ot, frame, t); const vf = new VideoFrame(view, { timestamp: Math.round(ot * 1e6), duration: Math.round(1e6 / FPS) }); ve.encode(vf, { keyFrame: 장 % (FPS * 2) === 0 }); vf.close(); 장++; 마지막 = ot;
        $("bar").style.width = `${Math.min(99, (ot / 총) * 100)}%`; $("progText").textContent = `조각 ${i + 1}/${조각.length} · ${시각(ot)} / ${시각(총)}`;
      }, () => ({ err: 오류, queue: ve.encodeQueueSize }));
      나간 += b - a;
    }
    await ve.flush(); ve.close(); if (ae) { await ae.flush(); ae.close(); } if (오류) throw 오류;
    mux.finalize();
    let blob; if (긴) { await ws.close(); blob = await fh.getFile(); } else blob = new Blob([target.buffer], { type: 'video/mp4' });
    return { blob, 확장: 'mp4' };
  }
  async function 내보내기() {
    if (!상태.내보내는중) {
      const 조각0 = 남긴것().map((g) => [g.a, g.b]); const 후0 = $("hook").value === "" ? null : Math.max(0, Math.min(Number($("hook").value), 상태.길이 - 0.5)); if (후0 !== null) 조각0.unshift([후0, Math.min(상태.길이, 후0 + 3)]);
      if (조각0.length) {
        const 총0 = 조각0.reduce((n, [a, b]) => n + b - a, 0);
        상태.내보내는중 = true; video.pause(); $("export").disabled = true; $("prog").classList.remove("hidden");
        try {
          const r = await 내보내기WC(조각0, 총0); const a = document.createElement("a"); a.href = URL.createObjectURL(r.blob); a.download = `${상태.파일.name.replace(/\.[^.]+$/, "")}_songcut.mp4`; a.click(); window.__cutLast = r;
          $("bar").style.width = '100%'; $("progText").textContent = `끝 — ${a.download} (${(r.blob.size / 1048576).toFixed(1)}MB · ${시각(총0)})`; return;
        } catch (e) { if (e && e.message !== 'NO_WC') { console.warn(e); $("progText").textContent = `빠른 저장이 안 돼 실시간 녹화로 저장해요 — ${e.message}`; } }
        finally { 상태.내보내는중 = false; $("export").disabled = false; }
      }
    }
    const 종류 = 형식();
    if (!종류) return alert("이 브라우저는 영상 녹화(MediaRecorder)를 지원하지 않습니다. 크롬이나 엣지에서 열어 주세요.");
    const 조각 = 남긴것().map((g) => [g.a, g.b]);
    const 후 = $("hook").value === "" ? null : Math.max(0, Math.min(Number($("hook").value), 상태.길이 - 0.5));
    if (후 !== null) 조각.unshift([후, Math.min(상태.길이, 후 + 3)]);
    if (!조각.length) return alert("남길 구간이 없습니다.");
    const 총 = 조각.reduce((n, [a, b]) => n + b - a, 0);

    상태.내보내는중 = true; video.pause(); await 오디오.resume();
    $("export").disabled = true; $("prog").classList.remove("hidden");
    const 흐름 = view.captureStream(30);
    if (상태.소리있음) 녹음목적지.stream.getAudioTracks().forEach((t) => 흐름.addTrack(t));
    const 녹 = new MediaRecorder(흐름, { mimeType: 종류, videoBitsPerSecond: 8_000_000 }), 덩이 = [];
    녹.ondataavailable = (e) => e.data.size && 덩이.push(e.data);
    const 끝남 = 기다려(녹, "stop");
    녹화누적 = 0; 녹화시작 = 0;
    try {
      for (const [i, [a, b]] of 조각.entries()) {
        video.currentTime = a; await 기다려(video, "seeked");
        그리기(내보내기시간());
        if (녹.state === "inactive") 녹.start(250); else 녹.resume();
        녹화시작 = performance.now();
        await video.play();
        await new Promise((ok) => { const 봄 = () => { if (video.currentTime >= b - 0.02 || video.ended) ok(); else requestAnimationFrame(봄); }; 봄(); });
        video.pause(); 녹.pause();
        녹화누적 += (performance.now() - 녹화시작) / 1000; 녹화시작 = 0;
        $("bar").style.width = `${Math.min(100, (녹화누적 / 총) * 100)}%`;
        $("progText").textContent = `조각 ${i + 1}/${조각.length} · ${시각(녹화누적)} / ${시각(총)}`;
      }
      녹.stop(); await 끝남;
      const 확장 = 종류.startsWith("video/mp4") ? "mp4" : "webm";
      const blob = new Blob(덩이, { type: 종류.split(";")[0] });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${상태.파일.name.replace(/\.[^.]+$/, "")}_songcut.${확장}`;
      a.click();
      $("progText").textContent = `끝 — ${a.download} (${(blob.size / 1048576).toFixed(1)}MB · ${시각(총)})`;
    } catch (e) {
      if (녹.state !== "inactive") 녹.stop();
      $("progText").textContent = `내보내지 못했습니다 — ${e.message}`;
    } finally {
      상태.내보내는중 = false; $("export").disabled = false;
    }
  }
  $("export").addEventListener("click", 내보내기);

  /* 구간 JSON — 클로드 스킬의 _cut.json 과 같은 모양 */
  function 보고서() {
    const 남김 = 남긴것().map((g) => [반올림(g.a), 반올림(g.b)]), 새 = 남김.reduce((n, [a, b]) => n + b - a, 0);
    return { 원본: 상태.파일.name, 원래길이: 반올림(상태.길이), 새길이: 반올림(새), 줄어든초: 반올림(상태.길이 - 새), 줄어든비율: Math.round((1 - 새 / 상태.길이) * 100), 남긴조각: 남김.length, 설정: 값(), 남긴구간: 남김 };
  }
  $("json").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(보고서(), null, 2)], { type: "application/json" }));
    a.download = `${상태.파일.name.replace(/\.[^.]+$/, "")}_cut.json`;
    a.click();
  });
  $("ffcmd").addEventListener("click", async () => {
    const r = 보고서(), 식 = r.남긴구간.map(([a, b]) => `between(t,${a},${b})`).join("+"), 이름 = r.원본;
    const 명령 = `ffmpeg -i "${이름}" -filter_complex "[0:v]select='${식}',setpts=N/FRAME_RATE/TB[v];[0:a]aselect='${식}',asetpts=N/SR/TB[a]" -map "[v]" -map "[a]" "${이름.replace(/\.[^.]+$/, "")}_cut.mp4"`;
    try { await navigator.clipboard.writeText(명령); $("ffcmd").textContent = "복사했어요 ✓"; } catch { prompt("아래 명령을 복사하세요", 명령); }
    setTimeout(() => ($("ffcmd").textContent = "ffmpeg 명령 복사"), 1800);
  });

  window.__songcut = 상태;   // 시험용
})();
