// Data/js/app.js

// 全局状态
let proxyData = [];        // 原始数据
let filteredData = [];     // 筛选后数据
let countryMap = {};       // 从 countries.json 加载的映射：代码 -> 中文名
let pageSize = 50;         // 每次显示条数
let shownCount = 0;        // 当前已显示条数
let clockTimer = null;     // 时钟定时器
let autoRefreshTimer = null; // 自动刷新定时器

// ========== 核心加载 ==========
async function loadCountryMap() {
  try {
    const res = await fetch("./countries.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    countryMap = await res.json();
  } catch (err) {
    console.error("加载国家映射失败:", err);
    countryMap = {};
  }
}

async function loadData() {
  try {
    const res = await fetch("./alive.txt?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();

    proxyData = parseAliveText(text);
    filteredData = proxyData.slice();

    generateFilters(filteredData);
    resetAndRender();
  } catch (err) {
    console.error("读取 alive.txt 失败:", err);
    const tbody = document.getElementById("proxy-table");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4">加载失败</td></tr>`;
    }
  }
}

function parseAliveText(text) {
  // 行格式：IP,端口,国家代码,提供商(可含逗号)
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const parts = line.split(",");
      const ip = (parts[0] || "").trim();
      const port = (parts[1] || "").trim();
      const country = (parts[2] || "").trim();
      const provider = parts.slice(3).join(",").trim();
      return { ip: ip || "-", port: port || "-", country: country || "-", provider: provider || "-" };
    });
}

// ========== 过滤与渲染 ==========
function resetAndRender() {
  shownCount = pageSize;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("proxy-table");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!filteredData.length) {
    tbody.innerHTML = `<tr><td colspan="4">无数据</td></tr>`;
    document.getElementById("btn-load-more").style.display = "none";
    return;
  }

  const end = Math.min(shownCount, filteredData.length);
  const batch = filteredData.slice(0, end);

  for (const e of batch) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.ip}</td>
      <td>${e.port}</td>
      <td>${e.country}</td> <!-- 表格里保持原始英文国家代码 -->
      <td>${e.provider}</td>
    `;
    tbody.appendChild(tr);
  }

  const moreBtn = document.getElementById("btn-load-more");
  if (moreBtn) {
    moreBtn.style.display = end < filteredData.length ? "inline-block" : "none";
  }
}

function handleLoadMore() {
  shownCount += pageSize;
  renderTable();
}

function filterData() {
  const countryVal = document.getElementById("filter-country").value; // 值为英文代码
  const portVal = document.getElementById("filter-port").value;

  filteredData = proxyData.filter(item => {
    const byCountry = countryVal ? item.country === countryVal : true;
    const byPort = portVal ? item.port === portVal : true;
    return byCountry && byPort;
  });

  resetAndRender();
}

// ========== 下拉选项 ==========
function generateFilters(data) {
  const countrySelect = document.getElementById("filter-country");
  const portSelect = document.getElementById("filter-port");
  if (!countrySelect || !portSelect) return;

  // 保留当前选择
  const prevCountry = countrySelect.value || "";
  const prevPort = portSelect.value || "";

  // 国家列表（去重、排序）
  const countries = [...new Set(data.map(e => e.country))].filter(Boolean).sort();

  // 端口列表（去重、数字排序）
  const ports = [...new Set(data.map(e => e.port))].filter(Boolean).sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return ("" + a).localeCompare("" + b);
    return na - nb;
  });

  // 国家下拉：显示中文，值用英文代码
  countrySelect.innerHTML = `<option value="">全部</option>`;
  for (const code of countries) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = countryMap[code] || code;
    countrySelect.appendChild(opt);
  }

  // 端口下拉
  portSelect.innerHTML = `<option value="">全部</option>`;
  for (const p of ports) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    portSelect.appendChild(opt);
  }

  // 恢复之前的选择（若仍然存在）
  if ([...countrySelect.options].some(o => o.value === prevCountry)) {
    countrySelect.value = prevCountry;
  }
  if ([...portSelect.options].some(o => o.value === prevPort)) {
    portSelect.value = prevPort;
  }
}

// ========== 工具按钮 ==========
function copyIPs() {
  const list = filteredData.map(e => e.ip).join("\n");
  if (!list) return alert("暂无可复制的 IP");
  navigator.clipboard.writeText(list).then(() => alert("已复制全部 IP"));
}

function copyAll() {
  const list = filteredData.map(e => `${e.ip},${e.port},${e.country},${e.provider}`).join("\n");
  if (!list) return alert("暂无可复制的信息");
  navigator.clipboard.writeText(list).then(() => alert("已复制全部信息"));
}

function manualRefresh() {
  // 手动刷新：重新拉取 alive.txt，并保持下拉映射与选择
  loadData();
}

// ========== 时钟与自动刷新 ==========
function startClock() {
  stopClock();
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
}

function stopClock() {
  if (clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

function updateClock() {
  const el = document.getElementById("current-time");
  if (el) {
    el.textContent = "当前时间: " + new Date().toLocaleTimeString();
  }
}

function startAutoRefresh(intervalMs = 10 * 60 * 1000) { // 默认 10 分钟
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => {
    // 自动刷新时，保留当前筛选条件
    const countryVal = document.getElementById("filter-country").value;
    const portVal = document.getElementById("filter-port").value;

    loadData().then(() => {
      // 恢复筛选条件并应用
      const cs = document.getElementById("filter-country");
      const ps = document.getElementById("filter-port");
      if (cs && [...cs.options].some(o => o.value === countryVal)) cs.value = countryVal;
      if (ps && [...ps.options].some(o => o.value === portVal)) ps.value = portVal;
      filterData();
    });
  }, intervalMs);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// ========== 初始化 ==========
function bindEvents() {
  const btnFilter = document.getElementById("btn-filter");
  const btnRefresh = document.getElementById("btn-refresh");
  const btnCopyIP = document.getElementById("btn-copy-ip");
  const btnCopyAll = document.getElementById("btn-copy-all");
  const btnLoadMore = document.getElementById("btn-load-more");

  if (btnFilter) btnFilter.addEventListener("click", filterData);
  if (btnRefresh) btnRefresh.addEventListener("click", manualRefresh);
  if (btnCopyIP) btnCopyIP.addEventListener("click", copyIPs);
  if (btnCopyAll) btnCopyAll.addEventListener("click", copyAll);
  if (btnLoadMore) btnLoadMore.addEventListener("click", handleLoadMore);

  // 选择变化立即筛选（可选，如果你想实时筛选可以开启）
  const countrySelect = document.getElementById("filter-country");
  const portSelect = document.getElementById("filter-port");
  if (countrySelect) countrySelect.addEventListener("change", filterData);
  if (portSelect) portSelect.addEventListener("change", filterData);
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  startClock();
  await loadCountryMap(); // 先加载中文映射
  await loadData();       // 再加载数据并渲染
  startAutoRefresh();     // 每 10 分钟自动刷新一次
});
