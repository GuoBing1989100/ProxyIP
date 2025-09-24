// 获取 IP 信息（使用 ipwhois.app，支持 HTTPS）
async function fetchIPInfo(ip){
  const url = `https://ipwhois.app/json/${encodeURIComponent(ip)}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    ip: data.ip || ip,
    asnText: data.as || data.asn || '',
    asnNum: (() => {
      const m = (data.as || '').match(/AS(\d+)/i);
      if (m) return m[1];
      if (/^\d+$/.test(String(data.asn||''))) return String(data.asn);
      return '';
    })(),
    org: data.org || '',
    isp: data.isp || '',
    country: data.country || '',
    city: data.city || '',
    lat: data.latitude, lon: data.longitude,
    timezone: data.timezone || ''
  };
}

const queryBtn=document.getElementById('queryBtn');
const msgEl=document.getElementById('msg');
const tbody=document.querySelector('#resultTable tbody');
const ipListEl=document.getElementById('ipList');

// 查询按钮逻辑
queryBtn.addEventListener('click', async ()=>{
  const ips=ipListEl.value.trim().split('\n').map(s=>s.trim()).filter(Boolean);
  msgEl.textContent=''; tbody.innerHTML='';
  if(ips.length===0){ msgEl.textContent='请粘贴至少一个 IP。'; return; }
  if(ips.length>50){ msgEl.textContent='⚠️ 每次最多查询 50 个 IP，请减少数量。'; return; }

  queryBtn.disabled=true; queryBtn.textContent='查询中…';
  try{
    for(const ip of ips){
      try{
        const info=await fetchIPInfo(ip);
        const tr=document.createElement('tr');
        const asnDisplay = info.asnText || (info.asnNum ? `AS${info.asnNum}`:'');
        tr.innerHTML=`
          <td>${info.ip}</td>
          <td>${asnDisplay
                ? `<a class="asn-link" data-json='${encodeURIComponent(JSON.stringify(info))}'>${asnDisplay}</a>`
                : 'N/A'}</td>
          <td>${info.org||'N/A'}</td>
          <td>${info.isp||'N/A'}</td>
          <td>${info.country||'N/A'}</td>
          <td>${info.city||'N/A'}</td>
          <td>${(info.lat!=null && info.lon!=null)?info.lat+', '+info.lon:'N/A'}</td>
          <td>${info.timezone||'N/A'}</td>`;
        tbody.appendChild(tr);
      }catch{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td>${ip}</td><td colspan="7">查询失败</td>`;
        tbody.appendChild(tr);
      }
    }
  }finally{
    queryBtn.disabled=false; queryBtn.textContent='查询';
  }
});

// 弹窗逻辑
const asnModal=document.getElementById('asnModal');
const asnContent=document.getElementById('asnContent');
const asnClose=document.getElementById('asnClose');
const historyDate=document.getElementById('historyDate');
const historyBtn=document.getElementById('historyBtn');
const historySummary=document.getElementById('historySummary');
const historyList=document.getElementById('historyList');

let currentASN = '';
let currentInfo = null;

// 点击 ASN 链接 → 打开详情
document.addEventListener('click', (e)=>{
  const a=e.target.closest('a.asn-link'); if(!a)return;
  const info=JSON.parse(decodeURIComponent(a.getAttribute('data-json')));
  currentInfo = info;
  currentASN = info.asnNum || ((info.asnText||'').match(/AS(\d+)/i)?.[1] || '');

  const asnDisplay = info.asnText || (currentASN ? `AS${currentASN}` : 'N/A');
  asnContent.innerHTML=`
    <p><b>IP 地址：</b> ${info.ip}</p>
    <p><b>自治系统号 (ASN)：</b> ${asnDisplay}</p>
    <p><b>组织：</b> ${info.org||'N/A'}</p>
    <p><b>运营商 (ISP)：</b> ${info.isp||'N/A'}</p>
    <p><b>国家：</b> ${info.country||'N/A'}</p>
    <p><b>城市：</b> ${info.city||'N/A'}</p>
    <p><b>经纬度：</b> ${(info.lat!=null && info.lon!=null)?info.lat+', '+info.lon:'N/A'}</p>
    <p><b>时区：</b> ${info.timezone||'N/A'}</p>
  `;

  // 默认日期设为今天 UTC
  const todayUTC = new Date();
  const yyyy = todayUTC.getUTCFullYear();
  const mm = String(todayUTC.getUTCMonth()+1).padStart(2,'0');
  const dd = String(todayUTC.getUTCDate()).padStart(2,'0');
  historyDate.value = `${yyyy}-${mm}-${dd}`;
  historySummary.textContent = '';
  historyList.innerHTML = '';

  asnModal.style.display='flex';
});

// 关闭弹窗
asnClose.addEventListener('click', ()=>{ asnModal.style.display='none'; });
asnModal.addEventListener('click', (e)=>{ if(e.target===asnModal) asnModal.style.display='none'; });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') asnModal.style.display='none'; });

// 查以往按钮
historyBtn.addEventListener('click', async ()=>{
  if(!currentASN){ historySummary.textContent='未识别到 ASN 编号。'; return; }
  const d = historyDate.value;
  if(!d){ historySummary.textContent='请先选择日期。'; return; }
  historySummary.textContent = '查询中…';
  historyList.innerHTML = '';

  const start = `${d}T00:00:00`;
  const end   = `${d}T23:59:59`;
  const url = `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${encodeURIComponent(currentASN)}&starttime=${encodeURIComponent(start)}&endtime=${encodeURIComponent(end)}`;

  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error('RIPEstat 请求失败');
    const json = await res.json();
    const prefixes = (json && json.data && json.data.prefixes) ? json.data.prefixes : [];
    const uniqSet = new Set(prefixes.map(p=>p.prefix || p));
    const uniq = Array.from(uniqSet);

    historySummary.textContent = `日期：${d} (UTC)，公告前缀数量：${uniq.length}`;
    if(uniq.length === 0){
      historyList.innerHTML = '<div class="small-note">该日期区间未检索到前缀公告数据或 ASN 未公告。</div>';
    }else{
      const sample = uniq.slice(0, 50);
      historyList.innerHTML = sample.map(px=>`<div class="pill">${px}</div>`).join('') +
        (uniq.length>50 ? `<div class="small-note">仅显示前 50 条，共 ${uniq.length} 条。</div>` : '');
    }
  } catch(err) {
    historySummary.textContent = '查询失败：' + (err && err.message ? err.message : '网络或服务错误');
    historyList.innerHTML = '';
  }
});
