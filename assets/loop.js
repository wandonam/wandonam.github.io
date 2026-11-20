/* WANDONAM — 홈의 3D 무한 루프 (외부 라이브러리 없이 캔버스 2D 에 직접 3D 투영) */
(function () {
  var stage = document.getElementById('loopStage');
  var canvas = document.getElementById('loopCanvas');
  if (!stage || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  stage.classList.add('live'); // 대체 SVG 숨김

  var TAU = Math.PI * 2;
  // 이 루프는 "자동으로 계속 돈다"는 내용 자체라 동작 줄이기에서도 멈추지 않고, 속도와 깜박임만 줄인다.
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = calm ? 0.5 : 1;
  var labels = [].slice.call(stage.querySelectorAll('.loop-label'));
  var W = 0, H = 0, DPR = 1, small = false;
  var N = 360, P = [], particles = [], pulses = [];
  var running = false, visible = true, t0 = performance.now(), last = 0;

  // 단계 라벨이 놓일 루프 위치 (0..1)
  var stageT = [0.87, 0.0, 0.13, 0.37, 0.5, 0.63].slice(0, labels.length); // 모으기→정리→AI→사람→실행→점검, 교차점(0.25·0.75)은 피함

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(280, r.width); H = Math.max(260, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    small = W < 640;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    N = small ? 220 : 360;
    var count = small ? 46 : 120;
    particles = [];
    for (var i = 0; i < count; i++) particles.push({ u: Math.random(), v: 0.012 + Math.random() * 0.03, s: 0.6 + Math.random() * 1.4, o: Math.random() * TAU });
    pulses = [{ u: 0.0, v: 0.055 }, { u: 0.34, v: 0.055 }, { u: 0.67, v: 0.055 }];
  }

  // 3D 무한대 곡선 (베르누이 렘니스케이트 + 깊이)
  function curve(u, out) {
    var t = u * TAU, s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
    out.x = c / d; out.y = s * c / d; out.z = 0.42 * s;
    return out;
  }

  function project(u, rotY, rotX, R, o) {
    curve(u, o);
    var x = o.x * R, y = o.y * R, z = o.z * R;
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    var cx = Math.cos(rotX), sx = Math.sin(rotX);
    var y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    var f = R * 3.2, p = f / (f + z2);
    o.sx = W / 2 + x1 * p; o.sy = H / 2 + y2 * p; o.depth = z2 / R; o.p = p;
    return o;
  }

  function frame(now) {
    var a, b; // 세그먼트 양 끝점 (전역으로 새지 않게)
    var time = (now - t0) / 1000 * SPEED;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    var R = Math.min(W * (small ? 0.4 : 0.43), H * 0.9);
    var rotY = Math.sin(time * 0.21) * 0.5;
    var rotX = 0.42 + Math.sin(time * 0.16) * 0.1;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 배경 광원
    var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R * 1.25);
    g.addColorStop(0, 'rgba(90,110,255,0.20)'); g.addColorStop(0.55, 'rgba(60,70,200,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 곡선 점 계산
    if (P.length !== N + 1) { P = []; for (var k = 0; k <= N; k++) P.push({}); }
    for (var i = 0; i <= N; i++) project(i / N, rotY, rotX, R, P[i]);

    // 세그먼트 깊이 정렬 (먼 것부터)
    var segs = [];
    for (i = 0; i < N; i++) segs.push(i);
    segs.sort(function (a, b) { return (P[b].depth + P[b + 1].depth) - (P[a].depth + P[a + 1].depth); });

    var base = small ? 12 : 19;
    // 1) 은은한 발광 (끊김 없는 한 줄 경로)
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[3.4, 0.05], [2.0, 0.08]].forEach(function (pass) {
      ctx.beginPath(); ctx.moveTo(P[0].sx, P[0].sy);
      for (var q = 1; q <= N; q++) ctx.lineTo(P[q].sx, P[q].sy);
      ctx.strokeStyle = 'rgba(110,125,255,' + pass[1] + ')';
      ctx.lineWidth = base * pass[0];
      ctx.stroke();
    });
    // 2) 입체 튜브 몸통 (앞이 뒤를 가림)
    ctx.globalCompositeOperation = 'source-over';
    for (var j = 0; j < segs.length; j++) {
      i = segs[j]; a = P[i]; b = P[i + 1];
      var dpt = Math.max(-1, Math.min(1, (a.depth + b.depth) / 2));
      var n = (1 - dpt) / 2; // 0 먼 쪽 → 1 가까운 쪽
      var r = Math.round(22 + 48 * n), gg = Math.round(28 + 62 * n), bb = Math.round(80 + 150 * n);
      ctx.strokeStyle = 'rgb(' + r + ',' + gg + ',' + bb + ')';
      ctx.lineWidth = base * a.p;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      // 윗면 반사광
      ctx.strokeStyle = 'rgba(190,200,255,' + (0.15 + 0.55 * n).toFixed(3) + ')';
      ctx.lineWidth = base * 0.22 * a.p;
      var off = base * 0.24 * a.p;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy - off); ctx.lineTo(b.sx, b.sy - off); ctx.stroke();
    }

    // 3) 흐르는 빛 입자와 펄스
    ctx.globalCompositeOperation = 'lighter';
    var tmp = {};
    for (i = 0; i < particles.length; i++) {
      var q = particles[i];
      q.u = (q.u + q.v * dt * SPEED) % 1;
      project(q.u, rotY, rotX, R, tmp);
      var tw = calm ? 0.8 + 0.2 * Math.sin(time * 3 + q.o) : 0.55 + 0.45 * Math.sin(time * 3 + q.o);
      var rad = (2.2 + q.s * 2) * tmp.p;
      var al = (0.25 + 0.5 * (1 - tmp.depth) / 2) * tw;
      var pg = ctx.createRadialGradient(tmp.sx, tmp.sy, 0, tmp.sx, tmp.sy, rad * 3);
      pg.addColorStop(0, 'rgba(210,220,255,' + al.toFixed(3) + ')');
      pg.addColorStop(1, 'rgba(110,125,255,0)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(tmp.sx, tmp.sy, rad * 3, 0, TAU); ctx.fill();
    }
    for (i = 0; i < pulses.length; i++) {
      var pu = pulses[i];
      pu.u = (pu.u + pu.v * dt * SPEED) % 1;
      for (var tail = 0; tail < 10; tail++) {
        var uu = (pu.u - tail * 0.0045 + 1) % 1;
        project(uu, rotY, rotX, R, tmp);
        var rr = (small ? 10 : 15) * tmp.p * (1 - tail / 12);
        var ag = (calm ? 0.4 : 0.55) * (1 - tail / 10);
        var hg = ctx.createRadialGradient(tmp.sx, tmp.sy, 0, tmp.sx, tmp.sy, rr * 2.2);
        hg.addColorStop(0, 'rgba(255,236,220,' + ag.toFixed(3) + ')');
        hg.addColorStop(0.35, 'rgba(255,150,90,' + (ag * 0.6).toFixed(3) + ')');
        hg.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(tmp.sx, tmp.sy, rr * 2.2, 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // 4) 단계 라벨 위치·반응
    for (i = 0; i < labels.length; i++) {
      var su = stageT[i];
      project(su, rotY, rotX, R, tmp);
      var lx = tmp.sx + (tmp.sx - W / 2) * 0.1, ly = tmp.sy + (tmp.sy < H / 2 ? -1 : 1) * (small ? 24 : 32);
      var el = labels[i], lw = el.offsetWidth || 80, lh = el.offsetHeight || 24;
      lx = Math.max(4 + lw / 2, Math.min(W - 4 - lw / 2, lx));
      ly = Math.max(4 + lh / 2, Math.min(H - 4 - lh / 2, ly));
      el.style.transform = 'translate(' + (lx - lw / 2).toFixed(1) + 'px,' + (ly - lh / 2).toFixed(1) + 'px)';
      el.style.opacity = (0.55 + 0.45 * (1 - tmp.depth) / 2).toFixed(2);
      var on = false;
      for (var m = 0; m < pulses.length; m++) { var dd = Math.abs(pulses[m].u - su); if (Math.min(dd, 1 - dd) < 0.045) on = true; }
      el.classList.toggle('on', on);
      var dot = el._dot || (el._dot = stage.querySelector('.loop-dot[data-i="' + i + '"]'));
      if (dot) { dot.style.transform = 'translate(' + (tmp.sx - 10).toFixed(1) + 'px,' + (tmp.sy - 10).toFixed(1) + 'px)'; dot.classList.toggle('on', on); }
    }

    if (running) requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }

  resize();
  window.addEventListener('resize', function () { resize(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !document.hidden) start(); else stop(); }, { threshold: 0.01 }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
  start();
})();
