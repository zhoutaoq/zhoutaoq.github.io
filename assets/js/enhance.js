/* ==========================================================================
   enhance.js — 首页交互与动效（原生实现，无依赖）
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('[data-hero]');

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* 顶栏滚动态 + 阅读进度条 ------------------------------------------------ */

  function initMasthead() {
    var masthead = $('.masthead');
    if (!masthead) return;

    var bar = null;
    if (hero) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress';
      bar.setAttribute('data-progress', '');
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      masthead.classList.toggle('is-scrolled', y > 8);

      if (bar) {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(y / max, 1) : 0;
        bar.style.transform = 'scaleX(' + ratio + ')';
      }
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* 滚动入场 -------------------------------------------------------------- */

  function revealAll() {
    $$('[data-reveal]').forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    var fired = false;
    var io = new IntersectionObserver(
      function (entries) {
        fired = true;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    items.forEach(function (el) {
      io.observe(el);
    });

    // 页面见底时把剩下的全放出来，避免最后一行卡在触发线以下一直不显示
    var ticking = false;
    function flushAtEnd() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var doc = document.documentElement;
        if (window.pageYOffset + window.innerHeight >= doc.scrollHeight - 4) revealAll();
      });
    }
    window.addEventListener('scroll', flushAtEnd, { passive: true });
    window.addEventListener('resize', flushAtEnd, { passive: true });
    flushAtEnd();

    // 兜底：观察器压根没触发（脚本被拦、DOM 异常）时才全部显示
    window.setTimeout(function () {
      if (!fired) revealAll();
    }, 2000);
  }

  /* 数字滚动 -------------------------------------------------------------- */

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }

    var duration = 1200;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    if (!('IntersectionObserver' in window)) {
      nums.forEach(countUp);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    nums.forEach(function (el) {
      io.observe(el);
    });
  }

  /* Hero 文案轮播 --------------------------------------------------------- */

  function initTyped() {
    var host = $('[data-typed]');
    if (!host) return;

    var words = $$('span', host).map(function (s) {
      return s.textContent.trim();
    });
    host.innerHTML = '';
    if (!words.length) return;

    if (reduceMotion) {
      host.textContent = words[0];
      return;
    }

    var wordIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var word = words[wordIndex];
      charIndex += deleting ? -1 : 1;
      host.textContent = word.slice(0, charIndex);

      var delay = deleting ? 45 : 85;
      if (!deleting && charIndex === word.length) {
        deleting = true;
        delay = 1800;
      } else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 320;
      }
      window.setTimeout(tick, delay);
    }
    window.setTimeout(tick, 700);
  }

  /* Hero 粒子星网 --------------------------------------------------------- */

  function initParticles() {
    var canvas = $('[data-hero-canvas]');
    if (!canvas || !hero || reduceMotion) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var nodes = [];
    var pointer = { x: -9999, y: -9999 };
    var running = true;
    var raf = null;

    function resize() {
      var rect = hero.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.round(Math.min((width * height) / 16000, 78));
      count = Math.max(count, 18);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.9
        });
      }
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      var linkDist = 132;
      var i, j, a, b, dx, dy, dist;

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        // 鼠标附近轻微排斥
        dx = a.x - pointer.x;
        dy = a.y - pointer.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0.1) {
          a.x += (dx / dist) * 0.6;
          a.y += (dy / dist) * 0.6;
        }
      }

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            ctx.strokeStyle = 'rgba(0, 127, 255, ' + (0.16 * (1 - dist / linkDist)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = 'rgba(0, 127, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
    }

    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', function () {
      pointer.x = -9999;
      pointer.y = -9999;
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 180);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) start();
          else stop();
        },
        { threshold: 0 }
      ).observe(hero);
    }

    resize();
    frame();
  }

  /* 卡片光标高光 ---------------------------------------------------------- */

  function initSpotlight() {
    if (reduceMotion) return;
    var cards = $$('[data-spotlight]');
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - rect.left + 'px');
        card.style.setProperty('--my', e.clientY - rect.top + 'px');
      });
    });
  }

  /* 头像轻微倾斜 ---------------------------------------------------------- */

  function initTilt() {
    if (reduceMotion) return;
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    $$('[data-tilt]').forEach(function (el) {
      var max = 7;

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform =
          'perspective(720px) rotateY(' + (px * max).toFixed(2) + 'deg) rotateX(' + (-py * max).toFixed(2) + 'deg)';
      });

      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* 页内锚点平滑滚动 ------------------------------------------------------ */

  function initSmoothAnchors() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  function boot() {
    initMasthead();
    initReveal();
    initCounters();
    initTyped();
    initParticles();
    initSpotlight();
    initTilt();
    initSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
