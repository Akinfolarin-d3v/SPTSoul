'use strict';

/**
 * navbar variables
 */

const navOpenBtn = document.querySelector("[data-menu-open-btn]");
const navCloseBtn = document.querySelector("[data-menu-close-btn]");
const navbar = document.querySelector("[data-navbar]");
const overlay = document.querySelector("[data-overlay]");

const navElemArr = [navOpenBtn, navCloseBtn, overlay];

for (let i = 0; i < navElemArr.length; i++) {

  navElemArr[i].addEventListener("click", function () {

    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
    document.body.classList.toggle("active");

  });

}



/**
 * header sticky
 */

const header = document.querySelector("[data-header]");

window.addEventListener("scroll", function () {

  window.scrollY >= 10 ? header.classList.add("active") : header.classList.remove("active");

});



/**
 * go top
 */

const goTopBtn = document.querySelector("[data-go-top]");

window.addEventListener("scroll", function () {

  window.scrollY >= 500 ? goTopBtn.classList.add("active") : goTopBtn.classList.remove("active");

});

/* UTILS */
function getProducts() {
  return JSON.parse(localStorage.getItem('products')) || [];
}
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

/* RENDER CARDS */
function renderProducts() {
  const products = getProducts();
  ['upcoming','top-rated','tv-series'].forEach(sec => {
    const ul = document.querySelector(`#${sec} .movies-list`);
    if (ul) ul.innerHTML = '';
  });
  products.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="movie-card" data-index="${i}">
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
            <span>$${p.price}</span>
          </div>
        </div>
      </div>
    `;
    document.querySelector(`#${p.section} .movies-list`).append(li);
  });

  // attach click handlers
  document.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      openProductModal(getProducts()[card.dataset.index]);
    });
  });
}

/* PRODUCT MODAL */
function openProductModal(product) {
  document.getElementById('modal-product-image').src = product.image;
  document.getElementById('modal-product-title').textContent = product.title;
  document.getElementById('modal-product-badge').textContent = product.badge;
  document.getElementById('modal-product-price').textContent = product.price.toFixed(2);

  const beatList = document.getElementById('modal-beat-list');
  beatList.innerHTML = '';
  product.beats.forEach((b, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-audio-wrapper';
    wrapper.innerHTML = `
      <p>${b.name}</p>
      <audio controls src="${b.demo}"></audio>
      <button class="btn btn-primary add-beat-btn" data-idx="${idx}">
        Add to Cart
      </button>
    `;
    beatList.appendChild(wrapper);
  });

  // full-pack checkout
  document.getElementById('modal-checkout').onclick = () => {
    const cart = getCart();
    cart.push({ title: product.title, type: 'pack', price: product.price });
    saveCart(cart);
    alert('Pack added to cart!');
  };

  // per-beat add
  beatList.querySelectorAll('.add-beat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.idx;
      const cart = getCart();
      // price uses product.price per beat
      cart.push({ title: product.title, beat: product.beats[idx].name, type: 'beat', price: product.price });
      saveCart(cart);
      alert(`${product.beats[idx].name} added to cart!`);
    });
  });

  document.getElementById('product-modal').classList.remove('hidden');
}


/* CLOSE BUTTONS */
document.getElementById('close-product-modal')
  .addEventListener('click', () => document.getElementById('product-modal').classList.add('hidden'));
document.getElementById('close-cart-modal')
  .addEventListener('click', () => document.getElementById('cart-modal').classList.add('hidden'));

/* CART BUTTON */
document.getElementById('cart-modal-btn')
  .addEventListener('click', () => {
    document.getElementById('cart-modal').classList.remove('hidden');
    populateCartModal();
  });

/* ADD TO CART */
document.getElementById('modal-add-to-cart')
  .addEventListener('click', function() {
    const title = this.dataset.productTitle;
    const qty = parseInt(document.getElementById('modal-quantity').value);
    const cart = getCart();
    cart.push({ title, quantity: qty });
    saveCart(cart);
    alert(`${title} added to cart!`);
    document.getElementById('product-modal').classList.add('hidden');
  });

/* POPULATE CART CONTENTS */
function populateCartModal() {
  const items = getCart();
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  if (!items.length) {
    container.textContent = 'Your cart is empty.';
    return;
  }
  items.forEach(i => {
    const div = document.createElement('div');
    div.textContent = `${i.title} × ${i.quantity}`;
    container.append(div);
  });
}

/* INITIALIZE */
document.addEventListener('DOMContentLoaded', renderProducts);
window.addEventListener('storage', e => {
  if (e.key === 'products') renderProducts();
});
