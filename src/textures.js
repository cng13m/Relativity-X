import * as THREE from "three";

function createCanvas(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function applyTextureSettings(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function hexToRgb(hex) {
  const safe = hex.replace("#", "");
  const value = Number.parseInt(safe, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function lerpColor(a, b, t) {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  return `rgb(${Math.round(colorA.r + (colorB.r - colorA.r) * t)}, ${Math.round(colorA.g + (colorB.g - colorA.g) * t)}, ${Math.round(colorA.b + (colorB.b - colorA.b) * t)})`;
}

function fillLinearGradient(ctx, width, height, stops) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawNoiseBands(ctx, width, height, options) {
  const { rows = 180, columns = 48, palette = ["#777"], jitter = 18, alpha = 0.45 } = options;
  const rowHeight = height / rows;
  for (let row = 0; row < rows; row += 1) {
    const y = row * rowHeight;
    const base = palette[row % palette.length];
    for (let col = 0; col < columns; col += 1) {
      const x = (col / columns) * width;
      const w = width / columns + 2;
      const h = rowHeight + Math.random() * jitter;
      ctx.fillStyle = lerpColor(base, palette[(row + 1) % palette.length], Math.random());
      ctx.globalAlpha = alpha + Math.random() * 0.12;
      ctx.fillRect(x, y - Math.random() * 6, w, h);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSpeckles(ctx, width, height, count, palette, sizeRange = [1, 6], alpha = 0.35) {
  for (let i = 0; i < count; i += 1) {
    const radius = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, radius, 0, Math.PI * 2);
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSwirls(ctx, width, height, count, palette, lineWidth = 18, alpha = 0.25) {
  for (let i = 0; i < count; i += 1) {
    const y = Math.random() * height;
    const amp = 8 + Math.random() * 32;
    const freq = 0.004 + Math.random() * 0.012;
    const phase = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 8) {
      ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp);
    }
    ctx.strokeStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.7);
    ctx.lineWidth = lineWidth * (0.55 + Math.random() * 0.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawCraters(ctx, width, height, count, dark = "rgba(40,40,40,0.35)", light = "rgba(255,255,255,0.12)") {
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 6 + Math.random() * 30;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - radius * 0.18, y - radius * 0.18, radius * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function createPlanetTexture(bodyId) {
  const canvas = createCanvas(1024);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  switch (bodyId) {
    case "sun":
      fillLinearGradient(ctx, width, height, [[0, "#ffdb66"], [0.38, "#ff9d00"], [1, "#6e1800"]]);
      drawSwirls(ctx, width, height, 120, ["#fff8b5", "#ffcb48", "#ff7b00"], 26, 0.28);
      drawSpeckles(ctx, width, height, 1600, ["#fff2b0", "#ffc04c", "#ff6b1a"], [2, 10], 0.35);
      break;
    case "mercury":
      fillLinearGradient(ctx, width, height, [[0, "#8d857b"], [0.45, "#70685f"], [1, "#504843"]]);
      drawSpeckles(ctx, width, height, 4500, ["#a79f95", "#5a524a", "#8f877d"], [1, 5], 0.48);
      drawCraters(ctx, width, height, 220);
      break;
    case "venus":
      fillLinearGradient(ctx, width, height, [[0, "#f3d07a"], [0.45, "#c28b47"], [1, "#5d3118"]]);
      drawSwirls(ctx, width, height, 150, ["#fff0be", "#efc16a", "#9d5c2c"], 34, 0.24);
      drawNoiseBands(ctx, width, height, { rows: 160, columns: 36, palette: ["#f4d891", "#dca85d", "#8d5731"], alpha: 0.22, jitter: 12 });
      break;
    case "earth":
      fillLinearGradient(ctx, width, height, [[0, "#2456c4"], [0.5, "#2f8ccf"], [1, "#103371"]]);
      drawSpeckles(ctx, width, height, 5000, ["#2f6bd1", "#1f4f9c", "#48a7cf"], [1, 6], 0.24);
      for (let i = 0; i < 32; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.beginPath();
        ctx.ellipse(x, y, 60 + Math.random() * 120, 20 + Math.random() * 70, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fillStyle = ["#356c2d", "#648c3a", "#7d5b2b"][Math.floor(Math.random() * 3)];
        ctx.globalAlpha = 0.85;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    case "moon":
      fillLinearGradient(ctx, width, height, [[0, "#d3d1ca"], [0.5, "#aaa79f"], [1, "#69665f"]]);
      drawSpeckles(ctx, width, height, 3000, ["#eceae3", "#8c8981", "#b6b2aa"], [1, 5], 0.4);
      drawCraters(ctx, width, height, 180, "rgba(60,60,60,0.28)", "rgba(255,255,255,0.16)");
      break;
    case "mars":
      fillLinearGradient(ctx, width, height, [[0, "#d26a39"], [0.45, "#a2411f"], [1, "#552012"]]);
      drawSpeckles(ctx, width, height, 4200, ["#e39a72", "#8d3017", "#ba5c2c"], [1, 6], 0.42);
      drawSwirls(ctx, width, height, 60, ["#f0b38f", "#7b2511"], 14, 0.16);
      break;
    case "jupiter":
      fillLinearGradient(ctx, width, height, [[0, "#ead8ba"], [0.5, "#b88c60"], [1, "#7b5738"]]);
      drawNoiseBands(ctx, width, height, { rows: 220, columns: 30, palette: ["#f3e7cb", "#d0a97e", "#b57d52", "#8c5b3b"], alpha: 0.34, jitter: 10 });
      drawSwirls(ctx, width, height, 120, ["#f7efe0", "#c78755", "#8d5b3f"], 22, 0.2);
      ctx.fillStyle = "rgba(183, 82, 54, 0.75)";
      ctx.beginPath();
      ctx.ellipse(width * 0.72, height * 0.58, 110, 58, -0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "saturn":
      fillLinearGradient(ctx, width, height, [[0, "#efe1b8"], [0.52, "#d1b07c"], [1, "#8e7046"]]);
      drawNoiseBands(ctx, width, height, { rows: 220, columns: 28, palette: ["#f7edd2", "#ddc190", "#bf9a68", "#8f6f4d"], alpha: 0.28, jitter: 8 });
      drawSwirls(ctx, width, height, 90, ["#ffefd0", "#c9a26f", "#8c6a49"], 16, 0.16);
      break;
    case "uranus":
      fillLinearGradient(ctx, width, height, [[0, "#dff9fd"], [0.45, "#a7d9e4"], [1, "#6792a1"]]);
      drawNoiseBands(ctx, width, height, { rows: 180, columns: 20, palette: ["#dffbff", "#bceaf0", "#86c2d0"], alpha: 0.15, jitter: 6 });
      break;
    case "neptune":
      fillLinearGradient(ctx, width, height, [[0, "#7aa0ff"], [0.5, "#2f57d6"], [1, "#0d1f6a"]]);
      drawNoiseBands(ctx, width, height, { rows: 220, columns: 22, palette: ["#89b2ff", "#3f6ae9", "#1730a2"], alpha: 0.22, jitter: 8 });
      drawSwirls(ctx, width, height, 70, ["#9ac0ff", "#2444d0"], 18, 0.12);
      break;
    default:
      fillLinearGradient(ctx, width, height, [[0, "#888"], [1, "#444"]]);
      break;
  }

  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

function createEarthCloudTexture() {
  const canvas = createCanvas(1024);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < 180; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + Math.random() * 90, 8 + Math.random() * 26, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
  }
  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

function createRingTexture(innerColor, outerColor, dustyColor = "#ffffff") {
  const canvas = createCanvas(2048);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const bandColor = lerpColor(innerColor, outerColor, t);
    ctx.fillStyle = bandColor;
    ctx.globalAlpha = 0.2 + Math.sin(t * 32) * 0.06 + Math.random() * 0.14;
    ctx.fillRect(x, 0, 1, height);
    if (Math.random() > 0.92) {
      ctx.fillStyle = dustyColor;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x, 0, 1, height);
    }
  }
  ctx.globalAlpha = 1;
  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

function createMetalTexture() {
  const canvas = createCanvas(1024);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  fillLinearGradient(ctx, width, height, [[0, "#516274"], [0.5, "#c1ccd8"], [1, "#425160"]]);
  drawNoiseBands(ctx, width, height, { rows: 220, columns: 12, palette: ["#a9b7c7", "#76879a", "#cdd6df", "#5e6d7d"], alpha: 0.18, jitter: 2 });
  drawSpeckles(ctx, width, height, 1800, ["#dce3ea", "#728297", "#3d4a58"], [1, 3], 0.18);
  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

function createAsteroidTexture(basePalette) {
  const canvas = createCanvas(512);
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  fillLinearGradient(ctx, width, height, [[0, basePalette[0]], [0.45, basePalette[1]], [1, basePalette[2]]]);
  drawSpeckles(ctx, width, height, 2200, basePalette, [1, 5], 0.38);
  drawCraters(ctx, width, height, 60, "rgba(20,20,20,0.3)", "rgba(255,255,255,0.08)");
  return applyTextureSettings(new THREE.CanvasTexture(canvas));
}

let cachedTextures = null;

export function createBodyTextures() {
  if (cachedTextures) {
    return cachedTextures;
  }

  cachedTextures = {
    planets: {
      sun: createPlanetTexture("sun"),
      mercury: createPlanetTexture("mercury"),
      venus: createPlanetTexture("venus"),
      earth: createPlanetTexture("earth"),
      moon: createPlanetTexture("moon"),
      mars: createPlanetTexture("mars"),
      jupiter: createPlanetTexture("jupiter"),
      saturn: createPlanetTexture("saturn"),
      uranus: createPlanetTexture("uranus"),
      neptune: createPlanetTexture("neptune"),
    },
    earthClouds: createEarthCloudTexture(),
    saturnRing: createRingTexture("#f5e4bc", "#8d6b45", "#fff5d5"),
    uranusRing: createRingTexture("#d6edf4", "#7c9ba3", "#ffffff"),
    shipMetal: createMetalTexture(),
    asteroid: createAsteroidTexture(["#8a847c", "#5d5852", "#3f3b37"]),
    kuiper: createAsteroidTexture(["#626273", "#48495a", "#2f3040"]),
  };

  return cachedTextures;
}
