// ===================================================
// E-Commerce DZ POS - Main Application JS v2.0
// ===================================================

'use strict';

// ===== DATA STORE =====
const DB = {
  get(key, def = null) {
    try {
      const v = localStorage.getItem('ecdz_' + key);
      return v ? JSON.parse(v) : def;
    } catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('ecdz_' + key, JSON.stringify(val)); } catch {}
  }
};

// ===== GLOBAL STATE =====
const State = {
  cart: DB.get('cart_saved', []),
  currentPage: 'sale',
  invoiceCounter: DB.get('invoice_counter', 1),
  settings: DB.get('settings', {
    storeName: 'E-Commerce DZ',
    phone: '',
    address: '',
    welcomeMsg: 'شكراً لتسوقكم معنا',
    currency: 'دج',
    dateFormat: 'dmy',
    lang: 'ar',
    theme: 'light',
    color: 'default',
    fontSize: 15,
    soundEnabled: true,
    notifStock: true,
    notifDebt: true,
    autoBackup: false,
    paperSize: 'A5'
  }),
  users: DB.get('users', [
    { id: 1, username: 'admin', password: 'admin', role: 'admin', name: 'المدير' }
  ]),
  currentUser: null,
  products: DB.get('products', []),
  customers: DB.get('customers', []),
  sales: DB.get('sales', []),
  debts: DB.get('debts', []),
  externalDebts: DB.get('external_debts', []),
  deliveries: DB.get('deliveries', []),
  notifications: DB.get('notifications', []),
  todaySales: DB.get('today_sales', [])
};

// ===== SOUNDS =====
const Sounds = {
  ctx: null,
  init() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  },
  beep(freq = 800, dur = 0.1, type = 'sine') {
    if (!State.settings.soundEnabled || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.frequency.value = freq; o.type = type;
      g.gain.setValueAtTime(0.3, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.start(this.ctx.currentTime);
      o.stop(this.ctx.currentTime + dur);
    } catch {}
  },
  click()   { this.beep(600, 0.08); },
  add()     { this.beep(880, 0.15); },
  success() { this.beep(1000, 0.2); setTimeout(() => this.beep(1200, 0.2), 150); },
  error()   { this.beep(200, 0.3, 'square'); },
  notif()   { this.beep(700, 0.1); setTimeout(() => this.beep(900, 0.15), 100); }
};

// ===== APP INIT =====
window.addEventListener('load', () => {
  Sounds.init();
  createParticles();
  startClock();
  applySettings();

  // Auto-login
  const savedUser = DB.get('saved_user');
  if (savedUser) {
    const u = State.users.find(x => x.username === savedUser.username && x.password === savedUser.password);
    if (u) { State.currentUser = u; showApp(); }
  }
});

// ===== LOGIN =====
function doLogin() {
  Sounds.click();
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  const u = State.users.find(x => x.username === user && x.password === pass);
  if (u) {
    State.currentUser = u;
    DB.set('saved_user', { username: u.username, password: u.password });
    addNotification(`تم دخول المستخدم: ${u.name}`, 'info');
    showApp();
    Sounds.success();
  } else {
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'block';
    Sounds.error();
    setTimeout(() => errEl.style.display = 'none', 3000);
  }
}

function togglePassword() {
  const inp = document.getElementById('login-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loginPage = document.getElementById('login-page');
    if (loginPage && loginPage.style.display !== 'none') doLogin();
  }
});

function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  updateStoreNameHeader();
  checkNotifications();
}

// ===== CLOCK =====
function startClock() {
  const update = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const el = document.getElementById('clock');
    if (el) el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const dd = document.getElementById('datedisp');
    if (dd) dd.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };
  update();
  setInterval(update, 1000);
}

// ===== PARTICLES =====
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random() * 100}%;
      background:${Math.random() > 0.5 ? '#6c63ff' : '#00d4ff'};
      animation-duration:${Math.random() * 10 + 8}s;
      animation-delay:${Math.random() * 8}s;
    `;
    container.appendChild(p);
  }
}

// ===== SIDEBAR =====
function toggleSidebar() {
  Sounds.click();
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ===== NAVIGATION =====
const PAGE_TITLES = {
  inventory: 'إدارة السلع',
  customers: 'إدارة الزبائن والتوصيل',
  reports: 'إدارة الأعمال',
  users: 'إدارة المستخدمين',
  suppliers: 'الديون الخارجية',
  settings: 'الإعدادات العامة'
};

function navigateTo(page) {
  Sounds.click();
  closeSidebar();
  DB.set('cart_saved', State.cart);

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    State.currentPage = page;
  }

  const backBtn = document.getElementById('back-btn');
  const menuBtn = document.getElementById('menu-btn');
  const pageTitle = document.getElementById('page-title-header');

  if (page === 'sale') {
    backBtn.style.display = 'none';
    menuBtn.style.display = '';
    pageTitle.style.display = 'none';
    refreshSaleFrame();
  } else {
    backBtn.style.display = '';
    menuBtn.style.display = 'none';
    pageTitle.textContent = PAGE_TITLES[page] || '';
    pageTitle.style.display = '';
    loadPageInContainer(page);
  }
}

function goBack() {
  Sounds.click();
  navigateTo('sale');
}

// ===== IFRAME PAGE LOADING =====
function loadPageInContainer(page) {
  const container = document.getElementById('page-' + page);
  if (!container) return;

  // Create or reload iframe
  let iframe = container.querySelector('iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    container.appendChild(iframe);
  }
  iframe.src = page + '.html';
}

// Called by sale iframe once loaded
function initSaleFrame(iframe) {
  try {
    if (iframe.contentWindow && iframe.contentWindow.initFromParent) {
      iframe.contentWindow.initFromParent();
    }
  } catch (e) {}
}

function refreshSaleFrame() {
  const iframe = document.getElementById('iframe-sale');
  if (!iframe) return;
  try {
    if (iframe.contentWindow && iframe.contentWindow.loadAndRender) {
      iframe.contentWindow.loadAndRender();
    }
  } catch (e) {}
}

// ===== APPLY SETTINGS =====
function applySettings() {
  const s = State.settings;
  document.documentElement.style.fontSize = s.fontSize + 'px';

  // Theme
  document.body.classList.toggle('dark', s.theme === 'dark');

  // Color theme
  document.body.className = document.body.className
    .replace(/\btheme-\w+\b/g, '')
    .trim();
  if (s.color && s.color !== 'default') {
    document.body.classList.add('theme-' + s.color);
  }

  document.documentElement.lang = s.lang === 'fr' ? 'fr' : 'ar';
  document.documentElement.dir = 'rtl';
  updateStoreNameHeader();
}

function updateStoreNameHeader() {
  const el = document.getElementById('store-name-header');
  if (el) el.textContent = State.settings.storeName || 'E-Commerce DZ';
}

// ===== TOAST =====
function showToast(msg, type = 'info', duration = 3000) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ===== MODAL =====
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ===== NOTIFICATIONS =====
function addNotification(msg, type = 'info') {
  State.notifications.unshift({ msg, type, time: new Date().toISOString(), read: false });
  if (State.notifications.length > 50) State.notifications.pop();
  DB.set('notifications', State.notifications);
  updateNotifBadge();
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-count');
  const unread = State.notifications.filter(n => !n.read).length;
  if (badge) {
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function showNotifPanel() {
  Sounds.click();
  State.notifications.forEach(n => n.read = true);
  DB.set('notifications', State.notifications);
  updateNotifBadge();
  alert('الإشعارات:\n\n' + (State.notifications.length
    ? State.notifications.slice(0, 10).map(n => `• ${n.msg}`).join('\n')
    : 'لا توجد إشعارات'));
}

function checkNotifications() {
  State.products.forEach(p => {
    if (p.qty <= 0) addNotification(`نفاد مخزون: ${p.name}`, 'danger');
    else if (p.qty <= 5) addNotification(`مخزون منخفض: ${p.name} (${p.qty})`, 'warning');
  });
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  State.customers.forEach(c => {
    if (c.debt > 0 && c.debtDate && new Date(c.debtDate).getTime() < weekAgo) {
      addNotification(`تذكير: دين ${c.name} لأكثر من أسبوع`, 'warning');
    }
  });
}

// ===== VIRTUAL KEYBOARD =====
function toggleVKeyboard() {
  const vkb = document.getElementById('vkeyboard');
  vkb.classList.toggle('visible');
  if (vkb.classList.contains('visible')) renderVKeyboard();
}

function renderVKeyboard() {
  const layout = document.getElementById('vkb-layout');
  if (!layout) return;
  const rows = [
    ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
    ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
    ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ','⌫'],
    ['1','2','3','4','5','6','7','8','9','0'],
    ['@','.','-','_','مسافة','إدخال']
  ];
  layout.innerHTML = rows.map(row => `
    <div class="vkb-row">
      ${row.map(key => `
        <button class="vkb-key ${key.length > 3 ? 'wider' : key.length > 1 ? 'wide' : ''}"
          onclick="vkbPress('${key}')">${key}</button>
      `).join('')}
    </div>
  `).join('');
}

function vkbPress(key) {
  Sounds.click();
  const active = document.activeElement;
  if (!active || !['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
  if (key === '⌫') {
    active.value = active.value.slice(0, -1);
  } else if (key === 'مسافة') {
    active.value += ' ';
  } else if (key === 'إدخال') {
    active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  } else {
    active.value += key;
  }
  active.dispatchEvent(new Event('input'));
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'k') { e.preventDefault(); toggleVKeyboard(); }
});

// Draggable VKB
(function() {
  const vkb = document.getElementById('vkeyboard');
  if (!vkb) return;
  let dragging = false, ox, oy;
  vkb.querySelector('.vkeyboard-header')?.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - vkb.offsetLeft;
    oy = e.clientY - vkb.offsetTop;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    vkb.style.left = (e.clientX - ox) + 'px';
    vkb.style.top = (e.clientY - oy) + 'px';
    vkb.style.right = 'auto'; vkb.style.bottom = 'auto';
  });
  document.addEventListener('mouseup', () => dragging = false);
})();

// ===== EXIT =====
function confirmExit() {
  Sounds.click();
  openModal('exit-modal');
}

// ===== LOGIN ENTER KEY =====
document.getElementById('login-pass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
