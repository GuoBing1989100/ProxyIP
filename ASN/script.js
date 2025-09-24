// 获取 IP 信息（使用 ipwhois.app，支持 HTTPS）
async function fetchIPInfo(ip){
  const url = `https://ipwhois.app/json/${encodeURIComponent(ip)}`;
  const res = await fetch(url, { headers:{ 'Accept':'application/json' } });
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
    org: data.org || (data.connection && data.connection.org) || '',
    isp: data.isp || (data.connection && data.connection.isp) || '',
    country: data.country || '',
    city: data.city || '',
    lat: data.latitude, lon: data.longitude,
    timezone: data.timezone || data.timezone_name || ''
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

// 点击 ASN 链接 → 打开详情
document.addEventListener('click', (e)=>{
  const a=e.target.closest('a.asn-link'); if(!a)return;
  const info=JSON.parse(decodeURIComponent(a.getAttribute('data-json')));
  const asnDisplay = info.asnText || (info.asnNum ? `AS${info.asnNum}` : 'N/A');
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
  asnModal.style.display='flex';
});

// 关闭弹窗
asnClose.addEventListener('click', ()=>{ asnModal.style.display='none'; });
asnModal.addEventListener('click', (e)=>{ if(e.target===asnModal) asnModal.style.display='none'; });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') asnModal.style.display='none'; });
