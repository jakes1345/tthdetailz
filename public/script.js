/**
 * INSTAGRAM WIRING
 * ─────────────────────────────────────────────────────────────────────────────
 * Instagram doesn't allow auto-pulling photos without an API key / OAuth.
 * Instead, every gallery photo on the site can link directly to its original
 * Instagram post — clean, fast, and stays in sync forever.
 *
 * HOW TO ADD A POST URL FOR A PHOTO:
 *   1. Open the post on Instagram (web or app)
 *   2. Tap the ⋯ menu → "Copy link"
 *   3. Paste it into the array below at the same index as the photo
 *      (photo1.jpg → index 0, photo2.jpg → index 1, etc.)
 *   4. Empty string = clicking the photo just opens your IG profile
 *
 * Example: 'https://www.instagram.com/p/CxxYyZz1234/'
 */
const TTH_INSTAGRAM_PROFILE = 'https://instagram.com/tthdetailz';
const TTH_INSTAGRAM_POSTS = [
  'https://www.instagram.com/p/DWO9pjxgJs6/',     // photo1.jpg
  'https://www.instagram.com/reel/DWOGaFNDoOX/',  // photo2.jpg
  'https://www.instagram.com/p/DWOCTg-jnbq/',     // photo3.jpg
  'https://www.instagram.com/p/DWOAiOQjro3/',     // photo4.jpg
  'https://www.instagram.com/p/DWN_lL5Du15/',     // photo5.jpg
  'https://www.instagram.com/p/DWN--tqjuWL/',     // photo6.jpg
  'https://www.instagram.com/p/DWN-WTODgNK/',     // photo7.jpg
  'https://www.instagram.com/reel/DWN9YRRjq8v/',  // photo8.jpg
  'https://www.instagram.com/p/DWN8g-SDrld/',     // photo9.jpg
  'https://www.instagram.com/p/DVCTO8gjyDk/',     // photo10.jpg
  'https://www.instagram.com/p/DVCS4TWD1ZE/'      // photo11.jpg
];
const TTH_INSTAGRAM_VIDEO_POSTS = [
  'https://www.instagram.com/reel/DWOGaFNDoOX/',  // video1
  'https://www.instagram.com/reel/DWN9YRRjq8v/',  // video2
  'https://www.instagram.com/reel/DUQ7bFKANBE/'   // video3
];
/**
 * Optional: paste ONE Instagram post URL here to show the official IG embed
 * (a full-fidelity post card) at the bottom of the gallery. Leave '' to hide.
 */
const TTH_INSTAGRAM_EMBED_POST_URL = '';

document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const navbar = document.querySelector('.navbar');

  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
  
  const promoBanner = document.querySelector('.promo-banner');

  function syncPromoNavLayout() {
    const promoH = promoBanner ? promoBanner.offsetHeight : 46;
    document.documentElement.style.setProperty('--promo-banner-height', `${promoH}px`);
    if (navbar) {
      const pastPromo = window.pageYOffset >= promoH;
      navbar.style.top = pastPromo ? '0px' : `${promoH}px`;
      document.documentElement.style.setProperty('--navbar-visual-height', `${navbar.offsetHeight}px`);
    }
  }

  syncPromoNavLayout();
  window.addEventListener('resize', syncPromoNavLayout);

  if (navbar) {
    window.addEventListener('scroll', () => {
      syncPromoNavLayout();
      if (window.pageYOffset > 100) {
        navbar.style.background = 'rgba(10, 10, 10, 0.98)';
        navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.4)';
      } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
        navbar.style.boxShadow = 'none';
      }
    });
  }
  
  const baSlider = document.querySelector('.ba-slider');
  const baRange = document.querySelector('.ba-range');
  const baBefore = document.querySelector('.ba-before');
  const baHandle = document.querySelector('.ba-handle');
  
  if (baRange && baBefore && baHandle) {
    baRange.addEventListener('input', (e) => {
      const value = e.target.value;
      baBefore.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
      baHandle.style.left = `${value}%`;
    });
  }
  
  const vehicleOptions = document.querySelectorAll('.vehicle-option input');
  const serviceOptions = document.querySelectorAll('.service-option input');
  const addonOptions = document.querySelectorAll('.addon-option input');
  const totalPriceEl = document.getElementById('totalPrice');
  const bookPackageBtn = document.getElementById('bookPackageBtn');

  function getVehicle() {
    const v = document.querySelector('.vehicle-option input:checked');
    return v ? v.value : 'sedan';
  }

  function refreshServicePriceLabels() {
    const vehicle = getVehicle();
    const key = vehicle === 'sedan' ? 'sedan' : 'suv';
    document.querySelectorAll('.service-option input').forEach(input => {
      const price = input.dataset[key];
      const card = input.closest('.service-option');
      const label = card && card.querySelector('[data-price-for]');
      if (label && price) label.textContent = `$${price}`;
    });
    const thirdRow = document.querySelector('[data-suv-only]');
    if (thirdRow) {
      const isSuv = vehicle !== 'sedan';
      thirdRow.style.display = isSuv ? '' : 'none';
      if (!isSuv) {
        const cb = thirdRow.querySelector('input');
        if (cb) cb.checked = false;
      }
    }
  }

  function calculateTotal() {
    refreshServicePriceLabels();
    let total = 0;
    const vehicle = getVehicle();
    const key = vehicle === 'sedan' ? 'sedan' : 'suv';

    const selectedService = document.querySelector('.service-option input:checked');
    if (selectedService) {
      total = parseInt(selectedService.dataset[key], 10) || 0;
    }

    addonOptions.forEach(addon => {
      if (addon.checked) total += parseInt(addon.dataset.price, 10) || 0;
    });

    if (totalPriceEl) totalPriceEl.textContent = `$${total}`;
  }

  vehicleOptions.forEach(opt => opt.addEventListener('change', calculateTotal));
  serviceOptions.forEach(opt => opt.addEventListener('change', calculateTotal));
  addonOptions.forEach(opt => opt.addEventListener('change', calculateTotal));
  calculateTotal();

  if (bookPackageBtn) {
    bookPackageBtn.addEventListener('click', () => {
      const vehicle = getVehicle();
      const service = document.querySelector('.service-option input:checked')?.value;
      const sel = document.getElementById('b-service');
      if (sel && service && service !== 'ceramic') {
        const v = vehicle === 'sedan' ? 'sedan' : 'suv';
        const target = `${service}-${v}`;
        if ([...sel.options].some(o => o.value === target)) sel.value = target;
      }
      const addonMap = {
        engine: 'Engine Bay (+$75)',
        pethair: 'Pet Hair (+$50)',
        odor: 'Odor Removal (+$125)',
        thirdrow: '3rd Row (+$25)'
      };
      document.querySelectorAll('input[name="b-addon"]').forEach(cb => { cb.checked = false; });
      addonOptions.forEach(addon => {
        if (addon.checked) {
          const label = addonMap[addon.value];
          const cb = document.querySelector(`input[name="b-addon"][value="${label}"]`);
          if (cb) cb.checked = true;
        }
      });
    });
  }
  
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      faqItems.forEach(i => i.classList.remove('active'));
      
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
  
  const bookingForm = document.getElementById('bookingForm');
  const bookingSuccess = document.getElementById('bookingSuccess');
  const downloadIcsAgainBtn = document.getElementById('downloadIcsAgain');
  let lastIcsUrl = null;
  let lastIcsName = 'tth-detailz-booking.ics';

  function pad(n) { return String(n).padStart(2, '0'); }

  function toICSDate(d) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }

  function buildICS({ summary, description, location, start, end }) {
    const dtstamp = toICSDate(new Date());
    const uid = `${Date.now()}-tthdetailz@local`;
    const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TTH Detailz//Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const SERVICE_DURATION_MIN = {
    'full-sedan': 240, 'full-suv': 270,
    'interior-sedan': 180, 'interior-suv': 210,
    'exterior-sedan': 90,  'exterior-suv': 105,
    'custom': 120
  };

  const SERVICE_LABEL = {
    'full-sedan': 'Full Detail (Sedan/Coupe) — $200',
    'full-suv': 'Full Detail (SUV/Truck) — $225',
    'interior-sedan': 'Interior Detail (Sedan/Coupe) — $140',
    'interior-suv': 'Interior Detail (SUV/Truck) — $165',
    'exterior-sedan': 'Exterior Detail (Sedan/Coupe) — $70',
    'exterior-suv': 'Exterior Detail (SUV/Truck) — $75',
    'custom': 'Custom service'
  };

  if (bookingForm) {
    const dateInput = document.getElementById('b-date');
    if (dateInput) {
      const today = new Date();
      dateInput.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }

    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const fd = new FormData(bookingForm);
      const name = (fd.get('name') || '').toString().trim();
      const phone = (fd.get('phone') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const vehicle = (fd.get('vehicle') || '').toString().trim();
      const service = (fd.get('service') || '').toString();
      const date = (fd.get('date') || '').toString();
      const time = (fd.get('time') || '').toString();
      const address = (fd.get('address') || '').toString().trim();
      const notes = (fd.get('notes') || '').toString().trim();
      const addons = fd.getAll('b-addon').map(a => a.toString());

      if (!name || !phone || !vehicle || !service || !date || !time) {
        alert('Please fill in name, phone, vehicle, service, date, and time.');
        return;
      }

      const [yy, mm, dd] = date.split('-').map(n => parseInt(n, 10));
      const [hh, mi] = time.split(':').map(n => parseInt(n, 10));
      const start = new Date(yy, mm - 1, dd, hh, mi);
      const durationMin = SERVICE_DURATION_MIN[service] || 120;
      const end = new Date(start.getTime() + durationMin * 60000);

      const serviceLabel = SERVICE_LABEL[service] || service;
      const addonLine = addons.length ? `Add-ons: ${addons.join(', ')}` : 'Add-ons: none';
      const summary = `TTH Detailz — ${serviceLabel.split(' — ')[0]}`;
      const description = [
        `Service: ${serviceLabel}`,
        addonLine,
        `Vehicle: ${vehicle}`,
        `Customer: ${name} (${phone}${email ? ', ' + email : ''})`,
        address ? `Address: ${address}` : null,
        notes ? `Notes: ${notes}` : null,
        '',
        'Status: Tentative — pending confirmation by text from TTH Detailz (630-454-1159).'
      ].filter(Boolean).join('\n');

      const ics = buildICS({
        summary,
        description,
        location: address || 'Mobile service — Northwest Suburbs',
        start,
        end
      });

      if (lastIcsUrl) URL.revokeObjectURL(lastIcsUrl);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      lastIcsUrl = URL.createObjectURL(blob);
      lastIcsName = `tth-detailz-${date}-${time.replace(':','')}.ics`;
      downloadFile(lastIcsUrl, lastIcsName);

      const dateNice = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeNice = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      const smsBody = [
        `New booking request — TTH Detailz`,
        ``,
        `Name: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : null,
        `Vehicle: ${vehicle}`,
        `Service: ${serviceLabel}`,
        addonLine,
        `When: ${dateNice} @ ${timeNice}`,
        address ? `Where: ${address}` : `Where: (mobile)`,
        notes ? `Notes: ${notes}` : null
      ].filter(Boolean).join('\n');

      const smsHref = `sms:+16304541159?&body=${encodeURIComponent(smsBody)}`;
      window.location.href = smsHref;

      bookingForm.hidden = true;
      if (bookingSuccess) {
        bookingSuccess.hidden = false;
        bookingSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (downloadIcsAgainBtn) {
    downloadIcsAgainBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (lastIcsUrl) downloadFile(lastIcsUrl, lastIcsName);
    });
  }
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      e.preventDefault();
      let target;
      try {
        target = document.querySelector(href);
      } catch {
        return;
      }
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.service-card, .testimonial, .gallery-item, .process-step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
  
  const style = document.createElement('style');
  style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
  
  const totalCalcBtn = document.querySelector('.calc-total .btn');
  if (totalCalcBtn) {
    totalCalcBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const galleryTabs = document.querySelectorAll('.gallery-tab');
  const galleryPanels = document.querySelectorAll('.gallery-panel');

  galleryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      galleryTabs.forEach(t => t.classList.remove('active'));
      galleryPanels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tabName}-panel`).classList.add('active');
    });
  });

  function initSlideshow(wrapperId, prevBtnId, nextBtnId, playBtnId, indicatorsId, currentId, totalId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return null;

    const slides = wrapper.querySelectorAll('.slide');
    if (slides.length === 0) return null;

    let currentIndex = 0;
    let isPlaying = false;
    let playInterval;

    function updateSlide(index) {
      wrapper.style.transform = `translateX(-${index * 100}%)`;

      const indicators = document.getElementById(indicatorsId);
      if (indicators) {
        indicators.innerHTML = '';
        slides.forEach((_, i) => {
          const dot = document.createElement('div');
          dot.className = `slide-dot${i === index ? ' active' : ''}`;
          dot.addEventListener('click', () => goToSlide(i));
          indicators.appendChild(dot);
        });
      }

      const currentEl = document.getElementById(currentId);
      const totalEl = document.getElementById(totalId);
      if (currentEl) currentEl.textContent = index + 1;
      if (totalEl) totalEl.textContent = slides.length;
    }

    function goToSlide(index) {
      currentIndex = index;
      if (currentIndex >= slides.length) currentIndex = 0;
      if (currentIndex < 0) currentIndex = slides.length - 1;
      updateSlide(currentIndex);
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    function togglePlay() {
      const playBtn = document.getElementById(playBtnId);
      isPlaying = !isPlaying;

      if (isPlaying) {
        playInterval = setInterval(nextSlide, 4000);
        if (playBtn) playBtn.textContent = '⏸ Pause';
      } else {
        clearInterval(playInterval);
        if (playBtn) playBtn.textContent = '▶ Play';
      }
    }

    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const playBtn = document.getElementById(playBtnId);

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); if (isPlaying) { clearInterval(playInterval); playInterval = setInterval(nextSlide, 4000); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); if (isPlaying) { clearInterval(playInterval); playInterval = setInterval(nextSlide, 4000); } });
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    updateSlide(0);
    return { goToSlide };
  }

  function getIgUrlForIndex(i) {
    const url = (Array.isArray(TTH_INSTAGRAM_POSTS) && TTH_INSTAGRAM_POSTS[i]) || '';
    return url || TTH_INSTAGRAM_PROFILE;
  }

  function wireGalleryToInstagram() {
    const photoSlides = document.querySelectorAll('#slides-wrapper .slide .slide-image');
    photoSlides.forEach((wrap, i) => {
      const img = wrap.querySelector('img');
      if (!img || wrap.dataset.igWired) return;
      const a = document.createElement('a');
      a.href = getIgUrlForIndex(i);
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'slide-ig-link';
      a.setAttribute('aria-label', 'Open this photo on Instagram');
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
      const badge = document.createElement('span');
      badge.className = 'slide-ig-badge';
      badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> View on Instagram';
      a.appendChild(badge);
      wrap.dataset.igWired = '1';
    });

    document.querySelectorAll('.thumb-item[data-type="photo"]').forEach((thumb) => {
      const idx = parseInt(thumb.dataset.slide, 10);
      if (Number.isNaN(idx)) return;
      thumb.dataset.igUrl = getIgUrlForIndex(idx);
    });
  }
  wireGalleryToInstagram();

  const photoSlideshow = initSlideshow('slides-wrapper', 'photo-prev', 'photo-next', 'photo-play', 'photo-indicators', 'photo-current', 'photo-total');
  initSlideshow('video-wrapper', 'video-prev', 'video-next', 'video-play', 'video-indicators', 'video-current', 'video-total');

  const thumbItems = document.querySelectorAll('.thumb-item');
  thumbItems.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const slideIndex = parseInt(thumb.dataset.slide, 10);
      if (Number.isNaN(slideIndex) || !photoSlideshow) return;

      const tab = document.querySelector('.gallery-tab[data-tab="photos"]');
      if (tab) tab.click();

      setTimeout(() => {
        photoSlideshow.goToSlide(slideIndex);
      }, 100);
    });
  });

  function mountInstagramEmbed() {
    const raw = typeof TTH_INSTAGRAM_EMBED_POST_URL === 'string' ? TTH_INSTAGRAM_EMBED_POST_URL.trim() : '';
    const host = document.getElementById('instagram-embed-host');
    if (!host || !raw) return;
    if (!/^https:\/\/(www\.)?instagram\.com\//i.test(raw)) return;

    host.innerHTML = '';
    const bq = document.createElement('blockquote');
    bq.className = 'instagram-media';
    bq.setAttribute('data-instgrm-permalink', raw);
    bq.setAttribute('data-instgrm-version', '14');
    const link = document.createElement('a');
    link.href = raw;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View this post on Instagram';
    bq.appendChild(link);
    host.appendChild(bq);

    function processEmbeds() {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
    }

    if (window.instgrm) {
      processEmbeds();
      return;
    }

    const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
    if (existing) {
      if (existing.getAttribute('data-loaded')) {
        processEmbeds();
      } else {
        existing.addEventListener('load', () => {
          existing.setAttribute('data-loaded', '1');
          processEmbeds();
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.instagram.com/embed.js';
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', '1');
      processEmbeds();
    });
    document.body.appendChild(script);
  }

  mountInstagramEmbed();
});
