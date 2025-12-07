// ====== UTIL LOCALSTORAGE ======
function getData(key, defaultValue) {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ====== KONSTANTA KEY ======
const KEY_USERS = 'ls_users';
const KEY_CURRENT_USER = 'ls_current_user';
const KEY_ORDERS = 'ls_orders';

// ====== FUNGSI USER / AUTH ======
function getCurrentUser() {
  const users = getData(KEY_USERS, []);
  const currentId = getData(KEY_CURRENT_USER, null);
  if (!currentId) return null;
  return users.find(u => u.id === currentId) || null;
}

function saveUserList(users) {
  setData(KEY_USERS, users);
}

function registerUser(nama, email, password) {
  const users = getData(KEY_USERS, []);
  if (users.some(u => u.email === email)) {
    alert('Email sudah terdaftar');
    return false;
  }
  const id = Date.now();
  const user = { id, nama, email, password, addresses: [] };
  users.push(user);
  saveUserList(users);
  setData(KEY_CURRENT_USER, id);
  alert('Registrasi berhasil. Anda sudah login.');
  return true;
}

function loginUser(email, password) {
  const users = getData(KEY_USERS, []);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    alert('Email atau password salah');
    return false;
  }
  setData(KEY_CURRENT_USER, user.id);
  alert('Login berhasil.');
  return true;
}

function logoutUser() {
  localStorage.removeItem(KEY_CURRENT_USER);
  alert('Anda telah logout.');
  location.reload();
}

// ====== UPDATE TOMBOL LOGIN/LOGOUT/PROFIL DI SIDEBAR ======
function updateAuthUI() {
  const btnLoginOpen = document.getElementById('btn-login-open');
  const btnLogout = document.getElementById('btn-logout');
  const btnProfil = document.getElementById('btn-profil');

  const currentUser = getCurrentUser();

  if (currentUser) {
    if (btnLoginOpen) btnLoginOpen.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (btnProfil) btnProfil.style.display = 'inline-flex';
  } else {
    if (btnLoginOpen) btnLoginOpen.style.display = 'inline-flex';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnProfil) btnProfil.style.display = 'none';
  }

  if (btnLogout) {
    btnLogout.onclick = function (e) {
      e.preventDefault();
      logoutUser();
    };
  }
}

// ====== PROFIL: EDIT & HAPUS AKUN ======
function updateProfile(namaBaru, emailBaru) {
  const users = getData(KEY_USERS, []);
  const currentId = getData(KEY_CURRENT_USER, null);
  if (!currentId) {
    alert('Anda belum login');
    return;
  }
  const idx = users.findIndex(u => u.id === currentId);
  if (idx === -1) return;

  if (emailBaru && emailBaru !== users[idx].email) {
    if (users.some(u => u.email === emailBaru)) {
      alert('Email sudah dipakai user lain');
      return;
    }
    users[idx].email = emailBaru;
  }
  if (namaBaru) users[idx].nama = namaBaru;

  saveUserList(users);
  alert('Profil berhasil diperbarui.');
}

function deleteAccount() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Anda belum login');
    return;
  }
  if (!confirm('Yakin ingin menghapus akun? Semua data akan hilang.')) return;

  let users = getData(KEY_USERS, []);
  users = users.filter(u => u.id !== currentUser.id);
  saveUserList(users);

  // ulasan sekarang di Supabase, jadi tidak perlu hapus dari localStorage
  let orders = getData(KEY_ORDERS, []);
  orders = orders.filter(o => o.userId !== currentUser.id);
  setData(KEY_ORDERS, orders);

  localStorage.removeItem(KEY_CURRENT_USER);
  alert('Akun berhasil dihapus.');
  window.location.href = 'index.html';
}

// ====== ALAMAT PENGIRIMAN (DI PROFIL) ======
function addAddress(dataAlamat) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Harus login dulu untuk mengelola alamat.');
    return;
  }
  const users = getData(KEY_USERS, []);
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;

  const addr = {
    id: Date.now(),
    nama: dataAlamat.nama,
    hp: dataAlamat.hp,
    detail: dataAlamat.detail,
    kota: dataAlamat.kota,
    kodepos: dataAlamat.kodepos
  };

  if (!users[idx].addresses) users[idx].addresses = [];
  users[idx].addresses.push(addr);
  saveUserList(users);
  alert('Alamat ditambahkan.');
  renderAddressList();
}

function updateAddress(id, dataAlamat) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const users = getData(KEY_USERS, []);
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;

  const addrs = users[idx].addresses || [];
  const aIdx = addrs.findIndex(a => a.id === id);
  if (aIdx === -1) return;

  addrs[aIdx] = { ...addrs[aIdx], ...dataAlamat };
  users[idx].addresses = addrs;
  saveUserList(users);
  alert('Alamat diperbarui.');
  renderAddressList();
}

function deleteAddress(id) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (!confirm('Hapus alamat ini?')) return;

  const users = getData(KEY_USERS, []);
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;

  const addrs = users[idx].addresses || [];
  users[idx].addresses = addrs.filter(a => a.id !== id);
  saveUserList(users);
  renderAddressList();
}

function renderAddressList() {
  const container = document.getElementById('alamat-list');
  if (!container) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    container.innerHTML = '<p>Silakan login untuk mengelola alamat.</p>';
    return;
  }

  const users = getData(KEY_USERS, []);
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;
  const addrs = users[idx].addresses || [];

  if (!addrs.length) {
    container.innerHTML = '<p>Belum ada alamat tersimpan.</p>';
    return;
  }

  let html = '';
  addrs.forEach(a => {
    html += `
      <div class="alamat-item" data-id="${a.id}">
        <p><strong>${a.nama}</strong> (${a.hp})</p>
        <p>${a.detail}, ${a.kota}, ${a.kodepos}</p>
        <button class="btn-edit-alamat">Edit</button>
        <button class="btn-hapus-alamat">Hapus</button>
      </div>
    `;
  });
  container.innerHTML = html;

  container.querySelectorAll('.btn-edit-alamat').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.alamat-item');
      const id = Number(parent.dataset.id);
      const a = addrs.find(x => x.id === id);
      if (!a) return;
      document.getElementById('alamat-nama').value = a.nama;
      document.getElementById('alamat-hp').value = a.hp;
      document.getElementById('alamat-detail').value = a.detail;
      document.getElementById('alamat-kota').value = a.kota;
      document.getElementById('alamat-kodepos').value = a.kodepos;
      container.dataset.editId = id;
    });
  });

  container.querySelectorAll('.btn-hapus-alamat').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.alamat-item');
      const id = Number(parent.dataset.id);
      deleteAddress(id);
    });
  });
}

// ambil alamat pertama user
function getPrimaryAddress() {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const users = getData(KEY_USERS, []);
  const u = users.find(x => x.id === currentUser.id);
  if (!u || !u.addresses || !u.addresses.length) return null;

  return u.addresses[0];
}

// ====== REVIEW / ULASAN DENGAN SUPABASE ======
async function addReview(produkId, rating, text) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Harus login untuk mengirim ulasan.');
    return;
  }

  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return;
  }

  const { error } = await supabaseClient
    .from('reviews')
    .insert({
      produkId,
      userName: currentUser.nama,
      rating: Number(rating),
      text
    });

  if (error) {
    console.error(error);
    alert('Gagal menyimpan ulasan.');
    return;
  }

  alert('Ulasan tersimpan.');
  renderAllReviewsCurrentFilter();
}

function initReviewForms() {
  const produkElems = document.querySelectorAll('.produk[data-produk-id]');
  produkElems.forEach(produk => {
    const produkId = produk.dataset.produkId;
    const form = produk.querySelector('.form-review');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      const rating = form.querySelector('.review-rating').value;
      const text = form.querySelector('.review-text').value;

      if (!rating || !text.trim()) {
        alert('Rating dan ulasan wajib diisi.');
        return;
      }

      addReview(produkId, rating, text);
      form.reset();
    });
  });
}

// ====== ULASAN PAGE (Supabase) ======
async function renderAllReviews(filterProdukId) {
  const container = document.getElementById('ulasan-list');
  if (!container) return;

  if (!window.supabaseClient) {
    container.innerHTML = '<p>Supabase belum siap.</p>';
    return;
  }

  let query = supabaseClient
    .from('reviews')
    .select('*')
    .order('createdAt', { ascending: false });

  if (filterProdukId && filterProdukId !== 'all') {
    query = query.eq('produkId', filterProdukId);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error(error);
    container.innerHTML = '<p>Gagal memuat ulasan.</p>';
    return;
  }

  const counts = {1:0,2:0,3:0,4:0,5:0};
  reviews.forEach(r => {
    if (counts[r.rating] != null) counts[r.rating] += 1;
  });
  const total = reviews.length;
  let sum = 0;
  Object.keys(counts).forEach(k => {
    sum += Number(k) * counts[k];
  });
  const avg = total ? (sum / total) : 0;

  const totalEl = document.getElementById('total-reviews');
  const avgEl = document.getElementById('avg-rating');
  const starsEl = document.getElementById('avg-stars');
  if (totalEl) totalEl.textContent = total + ' reviews';
  if (avgEl) avgEl.textContent = avg.toFixed(1);
  if (starsEl) {
    const rounded = Math.round(avg);
    const filled = '★'.repeat(rounded || 0);
    const empty = '☆'.repeat(5 - (rounded || 0));
    starsEl.textContent = filled + empty;
  }

  for (let i = 1; i <= 5; i++) {
    const countSpan = document.getElementById('count-' + i);
    const barFill = document.getElementById('bar-' + i);
    const c = counts[i] || 0;
    if (countSpan) countSpan.textContent = c;
    if (barFill) {
      const percent = total ? (c / total) * 100 : 0;
      barFill.style.width = percent + '%';
    }
  }

  const produkNames = {
    large: 'Lemon Sereh - Cup Large',
    medium: 'Lemon Sereh - Cup Medium',
    small: 'Lemon Sereh - Cup Small'
  };

  if (!reviews.length) {
    container.innerHTML = '<p>Belum ada ulasan.</p>';
    return;
  }

  let html = '';
  reviews.forEach(r => {
    const namaProduk = produkNames[r.produkId] || r.produkId;
    const stars = '⭐'.repeat(r.rating);
    html += `
      <div class="ulasan-item">
        <div class="ulasan-item-header">
          <div>
            <div class="ulasan-item-nama">${r.userName}</div>
            <div class="ulasan-item-produk">${namaProduk}</div>
          </div>
          <div class="ulasan-item-rating">${stars} (${r.rating}/5)</div>
        </div>
        <p class="ulasan-item-text">${r.text}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderAllReviewsCurrentFilter() {
  const filterSelect = document.getElementById('filterProduk');
  if (filterSelect) {
    renderAllReviews(filterSelect.value);
  }
}

// ====== ORDER (SIMPAN & LIST) ======
function getUserOrders() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];
  const orders = getData(KEY_ORDERS, []);
  return orders.filter(o => o.userId === currentUser.id);
}

function deleteOrder(orderId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (!confirm('Hapus pesanan ini?')) return;

  let orders = getData(KEY_ORDERS, []);
  orders = orders.filter(o => !(o.id === orderId && o.userId === currentUser.id));
  setData(KEY_ORDERS, orders);
  renderOrderList();
}

function renderOrderList() {
  const container = document.getElementById('order-list');
  if (!container) return;

  const orders = getUserOrders();
  if (!orders.length) {
    container.innerHTML = '<p>Belum ada pesanan.</p>';
    return;
  }

  let html = '';
  orders.forEach(o => {
    html += `
      <div class="order-row" data-order-id="${o.id}">
        <div class="order-info">
          <p class="order-name"><strong>${o.namaProduk}</strong></p>
          <p class="order-desc">Qty: ${o.qty}</p>
        </div>
        <div class="order-harga">
          <p>Rp ${o.totalHarga}</p>
        </div>
        <button class="order-delete-btn">Hapus</button>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.order-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.order-row');
      const id = Number(row.dataset.orderId);
      deleteOrder(id);
    });
  });
}

function addOrder(namaProduk, qty, totalHarga) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Silakan login terlebih dahulu sebelum memesan.');
    window.location.href = 'auth.html';
    return;
  }

  const orders = getData(KEY_ORDERS, []);
  const order = {
    id: Date.now(),
    userId: currentUser.id,
    namaProduk,
    qty,
    totalHarga
  };
  orders.push(order);
  setData(KEY_ORDERS, orders);
}

// ====== INISIALISASI PER HALAMAN ======
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (formLogin) {
    formLogin.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      if (loginUser(email, password)) {
        window.location.href = 'index.html';
      }
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', e => {
      e.preventDefault();
      const nama = document.getElementById('reg-nama').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      if (registerUser(nama, email, password)) {
        window.location.href = 'index.html';
      }
    });
  }

  const profilNama = document.getElementById('profil-nama');
  const profilEmail = document.getElementById('profil-email');

  if (profilNama && profilEmail) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('Silakan login terlebih dahulu.');
      window.location.href = 'auth.html';
      return;
    }

    profilNama.textContent = currentUser.nama;
    profilEmail.textContent = currentUser.email;

    const profilNamaText = document.getElementById('profil-nama-text');
    if (profilNamaText) {
      profilNamaText.textContent = currentUser.nama;
    }

    const formProfil = document.getElementById('form-profil');
    if (formProfil) {
      const editNama = document.getElementById('edit-nama');
      const editEmail = document.getElementById('edit-email');
      if (editNama) editNama.value = currentUser.nama;
      if (editEmail) editEmail.value = currentUser.email;

      formProfil.addEventListener('submit', e => {
        e.preventDefault();
        const nama = editNama ? editNama.value : currentUser.nama;
        const email = editEmail ? editEmail.value : currentUser.email;
        updateProfile(nama, email);
        window.location.reload();
      });
    }

    const btnHapusAkun = document.getElementById('btn-hapus-akun');
    if (btnHapusAkun) {
      btnHapusAkun.addEventListener('click', () => {
        deleteAccount();
      });
    }

    const formAlamat = document.getElementById('form-alamat');
    if (formAlamat) {
      formAlamat.addEventListener('submit', e => {
        e.preventDefault();
        const data = {
          nama: document.getElementById('alamat-nama').value,
          hp: document.getElementById('alamat-hp').value,
          detail: document.getElementById('alamat-detail').value,
          kota: document.getElementById('alamat-kota').value,
          kodepos: document.getElementById('alamat-kodepos').value
        };
        const container = document.getElementById('alamat-list');
        const editId = container.dataset.editId;
        if (editId) {
          updateAddress(Number(editId), data);
          delete container.dataset.editId;
        } else {
          addAddress(data);
        }
        formAlamat.reset();
      });
    }

    renderAddressList();
  }

  initReviewForms();
  renderOrderList();

  const ulasanList = document.getElementById('ulasan-list');
  if (ulasanList) {
    const filterSelect = document.getElementById('filterProduk');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        renderAllReviews(filterSelect.value);
      });
    }
    renderAllReviews('all');
  }
});
