document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const progress = document.querySelector(".page-progress span");
const hero = document.querySelector(".hero");

function updatePageProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener("scroll", updatePageProgress, { passive: true });
updatePageProgress();

if (hero) {
  new IntersectionObserver(([entry]) => header.classList.toggle("is-fixed", !entry.isIntersecting), { threshold: .05 }).observe(hero);
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .1 });
document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

const scanValue = document.querySelector("#scan-value");
if (hero && scanValue) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const value = 44 + x * 23.3;
    scanValue.textContent = `${value.toFixed(1)}%`;
  }, { passive: true });
}

function animateCanvas(canvas, colors) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let points = [];
  let pointer = { x: .5, y: .5 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = Array.from({ length: width < 700 ? 32 : 70 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      phase: Math.random() * Math.PI * 2,
      speed: .00015 + Math.random() * .00025,
    }));
  }

  canvas.parentElement.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  resize();

  function draw(time = 0) {
    context.clearRect(0, 0, width, height);
    points.forEach((point, index) => {
      const x = point.x + Math.sin(time * point.speed + point.phase) * 22;
      const y = point.y + Math.cos(time * point.speed + point.phase) * 18;
      const distanceToPointer = Math.hypot(x - pointer.x, y - pointer.y);
      for (let otherIndex = index + 1; otherIndex < points.length; otherIndex += 1) {
        const other = points[otherIndex];
        const distance = Math.hypot(x - other.x, y - other.y);
        if (distance < 130) {
          context.strokeStyle = colors.line.replace("ALPHA", String((1 - distance / 130) * .18));
          context.lineWidth = .7;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
      context.fillStyle = distanceToPointer < 150 ? colors.active : colors.point;
      context.beginPath();
      context.arc(x, y, distanceToPointer < 150 ? 2.2 : 1.1, 0, Math.PI * 2);
      context.fill();
    });
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
}

animateCanvas(document.querySelector("#project-signal-canvas"), {
  line: "rgba(103,215,232,ALPHA)", point: "rgba(241,243,237,.2)", active: "rgba(240,100,73,.9)",
});
animateCanvas(document.querySelector("#contact-particles"), {
  line: "rgba(18,14,12,ALPHA)", point: "rgba(18,14,12,.24)", active: "rgba(18,14,12,.86)",
});

const dialog = document.querySelector("#certificate-dialog");
const dialogImage = dialog?.querySelector("img");
const dialogTitle = dialog?.querySelector("p");
document.querySelectorAll(".certificate-item").forEach((item) => {
  item.addEventListener("click", () => {
    dialogImage.src = item.dataset.cert;
    dialogImage.alt = `${item.dataset.title}脱敏预览`;
    dialogTitle.textContent = item.dataset.title;
    dialog.showModal();
    document.body.classList.add("dialog-open");
  });
});
dialog?.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));
