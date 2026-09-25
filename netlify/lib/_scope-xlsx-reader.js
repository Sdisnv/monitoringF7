'use strict';

const zlib = require('node:zlib');

function fail(message){ throw new Error(`XLSX_INVALID: ${message}`); }

function zipEntries(input){
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input || []);
  const minimum = Math.max(0,buffer.length - 65557);
  let eocd = -1;
  for(let offset = buffer.length - 22; offset >= minimum; offset -= 1){
    if(buffer.readUInt32LE(offset) === 0x06054b50){ eocd = offset;break; }
  }
  if(eocd < 0) fail('archive ZIP illisible');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for(let index = 0; index < count; index += 1){
    if(buffer.readUInt32LE(offset) !== 0x02014b50) fail('répertoire ZIP incohérent');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46,offset + 46 + nameLength).toString('utf8');
    if(buffer.readUInt32LE(localOffset) !== 0x04034b50) fail(`entrée ZIP invalide: ${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(start,start + compressedSize);
    let data;
    if(method === 0) data = compressed;
    else if(method === 8) data = zlib.inflateRawSync(compressed);
    else fail(`compression ZIP non supportée: ${method}`);
    if(data.length !== uncompressedSize) fail(`taille ZIP incohérente: ${name}`);
    entries.set(name,data);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlText(value){
  return String(value || '').replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_m,n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_m,n) => String.fromCodePoint(parseInt(n,16)))
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}

function attribute(tag,name){
  const match = String(tag).match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? xmlText(match[1]) : '';
}

function sharedStrings(entries){
  const file = entries.get('xl/sharedStrings.xml');
  if(!file) return [];
  const values = [];
  for(const match of file.toString('utf8').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)){
    const fragments = [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((part) => xmlText(part[1]));
    values.push(fragments.join(''));
  }
  return values;
}

function workbookSheets(entries){
  const workbook = (entries.get('xl/workbook.xml') || Buffer.alloc(0)).toString('utf8');
  const relationships = (entries.get('xl/_rels/workbook.xml.rels') || Buffer.alloc(0)).toString('utf8');
  const targets = new Map([...relationships.matchAll(/<Relationship\b[^>]*>/g)].map((match) => [attribute(match[0],'Id'),attribute(match[0],'Target')]));
  return [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((match) => {
    const target = targets.get(attribute(match[0],'r:id')) || '';
    const normalized = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//,'')}`;
    return { name: attribute(match[0],'name'),path: normalized.replace(/\/\.\//g,'/') };
  });
}

function columnIndex(reference){
  const letters = String(reference || '').match(/^[A-Z]+/i);
  if(!letters) return -1;
  return [...letters[0].toUpperCase()].reduce((value,letter) => value * 26 + letter.charCodeAt(0) - 64,0) - 1;
}

function parseCell(cell,strings){
  const type = attribute(cell,'t');
  const inline = cell.match(/<is(?:\s[^>]*)?>([\s\S]*?)<\/is>/);
  const value = cell.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
  if(inline) return [...inline[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((part) => xmlText(part[1])).join('');
  if(!value) return null;
  const raw = xmlText(value[1]);
  if(type === 's') return strings[Number(raw)] == null ? '' : strings[Number(raw)];
  if(type === 'b') return raw === '1';
  if(type === 'str' || type === 'e') return raw;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : raw;
}

function parseWorksheet(xml,strings){
  const rows = [];
  for(const rowMatch of String(xml).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const row = [];
    for(const cellMatch of rowMatch[1].matchAll(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g)){
      const ref = attribute(cellMatch[0],'r');
      const index = columnIndex(ref);
      if(index >= 0) row[index] = parseCell(cellMatch[0],strings);
    }
    rows.push(row);
  }
  return rows;
}

function readXlsx(input,options = {}){
  const entries = zipEntries(input);
  const strings = sharedStrings(entries);
  const sheets = workbookSheets(entries);
  const selected = options.sheetName ? sheets.find((sheet) => sheet.name === options.sheetName) : sheets[options.sheetIndex || 0];
  if(!selected) fail(`onglet introuvable: ${options.sheetName || options.sheetIndex || 0}`);
  const file = entries.get(selected.path);
  if(!file) fail(`contenu d'onglet introuvable: ${selected.path}`);
  return { sheetName: selected.name,sheetNames: sheets.map((sheet) => sheet.name),rows: parseWorksheet(file.toString('utf8'),strings) };
}

module.exports = { readXlsx,zipEntries,xmlText,columnIndex };
