'use strict';

const CODE_PATTERN = /^([A-Z0-9]+)[.](\d{3})([a-z]?)$/;
const OI_ORDER = Object.freeze(['G1','C1','B1','B2','Y1','Y2','Y3','Y4']);

function text(value){ return String(value == null ? '' : value).trim(); }
function upper(value){ return text(value).toUpperCase(); }
function unique(values){ return [...new Set((values || []).map(upper).filter(Boolean))]; }

function parseEventCode(value){
  const match = upper(value).match(/^([A-Z0-9]+)[.](\d{3})([A-Z]?)$/);
  if(!match) return null;
  return { statCom:match[1],sequence:Number(match[2]),suffix:(match[3] || '').toLowerCase() };
}

function formatEventCode(statCom,sequence,suffix = ''){
  const prefix = upper(statCom);
  const number = Number(sequence);
  const tail = text(suffix).toLowerCase();
  if(!prefix || !Number.isInteger(number) || number < 1 || number > 999 || (tail && !/^[a-z]$/.test(tail))){
    throw new Error('INVALID_EVENT_CODE_PARTS');
  }
  return `${prefix}.${String(number).padStart(3,'0')}${tail}`;
}

function chronology(row){
  return text(row.startsAt || (row.date && `${row.date}T${row.startTime || row.heure_debut || '00:00'}`));
}

function oiRank(value){
  const index = OI_ORDER.indexOf(upper(value));
  return index < 0 ? OI_ORDER.length : index;
}

function businessOrder(row){
  const ois = unique(row.oiCodes || row.ois).sort((a,b) => oiRank(a)-oiRank(b) || a.localeCompare(b));
  const sites = unique(row.siteCodes || (row.siteCode ? [row.siteCode] : [])).sort();
  const publics = unique(row.publicCodes || row.publics).sort();
  const rankedOis = ois.map((code) => `${String(oiRank(code)).padStart(2,'0')}:${code}`);
  return `${rankedOis.join(',')}|${sites.join(',')}|${publics.join(',')}`;
}

function stableIdentity(row){
  return text(row.eventId || row.evenementId || row.publicationKey || row.id);
}

function compareEvents(left,right){
  return chronology(left).localeCompare(chronology(right))
    || businessOrder(left).localeCompare(businessOrder(right), 'fr', { numeric:true })
    || stableIdentity(left).localeCompare(stableIdentity(right));
}

function consumedByStatCom(codes = []){
  const result = new Map();
  for(const value of codes){
    const parsed = parseEventCode(value);
    if(!parsed) continue;
    result.set(parsed.statCom,Math.max(result.get(parsed.statCom) || 0,parsed.sequence));
  }
  return result;
}

function initialAllocations(events = [],existingCodes = []){
  const consumed = consumedByStatCom(existingCodes);
  const allocations = [];
  const currentByEvent = new Map();
  for(const row of events){
    const current = parseEventCode(row.eventCode || row.codeCours);
    if(current){
      currentByEvent.set(stableIdentity(row),formatEventCode(current.statCom,current.sequence,current.suffix));
      consumed.set(current.statCom,Math.max(consumed.get(current.statCom) || 0,current.sequence));
    }
  }
  const byStatCom = new Map();
  for(const row of events){
    const eventId = stableIdentity(row);
    const statCom = upper(row.statCom || row.statcomCode || row.stat_com_code);
    if(!eventId || !statCom || currentByEvent.has(eventId)) continue;
    if(!byStatCom.has(statCom)) byStatCom.set(statCom,[]);
    byStatCom.get(statCom).push(row);
  }
  for(const [statCom,source] of [...byStatCom].sort(([a],[b]) => a.localeCompare(b))){
    const rows = source.slice().sort(compareEvents);
    let sequence = consumed.get(statCom) || 0;
    for(let index=0;index<rows.length;){
      const stamp = chronology(rows[index]);
      const simultaneous = [];
      while(index < rows.length && chronology(rows[index]) === stamp){ simultaneous.push(rows[index]); index += 1; }
      const byBusinessOrder = new Map();
      for(const row of simultaneous){
        const key = businessOrder(row);
        if(!byBusinessOrder.has(key)) byBusinessOrder.set(key,[]);
        byBusinessOrder.get(key).push(row);
      }
      for(const [,sameRank] of [...byBusinessOrder].sort(([a],[b]) => a.localeCompare(b,'fr',{ numeric:true }))){
        sequence += 1;
        if(sequence > 999) throw new Error(`EVENT_CODE_SEQUENCE_EXHAUSTED:${statCom}`);
        sameRank.sort((a,b) => stableIdentity(a).localeCompare(stableIdentity(b)));
        if(sameRank.length > 26) throw new Error(`EVENT_CODE_SUFFIX_EXHAUSTED:${statCom}.${String(sequence).padStart(3,'0')}`);
        sameRank.forEach((row,position) => allocations.push({
          eventId:stableIdentity(row),statCom,sequence,
          suffix:sameRank.length > 1 ? String.fromCharCode(97 + position) : '',
          eventCode:formatEventCode(statCom,sequence,sameRank.length > 1 ? String.fromCharCode(97 + position) : ''),
          startsAt:chronology(row),businessOrder:businessOrder(row)
        }));
      }
    }
    consumed.set(statCom,sequence);
  }
  return allocations;
}

function compareEventCodes(left,right){
  const a=parseEventCode(left); const b=parseEventCode(right);
  if(!a || !b) return text(left).localeCompare(text(right),'fr',{ numeric:true });
  return a.statCom.localeCompare(b.statCom) || a.sequence-b.sequence || a.suffix.localeCompare(b.suffix);
}

async function appendPersistedEventCode(query,input = {}){
  const eventId=text(input.eventId || input.evenementId);
  const statCom=upper(input.statCom || input.statcomCode);
  if(!eventId || !statCom) return null;
  const existing=(await query('select event_code from scope_event_code_allocations where evenement_id=$1',[eventId])).rows[0];
  if(existing) return existing.event_code;
  const timestamp=text(input.timestamp) || new Date().toISOString();
  const sequence=Number((await query(`insert into scope_event_code_sequences(statcom_code,last_number,updated_at)
    values ($1,1,$2) on conflict(statcom_code) do update
    set last_number=scope_event_code_sequences.last_number+1,updated_at=excluded.updated_at
    returning last_number`,[statCom,timestamp])).rows[0].last_number);
  if(sequence > 999) throw new Error(`EVENT_CODE_SEQUENCE_EXHAUSTED:${statCom}`);
  const eventCode=formatEventCode(statCom,sequence);
  await query(`insert into scope_event_code_allocations(
    event_code,evenement_id,statcom_code,sequence_number,suffix,allocated_at,metadata
  ) values ($1,$2,$3,$4,'',$5,$6::jsonb)`,[
    eventCode,eventId,statCom,sequence,timestamp,JSON.stringify(input.metadata || {})
  ]);
  return eventCode;
}

async function preparePersistedInitialCodes(query,candidates = [],input = {}){
  const rows=(candidates || []).filter((row) => upper(row.statCom || row.statcomCode));
  if(!rows.length) return [];
  const issued=(await query(`select event_code as code from scope_event_code_allocations
    union select code_cours as code from scope_evenements where code_cours is not null and trim(code_cours) <> ''`)).rows.map((row) => row.code);
  const allocations=initialAllocations(rows,issued);
  const timestamp=text(input.timestamp) || new Date().toISOString();
  for(const allocation of allocations){
    await query(`insert into scope_event_code_sequences(statcom_code,last_number,updated_at)
      values ($1,$2,$3) on conflict(statcom_code) do update
      set last_number=greatest(scope_event_code_sequences.last_number,excluded.last_number),updated_at=excluded.updated_at`,
    [allocation.statCom,allocation.sequence,timestamp]);
    await query(`insert into scope_event_code_allocations(
      event_code,evenement_id,statcom_code,sequence_number,suffix,allocated_at,metadata
    ) values ($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict(evenement_id) do nothing`,[
      allocation.eventCode,allocation.eventId,allocation.statCom,allocation.sequence,allocation.suffix,timestamp,
      JSON.stringify({ ...(input.metadata || {}),startsAt:allocation.startsAt,businessOrder:allocation.businessOrder })
    ]);
  }
  return allocations;
}

module.exports={
  CODE_PATTERN,OI_ORDER,parseEventCode,formatEventCode,initialAllocations,compareEventCodes,compareEvents,
  consumedByStatCom,appendPersistedEventCode,preparePersistedInitialCodes
};
