'use strict';

// ─── INDEXEDDB HELPERS ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('BeatStoreDB', 2);
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products'))
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('cart'))
        db.createObjectStore('cart',    { keyPath: 'id', autoIncrement: true });
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function getProducts() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('products', 'readonly');
    const os = tx.objectStore('products');
    const rq = os.getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function getCart() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('cart', 'readonly');
    const os = tx.objectStore('cart');
    const rq = os.getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function saveCartItem(item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('cart', 'readwrite');
    const os = tx.objectStore('cart');
    const rq = os.add(item);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

async function deleteCartItem(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('cart', 'readwrite');
    const os = tx.objectStore('cart');
    const rq = os.delete(id);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

// ─── RENDER HOME PAGE PRODUCTS ─────────────────────────────────────────────────
async function renderProducts() {
  const prods = await getProducts();

  // Clear each section
  ['upcoming', 'top-rated', 'tv-series'].forEach(sec => {
    const ul = document.querySelector(`#${sec} .movies-list`);
    if (ul) ul.innerHTML = '';
  });

  // Render into appropriate section
  prods.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="movie-card" data-id="${p.id}">
        <figure class="card-banner">
          <img src="${p.image}" alt="${p.title}">
        </figure>
        <div class="title-wrapper">
          <h3 class="card-title">${p.title}</h3>
        </div>
        <div class="card-meta">
          <div class="badge badge-outline">${p.badge}</div>
          <div class="duration">
            <ion-icon name="pricetag-outline"></ion-icon>
            $${p.price.toFixed(2)}
          </div>
        </div>
      </div>`;
    const target = document.querySelector(`#${p.section} .movies-list`);
    if (target) target.append(li);
  });

  // Attach click handlers for product modal
  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', async () => {
      const id   = Number(card.dataset.id);
      const all  = await getProducts();
      const p    = all.find(x => x.id === id);
      openProductModal(p);
    });
  });
}

// ─── PRODUCT MODAL LOGIC ────────────────────────────────────────────────────────
function openProductModal(p) {
  // Populate fields
  document.getElementById('modal-product-image').src         = p.image;
  document.getElementById('modal-product-title').textContent = p.title;
  document.getElementById('modal-product-badge').textContent = p.badge;
  document.getElementById('modal-product-price').textContent = p.price.toFixed(2);

  // Audio demos
  const list = document.getElementById('modal-audio-list');
  list.innerHTML = '';
  p.demos.forEach(d => {
    const w = document.createElement('div');
    w.className = 'modal-audio-wrapper';
    w.innerHTML = `<p>${d.name}</p><audio controls src="${d.url}"></audio>`;
    list.append(w);
  });

  // Add to cart
  document.getElementById('modal-add-to-cart').onclick = async () => {
    await saveCartItem({
      title: p.title,
      price: p.price,
      demos: p.demos.map(d => d.url),
      zip:   p.zip
    });
    alert(`${p.title} added to cart!`);
    document.getElementById('product-modal').classList.add('hidden');
  };

  // Show modal
  document.getElementById('product-modal').classList.remove('hidden');
}

// Close product modal
document.getElementById('close-product-modal').onclick = () => {
  document.getElementById('product-modal').classList.add('hidden');
};

// ─── CART MODAL LOGIC ───────────────────────────────────────────────────────────
document.getElementById('cart-modal-btn').onclick = async () => {
  const cart    = await getCart();
  const ct      = document.getElementById('cart-items');
  const cc      = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const dlBtn   = document.getElementById('download-btn');

  if (!cart.length) {
    ct.innerHTML        = '<p>Your cart is empty.</p>';
    cc.textContent      = '0 items';
    totalEl.textContent = '0.00';
    dlBtn.disabled      = true;
  } else {
    ct.innerHTML = cart.map(it => `
      <div class="cart-item" data-id="${it.id}">
        <h4>${it.title}<button class="remove-item-btn">&times;</button></h4>
        <div class="demo-list">
          ${it.demos.map(u => `<audio controls src="${u}"></audio>`).join('')}
        </div>
      </div>
    `).join('');
    cc.textContent       = `${cart.length} ${cart.length === 1 ? 'item' : 'items'}`;
    totalEl.textContent  = cart.reduce((sum, it) => sum + it.price, 0).toFixed(2);
    dlBtn.disabled       = true;

    ct.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('.cart-item').dataset.id);
        await deleteCartItem(id);
        document.getElementById('cart-modal-btn').click(); // refresh
      });
    });
  }

  document.getElementById('cart-modal').classList.remove('hidden');
};

// Close cart modal
document.getElementById('close-cart-modal').onclick = () =>
  document.getElementById('cart-modal').classList.add('hidden');

// ─── PAYSTACK CHECKOUT & DOWNLOAD ───────────────────────────────────────────────
document.getElementById('checkout-btn').addEventListener('click', async () => {
  const cart   = await getCart();
  const amount = cart.reduce((s, i) => s + i.price, 0) * 100; // kobo
  const handler = PaystackPop.setup({
    key:      'YOUR_PUBLIC_KEY',
    email:    'customer@example.com',
    amount,
    currency: 'NGN',
    onClose() { alert('Payment window closed'); },
    callback(r) {
      document.getElementById('download-btn').disabled = false;
      alert('Payment successful! Ref: ' + r.reference);
    }
  });
  handler.openIframe();
});

document.getElementById('download-btn').addEventListener('click', async () => {
  const btn  = document.getElementById('download-btn');
  if (btn.disabled) return;
  const cart = await getCart();
  cart.forEach(it => {
    const a = document.createElement('a');
    a.href     = it.zip;
    a.download = `${it.title}.zip`;
    a.click();
  });
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', renderProducts);
