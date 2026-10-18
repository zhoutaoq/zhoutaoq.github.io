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

  /* 亮暗色：默认跟随浏览器设置，允许手动覆盖 ----------------------------- */

  var THEME_KEY = 'theme';
  var THEME_MODES = ['auto', 'dark', 'light'];
  var THEME_LABEL = { auto: '跟随系统', dark: '暗色', light: '亮色' };
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function systemDark() {
    return !!(darkQuery && darkQuery.matches);
  }

  function storedTheme() {
    try {
      var v = window.localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  function applyTheme(mode) {
    var root = document.documentElement;
    var dark = mode === 'auto' ? systemDark() : mode === 'dark';

    root.setAttribute('data-theme-mode', mode);
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');

    $$('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute('content', dark ? '#0b0d0f' : '#ffffff');
    });

    $$('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', '主题：' + THEME_LABEL[mode]);
      btn.setAttribute('title', '主题：' + THEME_LABEL[mode] + '（点击切换）');
    });

    document.dispatchEvent(new Event('enhance:theme'));
  }

  function initTheme() {
    // 首屏已在 head 里贴过一遍，这里补上按钮状态和 meta
    applyTheme(storedTheme());

    // 系统切换亮/暗时，处于「跟随系统」的页面实时跟着变
    if (darkQuery) {
      var onSystemChange = function () {
        if (storedTheme() === 'auto') applyTheme('auto');
      };
      if (darkQuery.addEventListener) darkQuery.addEventListener('change', onSystemChange);
      else if (darkQuery.addListener) darkQuery.addListener(onSystemChange);
    }

    var btn = $('[data-theme-toggle]');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var mode = storedTheme();
      var next = THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length];
      try {
        if (next === 'auto') window.localStorage.removeItem(THEME_KEY);
        else window.localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* 隐私模式下写不进去，忽略 */
      }
      applyTheme(next);
    });
  }

  /* 介绍动画弹窗 ---------------------------------------------------------- */

  function initIntroModal() {
    var modal = $('[data-intro-modal]') || $('#intro-modal');
    var openers = $$('[data-intro-open]');
    if (!modal || !openers.length) return;

    var frame = $('[data-intro-frame]', modal);
    var closeBtn = $('[data-intro-close]', modal);
    var lastFocus = null;
    var closeTimer = null;
    var panel = $('.intro-modal__panel', modal);

    /* 弹窗按视口算尺寸：宽度占 70%，同时不超过视口高度的 80%（头部约 44px） */
    function fitPanel() {
      if (!panel) return;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var width = vw < 760 ? vw * 0.94 : Math.min(vw * 0.7, (vh * 0.8 - 44) * 16 / 9);
      width = Math.min(width, 1600);
      panel.style.width = Math.round(width) + 'px';
    }

    function open(e) {
      if (e) e.preventDefault();
      window.clearTimeout(closeTimer);
      fitPanel();
      if (frame) {
        // 带上时间戳，保证每次打开都拿到最新的片子（也顺带绕开 HTML 的 10 分钟缓存）
        var base = frame.getAttribute('data-src');
        frame.setAttribute('src', base + (base.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now());
      }
      lastFocus = document.activeElement;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('intro-open');
      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
      });
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-open');
      closeTimer = window.setTimeout(function () {
        modal.hidden = true;
        if (frame) frame.setAttribute('src', 'about:blank');
      }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    window.addEventListener('resize', function () {
      if (!modal.hidden) fitPanel();
    }, { passive: true });

    openers.forEach(function (el) {
      el.addEventListener('click', open);
    });
    $$('[data-intro-close]', modal).forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (!modal.hidden && e.key === 'Escape') close();
    });
  }

  /* 从 token 里取主色，暗色下粒子也要跟着变亮 */
  function readBrand() {
    var value = window.getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    var hex = /^#([0-9a-f]{6})$/i.exec(value);
    if (!hex) return [0, 127, 255];
    var n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
    startCounters(document);
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
          startCounters(entry.target);
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

  /* 数字滚动跟着入场一起触发，快速滚动不会跳过 --------------------------- */

  function startCounters(root) {
    $$('[data-count]', root).forEach(function (el) {
      if (el.getAttribute('data-counted')) return;
      el.setAttribute('data-counted', '1');
      countUp(el);
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
    var brand = readBrand();

    document.addEventListener('enhance:theme', function () {
      brand = readBrand();
    });

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
      var rgb = brand.join(', ');
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
            ctx.strokeStyle = 'rgba(' + rgb + ', ' + (0.16 * (1 - dist / linkDist)).toFixed(3) + ')';
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
        ctx.fillStyle = 'rgba(' + rgb + ', 0.5)';
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

      // 目标卡片可能还停在入场动画的初始态（translateY 18px），
      // scrollIntoView 会按偏移后的位置落点，差 18px。先让它直接落到终态。
      var prevTransition = target.style.transition;
      target.style.transition = 'none';
      target.classList.add('is-in');
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      window.requestAnimationFrame(function () {
        target.style.transition = prevTransition;
      });
    });
  }

  /* 页脚右下角：当日访问量 / 上次发布 / 自发布以来访问量 ------------------ */

  function initPageStats() {
    var box = $('[data-page-stats]');
    if (!box) return;

    var NS = 'zhoutaoq-pv';
    var API = 'https://abacus.jasoncameron.dev/hit/';
    var release = box.getAttribute('data-release') || '';
    var now = new Date();
    var pad = function (n) {
      return (n < 10 ? '0' : '') + n;
    };
    var dayKey = 'day-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());

    function fill(name, value) {
      var el = box.querySelector('[data-pv="' + name + '"]');
      if (el && typeof value === 'number') el.textContent = value.toLocaleString('en-US');
    }

    function hit(key) {
      if (!key) return Promise.resolve(null);
      return fetch(API + NS + '/' + encodeURIComponent(key), { cache: 'no-store' })
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (json) {
          return json && typeof json.value === 'number' ? json.value : null;
        })
        .catch(function () {
          return null;
        });
    }

    hit(dayKey).then(function (value) {
      fill('day', value);
    });

    if (release) {
      hit('v-' + release).then(function (value) {
        fill('release', value);
      });
    }
  }

  function boot() {
    initMasthead();
    initTheme();
    initIntroModal();
    initReveal();
    initTyped();
    initParticles();
    initSpotlight();
    initTilt();
    initSmoothAnchors();
    initPageStats();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
