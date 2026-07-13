import * as THREE from "./assets/vendor/three.module.min.js";

const canvas = document.querySelector("#planet-canvas");
const hero = document.querySelector(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && hero && window.WebGLRenderingContext) {
  const preserveFrame = new URLSearchParams(location.search).has("qa-frame");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: preserveFrame, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 7.2);

  const mobile = window.matchMedia("(max-width: 700px)").matches;
  const segments = mobile ? 52 : 88;
  const geometry = new THREE.SphereGeometry(2.25, segments, Math.round(segments * 0.72));
  const uniforms = {
    uTime: { value: 0 },
    uScan: { value: new THREE.Vector3(0.65, 0.2, 0.72).normalize() },
    uIntensity: { value: 0.72 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vPosition;
      varying float vElevation;
      uniform float uTime;

      float terrain(vec3 p) {
        float a = sin(p.x * 3.4 + uTime * .045) * sin(p.y * 4.8) * sin(p.z * 3.1);
        float b = sin((p.x + p.z) * 7.2 - uTime * .025) * cos(p.y * 5.7) * .45;
        float c = cos(p.x * 12.0) * sin(p.z * 10.0) * .18;
        return a * .62 + b + c;
      }

      void main() {
        vec3 p = position;
        float elevation = terrain(normalize(p));
        p += normal * elevation * .105;
        vElevation = elevation;
        vPosition = normalize(position);
        vNormalWorld = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormalWorld;
      varying vec3 vPosition;
      varying float vElevation;
      uniform vec3 uScan;
      uniform float uIntensity;

      void main() {
        vec3 graphite = vec3(.035, .047, .043);
        vec3 ridge = vec3(.12, .15, .135);
        vec3 cyan = vec3(.20, .78, .86);
        vec3 signal = vec3(.94, .25, .14);

        float light = sqrt(max(dot(vNormalWorld, normalize(vec3(-.3, .55, 1.0))), 0.0));
        float rim = 1.0 - max(dot(vNormalWorld, vec3(0.0, 0.0, 1.0)), 0.0);
        rim *= rim;
        float contourBand = abs(fract((vElevation + 1.8) * 9.0) - .5);
        float contour = 1.0 - smoothstep(.035, .075, contourBand);
        float scanDistance = distance(normalize(vPosition), normalize(uScan));
        float scan = 1.0 - smoothstep(.12, .55, scanDistance);
        float scanRing = 1.0 - smoothstep(.018, .05, abs(scanDistance - .31));
        float warmZone = smoothstep(-.22, .36, vPosition.x - vPosition.y * .42);

        vec3 color = mix(graphite, ridge, light * .8 + max(vElevation, 0.0) * .18);
        color += contour * (.04 + scan * .24) * mix(cyan, signal, warmZone);
        color = mix(color, mix(cyan, signal, warmZone), scan * .55 * uIntensity);
        color += scanRing * mix(cyan, signal, warmZone) * .65;
        color += rim * vec3(.18, .28, .25);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const planet = new THREE.Mesh(geometry, material);
  scene.add(planet);

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(2.27, mobile ? 28 : 44, mobile ? 18 : 30),
    new THREE.MeshBasicMaterial({ color: 0x9eb6aa, wireframe: true, transparent: true, opacity: 0.055 })
  );
  scene.add(wire);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.32, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 vN; void main(){float a=pow(1.0-abs(vN.z),3.4);gl_FragColor=vec4(.18,.72,.78,a*.38);}`,
    })
  );

  function createParticles(count, radiusMin, radiusMax, color, size) {
    const positions = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const offset = index * 3;
      positions[offset] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[offset + 1] = Math.cos(phi) * radius;
      positions[offset + 2] = Math.sin(phi) * Math.sin(theta) * radius;
      base.set(positions.subarray(offset, offset + 3), offset);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color, size, transparent: true, opacity: .72, sizeAttenuation: true }));
    points.userData.base = base;
    return points;
  }

  const orbitParticles = createParticles(mobile ? 140 : 320, 2.55, 4.8, 0x80dbe5, mobile ? .024 : .02);
  scene.add(orbitParticles);

  const starCount = mobile ? 180 : 460;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    starPositions[i * 3] = (Math.random() - .5) * 20;
    starPositions[i * 3 + 1] = (Math.random() - .5) * 12;
    starPositions[i * 3 + 2] = -2 - Math.random() * 10;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xbad1c7, size: .025, transparent: true, opacity: .45 })));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(.45, .05);
  const pointerTarget = new THREE.Vector2(.45, .05);
  const scanTarget = new THREE.Vector3(.65, .2, .72).normalize();

  function placePlanet() {
    const ratio = hero.clientWidth / hero.clientHeight;
    if (ratio < .72) {
      planet.position.set(.45, -1.65, 0);
      wire.position.copy(planet.position);
      halo.position.copy(planet.position);
      orbitParticles.position.copy(planet.position);
      planet.scale.setScalar(.82);
      wire.scale.setScalar(.82);
      halo.scale.setScalar(.82);
      orbitParticles.scale.setScalar(.82);
    } else {
      planet.position.set(1.85, .05, 0);
      wire.position.copy(planet.position);
      halo.position.copy(planet.position);
      orbitParticles.position.copy(planet.position);
      planet.scale.setScalar(1);
      wire.scale.setScalar(1);
      halo.scale.setScalar(1);
      orbitParticles.scale.setScalar(1);
    }
  }

  function resize() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const renderScale = mobile ? .68 : .60;
    renderer.setSize(Math.round(width * renderScale), Math.round(height * renderScale), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    placePlanet();
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
  const renderInterval = 1000 / (mobile ? 24 : 30);
  let lastRenderTime = -renderInterval;
  window.__planetMetrics = { startedAt: performance.now(), renderedFrames: 0 };
  function render(now = 0) {
    if (!reducedMotion) requestAnimationFrame(render);
    if (!reducedMotion && now - lastRenderTime < renderInterval) return;
    lastRenderTime = now;
    const elapsed = clock.getElapsedTime();
    pointer.lerp(pointerTarget, .065);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(planet, false)[0];
    if (hit) {
      const local = planet.worldToLocal(hit.point.clone()).normalize();
      scanTarget.lerp(local, .09);
    }
    uniforms.uScan.value.copy(scanTarget);
    uniforms.uTime.value = elapsed;

    if (!reducedMotion) {
      planet.rotation.y = elapsed * .055 + pointer.x * .12;
      planet.rotation.x = -.09 + pointer.y * .07;
      wire.rotation.copy(planet.rotation);
      halo.rotation.copy(planet.rotation);
      orbitParticles.rotation.y = -elapsed * .018;
      orbitParticles.rotation.x = elapsed * .006;

      orbitParticles.position.x = planet.position.x + pointer.x * .035;
      orbitParticles.position.y = planet.position.y + pointer.y * .025;
    }

    renderer.render(scene, camera);
    window.__planetMetrics.renderedFrames += 1;
  }
  requestAnimationFrame(render);
} else if (canvas) {
  canvas.classList.add("is-fallback");
}
