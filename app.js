const STORAGE_KEY = 'yiqing-closet-v1';
const fallbackWeather = [
  [27, 24, 1, 8], [28, 25, 2, 10], [29, 25, 3, 15], [30, 26, 61, 40], [27, 23, 80, 65],
  [25, 21, 3, 12], [26, 22, 2, 8], [28, 24, 1, 10], [29, 25, 0, 6], [27, 22, 3, 18]
];
const defaults = [
  { id:'shirt', name:'亚麻白衬衫', category:'top', color:'米白', warmth:2, occasion:'通勤', active:true, bg:'#dfded2' },
  { id:'tee', name:'雾蓝短袖 T 恤', category:'top', color:'蓝色', warmth:1, occasion:'休闲', active:true, bg:'#b8cbd0' },
  { id:'knit', name:'燕麦针织开衫', category:'outer', color:'米白', warmth:3, occasion:'通勤', active:true, bg:'#c8bcaa' },
  { id:'blazer', name:'深灰西装外套', category:'outer', color:'灰色', warmth:3, occasion:'通勤', active:true, bg:'#7c817d' },
  { id:'jeans', name:'直筒浅蓝牛仔裤', category:'bottom', color:'蓝色', warmth:2, occasion:'休闲', active:true, bg:'#9baec2' },
  { id:'trouser', name:'黑色阔腿西裤', category:'bottom', color:'黑色', warmth:2, occasion:'通勤', active:true, bg:'#4d504f' },
  { id:'loafer', name:'焦糖乐福鞋', category:'shoe', color:'棕色', warmth:2, occasion:'通勤', active:true, bg:'#a97850' },
  { id:'sneaker', name:'奶油运动鞋', category:'shoe', color:'米白', warmth:1, occasion:'休闲', active:true, bg:'#e6e0d4' }
];
let closet = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaults;
let forecast = [];
let selectedDay = 0;
let activeFilter = 'all';
let locationLabel = '上海';
let shuffleIndex = 0;
const $ = selector => document.querySelector(selector);

const weatherInfo = code => {
  if (code === 0) return ['☀', '晴朗'];
  if ([1, 2].includes(code)) return ['⛅', '少云'];
  if (code === 3) return ['☁', '阴天'];
  if ([45, 48].includes(code)) return ['〰', '有雾'];
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return ['☂', '有雨'];
  if ([71,73,75,77,85,86].includes(code)) return ['❄', '有雪'];
  return ['ϟ', '雷雨'];
};
const dayLabel = (date, index) => index === 0 ? '今天' : index === 1 ? '明天' : new Intl.DateTimeFormat('zh-CN', { weekday:'short' }).format(new Date(`${date}T12:00:00`)).replace('周','周');
const dateText = date => new Intl.DateTimeFormat('zh-CN', { month:'long', day:'numeric', weekday:'long' }).format(new Date(`${date}T12:00:00`));
const categoryLabel = { top:'上装', bottom:'下装', outer:'外套', shoe:'鞋履', dress:'连衣裙', accessory:'配饰' };
const saveCloset = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(closet));
const activeItems = () => closet.filter(item => item.active);
const toast = text => { const el=$('#toast'); el.textContent=text; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 2200); };

function currentWeather(day = forecast[selectedDay] || { max:27, min:24, code:1, rain:8, wind:10, uv:6 }) {
  const temp = Math.round((day.max + day.min) / 2);
  const [icon, status] = weatherInfo(day.code);
  $('#weatherIcon').textContent = icon;
  $('#currentTemp').textContent = `${temp}°`;
  $('#weatherStatus').textContent = status;
  $('#feelsLike').textContent = `体感 ${temp}°`;
  $('#rainChance').textContent = `${Math.round(day.rain)}%`;
  $('#windSpeed').textContent = `${Math.round(day.wind)} km/h`;
  $('#uvIndex').textContent = Math.round(day.uv || 5);
  $('#weatherSummary').textContent = day.rain > 45 ? '雨水可能来访，别忘了带上防水外套或伞。' : temp >= 28 ? '体感偏暖，适合轻盈、透气的搭配。' : temp <= 15 ? '空气微凉，用层次感把温度留在身边。' : '温度舒服，穿得轻松有型就好。';
  $('#selectedDateLabel').textContent = `${dateText(day.date)} · 推荐`;
}

function renderForecast() {
  const strip = $('#forecastStrip');
  strip.innerHTML = forecast.map((day, index) => {
    const [icon] = weatherInfo(day.code);
    return `<button class="forecast-day ${selectedDay===index?'selected':''}" data-day="${index}" aria-label="${dayLabel(day.date,index)}，${Math.round(day.max)}度"><b>${dayLabel(day.date,index)}</b><i>${icon}</i><small>${Math.round(day.max)}° / ${Math.round(day.min)}°</small></button>`;
  }).join('');
  strip.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => { selectedDay=Number(button.dataset.day); renderForecast(); refreshRecommendation(); }));
}

function selectPiece(category, targetWarmth, used) {
  const choices = activeItems().filter(item => item.category === category && !used.includes(item.id));
  return choices.sort((a,b) => Math.abs(a.warmth-targetWarmth) - Math.abs(b.warmth-targetWarmth))[shuffleIndex % Math.max(choices.length,1)];
}
function refreshRecommendation() {
  const day = forecast[selectedDay] || { max:27, min:24, rain:8, wind:10, code:1 };
  currentWeather(day);
  const average = (day.max + day.min) / 2;
  const warmth = average <= 9 ? 5 : average <= 16 ? 4 : average <= 22 ? 3 : average <= 27 ? 2 : 1;
  const used=[];
  let pieces = [];
  const dress = activeItems().find(item => item.category==='dress' && Math.abs(item.warmth-warmth)<=1);
  if (dress && shuffleIndex % 3 === 2) pieces.push(dress);
  else ['top','bottom'].forEach(category => { const piece=selectPiece(category,warmth,used); if(piece){pieces.push(piece);used.push(piece.id);} });
  if (average < 20 || day.rain > 45 || day.wind > 24) { const outer = selectPiece('outer', warmth+1, used); if(outer){pieces.push(outer); used.push(outer.id);} }
  const shoe = selectPiece('shoe', warmth, used); if(shoe) pieces.push(shoe);
  const featured = pieces.find(item => item.photo) || pieces[0];
  const preview = $('#lookPreview');
  preview.innerHTML = featured?.photo ? `<img src="${featured.photo}" alt="${featured.name}">` : `<span>${pieces.length ? '衣' : '＋'}</span>`;
  if (!pieces.length) {
    $('#outfitTitle').textContent='先添加几件衣服吧'; $('#outfitReason').textContent='衣橱里的单品越丰富，推荐就越懂你。'; $('#comfortChip').textContent='等待衣物'; $('#styleTip').textContent='从“添加”开始上传你的第一件衣服。'; return;
  }
  const names = pieces.map(piece=>piece.name).join(' + ');
  $('#outfitTitle').textContent = average < 16 ? '温暖层次感' : average > 28 ? '清爽轻盈感' : '自然松弛感';
  $('#outfitReason').textContent = `${names}。${day.rain > 45 ? '有降雨可能，优先选择好打理的鞋履。' : '按你的衣橱与体感温度搭配。'}`;
  $('#comfortChip').textContent = day.rain > 45 ? '雨天安心' : average > 27 ? '清爽透气' : '舒适通勤';
  $('#styleTip').textContent = day.rain > 45 ? '小提示：包里放一把折叠伞，出门会更安心。' : average < 20 ? '小提示：温差较大时，带上一件薄外套更从容。' : '小提示：露出一点脚踝或手腕，整体会更轻盈。';
  $('#viewPieces').onclick = () => showPieces(pieces);
}

function renderCloset() {
  const items = closet.filter(item => activeFilter==='all' || item.category===activeFilter);
  $('#activeCount').textContent = closet.filter(i=>i.active).length;
  $('#archivedCount').textContent = closet.filter(i=>!i.active).length;
  $('#closetGrid').innerHTML = items.length ? items.map(item => `<article class="item-card ${item.active?'':'archived'}" data-item="${item.id}"><button class="archive-dot" aria-label="查看 ${item.name}">•••</button><div class="item-photo" style="--item-bg:${item.bg || '#d9ddd2'}">${item.photo ? `<img src="${item.photo}" alt="${item.name}">` : item.name.slice(0,1)}</div><div class="item-info"><b>${item.name}</b><small>${categoryLabel[item.category] || item.category} · ${item.color}</small></div></article>`).join('') : '<p class="empty">这个类别还没有单品。</p>';
  $('#closetGrid').querySelectorAll('[data-item]').forEach(card => card.addEventListener('click', () => openItem(card.dataset.item)));
}
function openItem(id) {
  const item = closet.find(i=>i.id===id); const dialog = $('#itemDialog');
  $('#dialogContent').innerHTML = `${item.photo?`<img class="dialog-item-image" src="${item.photo}" alt="${item.name}">`:`<div class="dialog-icon">${item.name.slice(0,1)}</div>`}<p class="eyebrow" style="margin-top:16px">${categoryLabel[item.category]} · ${item.color}</p><h2>${item.name}</h2><p style="font-size:13px;color:#72776f">保暖程度 ${'●'.repeat(item.warmth)}${'○'.repeat(5-item.warmth)}${item.occasion?` · ${item.occasion}`:''}</p><div class="dialog-actions"><button id="archiveItem">${item.active?'下架单品':'重新上架'}</button><button class="danger" id="deleteItem">删除</button></div>`;
  dialog.showModal();
  $('#archiveItem').onclick=()=>{item.active=!item.active;saveCloset();renderCloset();refreshRecommendation();dialog.close();toast(item.active?'已重新上架':'已下架，可随时重新上架');};
  $('#deleteItem').onclick=()=>{closet=closet.filter(i=>i.id!==id);saveCloset();renderCloset();refreshRecommendation();dialog.close();toast('单品已删除');};
}
function showPieces(pieces) { switchView('closetView'); activeFilter='all'; document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all')); renderCloset(); toast(`本套包含 ${pieces.length} 件单品`); }
function switchView(viewId) { document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===viewId)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.goto===viewId)); window.scrollTo({top:0,behavior:'smooth'}); }

async function getWeather(lat=31.2304, lon=121.4737, label='上海') {
  $('#updatedAt').textContent='正在更新';
  try {
    const params = new URLSearchParams({latitude:lat,longitude:lon,timezone:'auto',forecast_days:'10',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max'});
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if(!response.ok) throw new Error('weather unavailable');
    const d=await response.json();
    forecast=d.daily.time.map((date,i)=>({date,max:d.daily.temperature_2m_max[i],min:d.daily.temperature_2m_min[i],code:d.daily.weather_code[i],rain:d.daily.precipitation_probability_max[i]||0,wind:d.daily.wind_speed_10m_max[i]||0,uv:d.daily.uv_index_max[i]||0}));
    locationLabel=label;
    $('#locationName').textContent=locationLabel; $('#updatedAt').textContent='刚刚更新';
  } catch (err) {
    const today=new Date(); forecast=fallbackWeather.map((values,i)=>{const d=new Date(today);d.setDate(today.getDate()+i);return {date:d.toISOString().slice(0,10),max:values[0],min:values[1],code:values[2],rain:values[3],wind:14,uv:5};});
    $('#updatedAt').textContent='离线示例';
  }
  selectedDay=0; renderForecast(); refreshRecommendation();
}
function requestLocation() {
  if (!navigator.geolocation) { toast('设备不支持定位，已显示上海天气'); return; }
  $('#updatedAt').textContent='正在定位';
  navigator.geolocation.getCurrentPosition(pos=>getWeather(pos.coords.latitude,pos.coords.longitude,'当前位置'), error=>{toast(error.code === 1 ? '定位权限未开启，请使用下方城市搜索' : '未取得定位，请使用下方城市搜索');getWeather();}, {timeout:10000,maximumAge:900000});
}
function renderCityResults(results) {
  const container = $('#cityResults');
  if (!results?.length) { container.innerHTML = '<p class="city-result">未找到该城市，请换一个名称试试。</p>'; return; }
  container.innerHTML = results.map((city, index) => `<button class="city-result" type="button" data-city-index="${index}"><b>${city.name}</b><span>${[city.admin1, city.country].filter(Boolean).join(' · ')}</span></button>`).join('');
  container.querySelectorAll('[data-city-index]').forEach(button => button.addEventListener('click', () => {
    const city = results[Number(button.dataset.cityIndex)];
    $('#cityResults').innerHTML = '';
    getWeather(city.latitude, city.longitude, [city.name, city.admin1].filter(Boolean).join(' · '));
    toast(`已切换到 ${city.name}`);
  }));
}
async function searchCity(event) {
  event.preventDefault();
  const query = $('#citySearchInput').value.trim();
  if (!query) return;
  $('#cityResults').innerHTML = '<p class="city-result">正在搜索城市…</p>';
  try {
    const params = new URLSearchParams({ name:query, count:'5', language:'zh', format:'json' });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) throw new Error('search unavailable');
    renderCityResults((await response.json()).results);
  } catch (error) {
    $('#cityResults').innerHTML = '<p class="city-result">暂时无法搜索，请检查网络后重试。</p>';
  }
}

$('#refreshWeather').addEventListener('click',requestLocation); $('#locationButton').addEventListener('click',requestLocation); $('#citySearchForm').addEventListener('submit',searchCity); $('#shuffleOutfit').addEventListener('click',()=>{shuffleIndex++;refreshRecommendation();toast('换一套看看');});
document.querySelectorAll('[data-goto]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.goto)));
$('#filterRow').addEventListener('click',event=>{const button=event.target.closest('.filter');if(!button)return;activeFilter=button.dataset.filter;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===button));renderCloset();});
$('#itemWarmth').addEventListener('input',event=>$('#warmthOutput').textContent=['','轻薄','偏薄','中等','保暖','很暖'][event.target.value]);
function attachPhotoInput() {
  $('#itemPhoto').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $('#photoPicker').dataset.image = reader.result;
      $('#photoPicker').innerHTML = `<input type="file" id="itemPhoto" accept="image/*" /><img src="${reader.result}" alt="待上传衣物预览">`;
      attachPhotoInput();
    };
    reader.readAsDataURL(file);
  });
}
attachPhotoInput();
$('#itemForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#itemName').value.trim();const item={id:`item-${Date.now()}`,name,category:$('#itemCategory').value,color:$('#itemColor').value,warmth:Number($('#itemWarmth').value),occasion:$('#itemOccasion').value.trim(),active:true,bg:'#cfd7c8',photo:$('#photoPicker').dataset.image||''};closet.unshift(item);saveCloset();event.target.reset();$('#warmthOutput').textContent='中等';$('#photoPicker').dataset.image='';$('#photoPicker').innerHTML='<input type="file" id="itemPhoto" accept="image/*" /><span class="photo-plus">＋</span><b>上传衣物照片</b><small>支持相册或拍照</small>';attachPhotoInput();renderCloset();refreshRecommendation();switchView('closetView');toast('已加入衣橱');});
$('.dialog-close').addEventListener('click',()=>$('#itemDialog').close());
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
renderCloset();getWeather();
