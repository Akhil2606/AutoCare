
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const body = document.body;
  const toast = $('.toast');
  let toastTimer;

  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  const progress = $('.scroll-progress i');

  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  }

  addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Back to Top functionality
  const backToTopButton = $('.to-top');

  function updateBackToTopButton() {
    backToTopButton.classList.toggle('show', window.scrollY > 350);
  }

  addEventListener('scroll', updateBackToTopButton, { passive: true });
  updateBackToTopButton();

  backToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('.footer-bottom a').addEventListener('click', event => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Navigation active button highlighting
  const desktopNavLinks = $$('.desktop-nav a');

  desktopNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      desktopNavLinks.forEach(item => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  }), { threshold: .12 });

  $$('.reveal').forEach(el => revealObserver.observe(el));

  const nav = $('.mobile-nav');
  const navScrim = $('.nav-scrim');

  function toggleNav(open) {
    nav.classList.toggle('open', open);
    navScrim.classList.toggle('open', open);
    body.classList.toggle('locked', open);
    nav.setAttribute('aria-hidden', String(!open));
  }

  $('.menu-toggle').addEventListener('click', () => toggleNav(true));
  $('.mobile-close').addEventListener('click', () => toggleNav(false));
  navScrim.addEventListener('click', () => toggleNav(false));
  $$('.mobile-nav a').forEach(a => a.addEventListener('click', () => toggleNav(false)));

  const search = $('.search-panel');
  const panelScrim = $('.panel-scrim');

  function toggleSearch(open) {
    search.classList.toggle('open', open);
    panelScrim.classList.toggle('open', open);
    body.classList.toggle('locked', open);
    if (open) setTimeout(() => $('#search-input').focus(), 250);
  }

  $('.search-trigger').addEventListener('click', () => toggleSearch(true));
  $('.search-close').addEventListener('click', () => toggleSearch(false));

  const cart = $('.cart-drawer');
  let cartItems = [];

  function toggleCart(open) {
    cart.classList.toggle('open', open);
    panelScrim.classList.toggle('open', open);
    body.classList.toggle('locked', open);
  }

  $('.cart-trigger').addEventListener('click', () => toggleCart(true));
  $('.cart-close').addEventListener('click', () => toggleCart(false));

  panelScrim.addEventListener('click', () => {
    toggleSearch(false);
    toggleCart(false);
  });

  // Update quantity controls on product cards
  function renderProductControls() {
    $$('.product-card').forEach(card => {
      const name = card.querySelector('h3').textContent.trim();
      const priceText = card.querySelector('.product-bottom strong').textContent.trim();
      const price = Number(priceText.replace(/[^0-9]/g, ''));
      const item = cartItems.find(product => product.name === name);
      const quantity = item ? item.qty : 0;
      const bottom = card.querySelector('.product-bottom');

      if (quantity === 0) {
        bottom.innerHTML = `
          <strong>${priceText}</strong>
          <button class="add-cart" data-product="${name}" data-price="${price}">
            Add to cart <span>↗</span>
          </button>
        `;
      } else {
        bottom.innerHTML = `
          <strong>${priceText}</strong>
          <div class="quantity-control">
            <button type="button" data-cart-action="decrease" data-product="${name}" aria-label="Decrease ${name} quantity">−</button>
            <span>${quantity}</span>
            <button type="button" data-cart-action="increase" data-product="${name}" data-price="${price}" aria-label="Increase ${name} quantity">+</button>
          </div>
        `;
      }
    });
  }

  // Render cart drawer
  function renderCart() {
    const count = cartItems.reduce((sum, item) => sum + item.qty, 0);

    $$('.cart-count').forEach(el => el.textContent = count);
    $('.cart-count-inline').textContent = `(${count})`;

    const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    $('.cart-total').textContent = '₹' + total.toLocaleString('en-IN');

    const box = $('.cart-items');

    if (!cartItems.length) {
      box.innerHTML = '<p class="empty-cart">Your cart is taking a pit stop.<br><small>Add a part and it’ll show up here.</small></p>';
    } else {
      box.innerHTML = cartItems.map(item => `
        <div class="cart-row">
          <div class="cart-item-info">
            <b>${item.name}</b>
            <small>₹${item.price.toLocaleString('en-IN')} each</small>
          </div>
          <strong>₹${(item.price * item.qty).toLocaleString('en-IN')}</strong>
          <div class="quantity-control cart-quantity">
            <button type="button" data-cart-action="decrease" data-product="${item.name}" aria-label="Decrease ${item.name} quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" data-cart-action="increase" data-product="${item.name}" data-price="${item.price}" aria-label="Increase ${item.name} quantity">+</button>
          </div>
        </div>
      `).join('');
    }

    renderProductControls();
  }

  // Add product to cart
  function addProduct(name, price) {
    const existing = cartItems.find(item => item.name === name);

    if (existing) {
      existing.qty++;
    } else {
      cartItems.push({ name, price: Number(price), qty: 1 });
    }

    renderCart();
    notify(`${name} added to your cart`);
  }

  // Handle Add, Increase and Decrease actions
  document.addEventListener('click', event => {
    const quantityButton = event.target.closest('[data-cart-action]');

    if (quantityButton) {
      const name = quantityButton.dataset.product;
      const action = quantityButton.dataset.cartAction;
      const item = cartItems.find(product => product.name === name);

      if (action === 'increase') {
        if (item) {
          item.qty++;
        } else {
          cartItems.push({
            name,
            price: Number(quantityButton.dataset.price),
            qty: 1
          });
        }
      }

      if (action === 'decrease' && item) {
        item.qty--;

        if (item.qty <= 0) {
          cartItems = cartItems.filter(product => product.name !== name);
        }
      }

      renderCart();
      return;
    }

    const productButton = event.target.closest('[data-product]');

    if (productButton) {
      addProduct(productButton.dataset.product, productButton.dataset.price);
    }
  });

  renderCart();

  $('.checkout-button').addEventListener('click', () => notify(cartItems.length ? 'Checkout is a demo — no payment was taken.' : 'Your cart is empty'));

  $('.search-panel form').addEventListener('submit', e => {
    e.preventDefault();

    const q = $('#search-input').value.trim().toLowerCase();

    if (!q) {
      notify('Type a service or part to search');
      return;
    }

    const match = [...$$('.service-card'), ...$$('.product-card')].find(el => el.innerText.toLowerCase().includes(q));

    toggleSearch(false);

    if (match) {
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
      match.classList.add('search-highlight');
      setTimeout(() => match.classList.remove('search-highlight'), 1500);
    } else {
      notify('No exact match — try “engine”, “brake” or “filter”.');
    }
  });

  // Authentication: FastAPI connection
  
  // Authentication: Browser-based demo login and signup

  const backdrop = $('.modal-backdrop');
  let authMode = 'login';

  const loginButtons = $$('[data-open="login"]');
  const logoutButton = $('.logout-button');
  const userGreeting = $('.user-greeting');

  const ACCOUNTS_KEY = 'autocare-demo-accounts';
  const SESSION_KEY = 'autocare-demo-user';

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function getSavedUser() {
    try {
      const savedUsers = [
        localStorage.getItem(SESSION_KEY),
        sessionStorage.getItem(SESSION_KEY)
      ];

      for (const saved of savedUsers) {
        if (!saved) continue;

        const user = JSON.parse(saved);

        const account = getAccounts().find(
          account => account.email === user.email
        );

        if (account) {
          return {
            name: account.name,
            email: account.email
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  function updateAuthUI(user) {
    const loggedIn = Boolean(user);

    loginButtons.forEach(button => {
      button.hidden = loggedIn;
    });

    logoutButton.hidden = !loggedIn;
    userGreeting.hidden = !loggedIn;

    userGreeting.textContent = loggedIn
      ? `Hi, ${user.name || user.email}`
      : '';
  }

  function saveUserSession(user, remember) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(user));

    updateAuthUI(user);
  }

  function clearUserSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    updateAuthUI(null);
  }

  function authOpen(open) {
    backdrop.classList.toggle('open', open);
    body.classList.toggle('locked', open);

    if (open) {
      setTimeout(() => {
        $('#auth-form input:not([type=checkbox])')?.focus();
      }, 180);
    }
  }

  // Restore an existing login session
  updateAuthUI(getSavedUser());

  // Logout
  logoutButton.addEventListener('click', () => {
    clearUserSession();
    authOpen(false);
    notify('You have been logged out successfully.');
  });

  // Switch between signup and signin
  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';

    $('#auth-title').textContent = signup ? 'Create your account.' : 'Sign in.';

    $('.auth-form > .eyebrow').innerHTML =
      '<span class="eyebrow-dot"></span> ' +
      (signup ? 'JOIN THE AUTO CARE CLUB' : 'WELCOME BACK');

    $('.auth-form > p:not(.eyebrow)').textContent = signup
      ? 'Create your account to get started.'
      : 'Enter your details to continue.';

    $('.auth-name-field').hidden = !signup;
    $('.auth-name-field input').required = signup;

    $('#auth-form [name="password"]').autocomplete =
      signup ? 'new-password' : 'current-password';

    $('.auth-options').hidden = signup;

    $('.auth-submit').innerHTML =
      (signup ? 'Create account' : 'Sign in') + ' <span>↗</span>';

    $('.auth-switch').innerHTML = signup
      ? 'Already have an account? <button type="button" class="signup-switch">Sign in</button>'
      : 'New to Auto Care? <button type="button" class="signup-switch">Create account</button>';
  }

  loginButtons.forEach(button => {
    button.addEventListener('click', () => {
      setAuthMode('login');
      authOpen(true);
    });
  });

  $('.auth-close').addEventListener('click', () => authOpen(false));

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) {
      authOpen(false);
    }
  });

  $('.auth-switch').addEventListener('click', event => {
    if (event.target.closest('.signup-switch')) {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
    }
  });

  $('.forgot-button').addEventListener('click', () => {
    notify('Password recovery is not available in this demo.');
  });

  // Signup and signin
  $('#auth-form').addEventListener('submit', event => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');

    const signup = authMode === 'signup';
    const submitButton = $('.auth-submit');

    if (!email || !password || (signup && !name)) {
      notify('Please fill in all required fields.');
      return;
    }

    if (signup) {
      const accounts = getAccounts();

      const existingAccount = accounts.find(account => account.email === email);

      if (existingAccount) {
        notify('This email is already registered. Please sign in.');
        return;
      }

      accounts.push({
        name,
        email,
        password
      });

      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

      notify('Account created successfully! Please sign in.');

      form.reset();
      setAuthMode('login');
      return;
    }

    const accounts = getAccounts();

    const account = accounts.find(account =>
      account.email === email && account.password === password
    );

    if (!account) {
      notify('Invalid email or password. Please check your credentials.');
      return;
    }

    const loggedInUser = {
      name: account.name,
      email: account.email
    };

    const remember = $('.check-label input').checked;

    saveUserSession(loggedInUser, remember);

    authOpen(false);
    notify(`Welcome back, ${account.name}!`);

    form.reset();
    setAuthMode('login');
  });

  $$('.service-book').forEach(btn => btn.addEventListener('click', () => {
  const card = btn.closest('.service-card');
  $('#booking-form select').value = card.dataset.service;
  $('#booking').scrollIntoView({ behavior: 'smooth' });

  setTimeout(() => {
    $('#booking-form input[name="name"]').focus({ preventScroll: true });
  }, 700);
}));

  $('#booking-date').min = new Date().toISOString().split('T')[0];

  $('#booking-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    notify(`Thanks ${data.get('name')} — your ${data.get('service')} request is ready (demo).`);
    e.currentTarget.reset();
  });

  // Newsletter subscription popup
  $('#newsletter-form').addEventListener('submit', e => {
    e.preventDefault();

    const emailInput = e.currentTarget.querySelector('input[type="email"]');
    const email = emailInput.value.trim();

    if (!email) {
      notify('Please enter your email address.');
      return;
    }

    $('#newsletter-message').textContent = 'You’re on the list — thanks for joining.';
    notify('Thanks for subscribing! Your email has been added (demo).');
    e.currentTarget.reset();
  });

  const reviews = [
    ['Finally, a service team that explains everything clearly and treats their car like their own.', 'Arjun R.', 'Customer since 2022 · Hyderabad', 'AR'],
    ['Booked a service in minutes. The team was professional, on time and genuinely helpful.', 'Meera S.', 'Customer since 2023 · Chennai', 'MS'],
    ['Clear pricing, genuine parts and no pressure. Exactly how car care should feel.', 'Rahul K.', 'Customer since 2021 · Hyderabad', 'RK']
  ];

  let reviewIndex = 0;

  function showReview(i) {
    reviewIndex = (i + reviews.length) % reviews.length;
    const r = reviews[reviewIndex];
    $('blockquote').textContent = '“' + r[0] + '”';
    $('.quote-author b').textContent = r[1];
    $('.quote-author small').textContent = r[2];
    $('.author-avatar').textContent = r[3];
  }

  $('.quote-prev').addEventListener('click', () => showReview(reviewIndex - 1));
  $('.quote-next').addEventListener('click', () => showReview(reviewIndex + 1));

  const statObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = Number(el.dataset.count);
      const duration = 1200;
      const start = performance.now();

      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      statObserver.unobserve(el);
    }
  }), { threshold: .5 });

  $$('[data-count]').forEach(el => statObserver.observe(el));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      toggleNav(false);
      toggleSearch(false);
      toggleCart(false);
      authOpen(false);
    }
  });
})();

// Emergency preloader fix
document.body.classList.add('ready');
document.body.classList.remove('locked');

const loader = document.querySelector('.loader');
if (loader) loader.remove();
