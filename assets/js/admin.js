document.addEventListener('DOMContentLoaded', () => {
  // ——— Admin credentials ———
  const ADMIN_USERNAME = 'a';
  const ADMIN_PASSWORD = 'a';

  // ——— DOM elements ———
  const loginSection     = document.getElementById('login-section');
  const productSection   = document.getElementById('product-section');
  const loginForm        = document.getElementById('login-form');
  const productForm      = document.getElementById('product-form');
  const loginError       = document.getElementById('login-error');
  const productError     = document.getElementById('product-error');
  const productListBody  = document.getElementById('product-list-body');

  // ——— Data store ———
  let products = JSON.parse(localStorage.getItem('products')) || [];

  // ——— Display products table ———
  function displayProducts() {
    productListBody.innerHTML = '';
    products.forEach((product, index) => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${product.section}</td>
        <td>${product.title}</td>
        <td>${product.badge || ''}</td>
        <td>$${product.price.toFixed(2)}</td>
        <td>${product.beats.length}</td>
        <td>
          <button class="btn-admin delete-btn" data-index="${index}">
            Delete
          </button>
        </td>
      `;
      productListBody.appendChild(row);
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.index);
        products.splice(i, 1);
        localStorage.setItem('products', JSON.stringify(products));
        displayProducts();
        window.dispatchEvent(new Event('storage'));
      });
    });
  }

  // Initial table render
  displayProducts();

  // ——— Login handler ———
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      loginSection.classList.add('hidden');
      productSection.classList.remove('hidden');
      loginError.textContent = '';
    } else {
      loginError.textContent = 'Invalid username or password.';
    }
  });

  /**
   * Read a File object as a Data URL, returning a Promise
   */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ——— Product upload handler ———
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    productError.textContent = '';

    // Gather form values
    const section    = document.getElementById('product-section-select').value.trim();
    const title      = document.getElementById('product-title').value.trim();
    const badge      = document.getElementById('product-badge').value.trim();
    const price      = parseFloat(document.getElementById('product-price').value);
    const imageInput = document.getElementById('product-image').files[0];
    const beatGroups = Array.from(document.querySelectorAll('.audio-group'));

    // Basic front-end validation
    if (!section || !title || !badge || isNaN(price) || !imageInput || beatGroups.length === 0) {
      productError.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      // 1) Read cover image
      const imageData = await readFileAsDataURL(imageInput);

      // 2) Read all beats in parallel
      const beats = await Promise.all(
        beatGroups.map(grp => {
          const name     = grp.querySelector('input[name="beatNames[]"]').value.trim();
          const demoFile = grp.querySelector('input[name="demoFiles[]"]').files[0];
          const fullFile = grp.querySelector('input[name="fullFiles[]"]').files[0];
          if (!name || !demoFile || !fullFile) {
            throw new Error('Each beat needs a name, demo file, and full file.');
          }
          // Read demo and full in parallel
          return Promise.all([
            readFileAsDataURL(demoFile),
            readFileAsDataURL(fullFile)
          ]).then(([demo, full]) => ({ name, demo, full }));
        })
      );

      // 3) All reads succeeded → save product
      const newProduct = { section, title, badge, price, image: imageData, beats };
      products.push(newProduct);
      localStorage.setItem('products', JSON.stringify(products));

      // 4) Reset form & UI
      productForm.reset();
      const container = document.getElementById('audio-inputs-container');
      const first = container.querySelector('.audio-group');
      container.innerHTML = '';
      container.appendChild(first);
      displayProducts();
      window.dispatchEvent(new Event('storage'));

    } catch (err) {
      productError.textContent = err.message;
    }
  });
});
