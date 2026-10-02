/* ==========================================================================
   Planet Rose: 3D microphone (Three.js r128)

   Why it reads as a mic (lessons from v1):
   - Gunmetal PBR materials lit by a baked studio environment map (softboxes),
     so dark metal shows real reflections instead of rendering flat black.
   - Neutral white key + fill; --brand-red is the only colour (thin ring +
     one rim light). No pastels, no emissive glow.
   - The canvas fades in only after the first frame has rendered. Until then
     (or forever, if WebGL/CDN fails) the CSS glow + SVG mic are on screen.
   ========================================================================== */
(function () {
  'use strict';

  var button = document.querySelector('[data-mic]');
  var canvas = document.querySelector('[data-mic-canvas]');
  if (!button || !canvas) return;

  // No Three.js (CDN blocked, offline): keep the SVG + glow and stop quietly.
  if (typeof window.THREE === 'undefined') {
    button.classList.add('is-fallback');
    return;
  }

  var THREE = window.THREE;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (err) {
    button.classList.add('is-fallback');
    return;
  }

  try {
    init();
  } catch (err) {
    // Anything unexpected: never leave an empty or broken canvas on screen.
    button.classList.remove('is-live');
    button.classList.add('is-fallback');
    if (window.console) console.warn('[mic3d] fallback to SVG:', err);
  }

  function readBrandColor(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    try { return new THREE.Color(value || fallback); } catch (e) { return new THREE.Color(fallback); }
  }

  function init() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.2, 9.2);
    camera.lookAt(0, 0.05, 0);

    var brandRed = readBrandColor('--brand-red', '#F8001C');
    // CSS hex is sRGB; the renderer works in linear space. Without this the red washes out to pink.
    var redLinear = brandRed.clone().convertSRGBToLinear();

    /* ---------------- studio environment ----------------
       Real metal needs something to reflect. We build a tiny "photo studio"
       (dark room + white softboxes + one brand-red card) and bake it into an
       environment map, so dark gunmetal reads as metal instead of flat black. */
    var envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x0c0c0c, side: THREE.BackSide })
    ));
    function softbox(w, h, color, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      envScene.add(m);
    }
    softbox(10, 6, 0xffffff, 0, 5, 9);      // big key, front-top
    softbox(3, 12, 0xd9d9d9, -9, 0, 3);     // strip light, left
    softbox(3, 12, 0x9a9a9a, 9, 1, 2);      // strip light, right (dimmer)
    softbox(8, 3, redLinear, 0, -2, -10);    // red card behind: the only colour
    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    pmrem.dispose();

    /* ---------------- lights (neutral) ---------------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    var key = new THREE.DirectionalLight(0xffffff, 1.6);    // white key, from the front
    key.position.set(1.6, 2.6, 6);
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xffffff, 0.45);  // front-left fill
    fill.position.set(-3.5, 0.5, 4);
    scene.add(fill);

    var rimRed = new THREE.PointLight(redLinear, 1.1, 12);  // brand-red rim, behind only
    rimRed.position.set(-2.6, 1.8, -2.6);
    scene.add(rimRed);

    /* ---------------- materials ----------------
       Gunmetal body, dark steel grille, brushed-steel trim.
       --brand-red is the single accent (thin ring). No pastels, no emissive glow. */
    var gunmetal = new THREE.MeshStandardMaterial({ color: 0x222224, metalness: 0.9, roughness: 0.3 });
    var grilleCore = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.85, roughness: 0.55 });
    var steel = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 1, roughness: 0.28 });
    var red = new THREE.MeshStandardMaterial({ color: redLinear, metalness: 0.2, roughness: 0.45 });
    var rubber = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.1, roughness: 0.7 });

    /* ---------------- geometry ---------------- */
    var mic = new THREE.Group();

    // Grille head: dark steel core + fine neutral wire mesh
    var HEAD_Y = 1.18, HEAD_R = 0.64;
    var core = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R * 0.97, 48, 32), grilleCore);
    core.position.y = HEAD_Y;
    mic.add(core);

    var lattice = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(HEAD_R, 22, 14)),
      new THREE.LineBasicMaterial({ color: 0x8c8c90, transparent: true, opacity: 0.75 })
    );
    lattice.position.y = HEAD_Y;
    mic.add(lattice);

    // Steel equator band on the ball
    var band = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R * 1.005, 0.03, 12, 64), steel);
    band.position.y = HEAD_Y;
    band.rotation.x = Math.PI / 2;
    mic.add(band);

    // Collar under the head
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.43, 0.26, 48, 1), steel);
    collar.position.y = 0.62;
    mic.add(collar);

    // Thin brand-red ring: the only accent
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.028, 12, 64), red);
    ring.position.y = 0.47;
    ring.rotation.x = Math.PI / 2;
    mic.add(ring);

    // Tapered handle (lathe profile)
    var profile = [
      new THREE.Vector2(0.0, 0.48),
      new THREE.Vector2(0.42, 0.48),
      new THREE.Vector2(0.41, 0.3),
      new THREE.Vector2(0.36, -0.2),
      new THREE.Vector2(0.3, -0.9),
      new THREE.Vector2(0.25, -1.55),
      new THREE.Vector2(0.24, -1.68),
      new THREE.Vector2(0.18, -1.76),
      new THREE.Vector2(0.0, -1.78)
    ];
    var handle = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), gunmetal);
    mic.add(handle);

    // Steel tail cap
    var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.24, 0.12, 40), steel);
    tail.position.y = -1.62;
    mic.add(tail);

    // On/off switch: matte black, not a colour accent
    var sw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.07), rubber);
    sw.position.set(0, -0.35, 0.35);
    sw.rotation.x = -0.1;
    mic.add(sw);

    var rig = new THREE.Group();   // tilt lives here, spin lives on `mic`
    rig.add(mic);
    rig.rotation.z = 0.34;
    rig.rotation.x = 0.16;
    rig.position.y = 0.02;
    scene.add(rig);

    /* ---------------- sizing ---------------- */
    function resize() {
      var rect = button.getBoundingClientRect();
      var size = Math.max(160, Math.round(Math.min(rect.width, rect.height)));
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(button);
    } else {
      window.addEventListener('resize', resize);
    }

    /* ---------------- interaction ---------------- */
    var pointer = { x: 0, y: 0 };
    var tilt = { x: 0, y: 0 };
    var spinBoost = 0;

    button.addEventListener('pointermove', function (e) {
      var r = button.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    button.addEventListener('pointerleave', function () { pointer.x = 0; pointer.y = 0; });

    // interactions.js fires this when the mic is tapped
    button.addEventListener('mic:tap', function () {
      spinBoost = reduceMotion ? 0 : 0.55;
      if (reduceMotion) render(0);
    });

    /* ---------------- loop ---------------- */
    var running = false;
    var visible = true;
    var rafId = 0;
    var first = true;
    var clock = new THREE.Clock();

    function render(t) {
      tilt.x += (pointer.y * 0.28 - tilt.x) * 0.08;
      tilt.y += (pointer.x * 0.5 - tilt.y) * 0.08;

      if (!reduceMotion) {
        mic.rotation.y += 0.006 + spinBoost;
        spinBoost *= 0.9;
        rig.position.y = 0.02 + Math.sin(t * 1.3) * 0.05;
      }
      rig.rotation.x = 0.16 + tilt.x;
      rig.rotation.y = tilt.y;

      renderer.render(scene, camera);

      if (first) {
        first = false;
        // Wait one more frame so the pixels are on screen before the crossfade
        requestAnimationFrame(function () { button.classList.add('is-live'); });
      }
    }

    function tick() {
      if (!running) return;
      render(clock.getElapsedTime());
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (running || !visible || document.hidden) return;
      running = true;
      tick();
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    if (reduceMotion) {
      mic.rotation.y = 0.5;
      render(0);
      button.addEventListener('pointermove', function () { requestAnimationFrame(function () { render(0); }); });
    } else {
      render(0); // first frame right away, even if the mic starts off-screen
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) start(); else stop();
        }).observe(button);
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else start();
      });
      start();
    }

    // Lost GPU context (mobile tab switching etc.): fall back gracefully
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      stop();
      button.classList.remove('is-live');
      button.classList.add('is-fallback');
    });
  }
})();
