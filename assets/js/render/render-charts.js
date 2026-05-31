/* Monitoring F7 v65 — rendu graphiques centralisé robuste.
   Phase 5: rationalisation KPI/graphiques, protections Chart.js, canvas vide/absent, NaN/Infinity. */
(function(){
  'use strict';
  const CHART_FONT_FAMILY = 'Arial, Helvetica, sans-serif';
  const CHART_COLORS = ['#CB4B40','#2A2D73','#DE9043','#575756','#B3B6BE','#7A7DA8','#D06A5F','#5A5D9A','#F0C48A','#8C8FAF'];
  const DOMAIN_COLOR_MAP = { DPS: '#2A2D73', DAP: '#DE9043', FOBA: '#CB4B40', PR: '#575756', AUTO: '#B3B6BE', JSP: '#7A7DA8' };

  function warn(message, detail){
    try { console.warn(`[Monitoring F7 v65] ${message}`, detail || ''); } catch (_) {}
    try { window.MonitoringAuditLog?.logWarning('chart-warning', message, { detail }); } catch (_) {}
  }
  function safeNumber(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function safePercent(value){
    const n = safeNumber(value, 0);
    return Math.max(0, Math.min(100, n));
  }
  function normalizeData(values, options = {}){
    const list = Array.isArray(values) ? values : [];
    return list.map(v => {
      const n = safeNumber(v, 0);
      if(options.percent) return safePercent(n);
      return n;
    });
  }
  function cleanSeries(labels, values, options = {}){
    const cleanLabels = Array.isArray(labels) ? labels.map(label => String(label ?? '').trim() || 'Sans libellé') : [];
    const cleanValues = normalizeData(values, options);
    const length = Math.min(cleanLabels.length, cleanValues.length);
    const pairs = [];
    for(let i = 0; i < length; i += 1){
      const value = cleanValues[i];
      if(options.keepZeros || value !== 0) pairs.push({ label: cleanLabels[i], value });
    }
    if(!pairs.length && length > 0 && options.allowAllZero){
      for(let i = 0; i < length; i += 1) pairs.push({ label: cleanLabels[i], value: cleanValues[i] });
    }
    return { labels: pairs.map(p => p.label), values: pairs.map(p => p.value) };
  }
  function isChartJsAvailable(){
    return typeof window !== 'undefined' && typeof window.Chart !== 'undefined';
  }
  function getContext(canvas){
    if(!canvas || typeof canvas.getContext !== 'function') return null;
    try { return canvas.getContext('2d'); } catch (err) { warn('Canvas graphique indisponible.', err); return null; }
  }
  function setupHiDPICanvas(canvas){
    if(!canvas) return null;
    const ctx = getContext(canvas);
    if(!ctx) return null;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.width, height: canvas.height };
    const cssWidth = Math.max(320, Math.floor(rect.width || canvas.clientWidth || canvas.width || 640));
    const cssHeight = Math.max(220, Math.floor(rect.height || canvas.clientHeight || canvas.height || 320));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.floor(cssWidth * dpr);
    const pixelHeight = Math.floor(cssHeight * dpr);
    if(canvas.width !== pixelWidth || canvas.height !== pixelHeight){ canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.textBaseline = 'alphabetic';
    ctx.imageSmoothingEnabled = true;
    return { ctx, w: cssWidth, h: cssHeight, dpr };
  }
  function destroyChart(canvas){
    if(!canvas) return;
    try {
      if(canvas._chartInstance && typeof canvas._chartInstance.destroy === 'function') canvas._chartInstance.destroy();
    } catch (err) { warn('Destruction graphique précédente incomplète.', err); }
    canvas._chartInstance = null;
  }
  function drawEmptyChart(canvas, message = 'Aucune donnée exploitable'){
    if(!canvas) { warn(message); return; }
    destroyChart(canvas);
    const prepared = setupHiDPICanvas(canvas);
    if(!prepared) return;
    const { ctx, w, h } = prepared;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#6b7280'; ctx.font = `15px ${CHART_FONT_FAMILY}`; ctx.textAlign = 'center';
    ctx.fillText(message, w/2, h/2);
  }
  function getChartColor(index){ return CHART_COLORS[Math.abs(index || 0) % CHART_COLORS.length]; }
  function getDomainColor(domain){ return DOMAIN_COLOR_MAP[String(domain || '').toUpperCase()] || getChartColor(0); }
  function getDomainColorFromLabel(label){
    const value = String(label || '').toUpperCase();
    if(value.startsWith('DPS')) return getDomainColor('DPS');
    if(value.startsWith('DAP')) return getDomainColor('DAP');
    if(value.startsWith('FOBA')) return getDomainColor('FOBA');
    if(value.startsWith('PR')) return getDomainColor('PR');
    if(value.startsWith('AUTO') || value.startsWith('COND ')) return getDomainColor('AUTO');
    if(value.startsWith('JSP') || value.startsWith('CADETS')) return getDomainColor('JSP');
    return getChartColor(0);
  }
  function wrapCanvasLabel(ctx, text, maxWidth, maxLines = 4){
    const words = String(text || '').split(/\s+/).filter(Boolean); if(!words.length) return [''];
    const lines = []; let current = words[0];
    for(const word of words.slice(1)){
      const test = `${current} ${word}`;
      if(ctx.measureText(test).width <= maxWidth || current === '') current = test;
      else { lines.push(current); current = word; }
    }
    lines.push(current);
    if(lines.length > maxLines){
      const trimmed = lines.slice(0, maxLines);
      while(ctx.measureText(trimmed[maxLines-1] + '…').width > maxWidth && trimmed[maxLines-1].length > 1){ trimmed[maxLines-1] = trimmed[maxLines-1].slice(0,-1); }
      trimmed[maxLines-1] += '…'; return trimmed;
    }
    return lines;
  }
  function hasUsefulData(values){ return Array.isArray(values) && values.some(v => safeNumber(v, 0) !== 0); }
  function drawBarChart(canvas, labels, values, title, colors = null){
    if(!canvas) return warn(`Graphique absent: ${title || 'barres'}`);
    destroyChart(canvas);
    const series = cleanSeries(labels, values, { keepZeros: true, allowAllZero: true });
    if(!series.labels.length) return drawEmptyChart(canvas, 'Aucune donnée pour ce graphique');
    if(!hasUsefulData(series.values)) return drawEmptyChart(canvas, 'Aucune valeur significative à afficher');
    const prepared = setupHiDPICanvas(canvas); if(!prepared) return;
    const { ctx, w, h } = prepared;
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
    const pad = {top:38,right:24,bottom:100,left:54}; const maxVal = Math.max(...series.values.map(v => Math.abs(v)), 1);
    const chartW = Math.max(120, w - pad.left - pad.right); const chartH = Math.max(80, h - pad.top - pad.bottom);
    ctx.strokeStyle = 'rgba(15,23,42,0.15)'; ctx.beginPath(); ctx.moveTo(pad.left,pad.top); ctx.lineTo(pad.left,pad.top+chartH); ctx.lineTo(pad.left+chartW,pad.top+chartH); ctx.stroke();
    ctx.fillStyle = '#1c1f24'; ctx.font = `700 15px ${CHART_FONT_FAMILY}`; ctx.textAlign = 'left'; ctx.fillText(title || 'Graphique', pad.left, 22);
    const barGap = Math.max(8, Math.floor(chartW / Math.max(series.labels.length * 5, 14)));
    const barW = Math.max(14, (chartW - barGap*(series.labels.length+1))/Math.max(series.labels.length,1));
    ctx.font = `11px ${CHART_FONT_FAMILY}`;
    series.labels.forEach((label, i) => {
      const x = pad.left + barGap + i*(barW+barGap); const bh = (Math.abs(series.values[i])/maxVal) * (chartH-12); const y = pad.top + chartH - bh;
      ctx.fillStyle = colors && colors[i] ? colors[i] : getChartColor(i); if(bh > 0) ctx.fillRect(x,y,barW,bh);
      ctx.fillStyle = '#334155'; ctx.font = `11px ${CHART_FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.fillText(String(series.values[i]), x+barW/2, y-6);
      wrapCanvasLabel(ctx, label, Math.max(barW + barGap, 58), 4).forEach((line, idx) => ctx.fillText(line, x+barW/2, pad.top+chartH+18+idx*12));
    });
  }
  function drawHorizontalBarChart(canvas, labels, values, title, colors = null){
    if(!canvas) return warn(`Graphique absent: ${title || 'barres horizontales'}`);
    destroyChart(canvas);
    const series = cleanSeries(labels, values, { keepZeros: true, allowAllZero: true });
    if(!series.labels.length) return drawEmptyChart(canvas, 'Aucune donnée pour ce graphique');
    if(!hasUsefulData(series.values)) return drawEmptyChart(canvas, 'Aucune valeur significative à afficher');
    const prepared = setupHiDPICanvas(canvas); if(!prepared) return;
    const { ctx, w, h } = prepared;
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h); ctx.fillStyle = '#1c1f24'; ctx.font = `700 15px ${CHART_FONT_FAMILY}`; ctx.textAlign = 'left'; ctx.fillText(title || 'Graphique', 24, 22);
    const pad = {top:48,right:50,bottom:24,left:260}; const chartW = Math.max(180, w-pad.left-pad.right-50); const rowH = Math.max(24, Math.floor((h-pad.top-pad.bottom)/Math.max(series.labels.length,1))); const maxVal = Math.max(...series.values.map(v => Math.abs(v)),1);
    series.labels.forEach((label,i)=>{ const y = pad.top + i*rowH + 2; ctx.fillStyle='#334155'; ctx.font=`12px ${CHART_FONT_FAMILY}`; ctx.textAlign='right'; wrapCanvasLabel(ctx,label,pad.left-24,2).forEach((line,idx)=>ctx.fillText(line,pad.left-12,y+11+idx*11)); ctx.fillStyle='rgba(15,23,42,0.07)'; ctx.fillRect(pad.left,y,chartW,14); const bw=(Math.abs(series.values[i])/maxVal)*chartW; ctx.fillStyle=colors&&colors[i]?colors[i]:getChartColor(i); if(bw>0) ctx.fillRect(pad.left,y,bw,14); ctx.fillStyle='#334155'; ctx.textAlign='left'; ctx.fillText(String(series.values[i]),pad.left+chartW+10,y+12); });
  }
  function drawHorizontalDualBarChart(canvas, labels, targetValues, actualValues, title, colors = []){
    if(!canvas) return warn(`Graphique absent: ${title || 'objectifs'}`);
    destroyChart(canvas);
    labels = Array.isArray(labels) ? labels.map(v => String(v || '').trim() || 'Sans libellé') : [];
    targetValues = normalizeData(targetValues, { percent:true }); actualValues = normalizeData(actualValues, { percent:true });
    const length = Math.min(labels.length, targetValues.length, actualValues.length);
    if(!length) return drawEmptyChart(canvas, 'Aucun objectif exploitable');
    labels = labels.slice(0, length); targetValues = targetValues.slice(0, length); actualValues = actualValues.slice(0, length);
    if(!hasUsefulData(targetValues) && !hasUsefulData(actualValues)) return drawEmptyChart(canvas, 'Aucun objectif exploitable');
    const prepared = setupHiDPICanvas(canvas); if(!prepared) return;
    const { ctx, w, h } = prepared;
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#1c1f24'; ctx.font=`700 15px ${CHART_FONT_FAMILY}`; ctx.textAlign='left'; ctx.fillText(title || 'Objectif vs réel',24,22);
    const pad={top:52,right:170,bottom:28,left:110}; const chartW=Math.max(220,w-pad.left-pad.right-20); const rowH=Math.max(32,Math.floor((h-pad.top-pad.bottom)/Math.max(labels.length,1))); const maxVal=Math.max(100,...targetValues,...actualValues,1);
    labels.forEach((label,i)=>{ const y=pad.top+i*rowH+3; ctx.fillStyle='#334155'; ctx.font=`12px ${CHART_FONT_FAMILY}`; ctx.textAlign='left'; ctx.fillText(label,24,y+14); ctx.fillStyle='rgba(15,23,42,0.07)'; ctx.fillRect(pad.left,y,chartW,12); const targetW=(targetValues[i]/maxVal)*chartW; const actualW=(actualValues[i]/maxVal)*chartW; ctx.fillStyle='rgba(179,182,190,0.75)'; ctx.fillRect(pad.left,y,targetW,12); ctx.fillStyle=colors[i]||getChartColor(i); ctx.fillRect(pad.left,y,actualW,12); ctx.fillStyle='#334155'; ctx.font=`11px ${CHART_FONT_FAMILY}`; ctx.textAlign='left'; ctx.fillText(`${actualValues[i].toFixed(1)}% / obj ${targetValues[i].toFixed(0)}%`,pad.left+chartW+12,y+10); });
  }
  function drawPieChart(canvas, labels, values, title, colors = null){
    if(!canvas) return warn(`Graphique absent: ${title || 'camembert'}`);
    destroyChart(canvas);
    const series = cleanSeries(labels, values, { keepZeros: false });
    if(!series.labels.length || !hasUsefulData(series.values)) return drawEmptyChart(canvas, 'Aucune valeur significative à afficher');
    const prepared = setupHiDPICanvas(canvas); if(!prepared) return;
    const { ctx, w, h } = prepared; ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.fillStyle='#1c1f24'; ctx.font=`700 15px ${CHART_FONT_FAMILY}`; ctx.textAlign='left'; ctx.fillText(title || 'Graphique',24,22);
    const total = series.values.reduce((a,b)=>a+Math.max(0,b),0) || 1; const cx=Math.min(190, w*0.32), cy=Math.min(180, h*0.56), r=Math.min(95, Math.max(55, Math.min(w,h)*0.25)); let start=-Math.PI/2;
    series.values.forEach((value,i)=>{ const angle=(Math.max(0,value)/total)*Math.PI*2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+angle); ctx.closePath(); ctx.fillStyle=colors&&colors[i]?colors[i]:getChartColor(i); ctx.fill(); start += angle; });
    series.labels.slice(0, 10).forEach((label,i)=>{ const y=62+i*24; ctx.fillStyle=colors&&colors[i]?colors[i]:getChartColor(i); ctx.fillRect(Math.max(320, w*0.52),y,14,14); ctx.fillStyle='#334155'; ctx.font=`12px ${CHART_FONT_FAMILY}`; ctx.textAlign='left'; ctx.fillText(`${label} (${series.values[i]})`,Math.max(342, w*0.52+22),y+12); });
  }
  function drawLineChart(canvas, labels, data, label){
    if(!canvas) return warn(`Graphique absent: ${label || 'ligne'}`);
    labels = Array.isArray(labels) ? labels.map(v => String(v ?? '')) : []; data = normalizeData(data, { percent:true });
    if(!labels.length || !hasUsefulData(data)) return drawEmptyChart(canvas, 'Aucune évolution exploitable');
    if(!isChartJsAvailable()) return drawBarChart(canvas, labels, data, label);
    destroyChart(canvas);
    try { canvas._chartInstance = new Chart(canvas.getContext('2d'), { type:'line', data:{ labels, datasets:[{ label: label || 'Taux', data, borderColor:'#c1121f', backgroundColor:'rgba(193,18,31,0.08)', fill:true, tension:0.35, pointRadius:4, pointBackgroundColor:'#c1121f' }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: ctx => `${safeNumber(ctx.parsed.y).toFixed(1)} %` } } }, scales:{ y:{ min:0, max:100, ticks:{ callback:v=>v+'%' } } } } }); }
    catch(err){ warn('Graphique ligne Chart.js indisponible, rendu canvas simple.', err); drawBarChart(canvas, labels, data, label); }
  }
  function drawDoughnutChart(canvas, labels, data, title, colors = ['#CB4B40','#DE9043','#2A2D73','#575756','#B3B6BE']){
    if(!canvas) return warn(`Graphique absent: ${title || 'anneau'}`);
    labels = Array.isArray(labels) ? labels.map(v => String(v ?? '')) : []; data = normalizeData(data);
    if(!labels.length || !hasUsefulData(data)) return drawEmptyChart(canvas, 'Aucune valeur significative à afficher');
    if(!isChartJsAvailable()) return drawPieChart(canvas, labels, data, title, colors);
    destroyChart(canvas);
    try { canvas._chartInstance = new Chart(canvas.getContext('2d'), { type:'doughnut', data:{ labels, datasets:[{ data, backgroundColor: colors }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' }, tooltip:{ callbacks:{ label: ctx => { const total = ctx.dataset.data.reduce((a,b)=>a+safeNumber(b),0); const pct = total > 0 ? (100 * safeNumber(ctx.parsed) / total).toFixed(1) : '0.0'; return `${ctx.label}: ${ctx.parsed} (${pct}%)`; } } } } } }); }
    catch(err){ warn('Graphique anneau Chart.js indisponible, rendu canvas simple.', err); drawPieChart(canvas, labels, data, title, colors); }
  }

  const api = Object.freeze({ setupHiDPICanvas, destroyChart, drawEmptyChart, getChartColor, getDomainColor, getDomainColorFromLabel, wrapCanvasLabel, drawBarChart, drawHorizontalBarChart, drawHorizontalDualBarChart, drawPieChart, drawLineChart, drawDoughnutChart, normalizeData, safeNumber, safePercent });
  window.MonitoringRenderCharts = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.charts = api;
})();
