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

  function renderCart() {
    const count = cartItems.reduce((sum, item) => sum + item.qty, 0);
    $$('.cart-count').forEach(el => el.textContent = count);
    $('.cart-count-inline').textContent = `(${count})`;
    $('.cart-total').textContent = '₹' + cartItems.reduce((sum, item) => sum + item.price * item.qty, 0).toLocaleString('en-IN');

    const box = $('.cart-items');

    if (!cartItems.length) {
      box.innerHTML = '<p class="empty-cart">Your cart is taking a pit stop.<br><small>Add a part and it’ll show up here.</small></p>';
      return;
    }

    box.innerHTML = cartItems.map(item => `
      <div class="cart-row">
        <div>
          <b>${item.name}</b>
          <small>Qty ${item.qty} · ₹${item.price.toLocaleString('en-IN')} each</small>
        </div>
        <strong>₹${(item.price * item.qty).toLocaleString('en-IN')}</strong>
        <button data-remove="${item.name}">Remove item</button>
      </div>
    `).join('');

    $$('[data-remove]', box).forEach(btn => btn.addEventListener('click', () => {
      cartItems = cartItems.filter(item => item.name !== btn.dataset.remove);
      renderCart();
    }));
  }

  function addProduct(name, price) {
    const existing = cartItems.find(item => item.name === name);
    existing ? existing.qty++ : cartItems.push({ name, price: Number(price), qty: 1 });
    renderCart();
    notify(`${name} added to your cart`);
  }

  $$('[data-product]').forEach(btn => btn.addEventListener('click', () => addProduct(btn.dataset.product, btn.dataset.price)));

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

  const API_BASE_URL = 'http://127.0.0.1:8000';
  const backdrop = $('.modal-backdrop');
  let authMode = 'login';

  const loginButtons = $$('[data-open="login"]');
  const logoutButton = $('.logout-button');
  const userGreeting = $('.user-greeting');

  function getSavedToken() {
    return localStorage.getItem('autocare-token') || sessionStorage.getItem('autocare-token');
  }

  function getSavedUser() {
    const saved = localStorage.getItem('autocare-demo-user') || sessionStorage.getItem('autocare-demo-user');
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  function updateAuthUI(user) {
    const loggedIn = Boolean(user);

    loginButtons.forEach(button => button.hidden = loggedIn);
    logoutButton.hidden = !loggedIn;
    userGreeting.hidden = !loggedIn;

    userGreeting.textContent = loggedIn
        ? `Hi, ${user.name || user.email || 'User'}`
        : '';
}

  function clearSavedAuth() {
    localStorage.removeItem('autocare-token');
    sessionStorage.removeItem('autocare-token');
    localStorage.removeItem('autocare-demo-user');
    sessionStorage.removeItem('autocare-demo-user');
  }

  async function restoreLoginSession() {
    const token = getSavedToken();
    const user = getSavedUser();

    if (!token || !user) {
      updateAuthUI(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        clearSavedAuth();
        updateAuthUI(null);
        return;
      }

      const profile = await response.json();
      const updatedUser = {
        name: profile.name || user.name,
        email: profile.email || user.email
      };
      const storage = localStorage.getItem('autocare-token') ? localStorage : sessionStorage;
      storage.setItem('autocare-demo-user', JSON.stringify(updatedUser));
      updateAuthUI(updatedUser);
    } catch (error) {
      console.warn('Could not restore login session:', error);
      updateAuthUI(user);
    }
  }

  function authOpen(open) {
    backdrop.classList.toggle('open', open);
    body.classList.toggle('locked', open);
    if (open) setTimeout(() => $('#auth-form input:not([type=checkbox])')?.focus(), 180);
  }

  logoutButton.addEventListener('click', () => {
    clearSavedAuth();
    updateAuthUI(null);
    authOpen(false);
    notify('You have been logged out successfully.');
  });

  restoreLoginSession();

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';

    $('#auth-title').textContent = signup ? 'Create your account.' : 'Sign in.';
    $('.auth-form > .eyebrow').innerHTML = '<span class="eyebrow-dot"></span> ' + (signup ? 'JOIN THE AUTO CARE CLUB' : 'WELCOME BACK');
    $('.auth-form > p:not(.eyebrow)').textContent = signup ? 'A better ownership experience starts here.' : 'Enter your details to continue.';
    $('.auth-name-field').hidden = !signup;
    $('.auth-name-field input').required = signup;
    $('#auth-form [name="password"]').autocomplete = signup ? 'new-password' : 'current-password';
    $('.auth-options').hidden = signup;
    $('.auth-submit').innerHTML = (signup ? 'Create account' : 'Sign in') + ' <span>↗</span>';

    $('.auth-switch').innerHTML = signup
      ? 'Already have an account? <button type="button" class="signup-switch">Sign in</button>'
      : 'New to Auto Care? <button type="button" class="signup-switch">Create account</button>';
  }

  $$('[data-open="login"]').forEach(btn => btn.addEventListener('click', () => {
    setAuthMode('login');
    authOpen(true);
  }));

  $('.auth-close').addEventListener('click', () => authOpen(false));

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) authOpen(false);
  });

  $('.auth-switch').addEventListener('click', e => {
    if (e.target.closest('.signup-switch')) {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
    }
  });

  $('.forgot-button').addEventListener('click', () => notify('Password recovery is not connected yet.'));

  $('#auth-form').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim();
    const signup = authMode === 'signup';
    const submitButton = $('.auth-submit');

    if (!email || !password || (signup && !name)) {
      notify('Please fill in all required fields.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = signup ? 'Creating account...' : 'Signing in...';

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${signup ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup ? { name, email, password } : { email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        const detail = result.detail;
        const message = Array.isArray(detail)
          ? detail.map(item => item.msg).join(', ')
          : typeof detail === 'string' ? detail : 'Authentication failed.';

        throw new Error(message);
      }

      if (signup) {
        notify('Account created successfully. Please sign in.');
        form.reset();
        setAuthMode('login');
        return;
      }

      const storage = $('.check-label input').checked ? localStorage : sessionStorage;
      storage.setItem('autocare-token', result.access_token);

      let displayName = name || email.split('@')[0] || 'Driver';

      try {
        const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${result.access_token}`
          }
        });

        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          displayName = profile.name || displayName;
        }
      } catch (profileError) {
        console.warn('Could not load user profile:', profileError);
      }

      const loggedInUser = { name: displayName, email };
      storage.setItem('autocare-demo-user', JSON.stringify(loggedInUser));
      updateAuthUI(loggedInUser);

      authOpen(false);
      notify(`Welcome back, ${displayName}!`);
      form.reset();
      setAuthMode('login');

    } catch (error) {
      notify(error.message || 'Unable to connect to the server.');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = (authMode === 'signup' ? 'Create account' : 'Sign in') + ' <span>↗</span>';
    }
  });

  $$('.service-book').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.service-card');
    $('#booking-form select').value = card.dataset.service;
    $('#booking').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('#booking-form input[name="name"]').focus({ preventScroll: true }), 700);
  }));

  $('#booking-date').min = new Date().toISOString().split('T')[0];

  $('#booking-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    notify(`Thanks ${data.get('name')} — your ${data.get('service')} request is ready (demo).`);
    e.currentTarget.reset();
  });

  $('#newsletter-form').addEventListener('submit', e => {
    e.preventDefault();
    $('#newsletter-message').textContent = 'You’re on the list — thanks for joining.';
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