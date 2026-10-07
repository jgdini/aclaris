/* ACLARIS: motion (GSAP 3 + ScrollTrigger + SplitText + Lenis, todos locais em assets/vendor)
 *
 * Regras:
 *  - só anima transform, opacity e clip-path;
 *  - sem JavaScript o conteúdo aparece normalmente (a classe js-motion é posta no <head>
 *    e retirada em 4 s se este arquivo não rodar);
 *  - prefers-reduced-motion: sem parallax, pin, scrub e rolagem suave, só fades curtos;
 *  - celular: sem pin, sem parallax e sem rolagem suave.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  // se os scripts chegaram depois do tempo de segurança (4 s), a página já está visível e não animamos
  if (!root.classList.contains('js-motion')) return;
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js-motion'); return; }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  root.setAttribute('data-motion-ready', '1');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGGER = '.segment-row, .tech-card, .process-step, .product-card, .value-card, .timeline-item, .social-card, .post-card, .segment-chip';
  const q = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mm = gsap.matchMedia();

  /* ---------- 1. Rolagem suave (Lenis), só desktop ---------- */
  mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
    if (!window.Lenis) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, anchors: { offset: -100 } });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  });

  /* ---------- 2. Título do hero revelado por linha (SplitText + máscara) ---------- */
  const heroTitle = document.querySelector('.hero--photo h1, .page-hero h1');
  const heroExtras = q('.hero--photo .hero-cta, .hero--photo .hero-meta, .page-hero .hero-cta');
  const showExtras = (delay) => {
    if (!heroExtras.length) return;
    gsap.to(heroExtras, {
      opacity: 1, y: 0, duration: reduce ? 0.25 : 0.8, delay: reduce ? 0 : delay, stagger: reduce ? 0 : 0.12, ease: 'power3.out',
      onComplete() { heroExtras.forEach((e) => e.classList.add('is-in')); gsap.set(heroExtras, { clearProps: 'opacity,transform' }); },
    });
  };
  if (heroTitle) {
    const reveal = () => {
      if (reduce || !window.SplitText) {
        gsap.set(heroTitle, { visibility: 'visible' });
        if (reduce) gsap.from(heroTitle, { opacity: 0, duration: 0.25 });
        showExtras(0);
        return;
      }
      let played = false;
      try {
        SplitText.create(heroTitle, {
          type: 'lines', mask: 'lines', aria: 'auto', autoSplit: true,
          onSplit(self) {
            if (played) return;
            played = true;
            gsap.set(heroTitle, { visibility: 'visible' });
            showExtras(0.45);
            return gsap.from(self.lines, { yPercent: 105, duration: 1, ease: 'power4.out', stagger: 0.09, delay: 0.05 });
          },
        });
      } catch (e) {
        gsap.set(heroTitle, { visibility: 'visible' });
        showExtras(0);
      }
    };
    // as quebras de linha dependem da fonte, então espera a fonte (no máximo 0,9 s)
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(reveal);
  } else {
    showExtras(0);
  }

  /* ---------- 3. Seção fixa com troca por rolagem: etapas do Diagnóstico 360° (desktop) ---------- */
  const pinSection = document.querySelector('[data-pin-steps]');
  if (pinSection) {
    mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
      const proc = pinSection.querySelector('.process');
      const steps = q('.process-step', pinSection);
      if (!proc || steps.length < 2) return;
      proc.classList.remove('reveal', 'has-stagger');
      proc.classList.add('is-revealed');
      const bar = document.createElement('div');
      bar.className = 'process-progress';
      bar.setAttribute('aria-hidden', 'true');
      bar.innerHTML = '<span></span>';
      proc.after(bar);
      const fill = bar.firstElementChild;
      gsap.set(steps, { opacity: 0.28, y: 14 });
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pinSection,
          start: 'top top+=90',
          end: () => '+=' + Math.round(window.innerHeight * 0.5 * steps.length),
          pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      steps.forEach((s, i) => {
        tl.to(s, { opacity: 1, y: 0, duration: 1 }, i);
        tl.to(fill, { scaleX: (i + 1) / steps.length, duration: 1 }, i);
      });
      tl.to({}, { duration: 0.4 });
      return () => { bar.remove(); };
    });
  }

  /* ---------- 4. Entrada por rolagem: fade + deslocamento curto com stagger ---------- */
  const players = [];
  q('.reveal').forEach((el) => {
    const kids = q(STAGGER, el);
    if (kids.length) el.classList.add('has-stagger');
    const targets = kids.length ? kids : [el];
    let done = false;
    const play = () => {
      if (done) return;
      done = true;
      gsap.to(targets, {
        opacity: 1, y: 0, duration: reduce ? 0.25 : 0.8, ease: 'power3.out',
        stagger: reduce ? 0 : { each: 0.07, amount: Math.min(0.07 * targets.length, 0.6) },
        onComplete() {
          el.classList.add('is-revealed');
          gsap.set(targets, { clearProps: 'opacity,transform' });
        },
      });
    };
    const st = ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: play });
    if (st.progress > 0) play();
    players.push([el, play]);
  });
  // garante que nada fique escondido quando a página abre já rolada (âncora ou recarga)
  const settle = () => {
    ScrollTrigger.refresh();
    players.forEach(([el, play]) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) play();
    });
  };
  // o motion.js carrega depois da primeira pintura, então o evento load pode já ter acontecido
  if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle);

  /* ---------- 5. Contadores ---------- */
  q('.count[data-target]').forEach((el) => {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (reduce) { el.textContent = target; return; }
    // reserva a largura do número final para a contagem não empurrar o texto ao lado (sem CLS)
    el.style.display = 'inline-block';
    el.textContent = target;
    el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
    el.textContent = '0';
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter() {
        gsap.to(o, { v: target, duration: 1.6, ease: 'power2.out', onUpdate() { el.textContent = Math.round(o.v); }, onComplete() { el.textContent = target; } });
      },
    });
  });

  /* ---------- 6. Imagens: revelação com clip-path e parallax (parallax só desktop) ---------- */
  const images = q('.split > img');
  const frames = images.map((img) => {
    const frame = document.createElement('div');
    frame.className = 'img-frame';
    img.replaceWith(frame);
    frame.appendChild(img);
    if (!reduce && frame.getBoundingClientRect().top > window.innerHeight * 0.9) {
      gsap.fromTo(frame, { clipPath: 'inset(0 0 100% 0)' }, {
        clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: frame, start: 'top 85%', once: true },
      });
    }
    return frame;
  });
  mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
    frames.forEach((frame) => {
      const img = frame.firstElementChild;
      gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  });

  /* ---------- 7. Botões magnéticos (só mouse) ---------- */
  mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    const cleanups = [];
    q('.btn-primary, .btn-ghost, .btn-ghost-on-dark').forEach((btn) => {
      btn.classList.add('is-magnetic');
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
      const move = (e) => {
        const r = btn.getBoundingClientRect();
        xTo(gsap.utils.clamp(-10, 10, (e.clientX - (r.left + r.width / 2)) * 0.25));
        yTo(gsap.utils.clamp(-8, 8, (e.clientY - (r.top + r.height / 2)) * 0.3));
      };
      const leave = () => { xTo(0); yTo(0); };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        btn.removeEventListener('pointermove', move);
        btn.removeEventListener('pointerleave', leave);
        btn.classList.remove('is-magnetic');
        gsap.set(btn, { clearProps: 'x,y' });
      });
    });
    return () => cleanups.forEach((fn) => fn());
  });

  /* ---------- 8. Nada de loop infinito fora da tela ---------- */
  const loopers = q('.trust-logos');
  if (loopers.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    });
    loopers.forEach((el) => io.observe(el));
  }
})();
