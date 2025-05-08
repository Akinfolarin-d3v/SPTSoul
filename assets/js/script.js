'use strict';

/**
 * NAVBAR & STICKY HEADER & GO TOP
 */
const navOpenBtn  = document.querySelector("[data-menu-open-btn]");
const navCloseBtn = document.querySelector("[data-menu-close-btn]");
const navbar      = document.querySelector("[data-navbar]");
const overlay     = document.querySelector("[data-overlay]");
const goTopBtn    = document.querySelector("[data-go-top]");
const header      = document.querySelector("[data-header]");

[navOpenBtn, navCloseBtn, overlay].forEach(el => {
  el.addEventListener("click", () => {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.classList.toggle("active");
  });
});

window.addEventListener("scroll", () => {
  header.classList.toggle("active", window.scrollY >= 10);
  goTopBtn.classList.toggle("active", window.scrollY >= 500);
});

/**
 * INDEXEDDB HELPERS
 */
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

async function getProducts() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const rq = db.transaction('products','readonly').objectStore('products').getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function getCart() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const rq = db.transaction('cart','readonly').objectStore('cart').getAll();
    rq.onsuccess = () => res(rq.result);
    rq.onerror   = () => rej(rq.error);
  });
}

async function saveCartItem(item) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const rq = db.transaction('cart','readwrite').objectStore('cart').add(item);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

async function deleteCartItem(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const rq = db.transaction('cart','readwrite').objectStore('cart').delete(id);
    rq.onsuccess = () => res();
    rq.onerror   = () => rej(rq.error);
  });
}

/**
 * HOME PAGE: render into Upcoming / Top Rated / TV Series
 */
async function renderProducts() {
  const prods = await getProducts();
  ['upcoming','top-rated','best-beat'].forEach(sec => {
    const ul = document.querySelector(`#${sec} .movies-list`);
    if (ul) ul.innerHTML = '';
  });

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
    document.querySelector(`#${p.section} .movies-list`)?.append(li);
  });

  // attach modal openers
  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', async () => {
      const id   = +card.dataset.id;
      const all  = await getProducts();
      const prod = all.find(x => x.id === id);
      openProductModal(prod);
    });
  });
}

/**
 * PRODUCT PREVIEW MODAL
 */
function openProductModal(p) {
  document.getElementById('modal-product-image').src         = p.image;
  document.getElementById('modal-product-title').textContent = p.title;
  document.getElementById('modal-product-badge').textContent = p.badge;
  document.getElementById('modal-product-price').textContent = p.price.toFixed(2);

  const list = document.getElementById('modal-audio-list');
  list.innerHTML = p.demos.map(d => `
    <div class="modal-audio-wrapper">
      <p>${d.name}</p>
      <audio controls src="${d.url}"></audio>
    </div>
  `).join('');

  document.getElementById('modal-add-to-cart').onclick = async () => {
    await saveCartItem({
      title: p.title,
      price: p.price,
      demos: p.demos.map(d=>d.url),
      zip:   p.zip
    });
    alert(`${p.title} added to cart!`);
    document.getElementById('product-modal').classList.add('hidden');
  };

  document.getElementById('product-modal').classList.remove('hidden');
}

const closeBtn = document.getElementById('close-product-modal');
if (closeBtn) {
  closeBtn.onclick = () => {
    document.getElementById('close-product-modal').onclick = () => {
      document.getElementById('product-modal').classList.add('hidden');
    };
  };
}
async function renderCart() {
  const cart = await getCart();
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
        <h4>
          <span class="item-title">${it.title}</span>
          <button class="remove-item-btn"><ion-icon name="trash-outline"></ion-icon></button>
        </h4>
        <div class="demo-list">
          ${it.demos.map(d => `
            <div class="audio-player">
              <button class="btn btn-primary play-btn">
                <ion-icon name="play-circle-outline"></ion-icon>
              </button>
              <audio controls src="${d.url}"></audio>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    

    // REMOVE handlers
    ct.querySelectorAll('.remove-item-btn').forEach(btn =>
      btn.addEventListener('click', async e => {
        const id = +e.currentTarget.closest('.cart-item').dataset.id;
        await deleteCartItem(id);
        renderCart();
      })
    );

    // PLAY/PAUSE handlers
    ct.querySelectorAll('.audio-player').forEach(player => {
      const btn   = player.querySelector('.play-btn');
      const audio = player.querySelector('audio');  // now valid
    
      btn.addEventListener('click', () => {
        // pause any others
        ct.querySelectorAll('audio').forEach(a => {
          if (a !== audio) a.pause();
        });
        // toggle this one
        if (audio.paused) {
          audio.play();
          btn.querySelector('ion-icon').name = 'pause-circle-outline';
        } else {
          audio.pause();
          btn.querySelector('ion-icon').name = 'play-circle-outline';
        }
      });
    
      audio.addEventListener('ended', () => {
        btn.querySelector('ion-icon').name = 'play-circle-outline';
      });
    });
    

    cc.textContent      = `${cart.length} ${cart.length === 1 ? 'item' : 'items'}`;
    totalEl.textContent = cart.reduce((s,i)=>s+i.price,0).toFixed(2);
    dlBtn.disabled      = true;
  }

  document.getElementById('cart-modal').classList.remove('hidden');
}


/**
 * CHECKOUT & DOWNLOAD
 */
const downloadBtn = document.getElementById('download-btn');

function onPaymentSuccess(provider, reference) {
  downloadBtn.disabled = false;
  alert(`${provider} payment successful! Ref: ${reference}`);
}

document.getElementById('checkout-btn').onclick = () => {
  document.getElementById('payment-modal').classList.remove('hidden');
};

// 2) In your payment‑modal, when a method is chosen:
document.querySelectorAll('#payment-modal .payment-btn')
  .forEach(btn => btn.addEventListener('click', async () => {
    const method = btn.dataset.method;
    document.getElementById('payment-modal').classList.add('hidden');

    const cart   = await getCart();
    const amount = cart.reduce((s,i)=>s+i.price,0)*100;

    if (method === 'paystack') {
      const handler = PaystackPop.setup({
        key:      'YOUR_PUBLIC_KEY',
        email:    'customer@example.com',
        amount,
        currency: 'NGN',
        onClose() { alert('Payment window closed'); },
        callback(r) {
          onPaymentSuccess('Paystack', r.reference);
        }
      });
      handler.openIframe();

    } else if (method === 'paypal') {
      // Assuming you’ve loaded PayPal SDK and have a container:
      paypal.Buttons({
        createOrder(_data, actions) {
          return actions.order.create({
            purchase_units: [{ amount: { value: (amount/100).toFixed(2) } }]
          });
        },
        onApprove(_data, actions) {
          return actions.order.capture().then(details => {
            onPaymentSuccess('PayPal', details.id);
          });
        },
        onCancel() {
          alert('PayPal payment cancelled.');
        }
      }).render('#paypal-button-container');

    } else if (method === 'bitcoin') {
      // Example: call your backend to make an invoice
      try {
        const resp = await fetch('/api/create-btc-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amount/100 })
        });
        const { checkoutUrl, invoiceId } = await resp.json();
        // Redirect user to pay with Bitcoin
        window.location.href = checkoutUrl;
        // Later, your backend webhook should call onPaymentSuccess via client notification
      } catch (err) {
        alert('Bitcoin payment failed to initialize.');
      }
    }
  }));

// 3) Download logic remains unchanged
downloadBtn.onclick = async () => {
  if (downloadBtn.disabled) return;
  (await getCart()).forEach(it => {
    const a = document.createElement('a');
    a.href     = it.zip;
    a.download = `${it.title}.zip`;
    a.click();
  });
};


/**
 * INIT
 */
window.addEventListener('DOMContentLoaded', renderProducts);
