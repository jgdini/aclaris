// ACLARIS — shared site behavior

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('is-open'));
    });
  }

  // Scroll reveal — cascades child items (rows/cards) inside the revealed block
  const staggerSelector = '.segment-row, .tech-card, .process-step, .product-card, .value-card, .timeline-item, .social-card, .post-card, .segment-chip';
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const items = entry.target.querySelectorAll(staggerSelector);
          items.forEach((item, i) => {
            item.style.transitionDelay = reduceMotion ? '0ms' : `${Math.min(i * 65, 520)}ms`;
          });
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Count-up numbers (stats, timeline years, hero metrics)
  const counters = document.querySelectorAll('.count');
  if (counters.length) {
    const animateCount = (el) => {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      const duration = 1300;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const countIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(el => countIO.observe(el));
    } else {
      counters.forEach(animateCount);
    }
  }

  // Scroll progress bar
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    const updateProgress = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  // Header shadow on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.style.boxShadow = window.scrollY > 8 ? '0 6px 20px rgba(11,33,56,0.06)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Respect reduced-motion: freeze hero background videos on their poster frame
  const heroVideos = document.querySelectorAll('.hero-video, .page-hero-video');
  if (reduceMotion) {
    heroVideos.forEach(v => { v.pause(); v.removeAttribute('autoplay'); });
  }

  // Segment photo cards — spotlight auto-cycles through each one
  const segChips = document.querySelectorAll('.segment-chip');
  if (segChips.length && !reduceMotion) {
    let segIdx = 0;
    setInterval(() => {
      segChips.forEach(c => c.classList.remove('is-active'));
      segChips[segIdx].classList.add('is-active');
      segIdx = (segIdx + 1) % segChips.length;
    }, 2200);
  }

  // Subtle parallax drift on the hero's blueprint grid
  const heroGrid = document.querySelector('.hero.bp-grid');
  if (heroGrid && !reduceMotion) {
    const onHeroScroll = () => {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) {
        heroGrid.style.backgroundPosition = `${y * 0.12}px ${y * 0.12}px`;
      }
    };
    window.addEventListener('scroll', onHeroScroll, { passive: true });
  }

  // Instrument panel readout — live-feeling data rotation
  const panelRows = document.querySelectorAll('[data-readout]');
  const readings = {
    conductividade: ['1.8', '1.7', '1.9', '1.8', '2.0'],
    ph: ['7.2', '7.1', '7.3', '7.2', '7.2'],
    cloro: ['0.00', '0.00', '0.01', '0.00', '0.00'],
    turbidez: ['0.08', '0.07', '0.09', '0.08', '0.06'],
  };
  if (panelRows.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let tick = 0;
    setInterval(() => {
      tick = (tick + 1) % 5;
      panelRows.forEach(row => {
        const key = row.getAttribute('data-readout');
        if (readings[key]) row.textContent = readings[key][tick];
      });
    }, 2600);
  }

  // Job accordion: close others when one opens (optional single-open behavior)
  const jobCards = document.querySelectorAll('.job-card');
  jobCards.forEach(card => {
    card.addEventListener('toggle', () => {
      if (card.open) {
        jobCards.forEach(other => {
          if (other !== card) other.open = false;
        });
      }
    });
  });
});
