/* 쏭컷 로그인 · 건수 · 혜택 코드 (모든 화면 공용) */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const PLANS = [
  { id: 'lite', name: '라이트', count: 10, price: 4900, months: 6, desc: '가끔' },
  { id: 'pro', name: '프로', count: 25, price: 9900, months: 6, desc: '꾸준히', best: true },
  { id: 'ultra', name: '울트라', count: 50, price: 17900, months: 6, desc: '많이' }
];
const won = v => v.toLocaleString('ko-KR') + '원';
const PAY = {
  price: 9900, days: 180, orderName: '쏭컷 AI 이용권 프로 25건',
  backend: 'https://script.google.com/macros/s/AKfycbxsUt-AKMf2fw4w4Kqch2rjkq2nXe8ARTGWHHvnEP3zjwdc1M20Z8DDJCy1L1fs7WhAFA/exec',
  tossClientKey: '',            // 토스페이먼츠 클라이언트 키 (test_ck_… 는 운영자만 결제 가능, live_ck_… 는 모두)
  owner: 'mkssong22@gmail.com', contact: 'mkssong22@gmail.com'
};
const app = initializeApp({ apiKey: 'AIzaSyD546oVux_RkRnwVAuDhguT-5YPACgn5Hs', authDomain: 'lizssong.github.io', projectId: 'withaisolution', storageBucket: 'withaisolution.firebasestorage.app', messagingSenderId: '372739314135', appId: '1:372739314135:web:43254c2f8bdc5be163fb92' }, 'ssongcut');
const auth = getAuth(app); auth.languageCode = 'ko';
const db = getFirestore(app);
let user = null, ent = null, authReady;
const authReadyP = new Promise(r => authReady = r);
const $q = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const say = m => (window.toast ? window.toast(m, 3800) : alert(m));
const ymd = d => (d.getMonth() + 1) + '/' + d.getDate();
const isPaid = () => !!(ent && ent.paidUntil && ent.paidUntil > new Date());
const credits = () => (ent && ent.credits > 0 ? ent.credits : 0);
const isOwner = () => !!(user && user.email === PAY.owner);
const hasAccess = () => isPaid() || credits() > 0 || ((ent && ent.freeUsed) || 0) < 1;
async function api(action, body) {
  const r = await fetch(PAY.backend, { method: 'POST', body: JSON.stringify(Object.assign({}, body || {}, { action, idToken: await user.getIdToken() })) });
  return r.json();
}
const CODE_ERR = { NO_CODE: '없는 코드이거나 사용이 끝난 코드예요.', EXPIRED: '사용 기간이 지난 코드예요.', SOLD_OUT: '준비된 수량이 모두 사용된 코드예요.', ALREADY_USED: '이미 사용한 코드예요.', TOO_MANY: '여러 번 틀렸어요. 10분 뒤 다시 시도해 주세요.', BAD_CODE: '코드를 다시 확인해 주세요.' };
const payReady = () => !!PAY.tossClientKey && (!PAY.tossClientKey.startsWith('test_') || (user && user.email === PAY.owner));

async function loadEnt() {
  if (!user) { ent = null; return; }
  const ref = doc(db, 'ssongcut_users', user.uid);
  let s = await getDoc(ref);
  if (!s.exists()) { await setDoc(ref, { email: user.email || '', freeUsed: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); s = await getDoc(ref); }
  const d = s.data() || {};
  ent = { freeUsed: d.freeUsed || 0, credits: Number(d.credits || 0), paidUntil: d.paidUntil && d.paidUntil.toDate ? d.paidUntil.toDate() : null };
}
function renderAcct() {
  const el = $q('#acct'); if (!el) return;
  if (!user) { el.innerHTML = '<button class="btn btn-ghost btn-sm" id="acLogin">로그인</button>'; $q('#acLogin').onclick = () => openLogin(); return; }
  let badge = '';
  if (ent) {
    if (isPaid()) badge = '<span class="plan" id="acPlan">이용권 ~' + ymd(ent.paidUntil) + '</span>';
    else if (credits() > 0) badge = '<span class="plan" id="acPlan">남은 ' + credits() + '건' + ((ent.freeUsed || 0) < 1 ? ' + 무료 1회' : '') + '</span>';
    else if ((ent.freeUsed || 0) < 1) badge = '<span class="plan free" id="acPlan">무료 1회 남음</span>';
    else badge = '<span class="plan end" id="acPlan">이용권 구매</span>';
  }
  if (isOwner()) badge += '<span class="plan" id="acMgr" title="혜택 코드 관리">코드 관리</span>';
  el.innerHTML = badge + '<span class="who" title="' + esc(user.email) + '">' + esc(user.email) + '</span><span class="lo" id="acOut">로그아웃</span>';
  const p = $q('#acPlan'); if (p) p.onclick = () => openPaywall();
  const mg = $q('#acMgr'); if (mg) mg.onclick = () => openCodeAdmin();
  $q('#acOut').onclick = () => signOut(auth);
}
function modal(html) {
  const b = document.createElement('div'); b.className = 'pw-back';
  b.innerHTML = '<div class="pw" role="dialog" aria-modal="true"><button class="x" aria-label="닫기">×</button>' + html + '</div>';
  document.body.appendChild(b);
  const close = () => b.remove();
  b.querySelector('.x').addEventListener('click', close); b.addEventListener('click', e => { if (e.target === b) close(); });
  return { el: b, close };
}
async function login() {
  const prov = new GoogleAuthProvider();
  let cred;
  try { cred = await signInWithPopup(auth, prov); }
  catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await signInWithRedirect(auth, prov); return false; }
    throw e;
  }
  user = cred.user; await loadEnt(); renderAcct(); return true;
}
function openLogin() {
  return new Promise(resolve => {
    const m = modal('<span class="eb">FREE TRIAL</span><h3>구글 계정으로 시작하면<br>첫 1회는 무료예요</h3><p>로그인은 무료 체험과 이용권 기간을 확인하는 데만 써요. 비밀번호를 따로 만들 필요가 없어요.</p><div style="height:16px"></div><button class="btn gbtn" id="pwG"><i>G</i>구글 계정으로 계속하기</button><p class="note">계속하면 <a href="#terms" class="pwLink" style="color:#c4b5fd">이용약관</a>과 <a href="https://withaisolution.co.kr/privacy/" target="_blank" rel="noopener" style="color:#c4b5fd">개인정보처리방침</a>에 동의하게 돼요. 이메일과 이용 기록만 보관해요.</p><p class="err hidden" id="pwE"></p>');
    let done = false; const fin = v => { if (!done) { done = true; resolve(v); } };
    m.el.querySelector('.x').addEventListener('click', () => fin(false));
    m.el.addEventListener('click', e => { if (e.target === m.el) fin(false); });
    m.el.querySelectorAll('.pwLink').forEach(a => a.addEventListener('click', () => { m.close(); fin(false); }));
    m.el.querySelector('#pwG').onclick = async () => {
      try { await login(); m.close(); fin(true); }
      catch (e) { const er = m.el.querySelector('#pwE'); er.textContent = '로그인하지 못했어요. 팝업 차단을 풀고 다시 눌러 주세요. (' + (e.code || e.message) + ')'; er.classList.remove('hidden'); }
    };
  });
}
function openPaywall() {
  const head = isPaid() ? '<span class="eb">MY PLAN</span><h3>이용권 사용 중이에요</h3><p>' + ent.paidUntil.toLocaleDateString('ko-KR') + '까지 쓸 수 있어요. 건수가 더 필요하면 아래에서 추가로 신청하세요.</p>'
    : credits() > 0 ? '<span class="eb">MY PLAN</span><h3>남은 건수 ' + credits() + '건</h3><p>더 필요하면 아래에서 고르거나 혜택 코드를 입력하세요.</p>'
    : (ent && (ent.freeUsed || 0) < 1) ? '<span class="eb">SSONGCUT PASS</span><h3>첫 1회는 무료예요</h3><p>무료 체험 뒤에는 필요한 만큼만 골라서 쓰면 돼요.</p>'
    : '<span class="eb">SSONGCUT PASS</span><h3>무료 체험을 모두 쓰셨어요</h3><p>필요한 만큼만 골라서 계속 숏츠를 만들어 보세요.</p>';
  const ready = payReady();
  let sel = PLANS.find(p => p.best) || PLANS[0];
  const cards = '<div class="plans">' + PLANS.map(p => '<button type="button" class="pl' + (p === sel ? ' on' : '') + '" data-id="' + p.id + '">' + (p.best ? '<em>추천</em>' : '') + '<span class="pn">' + p.name + '</span><b>' + p.count + '건</b><span class="pp">' + won(p.price) + '</span><span class="pu">1건 ' + won(Math.round(p.price / p.count)) + ' · ' + p.desc + '</span></button>').join('') + '</div>';
  const m = modal(head + cards + '<ul><li>영상 1개 만들기 = 1건 (AI 숏츠 · 사진·영상 편집)</li><li>긴 영상은 길이 상관없이, 숏츠 여러 편도 1건</li><li>수정 · 다시 저장 · 생성 실패는 차감 없음</li><li>결제일부터 6개월 사용 · 자동 결제 없음</li></ul>'
    + (ready ? '<label class="agree"><input type="checkbox" id="pwAg"><span><a href="#terms" class="pwLink">이용약관 · 환불 안내</a>를 확인했고 결제에 동의합니다.</span></label><button class="btn btn-primary" id="pwPay" disabled>카드로 ' + won(sel.price) + ' 결제하기</button><p class="note">결제는 토스페이먼츠로 안전하게 처리돼요. 카드 정보는 쏭컷에 저장되지 않아요.</p>'
      : '<button class="btn btn-primary" id="pwAsk">이용권 구매 문의하기</button><p class="note">카드 · 카카오페이 · 네이버페이 결제를 곧 열어요. 그전에는 문의를 남겨 주시면 바로 안내해 드릴게요.</p>')
    + '<div class="cbox"><label for="pwCode">혜택 코드가 있나요?</label><div class="crow"><input class="inp" id="pwCode" placeholder="코드 입력" autocomplete="off" maxlength="30"><button class="btn btn-ghost btn-sm" id="pwCodeGo">적용</button></div><p class="cmsg" id="pwCodeMsg"></p></div>'
    + '<p class="err hidden" id="pwE"></p>');
  m.el.querySelectorAll('.pwLink').forEach(a => a.addEventListener('click', () => m.close()));
  const ag = m.el.querySelector('#pwAg'), pay = m.el.querySelector('#pwPay'), ask = m.el.querySelector('#pwAsk');
  const payLabel = () => '카드로 ' + won(sel.price) + ' 결제하기';
  m.el.querySelectorAll('.pl').forEach(b => b.addEventListener('click', () => {
    sel = PLANS.find(p => p.id === b.dataset.id) || sel;
    m.el.querySelectorAll('.pl').forEach(x => x.classList.toggle('on', x === b));
    if (pay) pay.textContent = payLabel();
    if (ask) ask.textContent = sel.name + ' ' + sel.count + '건 구매 문의하기';
  }));
  if (ask) ask.textContent = sel.name + ' ' + sel.count + '건 구매 문의하기';
  if (ag) ag.onchange = () => { pay.disabled = !ag.checked; };
  const cIn = m.el.querySelector('#pwCode'), cGo = m.el.querySelector('#pwCodeGo'), cMsg = m.el.querySelector('#pwCodeMsg');
  const doRedeem = async () => {
    const code = cIn.value.trim(); if (!code) { cIn.focus(); return; }
    if (!user) { m.close(); const ok = await openLogin(); if (ok) openPaywall(); return; }
    cGo.disabled = true; cMsg.className = 'cmsg'; cMsg.textContent = '확인 중…';
    try {
      const j = await api('redeem', { code });
      if (j.ok) { await loadEnt(); renderAcct(); cMsg.className = 'cmsg ok'; cMsg.textContent = j.added + '건이 추가됐어요. 지금 남은 건수는 ' + credits() + '건이에요.'; say(j.added + '건이 추가됐어요!'); setTimeout(() => m.close(), 1600); }
      else { cMsg.className = 'cmsg bad'; cMsg.textContent = CODE_ERR[j.code] || ('코드를 적용하지 못했어요. (' + j.code + ')'); }
    } catch (e) { cMsg.className = 'cmsg bad'; cMsg.textContent = '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.'; }
    cGo.disabled = false;
  };
  cGo.onclick = doRedeem; cIn.addEventListener('keydown', e => { if (e.key === 'Enter') doRedeem(); });
  if (ask) ask.onclick = () => { location.href = 'mailto:' + PAY.contact + '?subject=' + encodeURIComponent('[쏭컷] 이용권 신청') + '&body=' + encodeURIComponent('구글 로그인 이메일: ' + (user ? user.email : '') + '\n희망 이용권: ' + sel.name + ' ' + sel.count + '건 (' + won(sel.price) + ')\n'); };
  if (pay) pay.onclick = async () => {
    pay.disabled = true; pay.textContent = '결제창 여는 중…';
    try { await startPay(sel); } catch (e) { const er = m.el.querySelector('#pwE'); er.textContent = '결제창을 열지 못했어요: ' + (e.message || e.code || e); er.classList.remove('hidden'); pay.disabled = false; pay.textContent = payLabel(); }
  };
}
function openCodeAdmin() {
  if (!isOwner()) return;
  const m = modal('<span class="eb">OWNER</span><h3>혜택 코드 관리</h3><p>코드를 만들어 수강생·이벤트에 나눠 주면, 입력한 사람에게 건수가 추가돼요.</p>'
    + '<div class="cf"><label>코드<input class="inp" id="cfCode" placeholder="예: SEOCHO10" maxlength="30"></label><label>추가 건수<input class="inp" id="cfCr" type="number" min="1" max="1000" value="5"></label><label>사용 인원 (0 = 제한 없음)<input class="inp" id="cfMax" type="number" min="0" value="0"></label><label>사용 기간 일수 (0 = 없음)<input class="inp" id="cfDays" type="number" min="0" value="30"></label><label class="wide">메모<input class="inp" id="cfMemo" placeholder="예: 서초센터 12월 수강생" maxlength="60"></label></div>'
    + '<button class="btn btn-primary" id="cfMake">코드 만들기</button><p class="cmsg" id="cfMsg"></p>'
    + '<div class="cf"><label class="wide">이메일로 건수 바로 지급<input class="inp" id="gfMail" placeholder="쏭컷에 로그인한 구글 이메일"></label><label>건수<input class="inp" id="gfCr" type="number" min="1" value="10"></label></div><button class="btn btn-ghost btn-sm" id="gfGo">지급하기</button><p class="cmsg" id="gfMsg"></p>'
    + '<h4 class="clh">만든 코드</h4><div id="cfList" class="clist">불러오는 중…</div>');
  const $m = s => m.el.querySelector(s);
  const load = async () => {
    const j = await api('listCodes');
    const box = $m('#cfList'); if (!box) return;
    if (!j.ok) { box.textContent = '목록을 불러오지 못했어요 (' + j.code + ')'; return; }
    if (!j.items.length) { box.textContent = '아직 만든 코드가 없어요.'; return; }
    box.innerHTML = j.items.map(c => '<div class="crw' + (c.active === false ? ' off' : '') + '"><b>' + esc(c.code) + '</b><span>+' + esc(c.credits) + '건 · ' + esc(c.used || 0) + (Number(c.maxUses) > 0 ? '/' + esc(c.maxUses) : '') + '명 사용' + (c.expiresAt ? ' · ~' + new Date(c.expiresAt).toLocaleDateString('ko-KR') : '') + (c.memo ? ' · ' + esc(c.memo) : '') + '</span><button class="btn btn-ghost btn-sm" data-c="' + esc(c.code) + '" data-a="' + (c.active === false ? '1' : '0') + '">' + (c.active === false ? '다시 켜기' : '중지') + '</button></div>').join('');
    box.querySelectorAll('button[data-c]').forEach(b => b.onclick = async () => { b.disabled = true; await api('setCode', { code: b.dataset.c, active: b.dataset.a === '1' }); load(); });
  };
  $m('#cfMake').onclick = async () => {
    const msg = $m('#cfMsg'); msg.className = 'cmsg'; msg.textContent = '만드는 중…';
    const j = await api('createCode', { code: $m('#cfCode').value, credits: $m('#cfCr').value, maxUses: $m('#cfMax').value, days: $m('#cfDays').value, memo: $m('#cfMemo').value });
    if (j.ok) { msg.className = 'cmsg ok'; msg.textContent = '코드 ' + j.code + ' 를 만들었어요.'; $m('#cfCode').value = ''; load(); }
    else { msg.className = 'cmsg bad'; msg.textContent = ({ DUPLICATE: '이미 있는 코드예요.', BAD_CODE: '코드는 3~30자 영문·숫자로 써 주세요.', BAD_CREDITS: '건수는 1~1000 사이로 써 주세요.' })[j.code] || ('실패: ' + j.code); }
  };
  $m('#gfGo').onclick = async () => {
    const msg = $m('#gfMsg'); msg.className = 'cmsg'; msg.textContent = '지급 중…';
    const j = await api('grantCredits', { email: $m('#gfMail').value, credits: $m('#gfCr').value });
    if (j.ok) { msg.className = 'cmsg ok'; msg.textContent = j.email + ' 님의 남은 건수: ' + j.credits + '건'; }
    else { msg.className = 'cmsg bad'; msg.textContent = j.code === 'NO_USER' ? '그 이메일로 쏭컷에 로그인한 기록이 없어요.' : ('실패: ' + j.code); }
  };
  load();
}
function loadToss() {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v2/standard'; s.onload = res; s.onerror = () => rej(new Error('결제 모듈을 불러오지 못했어요')); document.head.appendChild(s); });
}
async function startPay(plan) {
  plan = plan || PLANS.find(p => p.best) || PLANS[0];
  if (!user) throw new Error('로그인이 필요해요');
  await loadToss();
  const tp = window.TossPayments(PAY.tossClientKey);
  const payment = tp.payment({ customerKey: user.uid });
  const back = location.origin + location.pathname;
  await payment.requestPayment({
    method: 'CARD', amount: { currency: 'KRW', value: plan.price },
    orderId: 'sc-' + plan.id + '-' + user.uid + '-' + Date.now(), orderName: '쏭컷 AI 이용권 ' + plan.name + ' ' + plan.count + '건',
    successUrl: back + '?pay=success', failUrl: back + '?pay=fail',
    customerEmail: user.email || undefined, customerName: user.displayName || undefined,
    card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false }
  });
}
async function handleReturn() {
  const q = new URLSearchParams(location.search); const st = q.get('pay'); if (!st) return;
  const clean = () => history.replaceState(null, '', location.pathname + location.hash);
  if (st === 'fail') { say('결제가 완료되지 않았어요. ' + (q.get('message') || '')); clean(); return; }
  await authReadyP;
  if (!user) { say('로그인 후 다시 확인해 주세요.'); return; }
  say('결제를 확인하고 있어요…');
  try {
    const r = await fetch(PAY.backend, { method: 'POST', body: JSON.stringify({ action: 'confirm', idToken: await user.getIdToken(), paymentKey: q.get('paymentKey'), orderId: q.get('orderId'), amount: Number(q.get('amount')) }) });
    const j = await r.json();
    if (j.ok) { await loadEnt(); renderAcct(); say('결제 완료! ' + (ent && ent.paidUntil ? ent.paidUntil.toLocaleDateString('ko-KR') + '까지' : '') + ' 쏭컷 이용권이 열렸어요.'); }
    else say('결제 확인에 실패했어요 (' + j.code + '). 문의: ' + PAY.contact);
  } catch (e) { say('결제 확인 중 오류가 났어요. 문의: ' + PAY.contact); }
  clean();
}
window.SCPay = {
  async gate() {
    if (!user) await authReadyP;
    if (!user) { const ok = await openLogin(); if (!ok) return false; }
    try { await loadEnt(); } catch (e) { say('이용 정보를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'); return false; }
    renderAcct();
    if (hasAccess()) return true;
    openPaywall(); return false;
  },
  async consume() {
    try {
      if (!user || !ent || isPaid()) return;
      if ((ent.freeUsed || 0) < 1) { await updateDoc(doc(db, 'ssongcut_users', user.uid), { freeUsed: 1, updatedAt: serverTimestamp() }); ent.freeUsed = 1; renderAcct(); say(credits() > 0 ? '무료 체험 1회를 사용했어요. 남은 건수는 ' + credits() + '건이에요.' : '무료 체험 1회를 사용했어요. 다음부터는 이용권이 필요해요.'); return; }
      if (credits() > 0) { const next = ent.credits - 1; await updateDoc(doc(db, 'ssongcut_users', user.uid), { credits: next, updatedAt: serverTimestamp() }); ent.credits = next; renderAcct(); say('1건을 사용했어요. 남은 건수는 ' + next + '건이에요.'); }
    } catch (e) { console.warn(e); }
  },
  openPaywall, openCodeAdmin, state: () => ({ user: user && user.email, ent })
};
onAuthStateChanged(auth, async u => { user = u; try { await loadEnt(); } catch (e) { ent = null; } renderAcct(); authReady(); });
getRedirectResult(auth).catch(e => { if (e && e.code) say('로그인하지 못했어요 (' + e.code + ')'); });
renderAcct();
handleReturn();
