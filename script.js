/* =========================================================
   SENTRY — Crime Risk Analysis & Safe Travel Recommendation
   Frontend logic. Replace the DATA / analyzeRisk() functions
   with real API calls to your trained model / backend.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- MOCK DATA (swap with real dataset outputs) ---------------- */

  const DISTRICTS = [
    { id: 1, name: "District 1 — Central" },
    { id: 2, name: "District 2 — Wentworth" },
    { id: 3, name: "District 3 — Grand Crossing" },
    { id: 4, name: "District 4 — South Chicago" },
    { id: 5, name: "District 5 — Calumet" },
    { id: 6, name: "District 6 — Gresham" },
    { id: 7, name: "District 7 — Englewood" },
    { id: 8, name: "District 8 — Chicago Lawn" },
    { id: 9, name: "District 9 — Deering" },
    { id: 10, name: "District 10 — Ogden" },
    { id: 11, name: "District 11 — Harrison" },
    { id: 12, name: "District 12 — Near West" },
    { id: 14, name: "District 14 — Shakespeare" },
    { id: 15, name: "District 15 — Austin" },
    { id: 16, name: "District 16 — Jefferson Park" },
    { id: 17, name: "District 17 — Albany Park" },
    { id: 18, name: "District 18 — Near North" },
    { id: 19, name: "District 19 — Town Hall" },
    { id: 20, name: "District 20 — Lincoln" },
    { id: 22, name: "District 22 — Morgan Park" },
    { id: 24, name: "District 24 — Rogers Park" },
    { id: 25, name: "District 25 — Grand Central" },
  ];

  const TIME_SLOTS = [
    { id: "early-morning", name: "Early Morning (12AM–6AM)" },
    { id: "morning", name: "Morning (6AM–12PM)" },
    { id: "afternoon", name: "Afternoon (12PM–4PM)" },
    { id: "evening", name: "Evening (4PM–8PM)" },
    { id: "night", name: "Night (8PM–12AM)" },
  ];

  const CRIME_TYPES = [
    "Theft", "Battery", "Criminal Damage", "Narcotics", "Assault",
    "Burglary", "Robbery", "Motor Vehicle Theft", "Deceptive Practice", "Weapons Violation",
  ];

  const SCANNER_FEED = [
    "10:42 · Theft reported — District 18",
    "10:44 · Patrol dispatched — District 7",
    "10:47 · Battery incident logged — District 15",
    "10:51 · Risk score refreshed — District 11",
    "10:55 · Vehicle theft flagged — District 4",
    "10:58 · Area clear — District 16",
  ];

  /* ---------------- Deterministic pseudo-random helpers ---------------- */
  // Ensures the same district+timeslot always produces the same "analysis"
  // instead of jumping around randomly on every click.

  function seedFromString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return ((h >>> 0) / 4294967295);
    };
  }

  function rangeFromSeed(rand, min, max) {
    return Math.floor(min + rand() * (max - min));
  }

  /* District base danger index (0-1), fixed so results feel coherent */
  const DISTRICT_DANGER = {};
  DISTRICTS.forEach((d) => {
    const r = seedFromString("danger-" + d.id);
    DISTRICT_DANGER[d.id] = r();
  });

  const TIME_MULTIPLIER = {
    "early-morning": 0.55,
    "morning": 0.35,
    "afternoon": 0.5,
    "evening": 0.8,
    "night": 1.0,
  };

  function computeRisk(districtId, slotId) {
    const rand = seedFromString(districtId + "-" + slotId);
    const base = DISTRICT_DANGER[districtId];
    const mult = TIME_MULTIPLIER[slotId];
    const composite = Math.min(1, base * 0.7 + mult * 0.5 + (rand() - 0.5) * 0.08);

    const crimeCount = Math.round(300 + composite * 2600 + rand() * 200);
    const safetyScore = Math.round((1 - composite) * 100);

    let level = "low";
    if (composite > 0.66) level = "high";
    else if (composite > 0.38) level = "medium";

    const shuffled = [...CRIME_TYPES].sort(() => rand() - 0.5);
    const topCrimes = shuffled.slice(0, 4);

    return { composite, crimeCount, safetyScore, level, topCrimes };
  }

  const LEVEL_LABEL = { low: "Low Risk", medium: "Moderate Risk", high: "High Risk" };

  const SAFETY_TIPS = {
    low: [
      "Standard precautions apply — stay aware of your surroundings.",
      "Well-lit, populated routes are readily available at this time.",
      "Public transit and rideshare access is reliable in this window.",
    ],
    medium: [
      "Stick to main roads and avoid unlit side streets.",
      "Keep valuables out of sight while walking or waiting for transit.",
      "Travel with a companion where possible during this time slot.",
    ],
    high: [
      "Avoid non-essential travel through this area during this window.",
      "If travel is required, use a direct rideshare rather than walking.",
      "Share your live location with someone you trust for the duration of the trip.",
      "Avoid displaying phones, jewelry, or cash in public view.",
    ],
  };

  const TRAVEL_ADVICE = {
    low: "Conditions are favorable. This is one of the calmer windows for this district based on historical incident data.",
    medium: "Exercise normal urban caution. Incident frequency is moderate but manageable with basic awareness.",
    high: "Historical incident density is elevated for this district and time. Consider the alternative window below or a direct transit option.",
  };

  function betterSlotFor(districtId) {
    let best = null;
    TIME_SLOTS.forEach((slot) => {
      const r = computeRisk(districtId, slot.id);
      if (!best || r.composite < best.risk) best = { slot: slot.name, risk: r.composite };
    });
    return best.slot;
  }

  /* ---------------- Populate selects ---------------- */

  function fillSelect(select, items, labelKey, valueKey) {
    select.innerHTML = items
      .map((it) => `<option value="${it[valueKey]}">${it[labelKey]}</option>`)
      .join("");
  }

  const districtSelects = ["quickDistrict", "riskDistrict", "travelDistrict"];
  const slotSelects = ["quickTimeSlot", "riskTimeSlot", "travelTimeSlot"];

  districtSelects.forEach((id) => {
    const el = document.getElementById(id);
    if (el) fillSelect(el, DISTRICTS, "name", "id");
  });
  slotSelects.forEach((id) => {
    const el = document.getElementById(id);
    if (el) fillSelect(el, TIME_SLOTS, "name", "id");
  });
  // default pick something with visible variety
  document.getElementById("riskDistrict").value = 7;
  document.getElementById("travelDistrict").value = 7;

  /* ---------------- Navigation ---------------- */

  const navItems = document.querySelectorAll(".nav__item");
  const pages = document.querySelectorAll(".page");
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  function goToPage(pageId) {
    navItems.forEach((n) => n.classList.toggle("is-active", n.dataset.page === pageId));
    pages.forEach((p) => p.classList.toggle("is-active", p.id === "page-" + pageId));
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navItems.forEach((btn) => btn.addEventListener("click", () => goToPage(btn.dataset.page)));
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.goto));
  });

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    overlay.classList.toggle("is-active");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-active");
  });

  /* ---------------- Animated counters ---------------- */

  function animateCounters() {
    document.querySelectorAll(".stat-card__value[data-count]").forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  animateCounters();

  /* ---------------- Ticker ---------------- */

  const ticker = document.getElementById("ticker");
  let tickIdx = 0;
  function renderTick() {
    ticker.innerHTML = `<span>${SCANNER_FEED[tickIdx % SCANNER_FEED.length]}</span>`;
    tickIdx++;
  }
  renderTick();
  setInterval(renderTick, 3600);

  /* ---------------- Risk Analysis page ---------------- */

  const riskEmptyState = document.getElementById("riskEmptyState");
  const riskResultBody = document.getElementById("riskResultBody");

  function runRiskAnalysis(districtId, slotId) {
    const district = DISTRICTS.find((d) => d.id === Number(districtId));
    const slot = TIME_SLOTS.find((s) => s.id === slotId);
    const result = computeRisk(Number(districtId), slotId);

    riskEmptyState.hidden = true;
    riskResultBody.hidden = false;

    const badge = document.getElementById("riskBadge");
    badge.className = "risk-badge level-" + result.level;
    document.getElementById("riskLevelText").textContent = LEVEL_LABEL[result.level];
    document.getElementById("riskDistrictName").textContent = district.name;
    document.getElementById("riskSlotName").textContent = slot.name;
    document.getElementById("riskCrimeCount").textContent = result.crimeCount.toLocaleString();
    document.getElementById("riskSafetyScore").textContent = result.safetyScore;

    requestAnimationFrame(() => {
      document.getElementById("riskScoreFill").style.width = result.safetyScore + "%";
    });

    const chipRow = document.getElementById("riskTopCrimes");
    chipRow.innerHTML = result.topCrimes.map((c) => `<span class="chip">${c}</span>`).join("");
  }

  document.getElementById("analyzeRiskBtn").addEventListener("click", () => {
    const d = document.getElementById("riskDistrict").value;
    const s = document.getElementById("riskTimeSlot").value;
    runRiskAnalysis(d, s);
  });

  document.getElementById("quickAnalyzeBtn").addEventListener("click", () => {
    const d = document.getElementById("quickDistrict").value;
    const s = document.getElementById("quickTimeSlot").value;
    document.getElementById("riskDistrict").value = d;
    document.getElementById("riskTimeSlot").value = s;
    goToPage("risk-analysis");
    runRiskAnalysis(d, s);
  });

  /* ---------------- Safe Travel page ---------------- */

  const travelEmptyState = document.getElementById("travelEmptyState");
  const travelResultBody = document.getElementById("travelResultBody");

  function runTravelRecommendation(districtId, slotId) {
    const district = DISTRICTS.find((d) => d.id === Number(districtId));
    const slot = TIME_SLOTS.find((s) => s.id === slotId);
    const result = computeRisk(Number(districtId), slotId);

    travelEmptyState.hidden = true;
    travelResultBody.hidden = false;

    const badge = document.getElementById("travelVerdictBadge");
    badge.className = "travel-verdict__badge level-" + result.level;
    badge.textContent = LEVEL_LABEL[result.level];
    document.getElementById("travelVerdictText").textContent =
      `${district.name} during ${slot.name.split(" (")[0]} carries a ${LEVEL_LABEL[result.level].toLowerCase()} profile based on historical incident data.`;

    document.getElementById("travelTips").innerHTML = SAFETY_TIPS[result.level]
      .map((t) => `<li>${t}</li>`).join("");

    document.getElementById("travelAltSlot").textContent = betterSlotFor(Number(districtId));
    document.getElementById("travelAdvice").textContent = TRAVEL_ADVICE[result.level];
  }

  document.getElementById("getRecommendationBtn").addEventListener("click", () => {
    const d = document.getElementById("travelDistrict").value;
    const s = document.getElementById("travelTimeSlot").value;
    runTravelRecommendation(d, s);
  });

  /* ---------------- Analytics charts (lightweight, no libraries) ---------------- */

  function buildAnalyticsData() {
    const byDistrict = DISTRICTS.map((d) => ({
      name: d.name.split("—")[1].trim(),
      value: Math.round(400 + DISTRICT_DANGER[d.id] * 3200),
    })).sort((a, b) => b.value - a.value).slice(0, 8);

    const bySlot = TIME_SLOTS.map((s) => ({
      name: s.name.split(" (")[0],
      value: Math.round(TIME_MULTIPLIER[s.id] * 4200 + 400),
    }));

    const rand = seedFromString("crime-types-dist");
    const byType = CRIME_TYPES.map((t) => ({ name: t, value: rangeFromSeed(rand, 400, 3200) }))
      .sort((a, b) => b.value - a.value);

    const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const trandRand = seedFromString("monthly-trend");
    const trend = months.map((m) => ({ name: m, value: rangeFromSeed(trandRand, 16000, 24000) }));

    return { byDistrict, bySlot, byType, trend };
  }

  const analytics = buildAnalyticsData();

  function renderBarV(containerId, data) {
    const el = document.getElementById(containerId);
    const max = Math.max(...data.map((d) => d.value));
    el.innerHTML = data.map((d) => `
      <div class="bar-v">
        <span class="bar-v__value">${d.value}</span>
        <div class="bar-v__fill" data-h="${(d.value / max) * 100}"></div>
        <span class="bar-v__label">${d.name}</span>
      </div>
    `).join("");
    requestAnimationFrame(() => {
      el.querySelectorAll(".bar-v__fill").forEach((f) => { f.style.height = f.dataset.h + "%"; });
    });
  }

  function renderBarH(containerId, data) {
    const el = document.getElementById(containerId);
    const max = Math.max(...data.map((d) => d.value));
    el.innerHTML = data.map((d) => `
      <div class="bar-h">
        <span class="bar-h__label">${d.name}</span>
        <div class="bar-h__track"><div class="bar-h__fill" data-w="${(d.value / max) * 100}"></div></div>
        <span class="bar-h__value">${d.value.toLocaleString()}</span>
      </div>
    `).join("");
    requestAnimationFrame(() => {
      el.querySelectorAll(".bar-h__fill").forEach((f) => { f.style.width = f.dataset.w + "%"; });
    });
  }

  const DONUT_COLORS = ["#5b8def", "#9b5cf6", "#34d399", "#f5b942", "#f2586b", "#5ec8f2", "#c084fc", "#fb923c", "#4ade80", "#f472b6"];

  function renderDonut(svgId, legendId, data) {
    const svg = document.getElementById(svgId);
    const legend = document.getElementById(legendId);
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = 80, cy = 80, r = 62, innerR = 38;
    let angle = -90;
    let paths = "";

    data.forEach((d, i) => {
      const slice = (d.value / total) * 360;
      const a0 = (angle * Math.PI) / 180;
      const a1 = ((angle + slice) * Math.PI) / 180;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const ix0 = cx + innerR * Math.cos(a0), iy0 = cy + innerR * Math.sin(a0);
      const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
      const largeArc = slice > 180 ? 1 : 0;
      paths += `<path d="M${ix0} ${iy0} L${x0} ${y0} A${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} L${ix1} ${iy1} A${innerR} ${innerR} 0 ${largeArc} 0 ${ix0} ${iy0} Z" fill="${DONUT_COLORS[i % DONUT_COLORS.length]}" opacity="0.92"/>`;
      angle += slice;
    });

    svg.innerHTML = paths;
    legend.innerHTML = data.map((d, i) => `
      <div class="legend-item">
        <span class="legend-item__dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
        <span>${d.name}</span>
        <strong>${Math.round((d.value / total) * 100)}%</strong>
      </div>
    `).join("");
  }

  function renderLineChart(svgId, data) {
    const svg = document.getElementById(svgId);
    const w = 600, h = 200, pad = 20;
    const max = Math.max(...data.map((d) => d.value));
    const min = Math.min(...data.map((d) => d.value));
    const stepX = (w - pad * 2) / (data.length - 1);

    const points = data.map((d, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((d.value - min) / (max - min || 1)) * (h - pad * 2);
      return [x, y];
    });

    const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
    const areaPath = linePath + ` L${points[points.length - 1][0]} ${h - pad} L${points[0][0]} ${h - pad} Z`;

    const dots = points.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#0b1226" stroke="#5b8def" stroke-width="2"><title>${data[i].name}: ${data[i].value}</title></circle>`).join("");
    const labels = data.map((d, i) => `<text x="${points[i][0]}" y="${h - 2}" font-size="9" fill="#5c6480" text-anchor="middle" font-family="JetBrains Mono, monospace">${d.name}</text>`).join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9b5cf6" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#9b5cf6" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5b8def"/>
          <stop offset="100%" stop-color="#9b5cf6"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#lineFade)" />
      <path d="${linePath}" fill="none" stroke="url(#lineStroke)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${labels}
    `;
  }

  function riskColor(v) {
    // v: 0-1 -> blue to purple to red
    if (v < 0.4) return `rgba(91,141,239,${0.25 + v})`;
    if (v < 0.7) return `rgba(155,92,246,${0.35 + v * 0.5})`;
    return `rgba(242,88,107,${0.4 + v * 0.5})`;
  }

  function renderHeatmap(containerId) {
    const el = document.getElementById(containerId);
    let html = "";
    DISTRICTS.slice(0, 15).forEach((d) => {
      TIME_SLOTS.forEach((s) => {
        const r = computeRisk(d.id, s.id);
        html += `<div class="heat-cell" style="background:${riskColor(r.composite)}" title="${d.name} · ${s.name}">${d.id}</div>`;
      });
    });
    el.innerHTML = html;
    el.style.gridTemplateColumns = `repeat(${TIME_SLOTS.length}, 1fr)`;
  }

  renderBarV("chartByDistrict", analytics.byDistrict);
  renderBarH("chartByTimeSlot", analytics.bySlot);
  renderDonut("chartByType", "chartByTypeLegend", analytics.byType.slice(0, 6));
  renderLineChart("chartTrend", analytics.trend);
  renderHeatmap("heatmap");

  /* ---------------- Prime first risk view so page never feels empty ---------------- */
  // Leaving Risk / Travel pages in their empty state by default is intentional —
  // it invites the first action rather than pre-filling a result nobody asked for.

})();
