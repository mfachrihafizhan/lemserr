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
const KEY_CURRENT_USER = 'ls_current_user';
const KEY_ORDERS = 'ls_orders';

// ====== FUNGSI USER / AUTH (SUPABASE) ======
async function registerUser(nama, email, password) {
  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return false;
  }

  const { data: existing } = await supabaseClient
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    alert('Email sudah terdaftar');
    return false;
  }

  const { data, error } = await supabaseClient
    .from('users')
    .insert({ nama, email, password })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert('Registrasi gagal.');
    return false;
  }

  setData(KEY_CURRENT_USER, data.id);
  alert('Registrasi berhasil. Anda sudah login.');
  return true;
}

async function loginUser(email, password) {
  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return false;
  }

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .maybeSingle();

  if (error || !data) {
    alert('Email atau password salah');
    return false;
  }

  setData(KEY_CURRENT_USER, data.id);
  alert('Login berhasil.');
  return true;
}

async function getCurrentUser() {
  const currentId = getData(KEY_CURRENT_USER, null);
  if (!currentId) return null;
  if (!window.supabaseClient) return null;

  const { data } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', currentId)
    .maybeSingle();

  return data || null;
}

function logoutUser() {
  localStorage.removeItem(KEY_CURRENT_USER);
  alert('Anda telah logout.');
  location.reload();
}

// ====== UPDATE TOMBOL LOGIN/LOGOUT/PROFIL ======
async function updateAuthUI() {
  const btnLoginOpen = document.getElementById('btn-login-open');
  const btnLogout = document.getElementById('btn-logout');
  const btnProfil = document.getElementById('btn-profil');

  const currentUser = await getCurrentUser();

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
async function updateProfile(namaBaru, emailBaru) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert('Anda belum login');
    return;
  }

  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return;
  }

  if (emailBaru && emailBaru !== currentUser.email) {
    const { data: existing } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', emailBaru)
      .maybeSingle();

    if (existing && existing.id !== currentUser.id) {
      alert('Email sudah dipakai user lain');
      return;
    }
  }

  const updates = {};
  if (namaBaru) updates.nama = namaBaru;
  if (emailBaru) updates.email = emailBaru;

  const { error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('id', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal memperbarui profil.');
    return;
  }

  alert('Profil berhasil diperbarui.');
}

async function deleteAccount() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert('Anda belum login');
    return;
  }
  if (!confirm('Yakin ingin menghapus akun? Semua data akan hilang.')) return;

  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return;
  }

  const { error } = await supabaseClient
    .from('users')
    .delete()
    .eq('id', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal menghapus akun.');
    return;
  }

  let orders = getData(KEY_ORDERS, []);
  orders = orders.filter(o => o.userId !== currentUser.id);
  setData(KEY_ORDERS, orders);

  localStorage.removeItem(KEY_CURRENT_USER);
  alert('Akun berhasil dihapus.');
  window.location.href = 'index.html';
}

// ====== ALAMAT PENGIRIMAN ======
async function addAddress(dataAlamat) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert('Harus login dulu untuk mengelola alamat.');
    return;
  }

  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return;
  }

  const addr = {
    id: Date.now(),
    nama: dataAlamat.nama,
    hp: dataAlamat.hp,
    detail: dataAlamat.detail,
    kota: dataAlamat.kota,
    kodepos: dataAlamat.kodepos
  };

  const addresses = currentUser.addresses || [];
  addresses.push(addr);

  const { error } = await supabaseClient
    .from('users')
    .update({ addresses })
    .eq('id', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal menambah alamat.');
    return;
  }

  alert('Alamat ditambahkan.');
  renderAddressList();
}

async function updateAddress(id, dataAlamat) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (!window.supabaseClient) return;

  const addresses = currentUser.addresses || [];
  const aIdx = addresses.findIndex(a => a.id === id);
  if (aIdx === -1) return;

  addresses[aIdx] = { ...addresses[aIdx], ...dataAlamat };

  const { error } = await supabaseClient
    .from('users')
    .update({ addresses })
    .eq('id', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal memperbarui alamat.');
    return;
  }

  alert('Alamat diperbarui.');
  renderAddressList();
}

async function deleteAddress(id) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (!confirm('Hapus alamat ini?')) return;
  if (!window.supabaseClient) return;

  const addresses = (currentUser.addresses || []).filter(a => a.id !== id);

  const { error } = await supabaseClient
    .from('users')
    .update({ addresses })
    .eq('id', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal menghapus alamat.');
    return;
  }

  renderAddressList();
}

async function renderAddressList() {
  const container = document.getElementById('alamat-list');
  if (!container) return;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    container.innerHTML = '<p>Silakan login untuk mengelola alamat.</p>';
    return;
  }

  const addrs = currentUser.addresses || [];

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

async function getPrimaryAddress() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  if (!currentUser.addresses || !currentUser.addresses.length) return null;
  return currentUser.addresses[0];
}

// ====== REVIEW / ULASAN (SUPABASE) ======
let currentEditingReviewId = null;

async function addReview(produkId, rating, text) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert('Harus login untuk mengirim ulasan.');
    return;
  }

  if (!window.supabaseClient) {
    alert('Supabase belum siap.');
    return;
  }

  if (currentEditingReviewId) {
    await updateReview(currentEditingReviewId, produkId, rating, text);
    currentEditingReviewId = null;
    renderAllReviewsCurrentFilter();
    return;
  }

  const { error } = await supabaseClient
    .from('reviews')
    .insert({
      produkId,
      userId: currentUser.id,
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

async function updateReview(id, produkId, rating, text) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (!window.supabaseClient) return;

  const { error } = await supabaseClient
    .from('reviews')
    .update({ produkId, rating: Number(rating), text })
    .eq('id', id)
    .eq('userId', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal mengubah ulasan.');
  } else {
    alert('Ulasan berhasil diubah.');
  }
}

async function deleteReview(id) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (!window.supabaseClient) return;
  if (!confirm('Hapus ulasan ini?')) return;

  const { error } = await supabaseClient
    .from('reviews')
    .delete()
    .eq('id', id)
    .eq('userId', currentUser.id);

  if (error) {
    console.error(error);
    alert('Gagal menghapus ulasan.');
    return;
  }

  alert('Ulasan dihapus.');
  renderAllReviewsCurrentFilter();
}

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
    .order('created_at', { ascending: false });

  if (filterProdukId && filterProdukId !== 'all') {
    query = query.eq('produkId', filterProdukId);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error(error);
    container.innerHTML = '<p>Gagal memuat ulasan.</p>';
    return;
  }

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    if (counts[r.rating] != null) counts[r.rating] += 1;
  });
  const total = reviews.length;
  let sum = 0;
  Object.keys(counts).forEach(k => {
    sum += Number(k) * counts[k];
  });
  const avg = total ? sum / total : 0;

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

  const currentUser = await getCurrentUser();
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
    const isOwner = currentUser && r.userId === currentUser.id;
    html += `
      <div class="ulasan-item" data-review-id="${r.id}" data-produk-id="${r.produkId}" data-rating="${r.rating}" data-text="${r.text.replace(/"/g, '&quot;')}">
        <div class="ulasan-item-header">
          <div>
            <div class="ulasan-item-nama">${r.userName}</div>
            <div class="ulasan-item-produk">${namaProduk}</div>
          </div>
          <div class="ulasan-item-rating">${stars} (${r.rating}/5)</div>
        </div>
        <p class="ulasan-item-text">${r.text}</p>
        ${isOwner ? `
          <div class="ulasan-actions">
            <button type="button" class="btn-ulasan-edit">Edit</button>
            <button type="button" class="btn-ulasan-delete">Hapus</button>
          </div>
        ` : ''}
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.btn-ulasan-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.ulasan-item');
      const id = item.dataset.reviewId;
      const produkId = item.dataset.produkId;
      const rating = item.dataset.rating;
      const text = item.dataset.text;

      const selectProduk = document.getElementById('ulasan-produk');
      const selectRating = document.getElementById('ulasan-rating');
      const textarea = document.getElementById('ulasan-text');
      if (selectProduk) selectProduk.value = produkId;
      if (selectRating) selectRating.value = rating;
      if (textarea) textarea.value = text;

      currentEditingReviewId = id;

      const btnSubmit = document.querySelector('form#form-ulasan-global button[type="submit"]');
      if (btnSubmit) btnSubmit.textContent = 'Update Ulasan';
    });
  });

  container.querySelectorAll('.btn-ulasan-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.ulasan-item');
      const id = item.dataset.reviewId;
      deleteReview(id);
    });
  });
}

function renderAllReviewsCurrentFilter() {
  const filterSelect = document.getElementById('filterProduk');
  if (filterSelect) {
    renderAllReviews(filterSelect.value);
  }
}

// ====== ORDER (LOCALSTORAGE) ======
async function getUserOrders() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];
  const orders = getData(KEY_ORDERS, []);
  return orders.filter(o => o.userId === currentUser.id);
}

async function updateOrderQty(orderId, newQty) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;

  let orders = getData(KEY_ORDERS, []);
  const idx = orders.findIndex(o => o.id === orderId && o.userId === currentUser.id);
  if (idx === -1) return;

  if (newQty <= 0) {
    orders = orders.filter(o => !(o.id === orderId && o.userId === currentUser.id));
  } else {
    const order = orders[idx];
    const hargaSatuan = order.totalHarga / Math.max(order.qty, 1);
    order.qty = newQty;
    order.totalHarga = hargaSatuan * newQty;
    orders[idx] = order;
  }
  setData(KEY_ORDERS, orders);
}

async function deleteOrder(orderId) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  if (!confirm('Hapus pesanan ini?')) return;

  let orders = getData(KEY_ORDERS, []);
  orders = orders.filter(o => !(o.id === orderId && o.userId === currentUser.id));
  setData(KEY_ORDERS, orders);
  renderOrderList();
}

async function renderOrderList() {
  const container = document.getElementById('order-list');
  if (!container) return;

  const orders = await getUserOrders();
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
        </div>
        <div class="order-harga">
          <p>Rp ${o.totalHarga.toLocaleString()}</p>
        </div>
        <div class="order-qty">
          <button type="button" class="order-qty-btn btn-order-minus">-</button>
          <span class="order-qty-val">${o.qty}</span>
          <button type="button" class="order-qty-btn btn-order-plus">+</button>
        </div>
        <div class="order-actions">
          <button type="button" class="order-delete-btn">Hapus</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.order-row').forEach(row => {
    const id = Number(row.dataset.orderId);
    const minusBtn = row.querySelector('.btn-order-minus');
    const plusBtn = row.querySelector('.btn-order-plus');
    const qtySpan = row.querySelector('.order-qty-val');

    minusBtn.addEventListener('click', () => {
      let qty = Number(qtySpan.textContent) || 0;
      if (qty > 1) {
        qty--;
        updateOrderQty(id, qty);
        qtySpan.textContent = qty;
      } else {
        if (confirm('Hapus pesanan ini?')) deleteOrder(id);
      }
      if (typeof updateOrderFooter === 'function') updateOrderFooter();
    });

    plusBtn.addEventListener('click', () => {
      let qty = Number(qtySpan.textContent) || 0;
      qty++;
      updateOrderQty(id, qty);
      qtySpan.textContent = qty;
      if (typeof updateOrderFooter === 'function') updateOrderFooter();
    });
  });

  container.querySelectorAll('.order-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.order-row');
      const id = Number(row.dataset.orderId);
      deleteOrder(id);
      if (typeof updateOrderFooter === 'function') updateOrderFooter();
    });
  });
}

async function addOrder(namaProduk, qty, totalHarga) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    alert('Silakan login terlebih dahulu sebelum memesan.');
    window.location.href = 'auth.html';
    return;
  }

  const orders = getData(KEY_ORDERS, []);
  let existing = orders.find(o => o.userId === currentUser.id && o.namaProduk === namaProduk);

  if (existing) {
    existing.qty += qty;
    existing.totalHarga += totalHarga;
  } else {
    const order = {
      id: Date.now(),
      userId: currentUser.id,
      namaProduk,
      qty,
      totalHarga
    };
    orders.push(order);
  }
  setData(KEY_ORDERS, orders);
  renderOrderList();
}

// ====== INISIALISASI PER HALAMAN ======
document.addEventListener('DOMContentLoaded', async () => {
  await updateAuthUI();

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      if (await loginUser(email, password)) {
        window.location.href = 'index.html';
      }
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nama = document.getElementById('reg-nama').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      if (await registerUser(nama, email, password)) {
        window.location.href = 'index.html';
      }
    });
  }

  const profilNama = document.getElementById('profil-nama');
  const profilEmail = document.getElementById('profil-email');

    if (profilNama && profilEmail) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      alert('Silakan login terlebih dahulu.');
      window.location.href = 'auth.html';
      return;
    }

    profilNama.textContent = currentUser.nama;
    profilEmail.textContent = currentUser.email;

    const profilNamaText = document.getElementById('profil-nama-text');
    if (profilNamaText) profilNamaText.textContent = currentUser.nama;

    const formProfil = document.getElementById('form-profil');
    if (formProfil) {
      formProfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = await getCurrentUser();
        if (!currentUser) return;

        const nama = document.getElementById('edit-nama')?.value || currentUser.nama;
        const email = document.getElementById('edit-email')?.value || currentUser.email;
        await updateProfile(nama, email);
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
      formAlamat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('alamat-nama').value;
        const hpStr = document.getElementById('alamat-hp').value;
        const detail = document.getElementById('alamat-detail').value;
        const kota = document.getElementById('alamat-kota').value;
        const kodeposStr = document.getElementById('alamat-kodepos').value;

        const hp = Number(hpStr);
        const kodepos = Number(kodeposStr);

        if (!Number.isInteger(hp) || hp <= 0) {
          alert('No. HP harus berupa angka.');
          return;
        }
        if (!Number.isInteger(kodepos) || kodepos <= 0) {
          alert('Kode pos harus berupa angka.');
          return;
        }

        const data = { nama, hp, detail, kota, kodepos };
        const container = document.getElementById('alamat-list');
        const editId = container.dataset.editId;
        if (editId) {
          await updateAddress(Number(editId), data);
          delete container.dataset.editId;
        } else {
          await addAddress(data);
        }
        formAlamat.reset();
      });
    }

    await renderAddressList();
  }

  await renderOrderList();

  const ulasanList = document.getElementById('ulasan-list');
  if (ulasanList && window.supabaseClient) {
    const filterSelect = document.getElementById('filterProduk');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        renderAllReviews(filterSelect.value);
      });
    }
    await renderAllReviews('all');
  }

  // Form ulasan global (kalau ada di ulasan.html)
  const formUlasanGlobal = document.getElementById('form-ulasan-global');
  if (formUlasanGlobal) {
    formUlasanGlobal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const produkId = document.getElementById('ulasan-produk')?.value;
      const rating = document.getElementById('ulasan-rating')?.value;
      const text = document.getElementById('ulasan-text')?.value;

      if (!produkId || !rating || !text.trim()) {
        alert('Rating dan ulasan wajib diisi.');
        return;
      }

      await addReview(produkId, rating, text);
      formUlasanGlobal.reset();
      currentEditingReviewId = null;
      const btnSubmit = formUlasanGlobal.querySelector('button[type="submit"]');
      if (btnSubmit) btnSubmit.textContent = 'Kirim Ulasan';
    });
  }
});