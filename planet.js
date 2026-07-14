import * as THREE from "./assets/vendor/three.module.min.js";

const canvas = document.querySelector("#planet-canvas");
const hero = document.querySelector(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && hero && window.WebGLRenderingContext) {
  const preserveFrame = new URLSearchParams(location.search).has("qa-frame");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    preserveDrawingBuffer: preserveFrame,
    powerPreference: "high-performance",
  });
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
  const softwareRenderer = /SwiftShader/i.test(rendererName);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, softwareRenderer ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 80);
  camera.position.set(0, 0, 8.2);

  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const palette = [
    new THREE.Color(0x78ddea),
    new THREE.Color(0xe8f1ed),
    new THREE.Color(0xe7c86e),
    new THREE.Color(0xf27a60),
  ];

  function createPointTexture() {
    const sprite = document.createElement("canvas");
    sprite.width = 48;
    sprite.height = 48;
    const context = sprite.getContext("2d");
    const gradient = context.createRadialGradient(24, 24, 0, 24, 24, 24);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(.18, "rgba(255,255,255,.92)");
    gradient.addColorStop(.48, "rgba(255,255,255,.28)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 48, 48);
    return new THREE.CanvasTexture(sprite);
  }

  const pointTexture = createPointTexture();

  function createRiverCanvas() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 1024;
    textureCanvas.height = 360;
    const context = textureCanvas.getContext("2d");
    context.globalCompositeOperation = "lighter";

    const colors = ["103,215,232", "231,200,110", "240,100,73"];
    for (let index = 0; index < 34; index += 1) {
      const y = 178 + gaussian() * 78;
      context.beginPath();
      context.moveTo(-40, y + gaussian() * 18);
      context.bezierCurveTo(260, y - 110 + gaussian() * 50, 690, y + 120 + gaussian() * 52, 1070, y - 12 + gaussian() * 28);
      context.strokeStyle = `rgba(${colors[index % colors.length]},${.012 + Math.random() * .032})`;
      context.lineWidth = 6 + Math.random() * 24;
      context.filter = `blur(${5 + Math.random() * 11}px)`;
      context.stroke();
    }
    context.filter = "none";
    return textureCanvas;
  }

  function gaussian() {
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * .72;
  }

  function streamPoint(t, spread = 1) {
    const x = t * 8.2;
    const center = Math.sin(t * 2.75) * .7 + t * .28;
    const taper = .42 + (1 - Math.min(1, Math.abs(t))) * .7;
    return new THREE.Vector3(
      x + gaussian() * .38 * spread,
      center + gaussian() * taper * spread,
      -1.6 + Math.random() * 2.7 + gaussian() * .2
    );
  }

  function createStream(count, spread, size, opacity = 1) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      const t = Math.random() * 2 - 1;
      const point = streamPoint(t, spread);
      const offset = index * 3;
      positions[offset] = point.x;
      positions[offset + 1] = point.y;
      positions[offset + 2] = point.z;

      const selector = Math.random();
      const color = selector < .46 ? palette[0] : selector < .73 ? palette[1] : selector < .89 ? palette[2] : palette[3];
      const brightness = .48 + Math.random() * .52;
      colors[offset] = color.r * brightness;
      colors[offset + 1] = color.g * brightness;
      colors[offset + 2] = color.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      map: pointTexture,
      alphaMap: pointTexture,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      alphaTest: .025,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(geometry, material);
  }

  const galaxy = new THREE.Group();
  const riverCanvas = createRiverCanvas();
  const riverPlane = softwareRenderer ? null : new THREE.Mesh(
    new THREE.PlaneGeometry(14.6, 5.15),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(riverCanvas),
      transparent: true,
      opacity: .42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  if (riverPlane) riverPlane.position.z = -2.35;
  if (softwareRenderer) {
    hero.style.backgroundImage = `url(${riverCanvas.toDataURL("image/png")})`;
    hero.style.backgroundPosition = mobile ? "58% 72%" : "66% 50%";
  }
  const dustCount = softwareRenderer ? 560 : mobile ? 900 : 1900;
  const coreCount = softwareRenderer ? 150 : mobile ? 300 : 620;
  const dust = createStream(dustCount, 1.18, mobile ? .045 : .04, .58);
  const core = createStream(coreCount, .38, mobile ? .075 : .065, .9);
  if (riverPlane) galaxy.add(riverPlane);
  galaxy.add(dust, core);

  const lineCount = softwareRenderer ? 16 : mobile ? 30 : 62;
  const linePositions = new Float32Array(lineCount * 6);
  for (let index = 0; index < lineCount; index += 1) {
    const t = Math.random() * 1.8 - .9;
    const start = streamPoint(t, .28);
    const end = streamPoint(Math.min(.98, t + .035 + Math.random() * .08), .28);
    linePositions.set([start.x, start.y, start.z, end.x, end.y, end.z], index * 6);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const dataLines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0x9de5eb, transparent: true, opacity: .13, blending: THREE.AdditiveBlending })
  );
  galaxy.add(dataLines);

  const starCount = softwareRenderer ? 180 : mobile ? 250 : 580;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    const offset = index * 3;
    starPositions[offset] = (Math.random() - .5) * 21;
    starPositions[offset + 1] = (Math.random() - .5) * 12;
    starPositions[offset + 2] = -3 - Math.random() * 12;
    const color = Math.random() > .9 ? palette[2] : palette[1];
    const brightness = .25 + Math.random() * .42;
    starColors[offset] = color.r * brightness;
    starColors[offset + 1] = color.g * brightness;
    starColors[offset + 2] = color.b * brightness;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const backgroundStars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ vertexColors: true, map: pointTexture, alphaMap: pointTexture, alphaTest: .03, size: mobile ? .04 : .032, transparent: true, opacity: .62, depthWrite: false })
  );
  scene.add(backgroundStars);

  const focusCount = softwareRenderer ? 20 : mobile ? 40 : 72;
  const focusPositions = new Float32Array(focusCount * 3);
  for (let index = 0; index < focusCount; index += 1) {
    const radius = .08 + Math.random() * .62;
    const angle = Math.random() * Math.PI * 2;
    const offset = index * 3;
    focusPositions[offset] = Math.cos(angle) * radius;
    focusPositions[offset + 1] = Math.sin(angle) * radius;
    focusPositions[offset + 2] = gaussian() * .22;
  }
  const focusGeometry = new THREE.BufferGeometry();
  focusGeometry.setAttribute("position", new THREE.BufferAttribute(focusPositions, 3));
  const focusCluster = new THREE.Points(
    focusGeometry,
    new THREE.PointsMaterial({ color: 0x9ce8ef, map: pointTexture, alphaMap: pointTexture, alphaTest: .03, size: mobile ? .045 : .038, transparent: true, opacity: .58, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(focusCluster);

  const cometGroup = new THREE.Group();
  for (let index = 0; index < (softwareRenderer ? 2 : mobile ? 3 : 6); index += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-.55 - Math.random() * .75, .14 + Math.random() * .2, 0),
    ]);
    const comet = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: index % 2 ? 0xe7c86e : 0x76dce8, transparent: true, opacity: .18 + Math.random() * .2, blending: THREE.AdditiveBlending })
    );
    comet.position.set(-6 + Math.random() * 12, -3 + Math.random() * 6, -1 - Math.random() * 3);
    comet.userData.speed = .16 + Math.random() * .2;
    cometGroup.add(comet);
  }
  scene.add(galaxy, cometGroup);

  const pointer = new THREE.Vector2(.32, .05);
  const pointerTarget = new THREE.Vector2(.32, .05);
  const pointerWorld = new THREE.Vector3();

  function placeGalaxy() {
    const ratio = hero.clientWidth / hero.clientHeight;
    if (ratio < .72) {
      galaxy.position.set(.1, -1.72, -.2);
      galaxy.rotation.set(.04, -.06, -.23);
      galaxy.scale.setScalar(.72);
      cometGroup.position.y = -1.25;
    } else {
      galaxy.position.set(1.55, .18, 0);
      galaxy.rotation.set(-.03, -.14, -.18);
      galaxy.scale.setScalar(1);
      cometGroup.position.y = 0;
    }
  }

  function resize() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const renderScale = mobile ? .68 : .60;
    renderer.setSize(Math.round(width * renderScale), Math.round(height * renderScale), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    placeGalaxy();
  }

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerTarget.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }, { passive: true });

  const observer = new ResizeObserver(resize);
  observer.observe(hero);
  resize();

  const clock = new THREE.Clock();
  const renderInterval = 1000 / (softwareRenderer ? 30 : mobile ? 24 : 30);
  let lastRenderTime = -renderInterval;
  window.__planetMetrics = { startedAt: performance.now(), renderedFrames: 0 };

  function render(now = 0) {
    if (!reducedMotion) requestAnimationFrame(render);
    if (!reducedMotion && now - lastRenderTime < renderInterval) return;
    lastRenderTime = now;

    const elapsed = clock.getElapsedTime();
    pointer.lerp(pointerTarget, .06);
    dust.material.opacity = .54 + Math.sin(elapsed * .42) * .045;
    core.material.opacity = .84 + Math.sin(elapsed * .55) * .06;

    if (!reducedMotion) {
      galaxy.rotation.y += (pointer.x * .055 - galaxy.rotation.y) * .035;
      galaxy.rotation.x += (-pointer.y * .035 - galaxy.rotation.x) * .035;
      galaxy.position.x += ((mobile ? .1 : 1.55) + pointer.x * .12 - galaxy.position.x) * .035;
      galaxy.position.y += ((mobile ? -1.72 : .18) + pointer.y * .08 - galaxy.position.y) * .035;
      backgroundStars.rotation.y = elapsed * .0025;
      dataLines.material.opacity = .1 + Math.sin(elapsed * .7) * .035;
      if (riverPlane) riverPlane.material.opacity = .4 + Math.sin(elapsed * .22) * .035;

      cometGroup.children.forEach((comet) => {
        comet.position.x += comet.userData.speed * .035;
        comet.position.y -= comet.userData.speed * .009;
        if (comet.position.x > 7) {
          comet.position.x = -7;
          comet.position.y = -3 + Math.random() * 6;
        }
      });

      pointerWorld.set(pointer.x, pointer.y, .2).unproject(camera);
      const direction = pointerWorld.sub(camera.position).normalize();
      const distance = -camera.position.z / direction.z;
      const target = camera.position.clone().add(direction.multiplyScalar(distance));
      focusCluster.position.lerp(target, .08);
      focusCluster.rotation.z = -elapsed * .08;
    }

    renderer.render(scene, camera);
    window.__planetMetrics.renderedFrames += 1;
  }

  requestAnimationFrame(render);
} else if (canvas) {
  canvas.classList.add("is-fallback");
}
