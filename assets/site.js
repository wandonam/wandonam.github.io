/* WANDONAM — 공용 스크립트: 모바일 메뉴, 스크롤 진입 효과 */
(function () {
  var btn = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');
  if (btn && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    };
    btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
    });
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 프로젝트 카드 작은 그림: 화면에 보일 때만 .play (동작 줄이기면 정지 그림 그대로) */
  var figs = [].slice.call(document.querySelectorAll('.mini-fig'));
  if (!reduce && figs.length && 'IntersectionObserver' in window) {
    var seen = new Map(), hid = false; // 탭이 숨겨지면(visibilitychange) 정지
    var sync = function () {
      figs.forEach(function (f) {
        var on = !hid && seen.get(f);
        f.classList.toggle('play', !!on);
      });
    };
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      sync();
    }, { threshold: 0.15 });
    figs.forEach(function (f) { fio.observe(f); });
    document.addEventListener('visibilitychange', function () { hid = document.hidden; sync(); });

    /* 랭킹: 순위 행이 실제로 자리를 바꿈 (상태가 필요해 스크립트로) */
    [].slice.call(document.querySelectorAll('[data-rank]')).forEach(function (box, bi) {
      var fig = box.closest('.mini-fig');
      var rows = [].slice.call(box.querySelectorAll('.rk-r'));
      var pos = rows.map(function (r, i) { return i; }); // rows[i] 가 있는 자리
      var widths = [74, 60, 68, 52, 64, 46, 70];
      var step = 0;
      function mark(r, cls, txt) {
        var em = r.querySelector('em'); em.className = cls; em.textContent = txt;
        r.classList.add('hl'); setTimeout(function () { r.classList.remove('hl'); }, 1100);
      }
      function tick() {
        if (!fig.classList.contains('play')) return;
        step++;
        rows.forEach(function (r) { var em = r.querySelector('em'); if (!r.classList.contains('hl')) { em.className = ''; em.textContent = '–'; } });
        if (step % 4 === 0) {
          // 맨 아래 상품이 빠지고 새 상품이 3위로 진입
          var last = pos.indexOf(3), third = pos.indexOf(2);
          pos[third] = 3; pos[last] = 2;
          rows[last].querySelector('i').style.width = widths[step % widths.length] + '%';
          rows.forEach(function (r, i) { r.style.setProperty('--p', pos[i]); });
          mark(rows[last], 'new', 'New'); mark(rows[third], 'dn', '▼1');
        } else {
          var a = step % 3; // 자리 a 와 a+1 을 맞바꿈
          var up = pos.indexOf(a + 1), dn = pos.indexOf(a);
          pos[up] = a; pos[dn] = a + 1;
          rows.forEach(function (r, i) { r.style.setProperty('--p', pos[i]); });
          mark(rows[up], 'up', '▲1'); mark(rows[dn], 'dn', '▼1');
        }
      }
      setTimeout(function () { tick(); setInterval(tick, 2900); }, 700 + bi * 400);
    });
  }

  var items = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach(function (el) { io.observe(el); });
})();
