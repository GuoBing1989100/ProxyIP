let proxyData = [];

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

    renderTable(proxyData);
  } catch (err) {
    console.error("读取 alive.txt 失败:", err);
    document.getElementById("proxy-table").innerHTML =
      `<tr><td colspan="4">加载失败</td></tr>`;
  }
}

function renderTable(data) {
  const tbody = document.getElementById("proxy-table");
  tbody.innerHTML = "";
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4">无数据</td></tr>`;
    return;
  }
  data.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.ip}</td>
      <td>${e.port}</td>
      <td>${e.country}</td>
      <td>${e.provider}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterData() {
  const country = document.getElementById("filter-country").value.trim().toUpperCase();
  const port = document.getElementById("filter-port").value.trim();
  let filtered = proxyData;
  if (country) filtered = filtered.filter(e => e.country.toUpperCase() === country);
  if (port) filtered = filtered.filter(e => e.port === port);
  renderTable(filtered);
}

function copyIPs() {
  const ips = proxyData.map(e => e.ip).join("\n");
  if (!ips) return alert("暂无可复制的 IP");
  navigator.clipboard.writeText(ips).then(() => alert("已复制全部 IP"));
}

function copyAll() {
  const all = proxyData.map(e => `${e.ip},${e.port},${e.country},${e.provider}`).join("\n");
  if (!all) return alert("暂无可复制的信息");
  navigator.clipboard.writeText(all).then(() => alert("已复制全部信息"));
}

function updateClock() {
  document.getElementById("current-time").textContent =
    "当前时间: " + new Date().toLocaleTimeString();
}

document.getElementById("btn-filter").addEventListener("click", filterData);
document.getElementById("btn-refresh").addEventListener("click", loadData);
document.getElementById("btn-copy-ip").addEventListener("click", copyIPs);
document.getElementById("btn-copy-all").addEventListener("click", copyAll);

setInterval(updateClock, 1000);
updateClock();
loadData();
