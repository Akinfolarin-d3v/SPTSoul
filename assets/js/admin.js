'use strict';

const bc = new BroadcastChannel('beatstore_channel');

// ─── IndexedDB Helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('BeatStoreDB', 1);
rq.onupgradeneeded = e => {
  const db = e.target.result;
  // Make absolutely sure autoIncrement:true is included:
  if (!db.objectStoreNames.contains('products')) {
    db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
  }
  if (!db.objectStoreNames.contains('cart')) {
    db.createObjectStore('cart',    { keyPath: 'id', autoIncrement: true });
  }
};
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function idbAdd(store, item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.add(item);
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function idbGetAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readonly');
    const os = tx.objectStore(store);
    const rq = os.getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function idbDelete(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    const rq = os.delete(key);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

// ─── Admin Page Logic ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Elements & constants
  const ADMIN_USERNAME    = 'a';
  const ADMIN_PASSWORD    = 'a';
  const loginSection      = document.getElementById('login-section');
  const productSection    = document.getElementById('product-section');
  const loginForm         = document.getElementById('login-form');
  const productForm       = document.getElementById('product-form');
  const loginError        = document.getElementById('login-error');
  const productError      = document.getElementById('product-error');
  const productListBody   = document.getElementById('product-list-body');
  const audioContainer    = document.getElementById('audio-inputs-container');
  const addAudioBtn       = document.getElementById('add-audio-btn');

  // 2) Admin login
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('admin-username').value.trim();
    const p = document.getElementById('admin-password').value.trim();
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
      loginSection.classList.add('hidden');
      productSection.classList.remove('hidden');
      loginError.textContent = '';
    } else {
      loginError.textContent = 'Invalid username or password.';
    }
  });

  // 3) Load and render existing products
  let products = await idbGetAll('products');
  renderTable();

  function renderTable() {
    productListBody.innerHTML = '';
    products.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.section}</td>
        <td>${p.title}</td>
        <td>${p.badge}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>${p.demos.length}</td>
        <td>
          <button class="btn-admin delete-btn" data-id="${p.id}">Delete</button>
        </td>`;
      productListBody.appendChild(row);
    });
    productListBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', onDeleteClick);
    });
  }

  async function onDeleteClick(e) {
    const id = Number(e.target.dataset.id);
    await idbDelete('products', id);
    products = products.filter(p => p.id !== id);
    renderTable();
    bc.postMessage('products-updated');
  }

  // 4) FileReader helper
  async function readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }

  // 5) Add / remove demo inputs
  addAudioBtn.addEventListener('click', () => {
    const tpl   = audioContainer.querySelector('.audio-group');
    const clone = tpl.cloneNode(true);
    clone.querySelector('input[name="demoFiles[]"]').value = '';
    audioContainer.appendChild(clone);
  });

  audioContainer.addEventListener('click', e => {
    if (e.target.classList.contains('remove-audio-btn')) {
      const groups = audioContainer.querySelectorAll('.audio-group');
      if (groups.length > 1) e.target.closest('.audio-group').remove();
    }
  });

  // 6) Save Pack
  productForm.addEventListener('submit', async e => {
    e.preventDefault();
    productError.textContent = '';

    // Gather form values
    const section   = document.getElementById('product-section-select').value.trim();
    const title     = document.getElementById('product-title').value.trim();
    const badge     = document.getElementById('product-badge').value.trim();
    const price     = parseFloat(document.getElementById('product-price').value);
    const imageF    = document.getElementById('product-image').files[0];
    const zipF      = document.getElementById('pack-zip').files[0];
    const groups    = Array.from(audioContainer.querySelectorAll('.audio-group'));

    // Validate
    if (!section || !title || !badge || isNaN(price)
        || !imageF || !zipF || groups.length === 0) {
      productError.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      // Read files
      const image = await readFile(imageF);
      const zip   = await readFile(zipF);

      const demos = await Promise.all(groups.map(async grp => {
        const df = grp.querySelector('input[name="demoFiles[]"]').files[0];
        if (!df) throw new Error('Each demo group must have a file.');
        return {
          name: df.name.replace(/\.[^/.]+$/, ''),
          url:  await readFile(df)
        };
      }));

      // Add to DB
      const id = await idbAdd('products', { section, title, badge, price, image, demos, zip });
      products.push({ id, section, title, badge, price, image, demos, zip });

      // Refresh UI + broadcast
      renderTable();
      bc.postMessage('products-updated');

      // Reset form to one demo
      productForm.reset();
      const firstGrp = audioContainer.querySelector('.audio-group');
      audioContainer.innerHTML = '';
      audioContainer.appendChild(firstGrp);

    } catch (err) {
      productError.textContent = err.message;
    }
  });
});
