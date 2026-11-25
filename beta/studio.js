/* 쏭컷 스튜디오 — 사진·영상 편집
 * 모든 화면은 "시간 t의 함수"로 그린다(renderFrame). 미리보기와 저장이 같은 함수를 쓰므로 보이는 그대로 저장된다.
 * 파일은 브라우저 안에서만 처리하고 어디에도 올리지 않는다. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const eInOut = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eBack = (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const spring = (x) => x <= 0 ? 0 : 1 - Math.exp(-7 * x) * Math.cos(11 * x);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const tick = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s - m * 60)).padStart(2, '0')}`; };
const dateStr = (d) => `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const FPS = 30;
const RATIOS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] };

/* ---------- 글꼴 ---------- */
const FONTS = [
  { f: 'Pretendard Variable', n: '프리텐다드', g: '고딕', w: [400, 600, 800, 900], local: true },
  { f: 'Noto Sans KR', n: '노토 산스', g: '고딕', w: [400, 700, 900] },
  { f: 'IBM Plex Sans KR', n: '플렉스 산스', g: '고딕', w: [400, 700] },
  { f: 'Gothic A1', n: '고딕 A1', g: '고딕', w: [400, 700, 900] },
  { f: 'Nanum Gothic', n: '나눔고딕', g: '고딕', w: [400, 700, 800] },
  { f: 'Gowun Dodum', n: '고운돋움', g: '고딕', w: [400] },
  { f: 'Orbit', n: '오르빗', g: '고딕', w: [400] },
  { f: 'Black Han Sans', n: '검은고딕', g: '제목', w: [400] },
  { f: 'Do Hyeon', n: '도현', g: '제목', w: [400] },
  { f: 'Jua', n: '주아', g: '제목', w: [400] },
  { f: 'Bagel Fat One', n: '베이글팻', g: '제목', w: [400] },
  { f: 'Gasoek One', n: '가석', g: '제목', w: [400] },
  { f: 'Gugi', n: '구기', g: '제목', w: [400] },
  { f: 'Sunflower', n: '해바라기', g: '제목', w: [300, 500, 700] },
  { f: 'Dongle', n: '동글', g: '제목', w: [400, 700] },
  { f: 'Kirang Haerang', n: '기랑해랑', g: '제목', w: [400] },
  { f: 'Black And White Picture', n: '흑백사진', g: '제목', w: [400] },
  { f: 'Stylish', n: '스타일리시', g: '제목', w: [400] },
  { f: 'Noto Serif KR', n: '노토 세리프', g: '명조', w: [400, 700, 900] },
  { f: 'Nanum Myeongjo', n: '나눔명조', g: '명조', w: [400, 700, 800] },
  { f: 'Gowun Batang', n: '고운바탕', g: '명조', w: [400, 700] },
  { f: 'Song Myung', n: '송명', g: '명조', w: [400] },
  { f: 'Hahmlet', n: '함렛', g: '명조', w: [400, 700, 900] },
  { f: 'Diphylleia', n: '산수국', g: '명조', w: [400] },
  { f: 'Nanum Pen Script', n: '나눔 펜글씨', g: '손글씨', w: [400] },
  { f: 'Nanum Brush Script', n: '나눔 붓글씨', g: '손글씨', w: [400] },
  { f: 'Gaegu', n: '개구', g: '손글씨', w: [400, 700] },
  { f: 'Hi Melody', n: '하이멜로디', g: '손글씨', w: [400] },
  { f: 'Gamja Flower', n: '감자꽃', g: '손글씨', w: [400] },
  { f: 'Poor Story', n: '서툰이야기', g: '손글씨', w: [400] },
  { f: 'Single Day', n: '싱글데이', g: '손글씨', w: [400] },
  { f: 'Yeon Sung', n: '연성', g: '손글씨', w: [400] },
  { f: 'Cute Font', n: '귀여운글씨', g: '손글씨', w: [400] },
  { f: 'East Sea Dokdo', n: '동해독도', g: '손글씨', w: [400] },
  { f: 'Dokdo', n: '독도', g: '손글씨', w: [400] },
];
const FONT = (f) => FONTS.find((x) => x.f === f);
const fontReady = new Set();
function useFont(f) {
  const F = FONT(f); if (!F || F.local || fontReady.has(f)) return;
  fontReady.add(f);
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@' + F.w.join(';') + '&display=swap';
  F._css = new Promise((r) => { l.onload = r; l.onerror = r; });
  document.head.appendChild(l);
}
const fontStr = (L, size) => `${L.weight} ${size}px "${L.font}","Pretendard Variable","Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
async function loadFontPreviews() {
  try {
    const fams = FONTS.filter((f) => !f.local);
    const text = [...new Set(fams.map((f) => f.n).join('') + '가나다')].join('');
    const url = 'https://fonts.googleapis.com/css2?' + fams.map((f) => 'family=' + f.f.replace(/ /g, '+') + ':wght@' + (f.w.find((x) => x >= 400) || f.w[0])).join('&') + '&text=' + encodeURIComponent(text) + '&display=swap';
    const res = await fetch(url); if (!res.ok) return;
    const st = document.createElement('style');
    st.textContent = (await res.text()).replace(/font-family:\s*'([^']+)'/g, "font-family: 'pv-$1'");
    document.head.appendChild(st);
  } catch (_) { /* 미리보기 글꼴이 없어도 이름은 보인다 */ }
}

/* ---------- 글자 스타일 묶음 ---------- */
const TP = {
  impact: { n: '임팩트', font: 'Black Han Sans', weight: 400, color: '#ffffff', accent: '#ffe14d', stroke: 1, strokeColor: '#000000', strokeW: 14, shadow: 1, box: 'none' },
  recap: { n: '요약 자막', font: 'Pretendard Variable', weight: 900, color: '#ffffff', accent: '#ffd400', stroke: 1, strokeColor: '#000000', strokeW: 10, shadow: 0, box: 'none' },
  lavender: { n: '라벤더', font: 'Pretendard Variable', weight: 800, color: '#1a1030', accent: '#7c3aed', stroke: 0, shadow: 0, box: 'pill', boxColor: '#c4b5fd', boxAlpha: 1 },
  clean: { n: '클린', font: 'Noto Sans KR', weight: 700, color: '#ffffff', accent: '#5eead4', stroke: 0, shadow: 0, box: 'box', boxColor: '#000000', boxAlpha: .6 },
  hook: { n: '흰 띠', font: 'Pretendard Variable', weight: 900, color: '#111111', accent: '#e11d48', stroke: 0, shadow: 0, box: 'band', boxColor: '#ffffff', boxAlpha: 1 },
  cute: { n: '귀엽게', font: 'Jua', weight: 400, color: '#ffffff', accent: '#ffe08a', stroke: 1, strokeColor: '#ff5c8a', strokeW: 13, shadow: 1, box: 'none' },
  hand: { n: '손글씨', font: 'Nanum Pen Script', weight: 400, color: '#ffffff', accent: '#ffd9a0', stroke: 1, strokeColor: '#3b2a1a', strokeW: 8, shadow: 1, box: 'none' },
  serif: { n: '감성 명조', font: 'Noto Serif KR', weight: 700, color: '#fff8e7', accent: '#f5c26b', stroke: 0, shadow: 1, box: 'none' },
  marker: { n: '형광펜', font: 'Do Hyeon', weight: 400, color: '#ffffff', accent: '#ffe14d', stroke: 0, shadow: 1, box: 'marker', boxColor: '#ec4899', boxAlpha: .9 },
  neon: { n: '네온', font: 'Do Hyeon', weight: 400, color: '#ffffff', accent: '#22d3ee', stroke: 0, shadow: 2, box: 'none' },
};
const STYLE_KEYS = ['font', 'weight', 'size', 'color', 'accent', 'stroke', 'strokeColor', 'strokeW', 'shadow', 'box', 'boxColor', 'boxAlpha', 'align', 'ls', 'lh', 'anim'];

/* ---------- 영상 종류별 묶음(템플릿) ---------- */
const PACKS = {
  memory: { n: '일상·추억', d: '따뜻한 색, 날짜 표시, 부드러운 전환', sw: ['#ff8a7a', '#ffc56b'], layout: 'blur', trans: 'fade', look: 'warm', date: true, cap: 'cute', capAnim: 'fade',
    title: { font: 'Jua', weight: 400, color: '#ffffff', accent: '#fff3b0', stroke: 0, shadow: 1, box: 'none', anim: 'bounce' },
    guide: '추천 순서: 제목 카드 → 사진·동영상(찍은 날짜순) → 끝맺음 한마디. 동영상은 웃음·환호처럼 소리가 큰 구간을 알아서 골라요.' },
  promo: { n: '홍보 쇼츠', d: '공감 질문 훅 → 할 수 있는 것 → 문의', sw: ['#7c3aed', '#ec4899'], layout: 'fill', trans: 'slide', look: 'vivid', date: false, cap: 'impact', capAnim: 'punch',
    title: { font: 'Black Han Sans', weight: 400, color: '#ffffff', accent: '#ffe14d', stroke: 0, shadow: 1, box: 'none', anim: 'punch' },
    guide: '추천 순서: 첫 3초 훅(공감 질문) → 할 수 있는 것 세 가지를 장면마다 한 줄씩 → 마지막 카드에 이름·문의처. 연락처는 맨 끝 카드에 크게 넣어야 읽을 시간이 생겨요.' },
  product: { n: '신메뉴·상품', d: '감성 한 줄 → 제품 → 이름 → 가격', sw: ['#2b2118', '#6b5237'], layout: 'frame', trans: 'zoom', look: 'natural', date: false, cap: 'serif', capAnim: 'rise',
    title: { font: 'Noto Serif KR', weight: 700, color: '#fff8e7', accent: '#f5c26b', stroke: 0, shadow: 0, box: 'none', anim: 'rise' },
    guide: '추천 순서: 감성 한 줄 → 제품 사진 → 이름 → 가격. 가격과 기간은 마지막 장면에서 가장 크게 넣고, 끝 1~2초는 그대로 멈춰 두세요.' },
  event: { n: '이벤트 공지', d: '혜택 숫자 크게 → 기간 → 행동 한 줄', sw: ['#ffd400', '#ff8a00'], layout: 'fill', trans: 'wipe', look: 'vivid', date: false, cap: 'hook', capAnim: 'punch',
    title: { font: 'Bagel Fat One', weight: 400, color: '#111111', accent: '#e11d48', stroke: 0, shadow: 0, box: 'none', anim: 'count' },
    guide: '추천 순서: 혜택 숫자를 제목 카드에 크게(숫자가 올라가요) → 기간 → "지금 신청" 같은 행동 한 줄. 실제 할인율과 날짜만 적어 주세요.' },
  lecture: { n: '강의·후기', d: '깔끔한 글자, 차분한 전환', sw: ['#0f172a', '#334155'], layout: 'blur', trans: 'fade', look: 'natural', date: false, cap: 'clean', capAnim: 'rise',
    title: { font: 'Pretendard Variable', weight: 800, color: '#ffffff', accent: '#5eead4', stroke: 0, shadow: 0, box: 'none', anim: 'rise' },
    guide: '추천 순서: 강의명 크게 → 현장 사진·영상 → 수강생 후기 한 줄씩 → 문의처. 후기는 실제로 받은 문장만 넣어 주세요.' },
  vlog: { n: '브이로그·여행', d: '밝은 색감, 경쾌한 전환, 장소 자막', sw: ['#22d3ee', '#a78bfa'], layout: 'fill', trans: 'whip', look: 'vivid', date: true, cap: 'cute', capAnim: 'pop',
    title: { font: 'Jua', weight: 400, color: '#ffffff', accent: '#fef08a', stroke: 0, shadow: 1, box: 'none', anim: 'bounce' },
    guide: '추천 순서: 장소 이름 제목 카드 → 사진·영상(시간순) → 마지막 한마디. 장면마다 장소나 느낌을 한 줄 자막으로 넣으면 좋아요.' },
  youtube: { n: '롱폼·유튜브', d: '가로 16:9, 동영상 전체 길이, 깔끔한 자막', sw: ['#ef4444', '#111827'], layout: 'fill', trans: 'fade', look: 'natural', date: false, cap: 'clean', capAnim: 'fade', ratio: '16:9', clipFull: true,
    title: { font: 'Pretendard Variable', weight: 900, color: '#ffffff', accent: '#ef4444', stroke: 0, shadow: 1, box: 'none', anim: 'rise' },
    guide: '가로 영상(유튜브 일반 영상)용이에요. 동영상은 전체 길이로 들어가고, 장면 탭에서 시작·끝을 잘라 쓸 수 있어요. 긴 영상은 저장에 영상 길이의 절반~비슷한 시간이 걸려요.' },
  recap: { n: '요약 쇼츠', d: '위 제목 띠 + 가운데 사진 + 아래 자막', sw: ['#111118', '#ffd400'], card: ['#0b0b10', '#22222e'], layout: 'recap', trans: 'none', look: 'natural', date: false, cap: 'recap', capAnim: 'word',
    title: { font: 'Pretendard Variable', weight: 900, color: '#ffffff', accent: '#ffd400', stroke: 0, shadow: 0, box: 'none', anim: 'punch' },
    guide: '추천 순서: 위쪽 고정 제목 두 줄 → 첫 3초 훅 문구 → 장면마다 자막 한두 줄. 강조할 한 단어만 *별표*로 감싸면 노란색이 돼요.' },
};

/* ---------- 상태 ---------- */
const P = { pack: 'memory', ratio: '9:16', W: 1080, H: 1920, layout: 'blur', transition: 'fade', transDur: .4, photoSec: 3, clipSec: 5,
  hook: '', fixedTitle: '', brand: '', dateStamp: true, bg1: '#ff8a7a', bg2: '#ffc56b', look: 'warm', autoFix: true, safe: false,
  clipFull: false, origSound: true, music: { buf: null, name: '', vol: .6, duck: true, id: 0, lib: '' }, sfx: '', sfxVol: .7,
  mv: { on: false, beats: [], strong: [], bpm: 0, per: 2, pulse: true, flash: false, len: 'auto', start: 0, analyzing: false }, scenes: [] };
let sel = null, selText = null;
const PV = { playing: false, t: 0, startAt: 0, src: null };
const EX = { busy: false, cancel: false, last: null };
const view = $('#view'), vctx = view.getContext('2d');
const RV = { ctx: vctx, W: 1080, H: 1920, cA: mk(1080, 1920), cB: mk(1080, 1920), bgc: mk(8, 8), preview: true };

const newText = (o = {}) => Object.assign({ id: uid(), text: '', role: 'free', font: 'Pretendard Variable', weight: 900, size: 64, color: '#ffffff', accent: '#ffe14d',
  stroke: 1, strokeColor: '#000000', strokeW: 14, shadow: 1, box: 'none', boxColor: '#000000', boxAlpha: .6, align: 'center', ls: 0, lh: 1.28, x: .5, y: .5, anim: 'fade', t0: 0, dur: 0, moved: false }, o);
const sceneBase = () => ({ id: uid(), dur: null, zoom: 1, px: 0, py: 0, rot: 0, flip: false, fit: 'auto', motion: 'auto', look: '', vol: 1,
  adj: { bright: 0, contrast: 0, sat: 0, warm: 0, sharp: 0, blur: 0, vig: 0 }, texts: [] });
const scene = () => P.scenes.find((s) => s.id === sel) || null;
const textOf = () => { const sc = scene(); return sc ? sc.texts.find((l) => l.id === selText) || null : null; };
const pack = () => PACKS[P.pack];

/* ---------- 화면 구성 좌표 ---------- */
function geom(W, H) {
  const k = Math.min(W, H) / 1080, port = H > W * 1.2;
  if (P.layout === 'recap') return port ? { box: [0, H * .242, W, H * .422], titleY: .135, capY: .711 } : { box: [0, H * .2, W, H * .62], titleY: .1, capY: .91 };
  if (P.layout === 'frame') {
    const m = 64 * k; let cw, ch, cy;
    if (port) { cw = W - 2 * m; ch = Math.min(H * .66, cw * 1.22); cy = H * .43; } else { ch = H - 2 * m - 150 * k; cw = Math.min(W - 2 * m, ch * (W > H ? 1.6 : 1)); cy = m + ch / 2; }
    const cx = W / 2, pad = 22 * k;
    return { card: [cx - cw / 2, cy - ch / 2, cw, ch], box: [cx - cw / 2 + pad, cy - ch / 2 + pad, cw - 2 * pad, ch - 2 * pad], capY: port ? .86 : .915 };
  }
  return { box: [0, 0, W, H], capY: port ? .8 : .88 };
}
const capY = () => geom(P.W, P.H).capY;

/* ---------- 시간표 ---------- */
function sceneDur(sc) {
  if (sc.kind === 'photo') return sc.dur || P.photoSec;
  if (sc.kind === 'video') return Math.max(.3, Math.min(sc.dur || (P.clipFull ? sc.srcDur : P.clipSec), sc.srcDur - sc.start));
  return sc.dur || 2.8;
}
const AUTO_TRANS = ['fade', 'slide', 'zoom', 'flash', 'blurzoom', 'circle', 'whip', 'spin', 'glitch', 'up'];
function transOf(sc, i) { /* 장면마다 고른 전환이 없으면 전체 전환을 쓴다. '알아서'는 장면 순서로 정해져 늘 같은 결과 */
  let t = (sc && sc.trans) || P.transition;
  if (t === 'auto') t = AUTO_TRANS[Math.floor(hash(i * 7.31 + 3) * AUTO_TRANS.length) % AUTO_TRANS.length];
  return t;
}
const mvActive = () => !!(P.mv.on && P.music.buf && P.mv.beats.length > 4);
function mvBeats() { /* 음악 시작 위치 기준으로 옮긴 박자 (0초에 첫 박자) */
  const B = P.mv.beats.map((b) => b - P.mv.start).filter((b) => b >= -0.02);
  if (!B.length || B[0] > .08) B.unshift(0);
  return B;
}
function mvLength() {
  const song = Math.max(1, P.music.buf.duration - P.mv.start);
  if (P.mv.len === 'song') return Math.min(song, 180);
  if (P.mv.len !== 'auto') return Math.min(song, +P.mv.len);
  return null; /* auto: 장면을 한 번씩 */
}
function timeline() {
  const items = [];
  if (mvActive() && P.scenes.length) {
    const B = mvBeats(), per = P.mv.per, gap = B.length > 2 ? (B[B.length - 1] - B[0]) / (B.length - 1) : .5, at = (k) => k < B.length ? B[k] : B[B.length - 1] + (k - B.length + 1) * gap;
    const want = mvLength(), maxItems = want ? 400 : P.scenes.length;
    let k = 0, n = 0;
    while (n < maxItems) {
      const sc = P.scenes[n % P.scenes.length], a = at(k), b = at(k + per);
      if (want && a >= want - .05) break;
      const tr = n > 0 ? transOf(sc, n) : 'none', ov = n > 0 && tr !== 'none' ? Math.min(P.transDur, (b - a) * .45, gap * .9) : 0;
      items.push({ sc, i: n, t0: a - ov / 2, t1: b, dur: 0, ovIn: ov, tr, beat: true });
      k += per; n++;
    }
    for (let j = 0; j < items.length; j++) { const it = items[j], nx = items[j + 1]; if (nx) it.t1 = nx.t0 + nx.ovIn; it.t0 = Math.max(0, it.t0); it.dur = it.t1 - it.t0; }
    let total = items.length ? items[items.length - 1].t1 : 0; if (want) total = Math.min(total, want);
    if (items.length) { const last = items[items.length - 1]; last.t1 = total; last.dur = last.t1 - last.t0; }
    return { items, total: Math.max(0, total), mv: true, beats: B };
  }
  let t = 0, prev = 0;
  P.scenes.forEach((sc, i) => {
    const tr = i > 0 ? transOf(sc, i) : 'none', d = tr === 'none' ? 0 : P.transDur;
    const dur = sceneDur(sc), ov = i > 0 ? Math.min(d, dur * .45, prev * .45) : 0;
    t -= ov; items.push({ sc, i, t0: t, t1: t + dur, dur, ovIn: ov, tr }); t += dur; prev = dur;
  });
  return { items, total: Math.max(0, t) };
}

/* ---------- 사진·동영상 그리기 ---------- */
const LOOKS = { natural: '', warm: ' sepia(0.18) saturate(1.1)', vivid: ' contrast(1.1) saturate(1.2)', film: ' sepia(0.25) contrast(0.92) saturate(0.85)', pastel: ' brightness(1.06) contrast(0.9) saturate(0.82)', cool: ' saturate(0.95)', sepia: ' sepia(0.7)', mono: ' grayscale(1) contrast(1.12)', none: '' };
function filterOf(sc, k) {
  const look = sc.look || P.look, a = sc.adj; let b = 1, c = 1, s = 1;
  if (look !== 'none' && P.autoFix && sc.auto) { b = sc.auto.b; c = sc.auto.c; s = sc.auto.s; }
  b *= 1 + a.bright / 200; c *= 1 + a.contrast / 200; s *= 1 + a.sat / 100;
  let f = '';
  if (Math.abs(b - 1) > .004) f += ` brightness(${b.toFixed(3)})`;
  if (Math.abs(c - 1) > .004) f += ` contrast(${c.toFixed(3)})`;
  if (Math.abs(s - 1) > .004) f += ` saturate(${Math.max(0, s).toFixed(3)})`;
  f += LOOKS[look] || '';
  if (a.blur > 0) f += ` blur(${(a.blur / 100 * 24 * k).toFixed(1)}px)`;
  return f.trim() || 'none';
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawMedia(R, sc, lt, dur, idx) {
  const { ctx, W, H } = R, k = Math.min(W, H) / 1080, g = geom(W, H);
  const isV = sc.kind === 'video', src = isV ? sc.vid : (sc.sharp || sc.work);
  const sw = isV ? (sc.vid.videoWidth || sc.w) : src.width, sh = isV ? (sc.vid.videoHeight || sc.h) : src.height;
  const ok = sw > 0 && sh > 0 && (!isV || sc.vid.readyState >= 2);
  const rot = sc.rot || 0, rw = rot % 180 ? sh : sw, rh = rot % 180 ? sw : sh, f = filterOf(sc, k);
  ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let cover = true, radius = 0;
  if (P.layout === 'blur') {
    cover = Math.abs(W / H - rw / rh) < .25;
    if (ok) { /* 흐린 배경: 1/12 크기로 줄여 흐리게 한 뒤 늘려 붙인다 */
      const bc = R.bgc, bw = bc.width = Math.ceil(W / 12), bh = bc.height = Math.ceil(H / 12), bx = bc.getContext('2d'), cv = Math.max(bw / rw, bh / rh);
      bx.save(); bx.filter = (f === 'none' ? '' : f + ' ') + 'blur(3px) brightness(0.72)'; bx.translate(bw / 2, bh / 2); bx.rotate(rot * Math.PI / 180); if (sc.flip) bx.scale(-1, 1);
      bx.drawImage(src, -sw * cv / 2, -sh * cv / 2, sw * cv, sh * cv); bx.restore();
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bc, 0, 0, bw, bh, -W * .05, -H * .05, W * 1.1, H * 1.1);
    }
  } else if (P.layout === 'frame') {
    const gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, P.bg1); gr.addColorStop(1, P.bg2); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const [cx, cy, cw, ch] = g.card;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 50 * k; ctx.shadowOffsetY = 18 * k; ctx.fillStyle = '#fff'; rrect(ctx, cx, cy, cw, ch, 30 * k); ctx.fill(); ctx.restore();
    radius = 14 * k;
  }
  if (sc.fit === 'cover') cover = true; else if (sc.fit === 'contain') cover = false;
  const [bx, by, bw, bh] = g.box;
  if (ok) {
    const base = cover ? Math.max(bw / rw, bh / rh) : Math.min(bw / rw, bh / rh);
    const mo = sc.kind === 'photo' ? (sc.motion === 'auto' ? (idx % 2 ? 'out' : 'in') : sc.motion) : (sc.motion === 'shake' || sc.motion === 'pulse' ? sc.motion : 'none'), p = dur > 0 ? clamp(lt / dur) : 0;
    let mz = 1, mx = 0, my = 0;
    if (mo === 'in') { mz = 1 + .08 * p; mx = .02 * bw * (p - .5); } else if (mo === 'out') { mz = 1.08 - .08 * p; mx = -.02 * bw * (p - .5); }
    else if (mo === 'left') { mz = 1.1; mx = (.5 - p) * .08 * bw; } else if (mo === 'right') { mz = 1.1; mx = (p - .5) * .08 * bw; } else if (mo === 'up') { mz = 1.1; my = (.5 - p) * .08 * bh; }
    else if (mo === 'shake') { mz = 1.06; mx = (hash(Math.floor(lt * 12) + 1.3) - .5) * .018 * bw; my = (hash(Math.floor(lt * 12) + 7.9) - .5) * .018 * bh; }
    else if (mo === 'pulse') { mz = 1.03 + .03 * Math.sin(lt * Math.PI * 2 * 1.2); }
    mz *= 1 + (R.pulse || 0);
    const z = base * (sc.zoom || 1) * mz, dw = rw * z, dh = rh * z;
    const ox = (sc.px || 0) * Math.abs(dw - bw) / 2 + mx, oy = (sc.py || 0) * Math.abs(dh - bh) / 2 + my;
    ctx.save(); rrect(ctx, bx, by, bw, bh, radius); ctx.clip();
    ctx.save(); ctx.translate(bx + bw / 2 + ox, by + bh / 2 + oy); ctx.rotate(rot * Math.PI / 180); if (sc.flip) ctx.scale(-1, 1);
    ctx.filter = f; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(src, -sw * z / 2, -sh * z / 2, sw * z, sh * z); ctx.restore();
    /* 색온도·가장자리 어둡게는 사진이 보이는 영역에만 덧칠한다 */
    const vx = Math.max(bx, bx + bw / 2 + ox - dw / 2), vy = Math.max(by, by + bh / 2 + oy - dh / 2);
    const vx2 = Math.min(bx + bw, bx + bw / 2 + ox + dw / 2), vy2 = Math.min(by + bh, by + bh / 2 + oy + dh / 2), vw = vx2 - vx, vh = vy2 - vy;
    const look = sc.look || P.look, warm = sc.adj.warm + (look === 'cool' ? -35 : 0);
    if (vw > 0 && vh > 0) {
      if (warm) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = warm > 0 ? `rgba(255,150,40,${Math.min(1, warm / 100) * .5})` : `rgba(50,140,255,${Math.min(1, -warm / 100) * .5})`; ctx.fillRect(vx, vy, vw, vh); ctx.restore(); }
      if (sc.adj.vig > 0) { const rg = ctx.createRadialGradient(vx + vw / 2, vy + vh / 2, Math.min(vw, vh) * .32, vx + vw / 2, vy + vh / 2, Math.hypot(vw, vh) * .56); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, `rgba(0,0,0,${sc.adj.vig / 100 * .78})`); ctx.fillStyle = rg; ctx.fillRect(vx, vy, vw, vh); }
    }
    ctx.restore();
    if (P.dateStamp && sc.kind === 'photo' && sc.date) {
      ctx.save(); ctx.font = `700 ${34 * k}px "Pretendard Variable","Malgun Gothic",sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,196,110,.96)'; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 8 * k;
      const low = P.layout !== 'frame' && P.layout !== 'recap' && H > W * 1.2;
      ctx.fillText(dateStr(sc.date), bx + bw - 36 * k, by + bh - (low ? 150 : 30) * k); ctx.restore();
    }
  }
  ctx.restore();
}
function drawCard(R, sc, lt, dur) {
  const { ctx, W, H } = R, g = ctx.createLinearGradient(0, 0, W, H), p = dur > 0 ? clamp(lt / dur) : 0;
  const def = pack().card || [P.bg1, P.bg2];
  g.addColorStop(0, sc.c1 || def[0]); g.addColorStop(1, sc.c2 || def[1]);
  ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = W * (.25 + .5 * p), cy = H * .3, rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .7);
  rg.addColorStop(0, 'rgba(255,255,255,.2)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/* ---------- 글자 그리기 (모션 11종) ---------- */
function wrapChars(ctx, chars, maxW) {
  const lines = []; let cur = [];
  const width = (a) => ctx.measureText(a.map((c) => c.ch).join('')).width;
  const push = () => { while (cur.length && cur[cur.length - 1].ch === ' ') cur.pop(); while (cur.length && cur[0].ch === ' ') cur.shift(); lines.push(cur); cur = []; };
  const toks = []; let tok = [];
  for (const c of chars) { if (c.ch === '\n') { if (tok.length) toks.push(tok); toks.push('\n'); tok = []; } else if (c.ch === ' ') { if (tok.length) toks.push(tok); toks.push([c]); tok = []; } else tok.push(c); }
  if (tok.length) toks.push(tok);
  for (const t of toks) {
    if (t === '\n') { push(); continue; }
    if (!cur.length || width(cur.concat(t)) <= maxW) cur = cur.concat(t);
    else { push(); if (t[0].ch !== ' ') cur = t.slice(); }
  }
  push();
  while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
  return lines.map((cs) => { const xs = [0]; let s = ''; for (const c of cs) { s += c.ch; xs.push(ctx.measureText(s).width); } return { cs, w: xs[cs.length] || 0, xs }; });
}
function layoutText(ctx, L, text, maxW, k) {
  const chars = []; let acc = false;
  for (const ch of text) { if (ch === '*') { acc = !acc; continue; } chars.push({ ch, acc }); }
  let size = L.size * k, lines;
  for (let n = 0; n < 16; n++) {
    ctx.font = fontStr(L, size); try { ctx.letterSpacing = ((L.ls || 0) * size / 100).toFixed(2) + 'px'; } catch (_) {}
    lines = wrapChars(ctx, chars, maxW);
    if (lines.every((l) => l.w <= maxW + 1) && lines.length <= (L.maxLines || 99)) break;
    size *= .93;
  }
  L._shrunk = size < L.size * k * .7;
  return { size, lines };
}
function drawText(R, L, lt, sdur) {
  const { ctx, W, H } = R, k = Math.min(W, H) / 1080;
  const t0 = Math.min(L.t0 || 0, Math.max(0, sdur - .2)), dur = L.dur > 0 ? Math.min(L.dur, sdur - t0) : sdur - t0, tt = lt - t0;
  if (tt < 0 || tt > dur + 1e-6 || !L.text.trim()) return;
  const A = L.anim || 'none'; let text = L.text;
  if (A === 'count') { const e = eOut(tt / 1.2); text = text.replace(/\d[\d,]*(\.\d+)?/g, (m) => { const dec = (m.split('.')[1] || '').length, v = parseFloat(m.replace(/,/g, '')) * e, s = dec ? v.toFixed(dec) : String(Math.round(v)); return m.includes(',') ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s; }); }
  const maxW = (W - 160 * k) * (L.maxW || 1);
  ctx.save();
  const lay = layoutText(ctx, L, text, maxW, k), size = lay.size, lh = size * (L.lh || 1.28), lines = lay.lines;
  const bh = lines.length * lh, bw = Math.max(1, ...lines.map((l) => l.w));
  const hasBox = L.box && L.box !== 'none', padX = size * .34, padY = size * .16, half = bw / 2 + (hasBox ? padX : 0);
  let cx = half * 2 > W - 48 * k ? W / 2 : clamp(L.x * W, half + 24 * k, W - half - 24 * k);
  const top = clamp(L.y * H - bh / 2, 24 * k + padY, Math.max(24 * k + padY, H - 24 * k - padY - bh));
  const lineX = (l) => L.align === 'left' ? cx - bw / 2 : L.align === 'right' ? cx + bw / 2 - l.w : cx - l.w / 2;
  L._bb = { x: cx - bw / 2 - padX, y: top - padY, w: bw + padX * 2, h: bh + padY * 2, f: R.frameNo };
  const fadeOut = L.dur > 0 && L.dur < sdur - t0 - .01 ? clamp((dur - tt) / .25) : 1, pin = A === 'none' ? 1 : clamp(tt / .3);
  ctx.globalAlpha *= fadeOut; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  /* 덩어리 전체에 거는 움직임 */
  if (A === 'fade' || A === 'count') { const p = eOut(tt / .45); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * 26 * k); }
  else if (A === 'punch') { const p = clamp(tt / .32), s = 1.5 - .5 * eBack(p); ctx.globalAlpha *= clamp(p * 4); ctx.translate(cx, top + bh / 2); ctx.scale(s, s); ctx.translate(-cx, -(top + bh / 2)); }
  else if (A === 'slide') { const p = eOut(tt / .45); ctx.globalAlpha *= p; ctx.translate(-(1 - p) * W * .35, 0); }
  /* 글자 뒤 배경 */
  if (hasBox) {
    ctx.save(); ctx.globalAlpha *= (L.boxAlpha == null ? 1 : L.boxAlpha) * eOut(pin); ctx.fillStyle = L.boxColor;
    if (L.box === 'band') ctx.fillRect(-W, top - padY * 1.6, W * 3, bh + padY * 3.2);
    else if (L.box === 'box') { rrect(ctx, cx - bw / 2 - padX, top - padY, bw + padX * 2, bh + padY * 2, size * .26); ctx.fill(); }
    else lines.forEach((l, i) => { if (!l.w) return; const x = lineX(l), y = top + i * lh;
      if (L.box === 'pill') { rrect(ctx, x - padX, y + lh * .04, l.w + padX * 2, lh * .92, lh * .3); ctx.fill(); } else ctx.fillRect(x - size * .1, y + lh * .5, l.w + size * .2, lh * .42); });
    ctx.restore();
  }
  /* 그릴 조각 만들기: 글자 단위 / 단어 단위 / 같은 색 묶음 단위 */
  const mode = (A === 'bounce' || A === 'type' || A === 'draw') ? 'char' : A === 'word' ? 'word' : 'run';
  const units = []; let ci = 0;
  lines.forEach((l, li) => {
    const x0 = lineX(l), y = top + li * lh + lh / 2, n = l.cs.length;
    const add = (j, e) => units.push({ str: l.cs.slice(j, e).map((c) => c.ch).join(''), x: x0 + l.xs[j], w: l.xs[e] - l.xs[j], y, li, lineTop: top + li * lh, i: ci++, col: l.cs[j].acc ? L.accent : L.color, acc: l.cs[j].acc });
    let j = 0;
    while (j < n) {
      if (mode !== 'run' && l.cs[j].ch === ' ') { j++; continue; }
      let e = j + 1;
      if (mode === 'run') while (e < n && l.cs[e].acc === l.cs[j].acc) e++;
      else if (mode === 'word') while (e < n && l.cs[e].ch !== ' ') e++;
      add(j, e); j = e;
    }
  });
  const n = units.length || 1, wordIv = clamp(dur * .7 / n, .16, .42), typeIv = Math.min(.07, 1.6 / n);
  const fx = (u) => {
    switch (A) {
      case 'rise': { const p = eOut((tt - u.li * .12) / .5); return p <= 0 ? null : { dy: (1 - p) * lh, clip: true }; }
      case 'bounce': { const tp = (tt - u.i * Math.min(.05, .8 / n)) / .55; if (tp <= 0) return null; const s = spring(tp); return { a: clamp(tp * 5), dy: -(1 - s) * size * 1.1, sy: 1 - Math.max(0, s - 1) * 1.3 }; }
      case 'type': return tt >= u.i * typeIv ? {} : null;
      case 'word': { const ap = u.i * wordIv; if (tt < ap) return null; const p = clamp((tt - ap) / .18), now = tt < ap + wordIv * (u.i === n - 1 ? 1.6 : 1); return { s: 1.28 - .28 * eOut(p), col: now || u.acc ? L.accent : L.color }; }
      case 'draw': { const p = clamp((tt - u.i * Math.min(.06, 1 / n)) / .7); return p <= 0 ? null : { draw: p }; }
      default: return {};
    }
  };
  const sw = size * (L.strokeW || 14) / 100;
  const paint = (str, x, y, col, pass, f) => {
    if (pass === 'stroke') {
      if (f.draw != null) { const per = size * 5; ctx.save(); ctx.setLineDash([per, per]); ctx.lineDashOffset = per * (1 - clamp(f.draw / .6)); ctx.lineWidth = Math.max(2 * k, size * .035); ctx.strokeStyle = col; ctx.globalAlpha *= 1 - clamp((f.draw - .6) / .4) * (L.stroke ? 0 : 1); ctx.strokeText(str, x, y); ctx.restore(); if (!L.stroke) return; ctx.globalAlpha *= clamp((f.draw - .55) / .45); }
      if (!L.stroke) return;
      ctx.save(); if (L.shadow === 1) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = size * .18; ctx.shadowOffsetY = size * .06; }
      ctx.lineWidth = sw; ctx.strokeStyle = L.strokeColor; ctx.strokeText(str, x, y); ctx.restore();
    } else {
      ctx.save(); if (f.draw != null) ctx.globalAlpha *= clamp((f.draw - .55) / .45);
      if (L.shadow === 2) { ctx.shadowColor = L.accent; ctx.shadowBlur = size * .45; } else if (L.shadow === 1 && !L.stroke) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = size * .2; ctx.shadowOffsetY = size * .06; }
      ctx.fillStyle = col; ctx.fillText(str, x, y); ctx.restore();
    }
  };
  if (A === 'glitch' && tt < .5) { /* 빨강·파랑이 어긋났다가 맞춰진다 */
    const step = Math.floor(tt * 24), off = (1 - tt / .5) * 22 * k * (hash(step) > .5 ? 1 : -1);
    for (const [col, o] of [['#ff2d55', off], ['#22d3ee', -off]]) { ctx.save(); ctx.globalAlpha *= .85; ctx.fillStyle = col; units.forEach((u) => ctx.fillText(u.str, u.x + o, u.y + (hash(step + u.i * 7) - .5) * off * .5)); ctx.restore(); }
  }
  let lastShown = null;
  for (const pass of (L.stroke || A === 'draw') ? ['stroke', 'fill'] : ['fill']) {
    for (const u of units) {
      const f = fx(u); if (!f) continue; lastShown = u;
      ctx.save(); if (f.a != null) ctx.globalAlpha *= f.a;
      if (f.clip) { ctx.beginPath(); ctx.rect(-W, u.lineTop - lh * .3, W * 3, lh * 1.3); ctx.clip(); }
      ctx.translate(u.x + u.w / 2, u.y + (f.dy || 0)); if (f.s || f.sy) ctx.scale(f.s || 1, (f.s || 1) * (f.sy || 1));
      paint(u.str, -u.w / 2, 0, f.col || u.col, pass, f); ctx.restore();
    }
  }
  if (A === 'type' && tt < n * typeIv + .9 && Math.floor(tt * 2.6) % 2 === 0) { const u = lastShown || units[0]; if (u) { ctx.fillStyle = L.color; ctx.fillRect(lastShown ? u.x + u.w + size * .06 : u.x, u.y - size * .45, Math.max(3 * k, size * .07), size * .9); } }
  ctx.restore();
  if (R.preview && !PV.playing && !EX.busy && L.id === selText) { ctx.save(); ctx.setLineDash([14 * k, 10 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(196,181,253,.95)'; ctx.strokeRect(L._bb.x, L._bb.y, L._bb.w, L._bb.h); ctx.restore(); }
}

/* ---------- 한 장면 · 전환 · 전체 위에 얹는 것 ---------- */
function renderScene(R, it, lt) {
  const sc = it.sc;
  if (sc.kind === 'card') drawCard(R, sc, lt, it.dur); else drawMedia(R, sc, lt, it.dur, it.i);
  for (const L of sc.texts) drawText(R, L, lt, it.dur);
}
function composite(R, p, type) {
  const { ctx, W, H, cA, cB } = R, e = eInOut(p);
  ctx.save(); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  switch (type) {
    case 'slide': ctx.drawImage(cA, -e * W, 0); ctx.drawImage(cB, (1 - e) * W, 0); break;
    case 'up': ctx.drawImage(cA, 0, -e * H); ctx.drawImage(cB, 0, (1 - e) * H); break;
    case 'zoom': { const s = 1 + .25 * e; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.drawImage(cA, -W / 2, -H / 2); ctx.restore(); const s2 = .86 + .14 * e; ctx.globalAlpha = e; ctx.translate(W / 2, H / 2); ctx.scale(s2, s2); ctx.drawImage(cB, -W / 2, -H / 2); break; }
    case 'wipe': ctx.drawImage(cA, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip(); ctx.drawImage(cB, 0, 0); break;
    case 'dip': ctx.drawImage(p < .5 ? cA : cB, 0, 0); ctx.fillStyle = `rgba(0,0,0,${p < .5 ? p * 2 : (1 - p) * 2})`; ctx.fillRect(0, 0, W, H); break;
    case 'flash': ctx.drawImage(p < .5 ? cA : cB, 0, 0); ctx.fillStyle = `rgba(255,255,255,${(1 - Math.abs(p - .5) * 2) * .95})`; ctx.fillRect(0, 0, W, H); break;
    case 'circle': { ctx.drawImage(cA, 0, 0); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(1, e * Math.hypot(W, H) / 2), 0, Math.PI * 2); ctx.clip(); ctx.drawImage(cB, 0, 0); ctx.restore(); break; }
    case 'blurzoom': { const k = Math.min(W, H) / 1080, a = p < .5, q = a ? p * 2 : (1 - p) * 2, s = 1 + .35 * eInOut(q); ctx.save(); ctx.filter = `blur(${(q * 18 * k).toFixed(1)}px)`; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.drawImage(a ? cA : cB, -W / 2, -H / 2); ctx.restore(); break; }
    case 'spin': { const a = p < .5, q = a ? eInOut(p * 2) : 1 - eInOut((p - .5) * 2), ang = (a ? 1 : -1) * q * .55, s = 1 + q * 1.15; ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.scale(s, s); ctx.drawImage(a ? cA : cB, -W / 2, -H / 2); ctx.restore(); break; }
    case 'whip': { const x = eInOut(p); for (let g = 3; g >= 0; g--) { const o = g * .045 * W * Math.sin(Math.PI * p); ctx.globalAlpha = g ? .22 : 1; ctx.drawImage(cA, -x * W - o, 0); ctx.drawImage(cB, (1 - x) * W - o, 0); } break; }
    case 'shake': { const amp = Math.sin(Math.PI * p) * Math.min(W, H) * .035, f = Math.floor(p * 16), dx = (hash(f + .7) - .5) * 2 * amp, dy = (hash(f + 5.1) - .5) * 2 * amp; ctx.save(); ctx.translate(dx, dy); ctx.drawImage(cA, 0, 0); ctx.globalAlpha = e; ctx.drawImage(cB, 0, 0); ctx.restore(); break; }
    case 'glitch': { const base = p < .5 ? cA : cB, other = p < .5 ? cB : cA, amp = Math.sin(Math.PI * p), f = Math.floor(p * 14); ctx.drawImage(base, 0, 0);
      for (let j = 0; j < 9; j++) { const y = hash(f * 13.1 + j * 3.7) * H, h = (hash(f * 2.3 + j) * .07 + .01) * H, dx = (hash(f + j * 9.2) - .5) * W * .16 * amp; ctx.drawImage(hash(j + f) > .5 ? other : base, 0, y, W, h, dx, y, W, h); }
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .28 * amp; ctx.drawImage(base, 10 * amp, 0); ctx.fillStyle = 'rgba(255,0,80,.5)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; break; }
    default: ctx.drawImage(cA, 0, 0); ctx.globalAlpha = e; ctx.drawImage(cB, 0, 0);
  }
  ctx.restore();
}
const G_FIXED = newText({ role: 'g', size: 92, anim: 'none', stroke: 0, shadow: 0, maxLines: 2, lh: 1.22, color: '#ffffff', accent: '#ffd400' });
const G_HOOK = newText(Object.assign({ role: 'g', size: 80, anim: 'punch', dur: 2.67 }, TP.hook));
const G_BRAND = newText({ role: 'g', size: 30, weight: 700, anim: 'none', stroke: 0, shadow: 1, color: '#ffffff' });
function drawGlobals(R, t, TL) {
  const { ctx, W, H } = R, g = geom(W, H), k = Math.min(W, H) / 1080;
  if (P.layout === 'recap' && P.fixedTitle.trim()) {
    const ls = P.fixedTitle.split('\n').map((s) => s.trim()).filter(Boolean);
    G_FIXED.text = ls[0].replace(/\*/g, '') + (ls[1] ? '\n*' + ls.slice(1).join(' ').replace(/\*/g, '') + '*' : ''); G_FIXED.y = g.titleY; G_FIXED.size = H > W * 1.2 ? 92 : 64;
    drawText(R, G_FIXED, t, TL.total + 1);
  }
  if (P.hook.trim() && t < 2.67 && TL.items[0] && TL.items[0].sc.kind !== 'card') { G_HOOK.text = P.hook; G_HOOK.y = P.layout === 'recap' ? (g.box[1] + g.box[3] * .5) / H : .5; drawText(R, G_HOOK, t, TL.total + 1); }
  if (P.brand.trim()) { /* 세로 화면은 아래 가운데, 가로·정사각은 자막과 겹치지 않게 오른쪽 위 */
    const port = H > W * 1.2; G_BRAND.text = P.brand.replace(/\*/g, ''); G_BRAND.x = port ? .5 : 1; G_BRAND.y = !port ? 0 : P.layout === 'recap' ? .8 : .955; ctx.save(); ctx.globalAlpha = .82; drawText(R, G_BRAND, t, TL.total + 1); ctx.restore(); }
  if (R.preview && P.safe && !EX.busy) {
    const port = H > W * 1.2, x = W * .06, y = H * (port ? .1 : .06), w = W * .88, h = H * (port ? .72 : .88);
    ctx.save(); ctx.setLineDash([18 * k, 12 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(34,211,238,.9)'; ctx.strokeRect(x, y, w, h);
    ctx.font = `700 ${26 * k}px "Pretendard Variable",sans-serif`; ctx.fillStyle = 'rgba(34,211,238,.95)'; ctx.textBaseline = 'top'; ctx.fillText('안전 영역 — 이 안의 글자는 버튼·설명에 가리지 않아요', x + 12 * k, y + 10 * k); ctx.restore();
  }
}
function lastBeat(TL, t) { /* t 바로 앞 박자와 그 박자가 강박인지 */
  const B = TL.beats; if (!B || !B.length) return null; let lo = 0, hi = B.length - 1; if (t < B[0]) return null;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (B[m] <= t) lo = m; else hi = m - 1; }
  const abs = B[lo] + P.mv.start, strong = P.mv.strong.some((s) => Math.abs(s - abs) < .03);
  return { t: B[lo], i: lo, strong };
}
function renderFrame(R, t, TL) {
  TL = TL || timeline(); const { ctx, W, H } = R; R.frameNo = (R.frameNo || 0) + 1;
  R.pulse = 0; if (TL.mv && P.mv.pulse) { const bt = lastBeat(TL, t); if (bt) R.pulse = Math.exp(-(t - bt.t) * 9) * (bt.strong ? .07 : .04); }
  if (!TL.items.length) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  t = clamp(t, 0, Math.max(0, TL.total - 1e-4));
  let a = null, b = null;
  for (const it of TL.items) if (t >= it.t0 && t < it.t1) { if (!a) a = it; else b = it; }
  if (!a) a = TL.items[TL.items.length - 1];
  if (b && b.ovIn > 0) {
    renderScene(Object.assign({}, R, { ctx: R.cA.getContext('2d') }), a, t - a.t0);
    renderScene(Object.assign({}, R, { ctx: R.cB.getContext('2d') }), b, t - b.t0);
    composite(R, clamp((t - b.t0) / b.ovIn), b.tr || P.transition);
  } else renderScene(R, b || a, t - (b || a).t0);
  if (TL.mv && P.mv.flash) { const bt = lastBeat(TL, t); if (bt && bt.strong) { const v = Math.exp(-(t - bt.t) * 12) * .32; if (v > .01) { R.ctx.save(); R.ctx.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`; R.ctx.fillRect(0, 0, W, H); R.ctx.restore(); } } }
  drawGlobals(R, t, TL);
}

/* ---------- 파일 넣기 ---------- */
function measure(src, w, h) { /* 48×48로 줄여 평균 밝기·채도를 재고 목표에 맞는 배율을 정한다 */
  const c = mk(48, 48), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h, 0, 0, 48, 48);
  const p = x.getImageData(0, 0, 48, 48).data; let Ls = 0, S = 0;
  for (let i = 0; i < p.length; i += 4) { const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); Ls += .2126 * r + .7152 * g + .0722 * b; S += mx ? (mx - mn) / mx : 0; }
  Ls /= p.length / 4; S /= p.length / 4;
  return { b: clamp(.5 / Math.max(Ls, .05), .88, 1.7), c: Ls < .35 ? 1.12 : 1.05, s: S < .25 ? 1.2 : 1.05 };
}
function thumbOf(src, w, h) { const c = mk(184, 184), x = c.getContext('2d'), s = Math.max(184 / w, 184 / h); x.drawImage(src, (184 - w * s) / 2, (184 - h * s) / 2, w * s, h * s); return c.toDataURL('image/jpeg', .72); }
const once = (el, ev, ms = 15000) => new Promise((ok, no) => { const t = setTimeout(() => no(new Error('시간 초과')), ms); el.addEventListener(ev, () => { clearTimeout(t); ok(); }, { once: true }); el.addEventListener('error', () => { clearTimeout(t); no(new Error('열 수 없는 파일')); }, { once: true }); });
function seekVid(v, t) {
  return new Promise((res) => {
    t = clamp(t, 0, Math.max(0, (v.duration || t) - .04));
    if (Math.abs(v.currentTime - t) < .0005 && v.readyState >= 2 && !v.seeking) return res();
    let done = false; const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); clearTimeout(to); res(); };
    const to = setTimeout(fin, 3000); v.addEventListener('seeked', fin);
    try { v.currentTime = t; } catch (_) { fin(); }
  });
}
async function readPhoto(f) {
  const url = URL.createObjectURL(f), img = new Image(); img.src = url;
  try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw e; }
  const s = Math.min(1, 2560 / Math.max(img.naturalWidth, img.naturalHeight)), c = mk(Math.max(1, Math.round(img.naturalWidth * s)), Math.max(1, Math.round(img.naturalHeight * s)));
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return Object.assign(sceneBase(), { kind: 'photo', name: f.name, work: c, sharp: null, w: c.width, h: c.height, date: new Date(f.lastModified), auto: measure(c, c.width, c.height), thumb: thumbOf(c, c.width, c.height) });
}
function makeVid(url) { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url; $('#vids').appendChild(v); return v; }
function highlight(buf, len, win) { /* 0.1초마다 소리 크기를 재서 가장 활발한 구간의 시작을 고른다 */
  if (!buf || len <= win) return Math.max(0, (len - win) / 2);
  const d = buf.getChannelData(0), cell = Math.floor(buf.sampleRate / 10), e = [];
  for (let i = 0; i + cell <= d.length; i += cell) { let s = 0; for (let j = i; j < i + cell; j += 4) s += d[j] * d[j]; e.push(s); }
  const wn = Math.round(win * 10); let sum = 0, best = -1, at = 0;
  for (let i = 0; i < e.length; i++) { sum += e[i]; if (i >= wn) sum -= e[i - wn]; if (i >= wn - 1 && sum > best) { best = sum; at = i - wn + 1; } }
  return clamp(at / 10, 0, Math.max(0, len - win));
}
async function readVideo(f) {
  const url = URL.createObjectURL(f), v = makeVid(url);
  try { await once(v, 'loadedmetadata'); } catch (e) { v.remove(); URL.revokeObjectURL(url); throw e; }
  if (!isFinite(v.duration) || !v.videoWidth) { v.remove(); URL.revokeObjectURL(url); throw new Error('길이를 알 수 없는 영상'); }
  const sc = Object.assign(sceneBase(), { kind: 'video', name: f.name, url, vid: v, w: v.videoWidth, h: v.videoHeight, srcDur: v.duration, start: 0, date: new Date(f.lastModified), abuf: null, auto: null, thumb: '' });
  sc.file = f; const isMp4 = /\.(mp4|m4v|mov)$/i.test(f.name) || /mp4|quicktime/.test(f.type);
  if (f.size <= 300 * 1048576 && v.duration <= 600) { try { sc.abuf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await f.arrayBuffer()); } catch (_) { sc.abuf = null; } }
  else if (isMp4 && window.SCMedia) { try { const pr = await window.SCMedia.probe(f); if (pr.audio && pr.audio.ok) sc.longAudio = true; else if (pr.audio) sc.tooBig = true; } catch (_) { sc.tooBig = true; } }
  else sc.tooBig = true;
  sc.start = P.clipFull || sc.longAudio ? 0 : highlight(sc.abuf, v.duration, P.clipSec);
  if (P.clipFull) sc.dur = v.duration;
  await seekVid(v, sc.start + .3);
  sc.auto = measure(v, v.videoWidth, v.videoHeight); sc.thumb = thumbOf(v, v.videoWidth, v.videoHeight);
  return sc;
}
async function addFiles(files) {
  const aud = [...files].find((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name));
  const media = [...files].filter((f) => f !== aud);
  if (aud) { await loadMusicFile(aud); if (!P.scenes.length && !media.length) { toast('음악을 넣었어요. 이제 사진·영상을 넣어 주세요.', 4000); return; } }
  files = media.filter((f) => /^(image|video)\//.test(f.type) || /\.(heic|heif|mov|mp4|m4v|webm|jpe?g|png|webp|gif)$/i.test(f.name));
  if (!files.length) return;
  const first = !P.scenes.some((s) => s.kind !== 'card'), h3 = $('#drop h3'), fresh = [], bad = [];
  for (const [i, f] of files.entries()) {
    h3.textContent = `${files.length}개 중 ${i + 1}번째를 살펴보는 중…`; toast(`${files.length}개 중 ${i + 1}번째를 살펴보는 중…`, 60000);
    try { fresh.push(f.type.startsWith('video/') || /\.(mov|mp4|m4v|webm)$/i.test(f.name) ? await readVideo(f) : await readPhoto(f)); } catch (_) { bad.push(f.name); }
  }
  h3.textContent = '사진·동영상을 한꺼번에 끌어다 놓으세요';
  if (first) fresh.sort((a, b) => a.date - b.date);
  const endAt = P.scenes.findIndex((s) => s.role === 'ending');
  P.scenes.splice(endAt < 0 ? P.scenes.length : endAt, 0, ...fresh);
  if (bad.length) toast(`열지 못한 파일 ${bad.length}개: ${bad.slice(0, 3).join(', ')} — 아이폰 HEIC 사진은 jpg로 바꿔서 넣어 주세요.`, 7000);
  else toast(`${fresh.length}개를 넣었어요.${fresh.some((s) => s.tooBig) ? ' 너무 큰 동영상은 소리 없이 들어갔어요.' : ''}`, 2600);
  if (!P.scenes.length) return;
  $('#drop').classList.add('hidden'); $('#work').classList.remove('hidden'); document.body.classList.add('editing');
  if (!scene() && fresh[0]) selectScene(fresh[0].id, false);
  syncAll(); changed();
}

/* ---------- 선명도(사진) ---------- */
let sharpTimer = 0;
function sharpen(sc) {
  if (sc.kind !== 'photo') return; const a = sc.adj.sharp / 100;
  if (a <= 0) { sc.sharp = null; return; }
  const w = sc.work.width, h = sc.work.height, c = sc.sharp || mk(w, h), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(sc.work, 0, 0); const im = x.getImageData(0, 0, w, h), s = im.data, o = new Uint8ClampedArray(s), kk = a * 1.6, w4 = w * 4;
  for (let y = 1; y < h - 1; y++) { let i = (y * w + 1) * 4; for (let xx = 1; xx < w - 1; xx++, i += 4) for (let ch = 0; ch < 3; ch++) { const j = i + ch; s[j] = o[j] * (1 + kk) - kk * (o[j - 4] + o[j + 4] + o[j - w4] + o[j + w4]) / 4; } }
  x.putImageData(im, 0, 0); sc.sharp = c;
}

/* ---------- 소리 섞기 (미리보기와 저장이 같은 결과를 쓴다) ---------- */
let MIX = null;
const AUD = (document.querySelector('meta[name="audio-base"]') || {}).content || 'audio/';
const SFXC = new Map();
async function loadSfx(file) { if (SFXC.has(file)) return SFXC.get(file); const job = (async () => { try { const r = await fetch(AUD + file); if (!r.ok) return null; return await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await r.arrayBuffer()); } catch (_) { return null; } })(); SFXC.set(file, job); return job; }
const needsAudio = (TL) => !!(P.music.buf || P.sfx && TL.items.length > 1 || P.origSound && TL.items.some((it) => it.sc.kind === 'video' && (it.sc.abuf || it.sc.longAudio) && it.sc.vol > 0));
async function mixAudio(TL) {
  if (isLongTL(TL)) return null;
  const sig = JSON.stringify([TL.items.map((it) => [it.sc.id, +it.t0.toFixed(3), +it.dur.toFixed(3), it.sc.start || 0, it.sc.vol, it.tr]), P.origSound, P.music.id, P.music.vol, P.music.duck, P.sfx, P.sfxVol, P.transition, TL.mv ? P.mv.start : -1]);
  if (MIX && MIX.sig === sig) return MIX.buf;
  const sr = 48000, len = Math.max(sr / 10, Math.ceil(TL.total * sr)), oc = new OfflineAudioContext(2, len, sr), voiced = [];
  if (P.origSound) for (const it of TL.items) {
    const sc = it.sc; if (sc.kind !== 'video' || !sc.abuf || !(sc.vol > 0)) continue;
    const s = oc.createBufferSource(), g = oc.createGain(), a = Math.max(0, it.t0), fi = Math.max(.06, it.ovIn || 0), v = sc.vol; s.buffer = sc.abuf;
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(v, a + fi); g.gain.setValueAtTime(v, Math.max(a + fi, it.t1 - .12)); g.gain.linearRampToValueAtTime(0, it.t1);
    s.connect(g).connect(oc.destination); s.start(a, sc.start, it.dur + .02); voiced.push([a, it.t1]);
  }
  if (P.music.buf) {
    const s = oc.createBufferSource(), g = oc.createGain(), v = P.music.vol; s.buffer = P.music.buf; s.loop = !TL.mv;
    g.gain.setValueAtTime(0, 0); g.gain.setTargetAtTime(v, 0, .18);
    if (P.music.duck) for (const [a, b] of voiced) { g.gain.setTargetAtTime(v * .3, Math.max(0, a - .1), .12); g.gain.setTargetAtTime(v, b, .22); }
    const fo = Math.min(1.5, TL.total / 3); g.gain.setTargetAtTime(0, Math.max(0, TL.total - fo), fo / 3.5);
    s.connect(g).connect(oc.destination); s.start(0, TL.mv ? P.mv.start : 0);
  }
  const sfxBuf = P.sfx && P.sfx !== 'synth' ? await loadSfx(P.sfx) : null;
  if (sfxBuf) TL.items.slice(1).forEach((it) => { if (it.tr === 'none') return; const at = Math.max(0, it.t0 + it.ovIn / 2 - Math.min(.12, sfxBuf.duration / 3)), s = oc.createBufferSource(), g = oc.createGain(); s.buffer = sfxBuf; g.gain.value = P.sfxVol; s.connect(g).connect(oc.destination); s.start(at); });
  if (P.sfx === 'synth') { /* 휙 소리: 걸러 낸 잡음이 높아졌다 낮아진다 */
    const nb = oc.createBuffer(1, sr * .5, sr), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = hash(i * .37) * 2 - 1;
    TL.items.slice(1).forEach((it) => { const at = Math.max(0, it.t0 - .05), s = oc.createBufferSource(), f = oc.createBiquadFilter(), g = oc.createGain(); s.buffer = nb; f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, at); f.frequency.exponentialRampToValueAtTime(3200, at + .18); f.frequency.exponentialRampToValueAtTime(700, at + .4);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.28 * P.sfxVol, at + .12); g.gain.linearRampToValueAtTime(0, at + .42); s.connect(f).connect(g).connect(oc.destination); s.start(at); });
  }
  const buf = await oc.startRendering(); MIX = { sig, buf }; return buf;
}

/* ---------- 음악 박자 찾기 (뮤직비디오) ---------- */
async function analyzeBeats(buf) {
  /* 저음(킥)과 전체 소리의 '갑자기 커지는 순간'을 모아 박자 간격(BPM)과 박자 위치를 찾는다 */
  const sr = 11025, len = Math.ceil(buf.duration * sr);
  const render = async (lp) => { const oc = new OfflineAudioContext(1, len, sr), s = oc.createBufferSource(); s.buffer = buf; let node = s; if (lp) { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; s.connect(f); node = f; } node.connect(oc.destination); s.start(0); return (await oc.startRendering()).getChannelData(0); };
  const low = await render(true), full = await render(false), hop = 128, fr = sr / hop, n = Math.floor(len / hop);
  const env = (d) => { const e = new Float32Array(n); for (let i = 0; i < n; i++) { let s = 0; const o = i * hop; for (let j = 0; j < hop; j++) { const v = d[o + j] || 0; s += v * v; } e[i] = Math.log(1e-6 + s); } return e; };
  const eL = env(low), eF = env(full), on = new Float32Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, eL[i] - eL[i - 1]) * .6 + Math.max(0, eF[i] - eF[i - 1]) * .4;
  /* 이동 평균을 빼서 큰 흐름은 지우고 튀는 순간만 남긴다 */
  const W2 = Math.round(fr * .5), sm = new Float32Array(n); let acc = 0; for (let i = 0; i < n; i++) { acc += on[i]; if (i >= W2) acc -= on[i - W2]; sm[i] = acc / Math.min(i + 1, W2); }
  for (let i = 0; i < n; i++) on[i] = Math.max(0, on[i] - sm[i]);
  let best = 0, bestLag = Math.round(fr * .5);
  const lo = Math.floor(fr * 60 / 180), hi = Math.ceil(fr * 60 / 70);
  for (let lag = lo; lag <= hi; lag++) { let s = 0; for (let i = lag; i < n; i++) s += on[i] * on[i - lag]; const bpm = 60 * fr / lag, w = Math.exp(-Math.pow(Math.log2(bpm / 120), 2) / (2 * .5 * .5)); s *= w; if (s > best) { best = s; bestLag = lag; } }
  let period = bestLag / fr, bpm = 60 / period;
  /* 박자 시작 위치(위상) */
  let bestPh = 0, bestS = -1; const steps = 48;
  for (let k = 0; k < steps; k++) { const ph = period * k / steps; let s = 0; for (let t = ph; t < buf.duration; t += period) { const i = Math.round(t * fr); s += on[i] || 0; } if (s > bestS) { bestS = s; bestPh = ph; } }
  const beats = []; for (let t = bestPh; t < buf.duration - .05; t += period) { /* 주변 ±40ms 안의 가장 센 지점으로 살짝 맞춘다 */ const c = Math.round(t * fr), r = Math.round(fr * .04); let bi = c, bv = -1; for (let i = c - r; i <= c + r; i++) if (i > 0 && i < n && on[i] > bv) { bv = on[i]; bi = i; } beats.push(+(bi / fr * .5 + t * .5).toFixed(3)); }
  /* 4박마다 오는 강박: 저음이 가장 센 자리 */
  let bestBar = 0, bestBarS = -1; const pk = (i) => { let m = -99; for (let q = i - 1; q <= i + Math.round(fr * .1); q++) if (q >= 0 && q < n && eL[q] > m) m = eL[q]; return m; };
  for (let o = 0; o < 4; o++) { let s = 0; for (let j = o; j < beats.length; j += 4) s += Math.max(0, pk(Math.round(beats[j] * fr)) + 14); if (s > bestBarS) { bestBarS = s; bestBar = o; } }
  const strong = beats.filter((_, j) => (j - bestBar) % 4 === 0);
  return { beats, strong, bpm: Math.round(bpm) };
}
function loudestStart(buf, win) { return highlight(buf, buf.duration, Math.min(win, buf.duration)); }
async function setMusic(buf, name, lib) {
  P.music.buf = buf; P.music.name = name; P.music.lib = lib || ''; P.music.id++; P.mv.beats = []; P.mv.strong = []; P.mv.bpm = 0; P.mv.start = 0;
  $('#musicInfo').textContent = `${name} (${fmt(buf.duration)})${P.mv.on ? ' — 박자를 찾는 중…' : ' — 영상보다 짧으면 처음부터 다시 이어져요.'}`; $('#musicClear').classList.remove('hidden');
  if (!P.mv.on) { $('#musicInfo').textContent = `${name} (${fmt(buf.duration)}) — 영상보다 짧으면 처음부터 다시 이어져요.`; changed(); return; }
  P.mv.analyzing = true; syncMv();
  try { const r = await analyzeBeats(buf); if (P.music.buf === buf) { P.mv.beats = r.beats; P.mv.strong = r.strong; P.mv.bpm = r.bpm; const s0 = r.strong.find((b) => b < 4) ?? r.beats[0]; if (s0 != null && s0 < 4) P.mv.start = s0; } } catch (e) { console.warn('beats', e); }
  P.mv.analyzing = false;
  if (P.music.buf === buf) { $('#musicInfo').textContent = `${name} (${fmt(buf.duration)}) · 박자 ${P.mv.bpm || '?'} BPM`; syncMv(); changed(); }
}
function syncMv() {
  const box = $('#mvBox'); if (!box) return;
  setVal('mvOn', P.mv.on); setSeg('mvPer', P.mv.per); setVal('mvPulse', P.mv.pulse); setVal('mvFlash', P.mv.flash); setVal('mvLen', P.mv.len); setVal('mvStart', P.mv.start.toFixed(1));
  $('#mvOpts').classList.toggle('hidden', !P.mv.on);
  $('#mvInfo').textContent = !P.music.buf ? '먼저 아래 배경음악을 고르거나 음악 파일을 넣어 주세요.' : P.mv.analyzing ? '박자를 찾는 중이에요…' : P.mv.beats.length ? `박자 ${P.mv.bpm} BPM을 찾았어요. 장면이 ${P.mv.per}박마다 바뀌어요.` : '이 음악에서는 박자를 찾지 못했어요. 박자가 뚜렷한 음악을 써 보세요.';
  if (P.music.buf) $('#mvStart').max = Math.max(0, P.music.buf.duration - 3).toFixed(1);
}

/* ---------- 긴 영상 소리: 필요한 구간만 풀어 쓰고, 소리 섞기도 구간별로 한다 ---------- */
const LONG_MIX = 300; /* 이보다 긴 영상은 소리를 구간별로 섞는다 (메모리 절약) */
const isLongTL = (TL) => TL.total > LONG_MIX || TL.items.some((it) => it.sc.longAudio && it.dur > 120);
async function sceneAudio(sc, a, b) {
  if (sc.abuf) return { buf: sc.abuf, at: 0 };
  if (!sc.longAudio || !window.SCMedia) return null;
  const c = sc._ac; if (c && c.a <= a + .01 && c.b >= b - .01) return { buf: c.buf, at: c.a };
  const A = Math.max(0, a - .3), B = Math.min(sc.srcDur, b + .3);
  try { const buf = await window.SCMedia.range48(sc.file, A, B); sc._ac = { a: A, b: B, buf }; return { buf, at: A }; } catch (e) { console.warn('scene audio', e); return null; }
}
function musicGainAt(TL, tau, voiced) { /* 배경음악 크기: 처음 살짝 커지고, 말소리 구간엔 30%로 줄고, 끝에서 작아진다 */
  const v = P.music.vol; let g = v * (1 - Math.exp(-tau / .18));
  if (P.music.duck) for (const [a, b] of voiced) { if (tau >= a - .25 && tau <= b + .25) { const d = Math.min(1, Math.min(tau - (a - .25), (b + .25) - tau) / .15); g *= 1 - .7 * Math.max(0, d); break; } }
  const fo = Math.min(1.5, TL.total / 3); if (tau > TL.total - fo) g *= Math.max(0, (TL.total - tau) / fo);
  return g;
}
async function mixWindow(TL, t0, t1) {
  const sr = 48000, N = Math.max(1, Math.ceil((t1 - t0) * sr)), oc = new OfflineAudioContext(2, N, sr), voiced = [];
  for (const it of TL.items) if (P.origSound && it.sc.kind === 'video' && (it.sc.abuf || it.sc.longAudio) && it.sc.vol > 0) voiced.push([it.t0, it.t1]);
  const curve = (fn, a, b) => { const n = Math.max(2, Math.ceil((b - a) * 60)), c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = Math.max(0, fn(a + (b - a) * i / (n - 1))); return c; };
  if (P.origSound) for (const it of TL.items) {
    const sc = it.sc; if (sc.kind !== 'video' || !(sc.vol > 0) || it.t1 <= t0 || it.t0 >= t1) continue;
    const a = Math.max(t0, it.t0), b = Math.min(t1, it.t1), srcA = sc.start + (a - it.t0), srcB = sc.start + (b - it.t0);
    const au = await sceneAudio(sc, srcA, srcB); if (!au) continue;
    const s = oc.createBufferSource(), g = oc.createGain(); s.buffer = au.buf;
    const fi = Math.max(.06, it.ovIn || 0), gf = (tau) => sc.vol * Math.min(1, (tau - it.t0) / fi, (it.t1 - tau) / .12);
    g.gain.setValueCurveAtTime(curve(gf, a, b), a - t0, Math.max(.01, b - a));
    s.connect(g).connect(oc.destination); s.start(a - t0, Math.max(0, srcA - au.at), b - a + .02);
  }
  if (P.music.buf) {
    const s = oc.createBufferSource(), g = oc.createGain(), D = P.music.buf.duration; s.buffer = P.music.buf; s.loop = true;
    g.gain.setValueCurveAtTime(curve((tau) => musicGainAt(TL, tau, voiced), t0, t1), 0, t1 - t0);
    s.connect(g).connect(oc.destination); s.start(0, (t0 % D));
  }
  const sfxBuf = P.sfx && P.sfx !== 'synth' ? await loadSfx(P.sfx) : null;
  if (P.sfx) TL.items.slice(1).forEach((it) => { if (it.tr === 'none') return; const at = it.t0 + it.ovIn / 2 - (sfxBuf ? Math.min(.12, sfxBuf.duration / 3) : .05); if (at < t0 - .5 || at >= t1) return;
    if (sfxBuf) { const s = oc.createBufferSource(), g = oc.createGain(); s.buffer = sfxBuf; g.gain.value = P.sfxVol; s.connect(g).connect(oc.destination); if (at >= t0) s.start(at - t0); else s.start(0, t0 - at); }
    else { const nb = oc.createBuffer(1, sr * .5, sr), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = hash(i * .37) * 2 - 1; const s = oc.createBufferSource(), f = oc.createBiquadFilter(), g = oc.createGain(), w = Math.max(0, at - t0); s.buffer = nb; f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(400, w); f.frequency.exponentialRampToValueAtTime(3200, w + .18); f.frequency.exponentialRampToValueAtTime(700, w + .4); g.gain.setValueAtTime(0, w); g.gain.linearRampToValueAtTime(.28 * P.sfxVol, w + .12); g.gain.linearRampToValueAtTime(0, w + .42); s.connect(f).connect(g).connect(oc.destination); s.start(w); } });
  return oc.startRendering();
}

/* ---------- 미리보기 ---------- */
let AC = null;
async function seekVideos(TL, t) {
  const jobs = [];
  for (const it of TL.items) { const sc = it.sc; if (sc.kind !== 'video' || t < it.t0 - 1e-6 || t >= it.t1) continue; if (!sc.vid.paused) sc.vid.pause(); jobs.push(seekVid(sc.vid, sc.start + clamp(t - it.t0, 0, it.dur))); }
  if (jobs.length) await Promise.all(jobs);
}
function syncVideos(TL, t) {
  for (const it of TL.items) {
    const sc = it.sc; if (sc.kind !== 'video') continue; const v = sc.vid, on = t >= it.t0 - .15 && t < it.t1;
    if (!on) { if (!v.paused) v.pause(); continue; }
    const target = sc.start + clamp(t - it.t0, 0, it.dur);
    if (v.paused) { if (Math.abs(v.currentTime - target) > .08) v.currentTime = target; v.play().catch(() => {}); } else if (Math.abs(v.currentTime - target) > .3) v.currentTime = target;
  }
}
let drawTok = 0, drawQueued = false;
async function redraw() {
  if (PV.playing || EX.busy) return; const tok = ++drawTok, TL = timeline();
  PV.t = clamp(PV.t, 0, Math.max(0, TL.total - .001));
  await seekVideos(TL, PV.t); if (tok !== drawTok || PV.playing || EX.busy) return;
  renderFrame(RV, PV.t, TL); transport(TL);
}
function scheduleDraw() { if (drawQueued) return; drawQueued = true; tick().then(() => { drawQueued = false; redraw(); }); }
function transport(TL) { $('#seek').value = TL.total ? Math.round(PV.t / TL.total * 1000) : 0; $('#clock').textContent = `${fmt(PV.t)} / ${fmt(TL.total)}`; }
async function play() {
  if (EX.busy || PV.playing || PV.starting || !P.scenes.length) return;
  PV.starting = true; let TL, buf = null, now;
  try {
    TL = timeline(); if (PV.t >= TL.total - .05) PV.t = 0;
    $('#play').textContent = '준비 중…'; await ensureFonts(1200);
    AC = AC || new AudioContext();
    await Promise.race([AC.resume(), new Promise((r) => setTimeout(r, 800))]);
    const long = isLongTL(TL);
    if (!long) { try { buf = await mixAudio(TL); } catch (e) { console.warn('mix', e); } }
    /* 소리 장치가 돌면 소리 시계에, 아니면 화면 시계에 맞춘다 */
    const live = AC.state === 'running'; now = live ? () => AC.currentTime : () => performance.now() / 1000;
    PV.srcs = []; PV.long = long && live && needsAudio(TL);
    if (PV.long) {
      const w0 = PV.t, w1 = Math.min(TL.total, w0 + 40), first = await mixWindow(TL, w0, w1), at = AC.currentTime + .06;
      const s = AC.createBufferSource(); s.buffer = first; s.connect(AC.destination); s.start(at); PV.srcs.push(s);
      PV.startAt = at - w0; PV.winEnd = w1; PV.winBusy = false;
    } else {
      if (buf && live) { PV.src = AC.createBufferSource(); PV.src.buffer = buf; PV.src.connect(AC.destination); PV.src.start(0, PV.t); }
      PV.startAt = now() - PV.t;
    }
    PV.playing = true; $('#play').textContent = '❚❚ 멈춤';
  } catch (e) { console.error(e); $('#play').textContent = '▶ 미리보기'; return; } finally { PV.starting = false; }
  const loop = () => {
    if (!PV.playing) return; const t = now() - PV.startAt;
    if (t >= TL.total) { stop(); PV.t = 0; redraw(); return; }
    PV.t = t; syncVideos(TL, t); renderFrame(RV, t, TL); transport(TL);
    if (PV.long && !PV.winBusy && PV.winEnd < TL.total && t > PV.winEnd - 15) { /* 다음 40초 소리를 미리 섞어 이어 붙인다 */
      PV.winBusy = true; const a = PV.winEnd, b = Math.min(TL.total, a + 40);
      mixWindow(TL, a, b).then((bf) => { if (!PV.playing) return; const s = AC.createBufferSource(); s.buffer = bf; s.connect(AC.destination); s.start(Math.max(AC.currentTime, PV.startAt + a)); PV.srcs.push(s); PV.winEnd = b; }).catch((e) => console.warn('win', e)).finally(() => { PV.winBusy = false; });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function stop() {
  if (PV.src) { try { PV.src.stop(); } catch (_) {} PV.src = null; }
  for (const s of PV.srcs || []) { try { s.stop(); } catch (_) {} } PV.srcs = []; PV.long = false;
  PV.playing = false; $('#play').textContent = '▶ 미리보기';
  for (const sc of P.scenes) if (sc.kind === 'video' && !sc.vid.paused) sc.vid.pause();
}

/* ---------- 글꼴 준비 ---------- */
function allTexts() { const out = []; for (const sc of P.scenes) for (const L of sc.texts) if (L.text.trim()) out.push(L); return out; }
async function ensureFonts(maxMs = 8000) { /* 글꼴이 늦게 와도 화면이 멈추지 않게 기다리는 시간에 한도를 둔다 */
  const jobs = [], extra = P.hook + P.fixedTitle + P.brand + '0123456789. ';
  for (const w of [700, 900]) jobs.push(document.fonts.load(`${w} 48px "Pretendard Variable"`, extra).catch(() => {}));
  for (const L of allTexts()) {
    useFont(L.font); const F = FONT(L.font);
    jobs.push((async () => { if (F && F._css) await F._css; try { await document.fonts.load(`${L.weight} 48px "${L.font}"`, L.text.replace(/\*/g, '') + '0123456789'); } catch (_) {} })());
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, maxMs))]);
}
let fontTimer = 0;
function fontsSoon() { clearTimeout(fontTimer); fontTimer = setTimeout(() => ensureFonts().then(scheduleDraw), 200); ensureFonts().then(scheduleDraw); }

/* ---------- 저장 (WebCodecs H.264 + AAC → MP4) ---------- */
async function exportVideo(opts) {
  if (EX.busy || !P.scenes.length) return null;
  if (!window.VideoEncoder || !window.VideoFrame) { toast('이 브라우저에서는 저장이 안 돼요. PC 크롬이나 엣지에서 열어 주세요.', 6000); return null; }
  const free = opts && opts.noCharge;
  if (!free && !EX.charged && window.SCPay) { let ok = false; try { ok = await window.SCPay.gate(); } catch (_) {} if (!ok) return null; }
  stop(); EX.busy = true; EX.cancel = false; EX.last = null;
  const bar = $('#bar'), ptxt = $('#progText'); $('#prog').classList.remove('hidden'); $('#export').disabled = true; bar.style.width = '0%'; ptxt.textContent = '준비하는 중…';
  let venc = null, aenc = null;
  try {
    await ensureFonts();
    const TL = timeline(), q = +$('#res').value / 1080, W = Math.round(P.W * q / 2) * 2, H = Math.round(P.H * q / 2) * 2;
    const cv = mk(W, H), R = { ctx: cv.getContext('2d'), W, H, cA: mk(W, H), cB: mk(W, H), bgc: mk(8, 8), preview: false };
    const { Muxer, ArrayBufferTarget, FileSystemWritableFileStreamTarget } = await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm');
    let vcfg = null;
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.640033']) { const c = { codec, width: W, height: H, bitrate: q >= 1 ? 8e6 : 5e6, framerate: FPS, avc: { format: 'avc' } }; try { if ((await VideoEncoder.isConfigSupported(c)).supported) { vcfg = c; break; } } catch (_) {} }
    if (!vcfg) throw new Error('이 기기는 MP4(H.264) 저장을 지원하지 않아요.');
    let mix = null, acfg = null, acodec = null; const long = isLongTL(TL);
    if (TL.total > 3600 + 1) throw new Error('한 편은 60분까지 저장할 수 있어요. 장면을 나눠 주세요.');
    if (needsAudio(TL)) { if (long) mix = { long: true }; else { try { mix = await mixAudio(TL); } catch (e) { console.warn('mix', e); } } }
    if (mix && window.AudioEncoder) for (const [codec, mc] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) { const c = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 }; try { if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = c; acodec = mc; break; } } catch (_) {} }
    /* 긴 영상은 메모리 대신 브라우저 저장공간(디스크)에 바로 써 내려간다 */
    let target, fh = null, ws = null;
    if (long) { const root = await navigator.storage.getDirectory(); for await (const [n] of root.entries()) if (/^export-/.test(n)) { try { await root.removeEntry(n); } catch (_) {} }
      fh = await root.getFileHandle('export-' + Date.now() + '.mp4', { create: true }); ws = await fh.createWritable(); target = new FileSystemWritableFileStreamTarget(ws); }
    else target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H, frameRate: FPS }, audio: acfg ? { codec: acodec, sampleRate: 48000, numberOfChannels: 2 } : undefined, fastStart: long ? false : 'in-memory', firstTimestampBehavior: 'offset' });
    let aDone = 0, aErrL = null; const aencL = long && acfg ? new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { aErrL = e; } }) : null; if (aencL) aencL.configure(acfg);
    const pushAudio = async (upTo) => { /* 긴 영상: 30초씩 섞어서 바로 넣는다 */
      while (aencL && aDone < upTo - 1e-6) { const b = Math.min(TL.total, aDone + 30), m = await mixWindow(TL, aDone, b), sr = 48000, ch0 = m.getChannelData(0), ch1 = m.getChannelData(1), base = Math.round(aDone * sr), end = Math.round((b - aDone) * sr);
        for (let off = 0; off < end; off += 1024) { const n = Math.min(1024, end - off), data = new Float32Array(n * 2); data.set(ch0.subarray(off, off + n), 0); data.set(ch1.subarray(off, off + n), n); const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((base + off) / sr * 1e6), data }); aencL.encode(ad); ad.close(); if (aencL.encodeQueueSize > 50) await tick(); if (aErrL) throw aErrL; }
        aDone = b; } };
    let encErr = null;
    venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { encErr = e; } }); venc.configure(vcfg);
    const N = Math.max(1, Math.round(TL.total * FPS)), started = performance.now();
    for (let f = 0; f < N; f++) {
      if (EX.cancel) throw new Error('CANCEL'); if (encErr) throw encErr;
      const t = f / FPS; await seekVideos(TL, t); renderFrame(R, t, TL);
      const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      if (aencL && t + 1 / FPS > aDone) await pushAudio(Math.min(TL.total, aDone + 30));
      while (venc.encodeQueueSize > 8) { await tick(); if (encErr) throw encErr; }
      if (f % 3 === 0) { bar.style.width = (f / N * 94).toFixed(1) + '%'; const el = (performance.now() - started) / 1000, left = el / (f + 1) * (N - f - 1); ptxt.textContent = `장면을 그리는 중 ${Math.round(f / N * 100)}% · 남은 시간 약 ${fmt(left)}`; await tick(); }
    }
    if (aencL) { await pushAudio(TL.total); await aencL.flush(); aencL.close(); if (aErrL) throw aErrL; }
    else if (acfg) {
      ptxt.textContent = '소리를 넣는 중…'; let aErr = null;
      aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { aErr = e; } }); aenc.configure(acfg);
      const sr = 48000, end = Math.min(mix.length, Math.round(N / FPS * sr)), ch0 = mix.getChannelData(0), ch1 = mix.numberOfChannels > 1 ? mix.getChannelData(1) : ch0;
      for (let off = 0; off < end; off += 1024) { const n = Math.min(1024, end - off), data = new Float32Array(n * 2); data.set(ch0.subarray(off, off + n), 0); data.set(ch1.subarray(off, off + n), n);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / sr * 1e6), data }); aenc.encode(ad); ad.close(); if (aenc.encodeQueueSize > 50) await tick(); if (aErr) throw aErr; }
      await aenc.flush(); aenc.close(); aenc = null; if (aErr) throw aErr;
    }
    await venc.flush(); venc.close(); venc = null; if (encErr) throw encErr;
    muxer.finalize();
    let blob; if (long) { await ws.close(); blob = await fh.getFile(); } else blob = new Blob([target.buffer], { type: 'video/mp4' });
    const tcard = P.scenes.find((s) => s.role === 'title');
    const name = `쏭컷_${((tcard && tcard.texts[0] && tcard.texts[0].text) || pack().n).replace(/\*/g, '').replace(/[\\/:*?"<>|\n]/g, '').trim().slice(0, 30) || '영상'}.mp4`;
    EX.last = { blob, name, frames: N, W, H, audio: acodec || 'none', seconds: N / FPS, took: (performance.now() - started) / 1000 };
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    if (!free && !EX.charged && window.SCPay) { EX.charged = true; try { await window.SCPay.consume(); } catch (_) {} }
    bar.style.width = '100%'; ptxt.textContent = `저장했어요 — ${name} (${(blob.size / 1048576).toFixed(1)}MB · ${fmt(N / FPS)} · ${W}×${H}${acfg ? '' : ' · 소리 없음'})`;
    if (mix && !acfg) toast('이 브라우저는 소리 넣기를 지원하지 않아 소리 없이 저장했어요. PC 크롬을 권해요.', 6000);
    return EX.last;
  } catch (e) {
    try { venc && venc.state !== 'closed' && venc.close(); aenc && aenc.state !== 'closed' && aenc.close(); } catch (_) {}
    if (e && e.message === 'CANCEL') ptxt.textContent = '그만뒀어요. 파일은 만들지 않았어요.'; else { console.error(e); ptxt.textContent = `만들지 못했어요 — ${e && e.message || e}`; }
    return null;
  } finally { EX.busy = false; $('#export').disabled = false; scheduleDraw(); }
}

/* ---------- 검수 시트 ---------- */
async function qaSheet() {
  if (!P.scenes.length || EX.busy) return; stop(); await ensureFonts();
  const TL = timeline(), T = TL.total, ts = [.05, Math.min(.6, T * .12), T * .3, T * .5, T * .75, Math.max(0, T - .05)];
  const port = P.H > P.W, cols = port ? 6 : 3, rows = port ? 1 : 2, cw = port ? 300 : 480, chh = Math.round(cw * P.H / P.W / 2) * 2, gap = 10;
  const sheet = $('#qaSheet'); sheet.width = cols * cw + (cols + 1) * gap; sheet.height = rows * (chh + 34) + (rows + 1) * gap;
  const sx = sheet.getContext('2d'); sx.fillStyle = '#12121c'; sx.fillRect(0, 0, sheet.width, sheet.height);
  const R = { ctx: null, W: cw * 2, H: chh * 2, cA: mk(cw * 2, chh * 2), cB: mk(cw * 2, chh * 2), bgc: mk(8, 8), preview: false }, cv = mk(R.W, R.H); R.ctx = cv.getContext('2d');
  for (const [i, t] of ts.entries()) {
    await seekVideos(TL, t); renderFrame(R, t, TL);
    const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (chh + 34 + gap);
    sx.imageSmoothingQuality = 'high'; sx.drawImage(cv, x, y, cw, chh); sx.fillStyle = '#a1a1b5'; sx.font = '700 15px "Pretendard Variable",sans-serif'; sx.textBaseline = 'middle'; sx.fillText(`${t.toFixed(1)}초`, x + 4, y + chh + 17);
  }
  const texts = allTexts(), miss = [...new Set(texts.filter((L) => !document.fonts.check(`${L.weight} 48px "${L.font}"`, L.text.replace(/\*/g, ''))).map((L) => FONT(L.font) ? FONT(L.font).n : L.font))], small = texts.filter((L) => L._shrunk).length;
  $('#qaList').innerHTML = [`✓ 길이 ${fmt(T)} (${T.toFixed(1)}초) · 화면 ${P.W}×${P.H} · 장면 ${P.scenes.length}개 · 글자 ${texts.length}개`,
    miss.length ? `⚠ 아직 불러오지 못한 글꼴: ${miss.join(', ')} — 인터넷 연결을 확인하고 다시 눌러 주세요` : '✓ 글꼴을 모두 불러왔어요',
    small ? `⚠ 글이 길어서 자동으로 작아진 글자 ${small}개 — 글을 줄이거나 줄을 나눠 보세요` : '✓ 글자가 화면 밖으로 나가지 않아요',
    needsAudio(TL) ? '✓ 소리가 들어가요 (귀로 듣는 확인은 미리보기에서 해 주세요)' : '· 소리가 없는 영상이에요'].map((s) => `<li>${s}</li>`).join('');
  $('#qaModal').classList.remove('hidden'); scheduleDraw();
}

/* ---------- 화면 조작 ---------- */
let toastTimer = 0;
function toast(msg, ms = 3000) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), ms); }
function changed() { renderStrip(); scheduleDraw(); }
function selectScene(id, jump) {
  sel = id; const sc = scene(); selText = sc && sc.texts[0] ? sc.texts[0].id : null;
  if (jump && sc) { stop(); const it = timeline().items.find((x) => x.sc === sc); PV.t = it.t0 + Math.min(it.dur - .05, Math.max(it.ovIn + .05, it.dur * .7)); }
  syncScene(); syncText(); renderStrip(); scheduleDraw();
}
function renderStrip() {
  const TL = timeline(), strip = $('#strip'); strip.innerHTML = '';
  TL.items.forEach((it, i) => {
    const sc = it.sc, d = document.createElement('div'); d.className = 'tile' + (sc.id === sel ? ' on' : ''); d.draggable = true;
    const th = document.createElement('div'); th.className = 'th';
    if (sc.kind === 'card') { const def = pack().card || [P.bg1, P.bg2]; th.style.background = `linear-gradient(135deg,${sc.c1 || def[0]},${sc.c2 || def[1]})`; th.textContent = ((sc.texts[0] && sc.texts[0].text) || '글자 카드').replace(/\*/g, '').slice(0, 22); }
    else th.style.backgroundImage = `url(${sc.thumb})`;
    d.appendChild(th);
    d.insertAdjacentHTML('beforeend', `<span class="no">${i + 1}</span><span class="kd">${sc.kind === 'video' ? '🎬' : sc.kind === 'card' ? '🔤' : '📷'}</span><div class="du">${it.dur.toFixed(1)}초${sc.texts.some((l) => l.text.trim()) && sc.kind !== 'card' ? ' · 글자' : ''}</div>`);
    d.addEventListener('click', () => selectScene(sc.id, true));
    d.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-scene', sc.id); e.dataTransfer.effectAllowed = 'move'; });
    d.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('text/x-scene')) { e.preventDefault(); d.classList.add('dragover'); } });
    d.addEventListener('dragleave', () => d.classList.remove('dragover'));
    d.addEventListener('drop', (e) => { const id = e.dataTransfer.getData('text/x-scene'); d.classList.remove('dragover'); if (!id || id === sc.id) return; e.preventDefault(); e.stopPropagation();
      const from = P.scenes.findIndex((s) => s.id === id), moved = P.scenes.splice(from, 1)[0]; P.scenes.splice(P.scenes.findIndex((s) => s.id === sc.id) + (from <= i ? 1 : 0), 0, moved); changed(); });
    strip.appendChild(d);
  });
  $('#clock').textContent = `${fmt(PV.t)} / ${fmt(TL.total)}`;
  const sc = scene(), cap = sc && sc.texts.find((l) => l.role === 'caption'), q = $('#quickCap');
  if (document.activeElement !== q) q.value = cap ? cap.text : ''; q.disabled = !sc || sc.kind === 'card';
  ['mvL', 'mvR', 'dup', 'del'].forEach((id) => { $('#' + id).disabled = !sc; });
}
const setSeg = (id, v) => $$('#' + id + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
const setVal = (id, v) => { const el = $('#' + id); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; };
function syncProj() {
  $$('#packs .pack').forEach((b) => b.classList.toggle('on', b.dataset.k === P.pack)); $('#packGuide').textContent = pack().guide;
  setSeg('ratio', P.ratio); setSeg('layout', P.layout); setVal('trans', P.transition); setVal('transDur', P.transDur); $('#transDurV').textContent = P.transDur.toFixed(1) + '초';
  setVal('clipFull', P.clipFull); setVal('photoSec', P.photoSec); $('#photoSecV').textContent = P.photoSec + '초'; setVal('clipSec', P.clipSec); $('#clipSecV').textContent = P.clipSec + '초';
  const tc = P.scenes.find((s) => s.role === 'title'), ec = P.scenes.find((s) => s.role === 'ending');
  if (document.activeElement !== $('#title')) setVal('title', tc ? tc.texts[0].text : ''); if (document.activeElement !== $('#ending')) setVal('ending', ec ? ec.texts[0].text : '');
  setVal('hook', P.hook); setVal('fixedTitle', P.fixedTitle); setVal('brand', P.brand); setVal('dateStamp', P.dateStamp); setVal('bg1', P.bg1); setVal('bg2', P.bg2); setVal('safe', P.safe);
  $('#fixedWrap').classList.toggle('hidden', P.layout !== 'recap');
  setVal('look', P.look); setVal('autoFix', P.autoFix); setVal('origSound', P.origSound); setVal('musicVol', P.music.vol); $('#musicVolV').textContent = Math.round(P.music.vol * 100) + '%'; setVal('duck', P.music.duck); setVal('sfx', P.sfx); setVal('sfxVol', P.sfxVol); $('#sfxVolV').textContent = Math.round(P.sfxVol * 100) + '%'; syncMv();
}
const ADJ = { aBright: 'bright', aContrast: 'contrast', aSat: 'sat', aWarm: 'warm', aSharp: 'sharp', aBlur: 'blur', aVig: 'vig' };
function syncScene() {
  const sc = scene(); $('#scEmpty').classList.toggle('hidden', !!sc); $('#scBody').classList.toggle('hidden', !sc); if (!sc) return;
  const i = P.scenes.indexOf(sc) + 1; $('#scTitle').textContent = `${i}번 장면 · ${sc.kind === 'video' ? '동영상' : sc.kind === 'card' ? '글자 카드' : '사진'}`;
  const d = sceneDur(sc); $('#scDur').max = sc.kind === 'video' ? Math.max(1, Math.floor((sc.srcDur - sc.start) * 2) / 2) : 15; $('#scDur').step = sc.kind === 'video' && sc.srcDur > 120 ? 1 : .5; setVal('scDur', d); $('#scDurV').textContent = d >= 60 ? fmt(d) : d.toFixed(1) + '초';
  if (sc.kind === 'video') setVal('scEnd', (sc.start + d).toFixed(1));
  $('#scVideo').classList.toggle('hidden', sc.kind !== 'video'); $('#scPhoto').classList.toggle('hidden', sc.kind !== 'photo'); $('#scCard').classList.toggle('hidden', sc.kind !== 'card'); $('#scMedia').classList.toggle('hidden', sc.kind === 'card');
  if (sc.kind === 'video') { setVal('scStart', sc.start.toFixed(1)); $('#scStart').max = Math.max(0, sc.srcDur - .5).toFixed(1); setVal('scVol', sc.vol); $('#scVolV').textContent = Math.round(sc.vol * 100) + '%'; $('#scVideoInfo').textContent = `전체 ${fmt(sc.srcDur)} 중 ${fmt(sc.start)}부터 ${fmt(sc.start + sceneDur(sc))}까지 씁니다.${sc.abuf || sc.longAudio ? '' : ' (이 동영상은 소리를 읽지 못했어요)'}`; }
  if (sc.kind === 'photo') setVal('scMotion', sc.motion);
  setVal('scTrans', sc.trans || ''); $('#scTransWrap').classList.toggle('hidden', P.scenes.indexOf(sc) === 0 && !P.mv.on);
  if (sc.kind === 'video') setVal('scVMotion', sc.motion === 'shake' || sc.motion === 'pulse' ? sc.motion : 'none');
  if (sc.kind === 'card') { const def = pack().card || [P.bg1, P.bg2]; setVal('cC1', sc.c1 || def[0]); setVal('cC2', sc.c2 || def[1]); return; }
  setSeg('scFit', sc.fit); setVal('scZoom', sc.zoom); $('#scZoomV').textContent = Math.round(sc.zoom * 100) + '%'; setVal('scPx', sc.px); setVal('scPy', sc.py); setVal('scLook', sc.look || '');
  for (const [id, key] of Object.entries(ADJ)) { setVal(id, sc.adj[key]); $('#' + id + 'V').textContent = sc.adj[key]; }
  $('#aSharpWrap').classList.toggle('hidden', sc.kind !== 'photo');
}
let fontGroup = '고딕';
function syncText() {
  const sc = scene(); $('#txEmpty').classList.toggle('hidden', !!sc); $('#txWrap').classList.toggle('hidden', !sc); if (!sc) return;
  const list = $('#txList'); list.innerHTML = '';
  sc.texts.forEach((L, i) => { const b = document.createElement('button'); b.className = 'chip' + (L.id === selText ? ' on' : ''); b.textContent = `${i + 1}. ${(L.text.replace(/\*/g, '').replace(/\n/g, ' ') || '빈 글자').slice(0, 12)}`; b.onclick = () => { selText = L.id; syncText(); scheduleDraw(); }; list.appendChild(b); });
  if (!sc.texts.length) list.innerHTML = '<span class="muted" style="font-size:13px">아직 글자가 없어요. 아래 버튼으로 추가해 보세요.</span>';
  const L = textOf(); $('#txBody').classList.toggle('hidden', !L); $('#txDel').classList.toggle('hidden', !L); if (!L) return;
  if (document.activeElement !== $('#txText')) setVal('txText', L.text);
  const F = FONT(L.font) || FONTS[0]; fontGroup = F.g; renderFonts(L);
  $('#txWeight').innerHTML = F.w.map((w) => `<option value="${w}">${({ 300: '가늘게', 400: '보통', 500: '중간', 600: '조금 굵게', 700: '굵게', 800: '더 굵게', 900: '아주 굵게' })[w]}</option>`).join(''); setVal('txWeight', L.weight);
  setVal('txSize', L.size); $('#txSizeV').textContent = L.size; setVal('txAnim', L.anim); setVal('txT0', L.t0); setVal('txDur', L.dur);
  setVal('txColor', L.color); setVal('txAccent', L.accent); setVal('txStroke', L.stroke); setVal('txStrokeColor', L.strokeColor); setVal('txStrokeW', L.strokeW);
  setVal('txShadow', L.shadow); setVal('txBox', L.box); setVal('txBoxColor', L.boxColor); setVal('txBoxAlpha', L.boxAlpha); setSeg('txAlign', L.align);
  setVal('txLs', L.ls); $('#txLsV').textContent = L.ls; setVal('txLh', L.lh); $('#txLhV').textContent = (+L.lh).toFixed(2);
}
function renderFonts(L) {
  $$('#fontTabs button').forEach((b) => b.classList.toggle('on', b.dataset.g === fontGroup));
  const grid = $('#fontGrid'); grid.innerHTML = '';
  FONTS.filter((f) => f.g === fontGroup).forEach((f) => { const b = document.createElement('button'); b.textContent = f.n; b.title = f.f; b.style.fontFamily = f.local ? `"${f.f}"` : `"pv-${f.f}","${f.f}",var(--font)`; b.className = L && L.font === f.f ? 'on' : '';
    b.onclick = () => { const T = textOf(); if (!T) return; T.font = f.f; if (!f.w.includes(+T.weight)) T.weight = f.w.reduce((a, w) => Math.abs(w - T.weight) < Math.abs(a - T.weight) ? w : a, f.w[0]); syncText(); fontsSoon(); }; grid.appendChild(b); });
}
function syncAll() { syncProj(); syncScene(); syncText(); }

/* 템플릿 */
function applyPack(key, quiet) {
  const p = PACKS[key]; P.pack = key; P.layout = p.layout; P.transition = p.trans;
  if (p.ratio && typeof setRatio === 'function' && P.ratio !== p.ratio) setRatio(p.ratio);
  if (p.clipFull && !P.clipFull) { P.clipFull = true; for (const sc of P.scenes) if (sc.kind === 'video') { sc.start = 0; sc.dur = sc.srcDur; } } if (p.mv && !P.mv.on) { P.mv.on = true; if (P.music.buf && !P.mv.beats.length) setMusic(P.music.buf, P.music.name, P.music.lib); } P.look = p.look; P.dateStamp = !!p.date; P.bg1 = p.sw[0]; P.bg2 = p.sw[1];
  if (key === 'recap') { P.bg1 = '#22222e'; P.bg2 = '#0b0b10'; }
  for (const sc of P.scenes) for (const L of sc.texts) {
    if (L.role === 'title') Object.assign(L, p.title);
    if (L.role === 'caption') { Object.assign(L, TP[p.cap], { anim: p.capAnim }); if (!L.moved) L.y = capY(); }
  }
  if (!quiet) { syncAll(); changed(); fontsSoon(); toast(`「${p.n}」 구성으로 바꿨어요. 글자 내용은 그대로예요.`); }
}
function dateRange() { const ds = P.scenes.filter((s) => s.date).map((s) => s.date.getTime()); if (!ds.length) return ''; const a = dateStr(new Date(Math.min(...ds))), b = dateStr(new Date(Math.max(...ds))); return a === b ? a : `${a} – ${b}`; }
function upsertCard(role, text) {
  let sc = P.scenes.find((s) => s.role === role);
  if (!text.trim()) { if (sc) { P.scenes.splice(P.scenes.indexOf(sc), 1); if (sel === sc.id) { sel = null; selText = null; } } return; }
  if (!sc) {
    sc = Object.assign(sceneBase(), { kind: 'card', role, texts: [newText(Object.assign({ role: 'title', size: 104, y: .47 }, pack().title))] });
    if (role === 'title' && P.dateStamp && dateRange()) sc.texts.push(newText({ role: 'sub', text: dateRange(), size: 40, weight: 700, y: .6, stroke: 0, shadow: 0, color: pack().title.color, anim: 'fade', t0: .5 }));
    if (role === 'title') P.scenes.unshift(sc); else P.scenes.push(sc);
  }
  sc.texts[0].text = text;
}
function newCaption(text) { return newText(Object.assign({ role: 'caption', text, y: capY(), size: 64 }, TP[pack().cap], { anim: pack().capAnim })); }
function hsl2hex(h, s, l) { const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
function pickColors() {
  const sc = P.scenes.find((s) => s.kind !== 'card'); if (!sc) return;
  const src = sc.kind === 'video' ? sc.vid : sc.work, w = sc.kind === 'video' ? sc.vid.videoWidth : sc.work.width, h = sc.kind === 'video' ? sc.vid.videoHeight : sc.work.height;
  const c = mk(40, 40), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h, 0, 0, 40, 40); const p = x.getImageData(0, 0, 40, 40).data; let r = 0, g = 0, b = 0, ws = 0;
  for (let i = 0; i < p.length; i += 4) { const mx = Math.max(p[i], p[i + 1], p[i + 2]), mn = Math.min(p[i], p[i + 1], p[i + 2]), s = mx ? (mx - mn) / mx : 0, l = (mx + mn) / 510, wg = s * s * (1 - Math.abs(l - .5) * 1.2) + .02; r += p[i] * wg; g += p[i + 1] * wg; b += p[i + 2] * wg; ws += wg; }
  r /= ws * 255; g /= ws * 255; b /= ws * 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hue = 0;
  if (d) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hue = (hue * 60 + 360) % 360; const sat = clamp(d / (1 - Math.abs(mx + mn - 1) + 1e-6), .35, .8);
  P.bg1 = hsl2hex(hue, sat, .52); P.bg2 = hsl2hex((hue + 32) % 360, sat, .34); syncProj(); changed(); toast('첫 장면에서 뽑은 색으로 카드와 액자 배경을 맞췄어요.');
}

/* ---------- 이벤트 연결 ---------- */
const on = (id, ev, fn) => $('#' + id).addEventListener(ev, fn);
const drop = $('#drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
document.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
on('files', 'change', (e) => { addFiles(e.target.files); e.target.value = ''; });
on('addMore', 'click', () => $('#files').click());
$$('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.t)));
function showTab(t) { $$('#tabs button').forEach((x) => x.classList.toggle('on', x.dataset.t === t)); $$('.pane').forEach((p) => p.classList.toggle('hidden', p.dataset.p !== t)); }

/* 구성 */
const packsEl = $('#packs');
for (const [k, p] of Object.entries(PACKS)) { const b = document.createElement('button'); b.className = 'pack'; b.dataset.k = k; b.innerHTML = `<b><i style="background:linear-gradient(135deg,${p.sw[0]},${p.sw[1]})"></i>${p.n}</b><span>${p.d}</span>`; b.onclick = () => applyPack(k); packsEl.appendChild(b); }
const segClick = (id, fn) => $$('#' + id + ' button').forEach((b) => b.addEventListener('click', () => fn(b.dataset.v)));
function recap() { for (const sc of P.scenes) for (const L of sc.texts) if (L.role === 'caption' && !L.moved) L.y = capY(); }
function setRatio(v) { P.ratio = v; [P.W, P.H] = RATIOS[v]; for (const c of [view, RV.cA, RV.cB]) { c.width = P.W; c.height = P.H; } RV.W = P.W; RV.H = P.H; recap(); }
segClick('ratio', (v) => { setRatio(v); syncProj(); changed(); });
on('clipFull', 'change', (e) => { P.clipFull = e.target.checked; for (const sc of P.scenes) if (sc.kind === 'video') { if (P.clipFull) { sc.start = 0; sc.dur = sc.srcDur; } else { sc.dur = null; } } syncScene(); changed(); toast(P.clipFull ? '동영상을 전체 길이로 넣었어요. 장면 탭에서 시작·끝을 잘라 쓸 수 있어요.' : `동영상을 ${P.clipSec}초 하이라이트로 줄였어요.`); });
segClick('layout', (v) => { P.layout = v; recap(); syncProj(); changed(); });
on('trans', 'change', (e) => { P.transition = e.target.value; changed(); });
on('transDur', 'input', (e) => { P.transDur = +e.target.value; $('#transDurV').textContent = P.transDur.toFixed(1) + '초'; changed(); });
on('photoSec', 'input', (e) => { P.photoSec = +e.target.value; $('#photoSecV').textContent = P.photoSec + '초'; syncScene(); changed(); });
on('clipSec', 'input', (e) => { P.clipSec = +e.target.value; $('#clipSecV').textContent = P.clipSec + '초'; syncScene(); changed(); });
on('title', 'input', (e) => { upsertCard('title', e.target.value); changed(); fontsSoon(); });
on('ending', 'input', (e) => { upsertCard('ending', e.target.value); changed(); fontsSoon(); });
on('hook', 'input', (e) => { P.hook = e.target.value; if (!PV.playing) PV.t = Math.min(PV.t, 1.2); changed(); fontsSoon(); });
on('fixedTitle', 'input', (e) => { P.fixedTitle = e.target.value; changed(); fontsSoon(); });
on('brand', 'input', (e) => { P.brand = e.target.value; changed(); fontsSoon(); });
on('dateStamp', 'change', (e) => { P.dateStamp = e.target.checked; changed(); });
on('bg1', 'input', (e) => { P.bg1 = e.target.value; changed(); }); on('bg2', 'input', (e) => { P.bg2 = e.target.value; changed(); });
on('pickColors', 'click', pickColors);
on('safe', 'change', (e) => { P.safe = e.target.checked; scheduleDraw(); });

/* 장면 띠 */
on('addCard', 'click', () => { const sc = Object.assign(sceneBase(), { kind: 'card', texts: [newText(Object.assign({ role: 'title', text: '여기에 글자를 써 보세요', size: 96, y: .47 }, pack().title))] }); const at = scene() ? P.scenes.indexOf(scene()) + 1 : P.scenes.length; P.scenes.splice(at, 0, sc); selectScene(sc.id, true); showTab('text'); fontsSoon(); });
on('sortDate', 'click', () => { /* 글자 카드는 제자리에 두고 사진·동영상만 날짜순으로 다시 놓는다 */ const media = P.scenes.filter((s) => s.kind !== 'card').sort((a, b) => a.date - b.date); let i = 0; P.scenes = P.scenes.map((s) => s.kind === 'card' ? s : media[i++]); syncScene(); changed(); toast('찍은 날짜순으로 다시 놓았어요.'); });
const move = (dir) => { const sc = scene(); if (!sc) return; const i = P.scenes.indexOf(sc), j = i + dir; if (j < 0 || j >= P.scenes.length) return; [P.scenes[i], P.scenes[j]] = [P.scenes[j], P.scenes[i]]; syncScene(); changed(); };
on('mvL', 'click', () => move(-1)); on('mvR', 'click', () => move(1));
on('dup', 'click', async () => { const sc = scene(); if (!sc) return; const cp = Object.assign({}, sc, { id: uid(), role: undefined, adj: Object.assign({}, sc.adj), texts: sc.texts.map((l) => Object.assign({}, l, { id: uid() })) });
  if (sc.kind === 'video') { cp.vid = makeVid(sc.url); try { await once(cp.vid, 'loadedmetadata'); await seekVid(cp.vid, cp.start); } catch (_) {} }
  P.scenes.splice(P.scenes.indexOf(sc) + 1, 0, cp); selectScene(cp.id, true); });
on('del', 'click', () => { const sc = scene(); if (!sc) return; const i = P.scenes.indexOf(sc); P.scenes.splice(i, 1); if (sc.kind === 'video' && !P.scenes.some((s) => s.url === sc.url)) { sc.vid.remove(); URL.revokeObjectURL(sc.url); } else if (sc.kind === 'video') sc.vid.remove();
  const nx = P.scenes[Math.min(i, P.scenes.length - 1)]; sel = null; selText = null; if (nx) selectScene(nx.id, true); else { $('#work').classList.add('hidden'); $('#drop').classList.remove('hidden'); document.body.classList.remove('editing'); EX.charged = false; } syncAll(); changed(); });
on('quickCap', 'input', (e) => { const sc = scene(); if (!sc || sc.kind === 'card') return; let L = sc.texts.find((l) => l.role === 'caption'); const v = e.target.value;
  if (!v.trim()) { if (L) { sc.texts.splice(sc.texts.indexOf(L), 1); if (selText === L.id) selText = sc.texts[0] ? sc.texts[0].id : null; } } else if (!L) { L = newCaption(v); sc.texts.push(L); selText = L.id; } else L.text = v;
  syncText(); changed(); fontsSoon(); });

/* 장면 · 보정 */
on('scDur', 'input', (e) => { const sc = scene(); if (!sc) return; sc.dur = +e.target.value; const d = sceneDur(sc); $('#scDurV').textContent = d >= 60 ? fmt(d) : d.toFixed(1) + '초'; if (sc.kind === 'video') setVal('scEnd', (sc.start + d).toFixed(1)); changed(); });
on('scEnd', 'change', (e) => { const sc = scene(); if (!sc || sc.kind !== 'video') return; const end = clamp(+e.target.value || 0, sc.start + .3, sc.srcDur); sc.dur = end - sc.start; syncScene(); changed(); });
on('scFull', 'click', () => { const sc = scene(); if (!sc || sc.kind !== 'video') return; sc.start = 0; sc.dur = sc.srcDur; syncScene(); changed(); toast(`이 동영상을 처음부터 끝까지(${fmt(sc.srcDur)}) 넣었어요.`); });
on('scStart', 'change', (e) => { const sc = scene(); if (!sc) return; sc.start = clamp(+e.target.value || 0, 0, Math.max(0, sc.srcDur - .5)); syncScene(); changed(); });
on('scVol', 'input', (e) => { const sc = scene(); if (!sc) return; sc.vol = +e.target.value; $('#scVolV').textContent = Math.round(sc.vol * 100) + '%'; });
on('scAuto', 'click', () => { const sc = scene(); if (!sc) return; if (!sc.abuf) return toast('이 동영상은 소리를 읽지 못해 가운데 구간을 씁니다.'); sc.start = highlight(sc.abuf, sc.srcDur, sceneDur(sc)); syncScene(); changed(); toast(`${sc.start.toFixed(1)}초부터가 소리가 가장 활발해요.`); });
on('scMotion', 'change', (e) => { const sc = scene(); if (sc) { sc.motion = e.target.value; changed(); } });
on('scVMotion', 'change', (e) => { const sc = scene(); if (sc) { sc.motion = e.target.value; changed(); } });
on('scTrans', 'change', (e) => { const sc = scene(); if (sc) { sc.trans = e.target.value; const it = timeline().items.find((x) => x.sc === sc && x.i > 0); if (it && !PV.playing) PV.t = it.t0 + it.ovIn * .5; changed(); } });
on('transAll', 'click', () => { for (const sc of P.scenes) sc.trans = ''; syncScene(); changed(); toast('모든 장면을 전체 전환으로 맞췄어요.'); });
on('cC1', 'input', (e) => { const sc = scene(); if (sc) { sc.c1 = e.target.value; sc.c2 = sc.c2 || $('#cC2').value; changed(); } });
on('cC2', 'input', (e) => { const sc = scene(); if (sc) { sc.c2 = e.target.value; sc.c1 = sc.c1 || $('#cC1').value; changed(); } });
segClick('scFit', (v) => { const sc = scene(); if (sc) { sc.fit = v; setSeg('scFit', v); changed(); } });
on('scZoom', 'input', (e) => { const sc = scene(); if (sc) { sc.zoom = +e.target.value; $('#scZoomV').textContent = Math.round(sc.zoom * 100) + '%'; scheduleDraw(); } });
on('scPx', 'input', (e) => { const sc = scene(); if (sc) { sc.px = +e.target.value; scheduleDraw(); } });
on('scPy', 'input', (e) => { const sc = scene(); if (sc) { sc.py = +e.target.value; scheduleDraw(); } });
on('scRotate', 'click', () => { const sc = scene(); if (sc) { sc.rot = ((sc.rot || 0) + 90) % 360; changed(); } });
on('scFlip', 'click', () => { const sc = scene(); if (sc) { sc.flip = !sc.flip; changed(); } });
on('autoFix', 'change', (e) => { P.autoFix = e.target.checked; changed(); });
on('look', 'change', (e) => { P.look = e.target.value; changed(); });
on('scLook', 'change', (e) => { const sc = scene(); if (sc) { sc.look = e.target.value; changed(); } });
for (const [id, key] of Object.entries(ADJ)) on(id, 'input', (e) => { const sc = scene(); if (!sc) return; sc.adj[key] = +e.target.value; $('#' + id + 'V').textContent = sc.adj[key];
  if (key === 'sharp') { clearTimeout(sharpTimer); sharpTimer = setTimeout(() => { sharpen(sc); scheduleDraw(); }, 140); } else scheduleDraw(); });
on('adjAll', 'click', () => { const sc = scene(); if (!sc) return; for (const o of P.scenes) if (o !== sc && o.kind !== 'card') { o.adj = Object.assign({}, sc.adj); o.look = sc.look; sharpen(o); } changed(); toast('모든 장면에 같은 보정을 넣었어요.'); });
on('adjReset', 'click', () => { const sc = scene(); if (!sc) return; sc.adj = { bright: 0, contrast: 0, sat: 0, warm: 0, sharp: 0, blur: 0, vig: 0 }; sc.look = ''; sc.sharp = null; sc.zoom = 1; sc.px = 0; sc.py = 0; sc.rot = 0; sc.flip = false; sc.fit = 'auto'; syncScene(); changed(); });

/* 글자 */
const fontTabs = $('#fontTabs');
for (const g of ['고딕', '제목', '명조', '손글씨']) { const b = document.createElement('button'); b.textContent = g; b.dataset.g = g; b.onclick = () => { fontGroup = g; renderFonts(textOf()); }; fontTabs.appendChild(b); }
const presetsEl = $('#txPresets');
for (const [k, p] of Object.entries(TP)) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = p.n; b.onclick = () => { const L = textOf(); if (!L) return; Object.assign(L, p); delete L.n; syncText(); fontsSoon(); }; presetsEl.appendChild(b); }
on('txAdd', 'click', () => { const sc = scene(); if (!sc) return; const hasCap = sc.texts.some((l) => l.role === 'caption');
  const L = sc.kind === 'card' ? newText(Object.assign({ text: '글자를 입력하세요', size: 56, y: .62, anim: 'fade', t0: .4 }, pack().title, { anim: 'fade' })) : hasCap ? newText(Object.assign({ text: '글자를 입력하세요', y: .2, size: 72 }, TP[pack().cap], { anim: 'punch' })) : newCaption('자막을 입력하세요');
  sc.texts.push(L); selText = L.id; syncText(); changed(); fontsSoon(); $('#txText').focus(); $('#txText').select(); });
on('txDel', 'click', () => { const sc = scene(), L = textOf(); if (!sc || !L) return; sc.texts.splice(sc.texts.indexOf(L), 1); selText = sc.texts[0] ? sc.texts[0].id : null; syncText(); syncProj(); changed(); });
const txBind = (id, key, ev, conv, after) => on(id, ev, (e) => { const L = textOf(); if (!L) return; L[key] = conv ? conv(e.target) : e.target.value; if (after) after(L); scheduleDraw(); });
txBind('txText', 'text', 'input', null, () => { renderStrip(); const sc = scene(); $$('#txList .chip').forEach((c, i) => { const L = sc.texts[i]; if (L) c.textContent = `${i + 1}. ${(L.text.replace(/\*/g, '').replace(/\n/g, ' ') || '빈 글자').slice(0, 12)}`; }); if (sc.role) syncProj(); fontsSoon(); });
txBind('txWeight', 'weight', 'change', (t) => +t.value, fontsSoon);
txBind('txSize', 'size', 'input', (t) => +t.value, (L) => { $('#txSizeV').textContent = L.size; });
txBind('txAnim', 'anim', 'change', null, (L) => { const it = timeline().items.find((x) => x.sc === scene()); if (it && !PV.playing) PV.t = it.t0 + Math.min(it.dur - .05, (L.t0 || 0) + .35); });
txBind('txT0', 't0', 'change', (t) => Math.max(0, +t.value || 0)); txBind('txDur', 'dur', 'change', (t) => Math.max(0, +t.value || 0));
txBind('txColor', 'color', 'input'); txBind('txAccent', 'accent', 'input'); txBind('txStroke', 'stroke', 'change', (t) => t.checked ? 1 : 0); txBind('txStrokeColor', 'strokeColor', 'input'); txBind('txStrokeW', 'strokeW', 'input', (t) => +t.value);
txBind('txShadow', 'shadow', 'change', (t) => +t.value); txBind('txBox', 'box', 'change'); txBind('txBoxColor', 'boxColor', 'input'); txBind('txBoxAlpha', 'boxAlpha', 'input', (t) => +t.value);
txBind('txLs', 'ls', 'input', (t) => +t.value, (L) => { $('#txLsV').textContent = L.ls; }); txBind('txLh', 'lh', 'input', (t) => +t.value, (L) => { $('#txLhV').textContent = L.lh.toFixed(2); });
segClick('txAlign', (v) => { const L = textOf(); if (L) { L.align = v; setSeg('txAlign', v); scheduleDraw(); } });
segClick('txPos', (v) => { const L = textOf(); if (!L) return; const g = geom(P.W, P.H); L.x = .5; L.y = v === 'top' ? (g.titleY || .14) : v === 'mid' ? .5 : v === 'cap' ? g.capY : .92; L.moved = v !== 'cap'; scheduleDraw(); });
on('txAll', 'click', () => { const L = textOf(); if (!L) return; let n = 0; for (const sc of P.scenes) for (const o of sc.texts) if (o !== L && o.role === 'caption') { for (const k of STYLE_KEYS) o[k] = L[k]; o.x = L.x; o.y = L.y; o.moved = L.moved; n++; } changed(); toast(n ? `자막 ${n}개를 같은 모양으로 맞췄어요.` : '다른 장면에 자막이 아직 없어요.'); });

/* 소리 */
on('origSound', 'change', (e) => { P.origSound = e.target.checked; });
on('music', 'change', async (e) => { const f = e.target.files[0]; if (!f) return; $('#musicInfo').textContent = '음악을 읽는 중…';
  await loadMusicFile(f); e.target.value = ''; });
async function loadMusicFile(f) {
  try { const buf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await f.arrayBuffer()); markLib(''); await setMusic(buf, f.name, ''); }
  catch (_) { $('#musicInfo').textContent = '이 음악 파일은 열 수 없어요. mp3나 m4a로 넣어 주세요.'; }
}
on('musicClear', 'click', () => { P.music.buf = null; P.music.name = ''; P.music.lib = ''; P.music.id++; P.mv.beats = []; $('#music').value = ''; $('#musicClear').classList.add('hidden'); $('#musicInfo').textContent = '음악을 뺐어요.'; markLib(''); syncMv(); changed(); });
/* 내장 배경음악 · 효과음 (상업적 이용 가능, audio/LICENSES.md) */
let LIB = { bgm: [], sfx: [] }, libAudio = null;
function markLib(file) { $$('#bgmList .bgm').forEach((x) => x.classList.toggle('on', x.dataset.f === file)); }
async function loadLibrary() {
  try { const r = await fetch(AUD + 'manifest.json', { cache: 'no-cache' }); if (!r.ok) throw 0; const m = await r.json(); const list = Array.isArray(m) ? m : (m.files || m.items || []);
    LIB.bgm = list.filter((x) => x.type === 'bgm'); LIB.sfx = list.filter((x) => x.type === 'sfx'); } catch (_) { LIB = { bgm: [], sfx: [] }; }
  const moods = [...new Set(LIB.bgm.map((x) => x.mood))], box = $('#bgmList');
  box.innerHTML = LIB.bgm.length ? moods.map((md) => `<div class="bgmg"><b>${md}</b>${LIB.bgm.filter((x) => x.mood === md).map((x) => `<div class="bgm" data-f="${x.file}"><button class="pv" title="미리듣기">▶</button><span>${x.titleKo}<small>${x.durationSec ? fmt(x.durationSec) : ''}</small></span><button class="use">사용</button></div>`).join('')}</div>`).join('') : '<p class="hint">기본 음악 목록을 불러오지 못했어요. 내 음악 파일은 아래에서 넣을 수 있어요.</p>';
  box.querySelectorAll('.bgm').forEach((row) => {
    const f = row.dataset.f, item = LIB.bgm.find((x) => x.file === f);
    row.querySelector('.pv').onclick = () => { if (libAudio && libAudio._f === f && !libAudio.paused) { libAudio.pause(); row.querySelector('.pv').textContent = '▶'; return; } if (libAudio) libAudio.pause(); $$('#bgmList .pv').forEach((b) => b.textContent = '▶'); libAudio = new Audio(AUD + f); libAudio._f = f; libAudio.volume = .7; libAudio.play().catch(() => {}); row.querySelector('.pv').textContent = '❚❚'; libAudio.onended = () => row.querySelector('.pv').textContent = '▶'; };
    row.querySelector('.use').onclick = async () => { if (libAudio) { libAudio.pause(); $$('#bgmList .pv').forEach((b) => b.textContent = '▶'); } $('#musicInfo').textContent = '음악을 불러오는 중…';
      try { const r = await fetch(AUD + f); const buf = await new OfflineAudioContext(2, 1, 48000).decodeAudioData(await r.arrayBuffer()); markLib(f); await setMusic(buf, item.titleKo, f); toast(`「${item.titleKo}」를 배경음악으로 넣었어요.`); }
      catch (_) { $('#musicInfo').textContent = '음악을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; } };
  });
  const sel = $('#sfx'); sel.innerHTML = '<option value="">없음</option><option value="synth">휙 (기본)</option>' + LIB.sfx.map((x) => `<option value="${x.file}">${x.titleKo}</option>`).join(''); setVal('sfx', P.sfx);
}
on('sfxPrev', 'click', async () => { if (!P.sfx) return toast('효과음을 먼저 골라 주세요.'); if (P.sfx === 'synth') return toast('휙 소리는 미리보기에서 들을 수 있어요.'); const a = new Audio(AUD + P.sfx); a.volume = P.sfxVol; a.play().catch(() => {}); });
on('sfxVol', 'input', (e) => { P.sfxVol = +e.target.value; $('#sfxVolV').textContent = Math.round(P.sfxVol * 100) + '%'; });

on('musicVol', 'input', (e) => { P.music.vol = +e.target.value; $('#musicVolV').textContent = Math.round(P.music.vol * 100) + '%'; });
on('duck', 'change', (e) => { P.music.duck = e.target.checked; }); on('sfx', 'change', (e) => { P.sfx = e.target.value; if (P.sfx && P.sfx !== 'synth') loadSfx(P.sfx); });

/* 재생 · 탐색 · 저장 */
on('play', 'click', () => PV.starting ? null : PV.playing ? (stop(), scheduleDraw()) : play());
on('seek', 'input', (e) => { const was = PV.playing; stop(); PV.t = +e.target.value / 1000 * timeline().total; scheduleDraw(); if (was) play(); });
document.addEventListener('keydown', (e) => { if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) || $('#work').classList.contains('hidden')) return; e.preventDefault(); PV.playing ? (stop(), scheduleDraw()) : play(); });
on('export', 'click', exportVideo); on('cancel', 'click', () => { EX.cancel = true; });
on('qa', 'click', qaSheet); on('qaClose', 'click', () => $('#qaModal').classList.add('hidden'));
on('qaSave', 'click', () => $('#qaSheet').toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '쏭컷_검수시트.png'; a.click(); }));
$('#qaModal').addEventListener('click', (e) => { if (e.target.id === 'qaModal') e.target.classList.add('hidden'); });
addEventListener('beforeunload', (e) => { if (EX.busy) { e.preventDefault(); e.returnValue = ''; } });

/* 미리보기에서 글자 끌어 옮기기 */
let drag = null;
const toCanvas = (e) => { const r = view.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * P.W, (e.clientY - r.top) / r.height * P.H]; };
view.addEventListener('pointerdown', (e) => {
  if (PV.playing || EX.busy) return; const sc = scene(); if (!sc) return; const [x, y] = toCanvas(e);
  const hit = [...sc.texts].reverse().find((L) => L._bb && L._bb.f === RV.frameNo && x >= L._bb.x && x <= L._bb.x + L._bb.w && y >= L._bb.y && y <= L._bb.y + L._bb.h);
  if (!hit) return; selText = hit.id; showTab('text'); syncText();
  drag = { L: hit, dx: hit._bb.x + hit._bb.w / 2 - x, dy: hit._bb.y + hit._bb.h / 2 - y }; view.setPointerCapture(e.pointerId); view.style.cursor = 'grabbing'; scheduleDraw();
});
view.addEventListener('pointermove', (e) => { if (!drag) return; const [x, y] = toCanvas(e); let nx = (x + drag.dx) / P.W, ny = (y + drag.dy) / P.H; if (Math.abs(nx - .5) < .015) nx = .5; if (Math.abs(ny - .5) < .01) ny = .5; drag.L.x = clamp(nx, .02, .98); drag.L.y = clamp(ny, .02, .98); drag.L.moved = true; scheduleDraw(); });
const endDrag = () => { drag = null; view.style.cursor = ''; };
view.addEventListener('pointerup', endDrag); view.addEventListener('pointercancel', endDrag);

/* ---------- 시작 ---------- */
window.toast = toast;
applyPack('memory', true);
syncAll(); loadFontPreviews(); loadLibrary();
document.fonts.load('900 48px "Pretendard Variable"', '쏭컷').catch(() => {});
/* 시험·연동용: 같은 t면 항상 같은 화면 */
window.renderFrame = (t) => renderFrame(RV, t);
Object.defineProperty(window, 'DURATION', { get: () => timeline().total });
window.__studio = { analyzeBeats, setMusic, loadLibrary, LIB: () => LIB, mvBeats, P, PV, EX, FONTS, PACKS, TP, timeline, addFiles, exportVideo, qaSheet, ensureFonts, seekVideos, applyPack, selectScene, redraw, mixAudio, newText, newCaption, upsertCard, syncAll, changed, renderTo: (R, t) => renderFrame(R, t) };
})();
