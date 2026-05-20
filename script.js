const emptyCsvInput = document.querySelector("#emptyCsvInput");
const emptyState = document.querySelector("#emptyState");
const statusText = document.querySelector("#status");
const chartCanvas = document.querySelector("#audienceChart");
const metricStrip = document.querySelector("#metricStrip");
const reportDate = document.querySelector("#reportDate");
const reportRange = document.querySelector("#reportRange");
const marketBadge = document.querySelector("#marketBadge");
const intervalList = document.querySelector("#intervalList");
const addIntervalButton = document.querySelector("#addIntervalButton");
const downloadImageButton = document.querySelector("#downloadImageButton");
const downloadWarning = document.querySelector("#downloadWarning");
const historicalAudience = document.querySelector("#historicalAudience");
const historicalShare = document.querySelector("#historicalShare");
const presenterName = document.querySelector("#presenterName");

let rows = [];
let headers = [];
let metadata = {};
let summary = {};
let currentFileText = "";

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 1,
});

const seriesConfig = [
  {
    key: "GLOBO",
    label: "GLOBO",
    mark: "globo",
    color: "#0b36b8",
    imageKey: "GLOBO",
  },
  {
    key: "CONTEUDO TV",
    label: "CONTEÚDO TV",
    mark: "NIC",
    color: "#8a3d0f",
  },
  {
    key: "RECORD",
    label: "RECORD",
    mark: "rec",
    color: "#e95145",
    imageKey: "RECORD",
  },
  {
    key: "SBT",
    label: "SBT",
    mark: "sbt",
    color: "#57bf3a",
    imageKey: "SBT",
  },
  {
    key: "TV BAND",
    label: "TV BAND",
    mark: "band",
    color: "#d93bd0",
    imageKey: "BAND",
  },
  {
    key: "TV BRASILIA",
    label: "TV BRASILIA",
    mark: "!",
    color: "#f07a2a",
    imageKey: "REDETV",
  },
  {
    key: "TOTAL LIGADOS",
    label: "TOTAL LIGADOS",
    mark: "TLE",
    color: "#a8a8a8",
  },
];

const normalize = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const options = [",", ";", "\t"];
  return options
    .map((delimiter) => ({
      delimiter,
      count: sample.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function normalizeDelimiter(delimiter) {
  return delimiter === "\\t" ? "\t" : delimiter;
}

function parseCsvLine(line, delimiter) {
  const result = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      result.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  result.push(value.trim());
  return result;
}

function parseCsv(text, forcedDelimiter) {
  const delimiter =
    forcedDelimiter === "auto" || !forcedDelimiter
      ? detectDelimiter(text)
      : normalizeDelimiter(forcedDelimiter);
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("O CSV precisa ter cabeçalho e pelo menos uma linha de dados.");
  }

  const parsedLines = lines.map((line) => parseCsvLine(line, delimiter));
  const headerIndex = findHeaderIndex(parsedLines);

  if (headerIndex < 0) {
    throw new Error("Não encontrei uma linha de cabeçalho válida no CSV.");
  }

  const parsedHeaders = parsedLines[headerIndex];
  const parsedRows = parsedLines.slice(headerIndex + 1).map((values) =>
    parsedHeaders.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {}),
  );

  return {
    parsedHeaders,
    parsedRows,
    parsedMetadata: parseMetadata(parsedLines.slice(0, headerIndex)),
    parsedSummary: parseSummary(parsedLines.slice(0, headerIndex), parsedHeaders),
  };
}

function parseMetadata(lines) {
  const meta = {};

  lines.forEach((line) => {
    if (line.length === 2) {
      meta[normalize(line[0])] = line[1];
    } else if (line.length === 1 && /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(line[0])) {
      meta.intervalo = line[0];
    }
  });

  return meta;
}

function parseSummary(lines, parsedHeaders) {
  const summaryData = {};
  const ratingLineIndex = lines.findIndex((line) =>
    normalize(line[0]).includes("rat"),
  );

  if (ratingLineIndex < 0) return summaryData;

  const ratingLine = lines[ratingLineIndex];
  const shareLine = lines[ratingLineIndex + 1] ?? [];

  parsedHeaders.forEach((header, index) => {
    summaryData[header] = {
      average: parseNumber(ratingLine[index]),
      share: parsePercent(shareLine[index]),
    };
  });

  return summaryData;
}

function findHeaderIndex(parsedLines) {
  const explicitHeaderIndex = parsedLines.findIndex((line) => {
    const normalized = line.map(normalize);
    return normalized.includes("min") && normalized.length > 2;
  });

  if (explicitHeaderIndex >= 0) return explicitHeaderIndex;

  return parsedLines.findIndex((line, index) => {
    if (index === parsedLines.length - 1 || line.length < 2) return false;

    const nextLine = parsedLines[index + 1] ?? [];
    const numericCells = nextLine.filter((cell) => Number.isFinite(parseNumber(cell)));
    return numericCells.length >= Math.max(1, Math.floor(line.length / 2));
  });
}

function parseNumber(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return NaN;

  const cleaned = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  return Number(cleaned);
}

function parseSeriesNumber(value) {
  const text = String(value ?? "").trim();
  if (text === "-") return 0;
  return parseNumber(value);
}

function parsePercent(value) {
  const number = parseNumber(value);
  return Number.isFinite(number) ? number : NaN;
}

function getLabelColumn() {
  return headers.find((header) => normalize(header) === "min") ?? "MIN";
}

function getSeriesHeader(config) {
  const normalizedKey = normalize(config.key);
  return headers.find((header) => normalize(header).includes(normalizedKey));
}

function availableSeries() {
  return seriesConfig
    .map((config) => ({
      ...config,
      header: getSeriesHeader(config),
    }))
    .filter((series) => series.header);
}

function updateChart() {
  const labelKey = getLabelColumn();
  const activeHeader = getActiveHeader();
  const series = buildSeries(labelKey);

  if (!series.length) {
    statusText.textContent = "Não encontrei colunas de audiência no CSV.";
    emptyState.hidden = false;
    clearChart();
    metricStrip.innerHTML = "";
    return;
  }

  emptyState.hidden = true;
  updateHeaderInfo();
  updateMetrics(series);
  drawMultiLineChart(series, activeHeader);

  statusText.textContent = "";
}

function buildSeries(labelKey) {
  return availableSeries()
    .map((series) => {
      const points = rows
        .map((row) => ({
          label: row[labelKey],
          value: parseSeriesNumber(row[series.header]),
        }))
        .filter((point) => point.label && Number.isFinite(point.value))
        .filter((point) => !isAggregateTimeLabel(point.label));

      return {
        ...series,
        points: sortTimePoints(points),
      };
    })
    .filter((series) => series.points.length);
}

function updateHeaderInfo() {
  reportDate.textContent = formatDate(metadata.data) ?? "--/--/----";
  reportRange.textContent = formatRange(metadata.intervalo) ?? inferRange();
  if (!marketBadge.dataset.userEdited) {
    marketBadge.value = getMarketCode(metadata.praca);
    resizeMarketBadge();
  }
}

function formatDate(value) {
  if (!value) return null;

  const [day, month, year] = String(value).split("-");
  if (year) return `${day}/${month}/${year}`;

  return value;
}

function inferRange() {
  const labelKey = getLabelColumn();
  const labels = rows
    .map((row) => row[labelKey])
    .filter((label) => /^\d{1,2}:\d{2}$/.test(String(label).trim()))
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

  if (!labels.length) return "--:-- - --:--";
  return `${labels[0]} - ${labels[labels.length - 1]}`;
}

function formatRange(value) {
  const match = String(value ?? "").match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  return match ? `${match[1]} - ${match[2]}` : null;
}

function getActiveHeader() {
  return availableSeries().find((series) => series.key === "GLOBO")?.header ?? "";
}

function resizeMarketBadge() {
  const length = Math.max(3, marketBadge.value.length);
  marketBadge.style.width = `${Math.max(11, length + 4)}ch`;
}

function getMarketCode(place) {
  const text = normalize(place);
  if (text.includes("distrito federal")) return "PROGRAMA";
  return "PROGRAMA";
}

function updateMetrics(series) {
  metricStrip.innerHTML = "";

  series.forEach((item) => {
    const calculatedAverage =
      item.points.reduce((sum, point) => sum + point.value, 0) / item.points.length;
    const average = summary[item.header]?.average;
    const share = summary[item.header]?.share;
    const card = document.createElement("article");
    card.className = "metric-card";
    card.style.setProperty("--series-color", item.color);
    const logoSource = getLogoSource(item);
    const logoContent = logoSource
      ? `<img src="${logoSource}" alt="${item.label}" />`
      : item.mark;
    card.innerHTML = `
      <span class="logo-dot" style="background:${item.color}">${logoContent}</span>
      <span class="metric-copy">
        <strong>${formatMetricValue(average, calculatedAverage)}</strong>
        <span>Audiência</span>
        <b>${formatShareValue(share)}</b>
        <span>Share</span>
      </span>
    `;
    metricStrip.appendChild(card);
  });
}

function formatMetricValue(value, fallback) {
  const number = Number.isFinite(value) ? value : fallback;
  return Number.isFinite(number) ? numberFormatter.format(number) : "-";
}

function formatShareValue(value) {
  return Number.isFinite(value) ? `${numberFormatter.format(value)}%` : "-";
}

function isAggregateTimeLabel(label) {
  return /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(String(label).trim());
}

function sortTimePoints(points) {
  const everyPointHasTime = points.every((point) =>
    /^\d{1,2}:\d{2}$/.test(String(point.label).trim()),
  );

  if (!everyPointHasTime) return points;

  return [...points].sort((a, b) => timeToMinutes(a.label) - timeToMinutes(b.label));
}

function timeToMinutes(label) {
  const [hours, minutes] = String(label).split(":").map(Number);
  return hours * 60 + minutes;
}

function clearChart() {
  const context = chartCanvas.getContext("2d");
  context.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = chartCanvas.getBoundingClientRect();
  chartCanvas.width = Math.round(rect.width * ratio);
  chartCanvas.height = Math.round(rect.height * ratio);
  const context = chartCanvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: rect.width, height: rect.height, context };
}

function drawMultiLineChart(series, activeHeader) {
  const { width, height, context } = resizeCanvas();
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  const maxValue = Math.max(...values);
  const minValue = Math.min(0, ...values);
  const topValue = Math.ceil(maxValue + Math.max(1, maxValue * 0.08));
  const range = topValue - minValue || 1;
  const padding = { top: 22, right: 16, bottom: 48, left: 22 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const longest = series.reduce((winner, item) =>
    item.points.length > winner.points.length ? item : winner,
  );

  context.clearRect(0, 0, width, height);
  drawVerticalBand(context, longest.points, padding, plotWidth, plotHeight);
  drawAxisLabels(context, longest.points, padding, plotWidth, height);

  series
    .slice()
    .sort((a, b) => (a.header === activeHeader ? 1 : 0) - (b.header === activeHeader ? 1 : 0))
    .forEach((item) => {
      drawSeriesLine({
        context,
        item,
        active: item.header === activeHeader,
        padding,
        plotWidth,
        plotHeight,
        minValue,
        range,
      });
    });
}

function drawMultiLineChartOnContext(context, series, activeHeader, bounds) {
  const values = series.flatMap((item) => item.points.map((point) => point.value));
  const maxValue = Math.max(...values);
  const minValue = Math.min(0, ...values);
  const topValue = Math.ceil(maxValue + Math.max(1, maxValue * 0.08));
  const range = topValue - minValue || 1;
  const padding = { top: 22, right: 16, bottom: 48, left: 22 };
  const plotWidth = bounds.width - padding.left - padding.right;
  const plotHeight = bounds.height - padding.top - padding.bottom;
  const longest = series.reduce((winner, item) =>
    item.points.length > winner.points.length ? item : winner,
  );

  context.save();
  context.translate(bounds.x, bounds.y);
  context.beginPath();
  context.rect(0, 0, bounds.width, bounds.height);
  context.clip();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, bounds.width, bounds.height);

  drawVerticalBand(context, longest.points, padding, plotWidth, plotHeight);
  drawAxisLabels(context, longest.points, padding, plotWidth, bounds.height);

  series
    .slice()
    .sort((a, b) => (a.header === activeHeader ? 1 : 0) - (b.header === activeHeader ? 1 : 0))
    .forEach((item) => {
      drawSeriesLine({
        context,
        item,
        active: item.header === activeHeader,
        padding,
        plotWidth,
        plotHeight,
        minValue,
        range,
      });
    });

  context.restore();
}

function drawVerticalBand(context, points, padding, plotWidth, plotHeight) {
  getIntervals().forEach(({ start, end }) => {
    const startIndex = findClosestTimeIndex(points, start);
    const endIndex = findClosestTimeIndex(points, end);
    if (startIndex < 0 || endIndex < 0) return;

    const fromIndex = Math.min(startIndex, endIndex);
    const toIndex = Math.max(startIndex, endIndex);
    const bandX = xFor(fromIndex, points.length, padding.left, plotWidth);
    const bandEndX = xFor(toIndex, points.length, padding.left, plotWidth);
    const bandWidth = Math.max(8, bandEndX - bandX);

    context.fillStyle = "rgba(0, 0, 0, 0.035)";
    context.fillRect(bandX, padding.top, bandWidth, plotHeight);
  });
}

function getIntervals() {
  return [...intervalList.querySelectorAll(".interval-row")]
    .map((row) => ({
      start: row.querySelector(".interval-start").value,
      end: row.querySelector(".interval-end").value,
    }))
    .filter((interval) => interval.start && interval.end);
}

function addIntervalRow(start = "", end = "") {
  const row = document.createElement("div");
  row.className = "interval-row";
  row.innerHTML = `
    <label>
      Início
      <input class="interval-start" type="time" value="${start}" />
    </label>
    <label>
      Fim
      <input class="interval-end" type="time" value="${end}" />
    </label>
    <button class="remove-interval-button" type="button" aria-label="Remover intervalo">×</button>
  `;

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", updateChart);
  });

  row.querySelector(".remove-interval-button").addEventListener("click", () => {
    row.remove();
    if (!intervalList.children.length) addIntervalRow();
    updateChart();
  });

  intervalList.appendChild(row);
}

function findClosestTimeIndex(points, time) {
  const target = timeToMinutes(time);
  if (!Number.isFinite(target)) return -1;

  let closestIndex = -1;
  let closestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(timeToMinutes(point.label) - target);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function drawAxisLabels(context, points, padding, plotWidth, height) {
  const indexes = pickTimeIndexes(points);
  context.font = "12px Globotipo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillStyle = "#9a9a9a";

  indexes.forEach((index) => {
    const x = xFor(index, points.length, padding.left, plotWidth);
    context.fillText(points[index].label, x, height - 20);
  });

  context.fillStyle = "#f1f1f1";
  context.fillRect(padding.left, 6, 118, 28);
  context.fillStyle = "#8f8f8f";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "11px Globotipo, Arial, sans-serif";
  context.fillText("Intervalo", padding.left + 59, 20);
  context.textBaseline = "alphabetic";
}

function drawSeriesLine({
  context,
  item,
  active,
  padding,
  plotWidth,
  plotHeight,
  minValue,
  range,
}) {
  const line = new Path2D();

  item.points.forEach((point, index) => {
    const x = xFor(index, item.points.length, padding.left, plotWidth);
    const y = yFor(point.value, padding.top, plotHeight, minValue, range);

    if (index === 0) line.moveTo(x, y);
    else line.lineTo(x, y);
  });

  context.save();
  context.globalAlpha = active ? 1 : 0.92;
  context.strokeStyle = item.color;
  context.lineWidth = active ? 4 : item.key === "TOTAL LIGADOS" ? 3.5 : 2.7;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke(line);
  context.restore();

  if (item.key === "GLOBO") {
    drawGloboHighlights(context, item, padding, plotWidth, plotHeight, minValue, range);
  } else {
    drawPointLabel(context, item, item.points.length - 1, padding, plotWidth, plotHeight, minValue, range);
  }

  if (item.key === "TOTAL LIGADOS") {
    drawPointLabel(context, item, Math.floor(item.points.length * 0.8), padding, plotWidth, plotHeight, minValue, range);
  } else if (item.key === "RECORD" || item.key === "SBT") {
    drawPointLabel(context, item, Math.floor(item.points.length * 0.5), padding, plotWidth, plotHeight, minValue, range);
  }
}

function drawGloboHighlights(context, item, padding, plotWidth, plotHeight, minValue, range) {
  const firstIndex = 0;
  const lastIndex = item.points.length - 1;
  const maxIndex = item.points.reduce(
    (bestIndex, point, index) => (point.value > item.points[bestIndex].value ? index : bestIndex),
    0,
  );
  const minIndex = item.points.reduce(
    (bestIndex, point, index) => (point.value < item.points[bestIndex].value ? index : bestIndex),
    0,
  );

  [
    { index: firstIndex, caption: "Audiência recebida", offset: -42 },
    { index: lastIndex, caption: "Audiência entregue", offset: -42 },
    { index: maxIndex, caption: "Maior audiência", offset: 34 },
    { index: minIndex, caption: "Menor audiência", offset: 34 },
  ].filter((highlight, position, all) =>
    all.findIndex((candidate) => candidate.index === highlight.index && candidate.caption === highlight.caption) === position,
  ).forEach((highlight) => {
    drawGloboHighlightLabel(
      context,
      item,
      highlight.index,
      highlight.caption,
      highlight.offset,
      padding,
      plotWidth,
      plotHeight,
      minValue,
      range,
    );
  });
}

function drawGloboHighlightLabel(
  context,
  item,
  index,
  caption,
  offset,
  padding,
  plotWidth,
  plotHeight,
  minValue,
  range,
) {
  const point = item.points[index];
  if (!point) return;

  const x = xFor(index, item.points.length, padding.left, plotWidth);
  const y = yFor(point.value, padding.top, plotHeight, minValue, range);
  const valueText = numberFormatter.format(point.value);
  const boxWidth = Math.max(104, context.measureText(caption).width + 18);
  const boxHeight = 35;
  const boxX = Math.min(Math.max(4, x - boxWidth / 2), padding.left + plotWidth - boxWidth);
  const boxY = Math.min(Math.max(8, y + offset), padding.top + plotHeight - boxHeight - 4);

  context.fillStyle = "rgba(155, 160, 255, 0.95)";
  roundRect(context, boxX, boxY, boxWidth, boxHeight, 6);
  context.fill();

  context.fillStyle = "#0b36b8";
  context.textAlign = "center";
  context.font = "900 12px Globotipo, Arial, sans-serif";
  context.fillText(valueText, boxX + boxWidth / 2, boxY + 14);
  context.font = "400 9px Globotipo, Arial, sans-serif";
  context.fillText(caption, boxX + boxWidth / 2, boxY + 27);

  context.fillStyle = "#0b36b8";
  context.beginPath();
  context.arc(x, y, 3.8, 0, Math.PI * 2);
  context.fill();
}

function drawPointLabel(context, item, index, padding, plotWidth, plotHeight, minValue, range) {
  const point = item.points[index];
  if (!point) return;

  const x = xFor(index, item.points.length, padding.left, plotWidth);
  const y = yFor(point.value, padding.top, plotHeight, minValue, range);
  const text = numberFormatter.format(point.value);
  const width = context.measureText(text).width + 10;
  const labelY = Math.max(14, y - 16);

  if (item.key === "GLOBO") {
    context.fillStyle = "#9ba0ff";
    roundRect(context, x - width / 2, labelY - 13, width, 20, 5);
    context.fill();
    context.fillStyle = "#0b36b8";
  } else {
    context.fillStyle = item.color;
  }

  context.font = "700 12px Globotipo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(text, x, labelY + 1);
}

function xFor(index, total, left, plotWidth) {
  return left + (total === 1 ? plotWidth / 2 : (plotWidth / (total - 1)) * index);
}

function yFor(value, top, plotHeight, minValue, range) {
  return top + plotHeight - ((value - minValue) / range) * plotHeight;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function pickTimeIndexes(points) {
  if (points.length <= 8) return Array.from({ length: points.length }, (_, index) => index);

  const indexes = new Set();
  points.forEach((point, index) => {
    const [, minute] = String(point.label).split(":").map(Number);
    if (Number.isFinite(minute) && minute % 10 === 0) indexes.add(index);
  });

  indexes.add(0);
  indexes.add(points.length - 1);
  return [...indexes].sort((a, b) => a - b);
}

async function downloadCleanImage() {
  if (!rows.length || !emptyState.hidden) {
    downloadWarning.textContent = "Importe um CSV antes de baixar a imagem.";
    statusText.textContent = "";
    return;
  }

  downloadWarning.textContent = "";

  const width = 1600;
  const height = 900;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const series = buildSeries(getLabelColumn());

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  await drawExportHeader(context, width);
  await drawTvGloboLogo(context, width);
  await drawExportMetrics(context, series);
  drawMultiLineChartOnContext(context, series, getActiveHeader(), {
    x: 24,
    y: 240,
    width: width - 48,
    height: 600,
  });
  drawExportFooter(context, width, height);

  const link = document.createElement("a");
  link.download = `audiencia-previa-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function drawExportHeader(context, width) {
  const headerY = 26;
  const headerHeight = 42;
  const headerCenterY = headerY + headerHeight / 2;

  context.fillStyle = "#0b36a8";
  context.font = "900 34px Globotipo, Arial, sans-serif";
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillText("AUDIÊNCIA PRÉVIA", 28, 48);

  const badgeText = marketBadge.value || "PROGRAMA";
  const programLogo = getProgramLogoSource(badgeText);
  let badgeX = 330;
  let badgeWidth = 0;

  if (programLogo) {
    const logoSize = getProgramLogoSize(badgeText);
    badgeWidth = logoSize.width;
    await drawLogoImageContain(
      context,
      programLogo,
      badgeX,
      headerY,
      logoSize.width,
      logoSize.height,
    );
  } else {
    context.font = "900 21px Globotipo, Arial, sans-serif";
    badgeWidth = Math.max(72, context.measureText(badgeText).width + 36);
    roundRect(context, badgeX, headerY, badgeWidth, headerHeight, 21);
    context.fill();
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.fillText(badgeText, badgeX + badgeWidth / 2, headerCenterY);
  }

  const presenter = presenterName.value.trim();
  if (presenter) {
    context.fillStyle = "#0b36a8";
    context.font = "400 15px Globotipo, Arial, sans-serif";
    context.textAlign = "left";
    context.fillText(`Apresentação: ${presenter}`, badgeX + badgeWidth + 16, 44);
    context.textAlign = "center";
  }

  context.fillStyle = "#0b36a8";
  context.textBaseline = "alphabetic";
  context.font = "900 15px Globotipo, Arial, sans-serif";
  context.font = "900 21px Globotipo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(reportDate.textContent, 94, 104);
  roundRect(context, 28, 116, 132, 44, 22);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "900 17px Globotipo, Arial, sans-serif";
  context.fillText(reportRange.textContent, 94, 144);
}

async function drawExportMetrics(context, series) {
  const startX = 190;
  const cardWidth = 160;
  const top = 92;
  const entries = buildExportMetricEntries(series);

  for (const [index, item] of entries.entries()) {
    const x = startX + index * cardWidth;
    if (item.type === "historical") {
      drawExportHistoricalMetric(context, x, top);
      continue;
    }

    const calculatedAverage =
      item.points.reduce((sum, point) => sum + point.value, 0) / item.points.length;
    const average = summary[item.header]?.average;
    const share = summary[item.header]?.share;

    context.fillStyle = item.color;
    context.beginPath();
    context.arc(x + 25, top + 32, 24, 0, Math.PI * 2);
    context.fill();

    const logoSource = getLogoSource(item);
    if (logoSource) {
      await drawLogoImage(context, logoSource, x + 8, top + 15, 34, 34);
    } else {
      context.fillStyle = "#ffffff";
      context.font = "900 13px Globotipo, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(item.mark, x + 25, top + 37);
    }

    context.fillStyle = item.color;
    context.fillRect(x + 60, top + 2, 3, 74);
    context.font = "900 17px Globotipo, Arial, sans-serif";
    context.textAlign = "left";
    context.fillText(formatMetricValue(average, calculatedAverage), x + 72, top + 18);
    context.font = "400 12px Globotipo, Arial, sans-serif";
    context.fillStyle = "#9b9b9b";
    context.fillText("Audiência", x + 72, top + 36);
    context.fillStyle = item.color;
    context.font = "900 15px Globotipo, Arial, sans-serif";
    context.fillText(formatShareValue(share), x + 72, top + 57);
    context.fillStyle = "#9b9b9b";
    context.font = "400 12px Globotipo, Arial, sans-serif";
    context.fillText("Share", x + 72, top + 74);
  }
}

function buildExportMetricEntries(series) {
  const entries = [...series];
  const globoIndex = entries.findIndex((item) => item.key === "GLOBO");
  const historicalEntry = { type: "historical" };

  if (globoIndex < 0) return [historicalEntry, ...entries].slice(0, 8);

  entries.splice(globoIndex + 1, 0, historicalEntry);
  return entries.slice(0, 8);
}

function drawExportHistoricalMetric(context, x, top) {
  const audience = historicalAudience.value.trim() || "-";
  const variation = historicalShare.value.trim()
    ? formatVariationInput(historicalShare.value)
    : "-";
  const variationNumber = parseNumber(variation);
  const accentColor = getSignedColor(variationNumber);

  context.fillStyle = accentColor;
  context.fillRect(x + 12, top + 2, 3, 74);
  context.font = "900 17px Globotipo, Arial, sans-serif";
  context.textAlign = "left";
  context.fillText(audience, x + 24, top + 18);
  context.font = "400 12px Globotipo, Arial, sans-serif";
  context.fillStyle = "#9b9b9b";
  context.fillText("Média histórica", x + 24, top + 36);
  context.fillStyle = accentColor;
  context.font = "900 15px Globotipo, Arial, sans-serif";
  context.fillText(variation, x + 24, top + 57);
  context.fillStyle = "#9b9b9b";
  context.font = "400 12px Globotipo, Arial, sans-serif";
  context.fillText("Variação", x + 24, top + 74);
}

function drawLogoImage(context, src, x, y, width, height) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, x, y, width, height);
      resolve();
    };
    image.onerror = resolve;
    image.src = src;
  });
}

function drawLogoImageContain(context, src, x, y, width, height) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const scale = Math.min(width / image.width, height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = x + (width - drawWidth) / 2;
      const drawY = y + (height - drawHeight) / 2;
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      resolve();
    };
    image.onerror = resolve;
    image.src = src;
  });
}

function getLogoSource(item) {
  return item.imageKey ? window.logoData?.[item.imageKey] : null;
}

async function drawTvGloboLogo(context, width) {
  const src = window.logoData?.TVGLOBO;
  if (!src) return;
  await drawLogoImage(context, src, width - 202, 26, 174, 42);
}

function getProgramLogoSource(programName) {
  const normalizedName = normalize(programName);
  if (normalizedName === "df1") return window.logoData?.PROGRAMA_DF1;
  if (normalizedName === "df2") return window.logoData?.PROGRAMA_DF2;
  if (normalizedName === "bom dia df") return window.logoData?.PROGRAMA_BOM_DIA_DF;
  if (normalizedName === "globo comunidade" || normalizedName === "gco") {
    return window.logoData?.PROGRAMA_GLOBO_COMUNIDADE;
  }
  if (normalizedName === "globo esporte") return window.logoData?.PROGRAMA_GLOBO_ESPORTE;
  if (normalizedName === "boletim df2") return window.logoData?.PROGRAMA_BOLETIM_DF2;
  return null;
}

function getProgramLogoSize(programName) {
  const normalizedName = normalize(programName);
  if (normalizedName === "bom dia df") return { width: 153, height: 42 };
  if (normalizedName === "globo esporte") return { width: 174, height: 42 };
  if (normalizedName === "boletim df2") return { width: 174, height: 42 };
  if (normalizedName === "globo comunidade" || normalizedName === "gco") {
    return { width: 210, height: 42 };
  }
  return { width: 174, height: 42 };
}

function drawExportFooter(context, width, height) {
  context.fillStyle = "#8a8a8a";
  context.font = "italic 12px Globotipo, Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(
    "Fonte: Ibope. DF. Dados prévios. 1 pt de audiência domiciliar no DF equivale a 10.034 domicílios.",
    width - 28,
    height - 18,
  );
}

function drawExportHistorical(context) {
  const audience = historicalAudience.value.trim();
  const share = historicalShare.value.trim();
  if (!audience && !share) return;

  context.fillStyle = "#8a8a8a";
  context.font = "900 12px Globotipo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText("Média histórica", 94, 184);

  drawHistoricalValue(context, audience || "-", 52, 207);
  context.fillStyle = "#9b9b9b";
  context.font = "400 11px Globotipo, Arial, sans-serif";
  context.fillText("Audiência", 52, 225);

  drawHistoricalValue(context, share || "-", 136, 207);
  context.fillStyle = "#9b9b9b";
  context.font = "400 11px Globotipo, Arial, sans-serif";
  context.fillText("Variação", 136, 225);
}

function drawHistoricalValue(context, value, x, y) {
  const parsed = parseNumber(value);
  context.fillStyle = getSignedColor(parsed);
  context.font = "900 17px Globotipo, Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(value, x, y);
}

function getSignedColor(value) {
  if (!Number.isFinite(value) || value === 0) return "#0b36a8";
  return value < 0 ? "#e95145" : "#6fbfff";
}

function updateSignedInput(input) {
  const value = parseNumber(input.value);
  input.classList.toggle("negative", Number.isFinite(value) && value < 0);
  input.classList.toggle("positive", Number.isFinite(value) && value > 0);
}

function formatVariationInput(value) {
  const number = parseNumber(value);
  if (!Number.isFinite(number)) return value.trim();

  const formatted = numberFormatter.format(Math.abs(number));
  const sign = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${sign}${formatted}%`;
}

downloadImageButton.addEventListener("click", downloadCleanImage);

function loadCsvText(text) {
  downloadWarning.textContent = "";
  const parsed = parseCsv(text, "auto");
  headers = parsed.parsedHeaders;
  rows = parsed.parsedRows;
  metadata = parsed.parsedMetadata;
  summary = parsed.parsedSummary;
  updateChart();
}

async function handleFileSelection(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    currentFileText = await file.text();
    loadCsvText(currentFileText);
  } catch (error) {
    statusText.textContent = error.message;
  }
}

emptyCsvInput.addEventListener("change", handleFileSelection);

function clearTextOnFocus(input, afterClear) {
  input.addEventListener("focus", () => {
    input.value = "";
    afterClear?.();
  });
}

clearTextOnFocus(marketBadge, () => {
  marketBadge.dataset.userEdited = "true";
  resizeMarketBadge();
});

clearTextOnFocus(presenterName);

marketBadge.addEventListener("input", () => {
  marketBadge.dataset.userEdited = "true";
  marketBadge.value = marketBadge.value.toUpperCase();
  resizeMarketBadge();
});

addIntervalButton.addEventListener("click", () => {
  addIntervalRow();
});

[historicalAudience, historicalShare].forEach((input) => {
  input.addEventListener("input", () => {
    updateSignedInput(input);
  });
});

historicalShare.addEventListener("blur", () => {
  historicalShare.value = formatVariationInput(historicalShare.value);
  updateSignedInput(historicalShare);
});

window.addEventListener("resize", () => {
  if (!rows.length || !emptyState.hidden) return;
  updateChart();
});

resizeMarketBadge();
addIntervalRow();
