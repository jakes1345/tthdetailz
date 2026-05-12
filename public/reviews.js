const REVIEWS_API = '/api/reviews';

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.tthTrackPageView === 'function') window.tthTrackPageView();

  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ── Mobile menu toggle ────────────────────────────────────────────────────
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // ── Star picker ──────────────────────────────────────────────────────────
  const starPicker = document.getElementById('starPicker');
  const ratingInput = document.getElementById('reviewRating');
  if (starPicker && ratingInput) {
    const stars = starPicker.querySelectorAll('.star');
    stars.forEach(s => {
      s.addEventListener('click', () => {
        const val = parseInt(s.dataset.value, 10);
        ratingInput.value = val;
        stars.forEach((st, i) => {
          st.textContent = i < val ? '★' : '☆';
        });
      });
    });
    // default 5 stars filled
    stars.forEach((st, i) => { st.textContent = i < 5 ? '★' : '☆'; });
  }

  // ── Fetch & display reviews ──────────────────────────────────────────────
  const reviewsContainer = document.getElementById('reviewsContainer');
  const statReviews = document.getElementById('statReviews');
  const statRating = document.getElementById('statRating');
  const statCars = document.getElementById('statCars');

  async function fetchReviews() {
    try {
      const res = await fetch(REVIEWS_API);
      if (!res.ok) throw new Error('fetch failed');
      const reviews = await res.json();
      renderReviews(reviews);
    } catch (e) {
      reviewsContainer.innerHTML = '<p class="reviews-empty">Unable to load reviews right now.</p>';
    }
  }

  function renderReviews(reviews) {
    if (!reviewsContainer) return;

    if (!reviews.length) {
      reviewsContainer.innerHTML = '<p class="reviews-empty">No reviews yet. Be the first!</p>';
      updateStats([]);
      return;
    }

    reviewsContainer.innerHTML = reviews.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const date = new Date(r.created_at + 'Z');
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const vehicle = r.vehicle ? `<span class="review-vehicle">${escHtml(r.vehicle)}</span>` : '';
      return `
        <div class="review-card">
          <div class="review-stars">${stars}</div>
          <p class="review-text">"${escHtml(r.review_text)}"</p>
          <div class="review-footer">
            <span class="review-author">${escHtml(r.name)}</span>
            ${vehicle}
            <span class="review-date">${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');

    updateStats(reviews);
  }

  function updateStats(reviews) {
    const count = reviews.length;
    const avg = count > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / count) : 0;
    if (statReviews) statReviews.textContent = count;
    if (statRating) statRating.textContent = avg.toFixed(1);

    // Animated cars counter
    if (statCars) {
      const target = count * 3 + 50;
      animateCounter(statCars, 0, target, 1500);
    }
  }

  function animateCounter(el, start, end, duration) {
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  fetchReviews();

  // ── Submit review ────────────────────────────────────────────────────────
  const reviewForm = document.getElementById('reviewForm');
  const reviewSuccess = document.getElementById('reviewSuccess');
  const reviewError = document.getElementById('reviewError');

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (reviewSuccess) reviewSuccess.hidden = true;
      if (reviewError) reviewError.hidden = true;

      const fd = new FormData(reviewForm);
      const name = fd.get('name')?.toString().trim();
      const rating = parseInt(fd.get('rating')?.toString(), 10) || 5;
      const vehicle = fd.get('vehicle')?.toString().trim() || '';
      const review_text = fd.get('review_text')?.toString().trim();

      if (!name || !review_text) {
        alert('Please fill in your name and review.');
        return;
      }

      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      const honeypot = {};
      ['hp_website', 'website', 'url', 'company_website', '_hp'].forEach((k) => {
        honeypot[k] = (fd.get(k) || '').toString();
      });

      try {
        const res = await fetch(REVIEWS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, rating, vehicle, review_text, ...honeypot })
        });
        if (!res.ok) throw new Error('submit failed');
        const data = await res.json();

        if (reviewSuccess) reviewSuccess.hidden = false;
        if (typeof window.tthTrack === 'function') {
          window.tthTrack('review_submit_ok', { rating });
        }
        reviewForm.reset();
        // reset stars to 5
        if (starPicker) {
          starPicker.querySelectorAll('.star').forEach(st => { st.textContent = '★'; });
        }
        if (ratingInput) ratingInput.value = '5';

        // Refresh reviews
        fetchReviews();
      } catch (err) {
        if (reviewError) reviewError.hidden = false;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Review';
        }
      }
    });
  }
});
