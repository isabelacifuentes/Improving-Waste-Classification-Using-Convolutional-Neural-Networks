const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const canvas = document.querySelector("#previewCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const emptyState = document.querySelector("#emptyState");
const resultPanel = document.querySelector(".result-panel");
const predictionText = document.querySelector("#predictionText");
const predictionDetail = document.querySelector("#predictionDetail");
const confidenceValue = document.querySelector("#confidenceValue");
const confidenceBar = document.querySelector("#confidenceBar");
const materialValue = document.querySelector("#materialValue");

const recyclableMaterials = new Set(["plastic", "paper", "cardboard", "metal", "glass"]);

const samplePalettes = {
  plastic: ["#e9f4ff", "#6da8d8", "#f8ffff", "#b8d8ed"],
  paper: ["#f2eee0", "#d5c89f", "#fffaf0", "#b8aa82"],
  metal: ["#d8dee2", "#8c999f", "#f5f8f8", "#59656a"],
  food: ["#8a5a2d", "#5f7d39", "#d19b4c", "#422b1d"],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateResult(result) {
  resultPanel.classList.toggle("is-recyclable", result.recyclable);
  resultPanel.classList.toggle("is-trash", !result.recyclable);
  predictionText.textContent = result.recyclable ? "Recyclable" : "Non-recyclable";
  predictionDetail.textContent = result.reason;
  confidenceValue.textContent = `${Math.round(result.confidence * 100)}%`;
  confidenceBar.style.width = `${Math.round(result.confidence * 100)}%`;
  materialValue.textContent = result.materialLabel;
}

function drawImageToCanvas(image) {
  const ratio = Math.min(canvas.width / image.width, canvas.height / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, x, y, width, height);
  emptyState.classList.add("is-hidden");
}

function analyzeCanvas() {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  let sampled = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let brightness = 0;
  let saturation = 0;
  let edgeEnergy = 0;
  let brightPixels = 0;
  let brownGreenPixels = 0;
  let grayPixels = 0;
  let bluePlasticPixels = 0;
  let paperPixels = 0;

  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      const index = (y * canvas.width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sat = max === 0 ? 0 : (max - min) / max;

      red += r;
      green += g;
      blue += b;
      brightness += lum;
      saturation += sat;
      sampled += 1;

      if (lum > 202 && sat < 0.22) brightPixels += 1;
      if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && lum > 70 && lum < 215) grayPixels += 1;
      if (b > r * 1.05 && b > g * 1.02 && lum > 95) bluePlasticPixels += 1;
      if (r > 120 && g > 96 && b < 105 && sat > 0.18) brownGreenPixels += 1;
      if (r > 175 && g > 158 && b > 120 && r > b * 1.08 && sat < 0.35) paperPixels += 1;

      if (x + 4 < canvas.width && y + 4 < canvas.height) {
        const right = ((y * canvas.width + x + 4) * 4);
        const down = (((y + 4) * canvas.width + x) * 4);
        edgeEnergy +=
          Math.abs(r - pixels[right]) +
          Math.abs(g - pixels[right + 1]) +
          Math.abs(b - pixels[right + 2]) +
          Math.abs(r - pixels[down]) +
          Math.abs(g - pixels[down + 1]) +
          Math.abs(b - pixels[down + 2]);
      }
    }
  }

  const avg = {
    r: red / sampled,
    g: green / sampled,
    b: blue / sampled,
    brightness: brightness / sampled,
    saturation: saturation / sampled,
    edges: edgeEnergy / sampled / 255,
    brightShare: brightPixels / sampled,
    brownGreenShare: brownGreenPixels / sampled,
    grayShare: grayPixels / sampled,
    blueShare: bluePlasticPixels / sampled,
    paperShare: paperPixels / sampled,
  };

  return classifyFeatures(avg);
}

function classifyFeatures(features) {
  const scores = {
    plastic:
      features.blueShare * 2.4 +
      features.brightShare * 1.4 +
      features.saturation * 0.7 +
      (features.b > features.r ? 0.35 : 0),
    paper:
      features.paperShare * 2.1 +
      features.brightShare * 0.8 +
      (features.brightness > 170 && features.saturation < 0.28 ? 0.55 : 0),
    cardboard:
      features.paperShare * 1.4 +
      (features.r > features.b * 1.18 && features.brightness > 120 ? 0.65 : 0),
    metal:
      features.grayShare * 2.2 +
      (features.saturation < 0.18 && features.edges > 0.4 ? 0.65 : 0),
    glass:
      features.brightShare * 1.1 +
      features.grayShare * 0.7 +
      (features.saturation < 0.2 && features.brightness > 155 ? 0.45 : 0),
    organic:
      features.brownGreenShare * 2.5 +
      (features.g > features.b * 1.25 && features.r > features.b * 1.1 ? 0.55 : 0),
    trash:
      features.edges * 0.85 +
      features.saturation * 0.6 +
      (features.brightness < 95 ? 0.55 : 0),
  };

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [material, topScore] = ranked[0];
  const secondScore = ranked[1][1];
  const recyclable = recyclableMaterials.has(material);
  const confidence = clamp(0.58 + (topScore - secondScore) * 0.18, 0.55, 0.94);
  const label = material === "organic" ? "food or organic waste" : material;
  const reason = recyclable
    ? `The image shows visual patterns most similar to ${label}, which is usually accepted in recycling streams when clean.`
    : `The image looks most similar to ${label}, so the safer classification is non-recyclable for this prototype.`;

  return {
    recyclable,
    confidence,
    materialLabel: label.replace(/^\w/, (letter) => letter.toUpperCase()),
    reason,
  };
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      drawImageToCanvas(image);
      updateResult(analyzeCanvas());
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawSample(type) {
  const colors = samplePalettes[type];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 30; i += 1) {
    const x = 80 + Math.random() * 460;
    const y = 60 + Math.random() * 340;
    const size = 36 + Math.random() * 80;
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = "rgba(23, 33, 27, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (type === "metal") {
      ctx.rect(x, y, size * 1.2, size * 0.65);
    } else if (type === "paper") {
      ctx.roundRect(x, y, size * 1.15, size * 0.85, 4);
    } else {
      ctx.ellipse(x, y, size * 0.62, size * 0.42, Math.random() * Math.PI, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
  }

  emptyState.classList.add("is-hidden");
  updateResult(analyzeCanvas());
}

imageInput.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-over");
  loadFile(event.dataTransfer.files[0]);
});

document.querySelectorAll(".sample-chip").forEach((button) => {
  button.addEventListener("click", () => drawSample(button.dataset.sample));
});
