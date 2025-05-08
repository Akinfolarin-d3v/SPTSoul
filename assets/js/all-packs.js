'use strict';

// 

// ─── INDEXEDDB HELPERS ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('BeatStoreDB', 3);
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

async function getAllProducts() {
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

// ─── PRODUCT MODAL (reuse same logic) ─────────────────────────────────────────
function openProductModal(p) {
  document.getElementById('modal-product-image').src         = p.image;
  document.getElementById('modal-product-title').textContent = p.title;
  document.getElementById('modal-product-badge').textContent = p.badge;
  document.getElementById('modal-product-price').textContent = p.price.toFixed(2);

  const list = document.getElementById('modal-audio-list');
  list.innerHTML = '';
  p.demos.forEach(d => {
    const w = document.createElement('div');
    w.className = 'modal-audio-wrapper';
    w.innerHTML = `<p>${d.name}</p><audio controls src="${d.url}"></audio>`;
    list.append(w);
  });

  document.getElementById('modal-add-to-cart').onclick = async () => {
    await idbAdd('cart',{
      title: p.title,
      price: p.price,
      demos: p.demos.map(d => d.url),
      zip:   p.zip
    });
    alert(`${p.title} added to cart!`);
    document.getElementById('product-modal').classList.add('hidden');
  };

  document.getElementById('product-modal').classList.remove('hidden');
}

// Close product modal

const closeBtn = document.getElementById('close-product-modal');
if (closeBtn) {
  closeBtn.onclick = () => {
    document.getElementById('close-product-modal').onclick = () => {
      document.getElementById('product-modal').classList.add('hidden');
    };
  };
}

// ─── CART MODAL LOGIC ───────────────────────────────────────────────────────────
document.getElementById('cart-modal-btn').onclick = async () => {
  const cart = await idbGetAll('cart');
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
    // 1) Build HTML with custom audio-player wrappers
    ct.innerHTML = cart.map(it => `
      <div class="cart-item" data-id="${it.id}">
        <h4>
          <span class="item-title">${it.title}</span>
        
          <button class="remove-item-btn"><ion-icon name="trash-outline"></ion-icon></button>
        </h4>
        <div class="demo-list">
          ${it.demos.map(d => `
            <div class="audio-player">
              <button class="btn btn-primary play-btn">
              <ion-icon name="play-circle-outline"></ion-icon>
                
                <span class="file-price">$${it.price.toFixed(2)}</span>
              </button>
              <audio src="${d.url}"></audio>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

        
    ct.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('.cart-item').dataset.id);
        await idbDelete('cart', id);
        document.getElementById('cart-modal-btn').click();
      });
    });

    ct.querySelectorAll('.audio-player').forEach(player => {
      const btn = player.querySelector('.play-btn');
      const audio = player.querySelector('audio');
      btn.addEventListener('click', () => {
        if (audio.paused) {
          audio.play();
          btn.querySelector('ion-icon').name = 'pause-circle-outline';
        } else {
          audio.pause();
          btn.querySelector('ion-icon').name = 'play-circle-outline';
        }
      });
    });
    
        
  
    cc.textContent       = `${cart.length} ${cart.length === 1 ? 'item' : 'items'}`;
    totalEl.textContent  = cart.reduce((sum, it) => sum + it.price, 0).toFixed(2);
    dlBtn.disabled       = true;
  
    // 2) Remove handlers
    ct.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.closest('.cart-item').dataset.id);
        await deleteCartItem(id);
        document.getElementById('cart-modal-btn').click(); // refresh
      });
    });
  
    // 3) Initialize play/pause on each audio-player
    ct.querySelectorAll('.audio-player').forEach(player => {
      const btn = player.querySelector('.play-btn');
      const audio = player.querySelector('audio');
    
      btn.addEventListener('click', () => {
        // toggle play/pause
        if (audio.paused) {
          audio.play();
          btn.classList.add('playing');
          btn.querySelector('ion-icon')?.setAttribute('name', 'pause-circle-outline');
        } else {
          audio.pause();
          btn.classList.remove('playing');
          btn.querySelector('ion-icon')?.setAttribute('name', 'play-circle-outline');
        }
      });
      
      audio.addEventListener('ended', () => {
        btn.classList.remove('playing');
        btn.querySelector('ion-icon')?.setAttribute('name', 'play-circle-outline');
      });
    });
    
  }
  
  document.getElementById('cart-modal').classList.remove('hidden');
};

// Close cart modal
document.getElementById('close-cart-modal').onclick = () =>
  document.getElementById('cart-modal').classList.add('hidden');

// ─── RENDER ALL PACKS ──────────────────────────────────────────────────────────
async function renderAllPacks() {
  const prods = await getAllProducts();
  prods.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const listEl = document.getElementById('all-packs-list');
  listEl.innerHTML = '';
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
            <ion-icon name="pricetag-outline"></ion-icon> $${p.price.toFixed(2)}
          </div>
        </div>
      </div>`;
    listEl.append(li);
  });

  document.querySelectorAll('#all-packs-list .movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      const prod = prods.find(x => x.id === id);
      
      openProductModal(prod);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const allPacksList = document.getElementById('all-packs-list');

  if (allPacksList) {
  
    renderAllPacks();
  }

});

