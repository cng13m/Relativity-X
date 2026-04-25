import * as THREE from "three";

function createCanvas(width = 768, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeColorTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeDataTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
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

function rgbString({ r, g, b }, alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

function blend(a, b, t) {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  return {
    r: colorA.r + (colorB.r - colorA.r) * t,
    g: colorA.g + (colorB.g - colorA.g) * t,
    b: colorA.b + (colorB.b - colorA.b) * t,
  };
}

function fillGradient(ctx, width, height, stops) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function addHorizontalTurbulence(ctx, width, height, palette, options = {}) {
  const { bands = 320, lineStep = 3, amplitude = 8, opacity = 0.35 } = options;
  for (let band = 0; band < bands; band += 1) {
    const y = (band / bands) * height;
    const color = palette[band % palette.length];
    ctx.beginPath();
    ctx.moveTo(0, y);
    const freq = 0.004 + Math.random() * 0.02;
    const phase = Math.random() * Math.PI * 2;
    const amp = amplitude * (0.5 + Math.random() * 1.4);
    for (let x = 0; x <= width; x += lineStep) {
      const offset = Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 0.37 + phase * 0.7) * amp * 0.45;
      ctx.lineTo(x, y + offset);
    }
    ctx.strokeStyle = rgbString(blend(color, "#ffffff", Math.random() * 0.18), opacity * (0.65 + Math.random() * 0.6));
    ctx.lineWidth = 1.5 + Math.random() * 8;
    ctx.stroke();
  }
}

function addSpeckleField(ctx, width, height, palette, count, radiusRange = [1, 4], opacity = 0.3) {
  for (let i = 0; i < count; i += 1) {
    const radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, radius, 0, Math.PI * 2);
    const color = palette[Math.floor(Math.random() * palette.length)];
    ctx.fillStyle = rgbString(blend(color, "#ffffff", Math.random() * 0.12), opacity * (0.35 + Math.random() * 0.95));
    ctx.fill();
  }
}

function addCraters(ctx, width, height, count, options = {}) {
  const { dark = "rgba(28,28,28,0.3)", light = "rgba(255,255,255,0.12)", min = 6, max = 26 } = options;
  for (let i = 0; i < count; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = min + Math.random() * (max - min);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - radius * 0.16, y - radius * 0.16, radius * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = light;
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.stroke();
  }
}

function grayscaleCopy(sourceCanvas, contrast = 1) {
  const canvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 - 128) * contrast + 128;
    const clamped = Math.max(0, Math.min(255, luminance));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function makeEarthSet() {
  const colorCanvas = createCanvas();
  const bumpCanvas = createCanvas();
  const roughCanvas = createCanvas();
  const cloudCanvas = createCanvas();
  const emissiveCanvas = createCanvas();

  const colorCtx = colorCanvas.getContext("2d");
  const bumpCtx = bumpCanvas.getContext("2d");
  const roughCtx = roughCanvas.getContext("2d");
  const cloudCtx = cloudCanvas.getContext("2d");
  const emissiveCtx = emissiveCanvas.getContext("2d");
  const { width, height } = colorCanvas;

  fillGradient(colorCtx, width, height, [[0, "#143a87"], [0.5, "#2d7bc8"], [1, "#0b235b"]]);
  addSpeckleField(colorCtx, width, height, ["#0d3270", "#1e5caa", "#4eb8d6"], 9000, [0.8, 4], 0.18);

  const continents = [
    { x: 0.18, y: 0.28, rx: 0.16, ry: 0.11, rot: -0.2, color: "#526e2b" },
    { x: 0.26, y: 0.56, rx: 0.13, ry: 0.16, rot: 0.12, color: "#748644" },
    { x: 0.53, y: 0.32, rx: 0.18, ry: 0.11, rot: 0.28, color: "#4a6725" },
    { x: 0.62, y: 0.58, rx: 0.14, ry: 0.2, rot: -0.08, color: "#7b8a47" },
    { x: 0.84, y: 0.44, rx: 0.09, ry: 0.07, rot: -0.22, color: "#8b7b43" },
  ];

  continents.forEach((landmass) => {
    colorCtx.save();
    colorCtx.translate(landmass.x * width, landmass.y * height);
    colorCtx.rotate(landmass.rot);
    colorCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
      const noise = 0.72 + Math.sin(a * 3 + landmass.rot * 4) * 0.1 + Math.cos(a * 5) * 0.08 + Math.random() * 0.08;
      const px = Math.cos(a) * landmass.rx * width * noise;
      const py = Math.sin(a) * landmass.ry * height * noise;
      if (a === 0) {
        colorCtx.moveTo(px, py);
      } else {
        colorCtx.lineTo(px, py);
      }
    }
    colorCtx.closePath();
    colorCtx.fillStyle = landmass.color;
    colorCtx.fill();
    colorCtx.restore();
  });

  colorCtx.fillStyle = "rgba(232,240,255,0.65)";
  colorCtx.fillRect(0, 0, width, height * 0.06);
  colorCtx.fillRect(0, height * 0.94, width, height * 0.06);

  bumpCtx.fillStyle = "#4d4d4d";
  bumpCtx.fillRect(0, 0, width, height);
  continents.forEach((landmass) => {
    bumpCtx.save();
    bumpCtx.translate(landmass.x * width, landmass.y * height);
    bumpCtx.rotate(landmass.rot);
    bumpCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
      const noise = 0.76 + Math.sin(a * 4) * 0.08 + Math.cos(a * 7) * 0.05;
      const px = Math.cos(a) * landmass.rx * width * noise;
      const py = Math.sin(a) * landmass.ry * height * noise;
      if (a === 0) bumpCtx.moveTo(px, py);
      else bumpCtx.lineTo(px, py);
    }
    bumpCtx.closePath();
    bumpCtx.fillStyle = "#b2b2b2";
    bumpCtx.fill();
    bumpCtx.restore();
  });

  roughCtx.fillStyle = "#171717";
  roughCtx.fillRect(0, 0, width, height);
  continents.forEach((landmass) => {
    roughCtx.save();
    roughCtx.translate(landmass.x * width, landmass.y * height);
    roughCtx.rotate(landmass.rot);
    roughCtx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.08; a += 0.08) {
      const noise = 0.78 + Math.sin(a * 4) * 0.06 + Math.cos(a * 5) * 0.05;
      const px = Math.cos(a) * landmass.rx * width * noise;
      const py = Math.sin(a) * landmass.ry * height * noise;
      if (a === 0) roughCtx.moveTo(px, py);
      else roughCtx.lineTo(px, py);
    }
    roughCtx.closePath();
    roughCtx.fillStyle = "#adadad";
    roughCtx.fill();
    roughCtx.restore();
  });

  cloudCtx.clearRect(0, 0, width, height);
  for (let i = 0; i < 220; i += 1) {
    cloudCtx.beginPath();
    cloudCtx.ellipse(
      Math.random() * width,
      Math.random() * height,
      18 + Math.random() * 110,
      8 + Math.random() * 30,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    cloudCtx.fillStyle = `rgba(255,255,255,${0.22 + Math.random() * 0.58})`;
    cloudCtx.fill();
  }

  emissiveCtx.fillStyle = "#000000";
  emissiveCtx.fillRect(0, 0, width, height);
  for (let i = 0; i < 950; i += 1) {
    emissiveCtx.beginPath();
    emissiveCtx.arc(Math.random() * width, Math.random() * height, 0.6 + Math.random() * 2.4, 0, Math.PI * 2);
    emissiveCtx.fillStyle = Math.random() > 0.55 ? "rgba(255,180,80,0.72)" : "rgba(255,220,120,0.62)";
    emissiveCtx.fill();
  }

  return {
    map: makeColorTexture(colorCanvas),
    bumpMap: makeDataTexture(bumpCanvas),
    roughnessMap: makeDataTexture(roughCanvas),
    cloudMap: makeColorTexture(cloudCanvas),
    emissiveMap: makeColorTexture(emissiveCanvas),
  };
}

function makeRockySet(palette, craterCount, options = {}) {
  const colorCanvas = createCanvas();
  const ctx = colorCanvas.getContext("2d");
  const { width, height } = colorCanvas;
  fillGradient(ctx, width, height, [[0, palette[0]], [0.55, palette[1]], [1, palette[2]]]);
  addSpeckleField(ctx, width, height, palette, 6000, [0.8, 4.5], 0.28);
  addCraters(ctx, width, height, craterCount, options.craters);
  if (options.streaks) {
    addHorizontalTurbulence(ctx, width, height, options.streaks, { bands: 100, lineStep: 6, amplitude: 4, opacity: 0.08 });
  }
  return {
    map: makeColorTexture(colorCanvas),
    bumpMap: makeDataTexture(grayscaleCopy(colorCanvas, 1.45)),
    roughnessMap: makeDataTexture(grayscaleCopy(colorCanvas, 0.9)),
  };
}

function makeGasGiantSet(colors, options = {}) {
  const colorCanvas = createCanvas();
  const ctx = colorCanvas.getContext("2d");
  const { width, height } = colorCanvas;
  fillGradient(ctx, width, height, [[0, colors[0]], [0.35, colors[1]], [0.68, colors[2]], [1, colors[3] ?? colors[2]]]);
  addHorizontalTurbulence(ctx, width, height, colors, {
    bands: options.bands ?? 360,
    lineStep: 3,
    amplitude: options.amplitude ?? 10,
    opacity: options.opacity ?? 0.28,
  });
  addSpeckleField(ctx, width, height, colors, 3000, [0.8, 4], 0.08);
  if (options.spot) {
    ctx.fillStyle = options.spot.color;
    ctx.beginPath();
    ctx.ellipse(width * options.spot.x, height * options.spot.y, options.spot.rx, options.spot.ry, options.spot.rot, 0, Math.PI * 2);
    ctx.fill();
  }
  return {
    map: makeColorTexture(colorCanvas),
    bumpMap: makeDataTexture(grayscaleCopy(colorCanvas, 0.7)),
    roughnessMap: makeDataTexture(grayscaleCopy(colorCanvas, 0.55)),
  };
}

function makeSunSet() {
  const colorCanvas = createCanvas();
  const ctx = colorCanvas.getContext("2d");
  const { width, height } = colorCanvas;
  fillGradient(ctx, width, height, [[0, "#fff5a1"], [0.35, "#ffaf2c"], [0.8, "#d25500"], [1, "#5d1200"]]);
  addHorizontalTurbulence(ctx, width, height, ["#fff6c5", "#ffce55", "#ff7e0f", "#ff4b00"], { bands: 280, amplitude: 18, opacity: 0.24 });
  addSpeckleField(ctx, width, height, ["#fff8bf", "#ffc750", "#ff8b1e"], 2600, [1, 8], 0.18);
  return {
    map: makeColorTexture(colorCanvas),
  };
}

function makeRingSet(innerColor, outerColor, dustyColor) {
  const colorCanvas = createCanvas(2048, 32);
  const alphaCanvas = createCanvas(2048, 32);
  const colorCtx = colorCanvas.getContext("2d");
  const alphaCtx = alphaCanvas.getContext("2d");
  const { width, height } = colorCanvas;
  for (let x = 0; x < width; x += 1) {
    const t = x / width;
    const base = rgbString(blend(innerColor, outerColor, t));
    colorCtx.fillStyle = base;
    colorCtx.fillRect(x, 0, 1, height);
    const density = 110 + Math.sin(t * 42) * 50 + Math.cos(t * 15) * 34 + Math.random() * 55;
    alphaCtx.fillStyle = `rgb(${density},${density},${density})`;
    alphaCtx.fillRect(x, 0, 1, height);
    if (Math.random() > 0.94) {
      colorCtx.fillStyle = dustyColor;
      colorCtx.globalAlpha = 0.2;
      colorCtx.fillRect(x, 0, 1, height);
      colorCtx.globalAlpha = 1;
    }
  }
  return {
    map: makeColorTexture(colorCanvas),
    alphaMap: makeDataTexture(alphaCanvas),
  };
}

function makeMetalSet() {
  const colorCanvas = createCanvas();
  const ctx = colorCanvas.getContext("2d");
  const { width, height } = colorCanvas;
  fillGradient(ctx, width, height, [[0, "#3f4d5d"], [0.5, "#c4cdd6"], [1, "#44515f"]]);
  addHorizontalTurbulence(ctx, width, height, ["#7b8797", "#d6dfe6", "#556473"], { bands: 220, amplitude: 1.5, opacity: 0.14 });
  addSpeckleField(ctx, width, height, ["#dce3ea", "#748599", "#394656"], 1800, [0.8, 2.2], 0.16);
  return {
    map: makeColorTexture(colorCanvas),
    bumpMap: makeDataTexture(grayscaleCopy(colorCanvas, 1.3)),
    roughnessMap: makeDataTexture(grayscaleCopy(colorCanvas, 0.85)),
  };
}

let cachedTextures = null;

export function createBodyTextures() {
  if (cachedTextures) {
    return cachedTextures;
  }

  cachedTextures = {
    planets: {
      sun: makeSunSet(),
      mercury: makeRockySet(["#9b9487", "#6f685e", "#433d37"], 240, { craters: { min: 5, max: 24 } }),
      venus: makeGasGiantSet(["#f0deb0", "#d7b06e", "#9d6033", "#5a2d18"], { bands: 300, amplitude: 12, opacity: 0.18 }),
      earth: makeEarthSet(),
      moon: makeRockySet(["#d8d4cb", "#a8a39a", "#66625d"], 180, { craters: { dark: "rgba(46,46,46,0.26)", light: "rgba(255,255,255,0.14)", min: 4, max: 20 } }),
      mars: makeRockySet(["#da7a46", "#9d4523", "#561f13"], 120, { streaks: ["#f0b086", "#8c3417"] }),
      jupiter: makeGasGiantSet(["#f4e6cb", "#d4b08a", "#b8835c", "#83563e"], { bands: 420, amplitude: 11, opacity: 0.26, spot: { x: 0.74, y: 0.58, rx: 116, ry: 56, rot: -0.1, color: "rgba(185,93,63,0.85)" } }),
      saturn: makeGasGiantSet(["#f2e6c5", "#d8be94", "#b99467", "#816346"], { bands: 360, amplitude: 8, opacity: 0.18 }),
      uranus: makeGasGiantSet(["#e7fdff", "#b7e7f0", "#7cb0c0", "#658b98"], { bands: 220, amplitude: 4, opacity: 0.09 }),
      neptune: makeGasGiantSet(["#97b8ff", "#4677ee", "#2040b6", "#10246d"], { bands: 260, amplitude: 7, opacity: 0.16 }),
    },
    saturnRing: makeRingSet("#f7e6ba", "#876647", "#fff8de"),
    uranusRing: makeRingSet("#dceff5", "#69828a", "#ffffff"),
    ship: makeMetalSet(),
    asteroid: makeRockySet(["#8b857d", "#5a554f", "#3c3835"], 70),
    kuiper: makeRockySet(["#656676", "#4b4c5b", "#2f3040"], 54),
  };

  return cachedTextures;
}
