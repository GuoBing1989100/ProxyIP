let proxyData = [];
let filteredData = [];
let displayCount = 50; // 每次显示条数
let currentIndex = 0;  // 当前显示到哪一条

// 国家代号映射表（可扩展）
const countryMap = {
  "US": "美国",
  "CN": "中国",
  "JP": "日本",
  "HK": "香港",
  "TW": "台湾",
  "KR": "韩国",
  "SG": "新加坡",
  "DE": "德国",
  "FR": "法国",
  "GB": "英国",
  "AT": "奥地利"
};

async function loadData() {
  try {
    const res = await fetch("./alive.txt?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();

    proxyData = text.trim().split("\n").map(line => {
      const [ip, port, country, ...providerParts] = line.split(",");
      return {
        ip: ip?.trim() || "-",
        port: port?.trim() || "-",
        country: country?.trim() || "-",
        provider: providerParts.join(",").trim() || "-"
      };
    });

    filteredData = proxyData;
    generateFilters(proxyData);
    resetAndRender();
  } catch (err) {
    console.error("读取 alive.txt 失败:", err);
    document.getElementById("proxy-table").innerHTML =
      `<tr><td colspan="4">加载失败</td></tr>`;
  }
}

function resetAndRender() {
  currentIndex = 0;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("proxy-table");
  tbody.innerHTML = "";

  const slice = filteredData.slice(0, currentIndex + displayCount);
  slice.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.ip}</td>
      <td>${e.port}</td>
      <td>${countryMap[e.country] || e.country}</td>
      <td>${e.provider}</td>
    `;
    tbody.appendChild(tr);
  });

  currentIndex = slice.length;
  document.getElementById("btn-load-more").style.display =
    currentIndex < filteredData.length ? "inline-block" : "none";
}

function filterData() {
  const country = document.getElementById("filter-country").value;
  const port = document.getElementById("filter-port").value;

  filteredData = proxyData;
  if (country) filteredData = filteredData.filter(e => e.country === country);
  if (port) filteredData = filteredData.filter(e => e.port === port);

  resetAndRender();
}

function generateFilters(data) {
  const countries = [...new Set(data.map(e => e.country))].sort();
  const ports = [...new Set(data.map(e => e.port))].sort((a, b) => a - b);

  const countrySelect = document.getElementById("filter-country");
  const portSelect = document.getElementById("filter-port");

  countrySelect.innerHTML = `<option value="">全部</option>`;
  countries.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = countryMap[c] || c;
    countrySelect.appendChild(opt);
  });

  portSelect.innerHTML = `<option value="">全部</option>`;
  ports.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    portSelect.appendChild(opt);
  });
}

function copyIPs() {
  const ips = filteredData.map(e => e.ip).join("\n");
  if (!ips) return alert("暂无可复制的 IP");
  navigator.clipboard.writeText(ips).then(() => alert("已复制全部 IP"));
}

function copyAll() {
  const all = filteredData.map(e => `${e.ip},${e.port},${e.country},${e.provider}`).join("\n");
  if (!all) return alert("暂无可复制的信息");
  navigator.clipboard.writeText(all).then(() => alert("已复制全部信息"));
}

function updateClock() {
  document.getElementById("current-time").textContent =
    "当前时间: " + new Date().toLocaleTimeString();
}

// 事件绑定
document.getElementById("btn-filter").addEventListener("click", filterData);
document.getElementById("btn-refresh").addEventListener("click", loadData);
document.getElementById("btn-copy-ip").addEventListener("click", copyIPs);
document.getElementById("btn-copy-all").addEventListener("click", copyAll);
document.getElementById("btn-load-more").addEventListener("click", renderTable);

// 时钟
setInterval(updateClock, 1000);
updateClock();

// 初始加载
loadData();
