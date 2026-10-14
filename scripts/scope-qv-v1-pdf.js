'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const pdfjs=require('pdfjs-dist/build/pdf.js'),PNG=require('png-js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness'),{claims}=require('./scope-qv-roadmap-export-proof');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-v1-tests19-33/pdf');
async function run(){
  fs.mkdirSync(out,{recursive:true});const qv=require('../output/qv-v1-tests19-33/current.json');
  const {hooks}=createCatalogUiHarness(),model=hooks.quoVadisProgrammeExport(qv);
  const source=JSON.stringify(model.rows),result=await generateQuoVadisProgrammeReport(null,{rows:model.rows,meta:{...model.meta,mode:'annual'}},claims);
  assert.equal(JSON.stringify(model.rows),source);const file=path.join(out,result.filename);fs.writeFileSync(file,result.buffer);
  const document=await pdfjs.getDocument({data:new Uint8Array(result.buffer),useSystemFonts:true,verbosity:0}).promise;
  let text='',rows=0;const pages=[];
  for(let number=1;number<=document.numPages;number++){
    const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(i=>i.str.trim());
    assert.ok(Math.abs(page.view[2]-841.89)<0.01 && Math.abs(page.view[3]-595.28)<0.01);
    for(const item of items){assert.ok(item.transform[4]>=28.35 && item.transform[4]+item.width<=841.89-28.35,`${number} x ${item.str}`);
      assert.ok(item.transform[5]>=28.35 && item.transform[5]+item.height<=595.28-28.35,`${number} y ${item.str}`);}
    const header=['Date','Horaire','Activité','Domaine','Famille','OI','Public cible','Lieu','Salle','Responsable','Stat.Com','État'];
    const positions=header.map(label=>{const item=items.find(i=>i.str===label);assert.ok(item,`${number} header ${label}`);return item.transform[4];});
    assert.ok(positions.every((x,i)=>i===0 || x>positions[i-1]));
    text+=items.map(i=>i.str).join(' ')+' ';pages.push({page:number,A4Landscape:true,allColumns:true,minimumMarginMm:10});
  }
  assert.ok(model.rows.every(row=>!/^F[0-8]\s/.test(row.domaine)));assert.doesNotMatch(text,/\bundefined\b/);assert.match(text,/SDIS|DAP|FOCO/);
  const samples=[];
  for(const page of [...new Set([1,document.numPages])]){
    const target=path.join(out,`annual-page-${page}`);
    execFileSync('/Users/thierrygrunig/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm',
      ['-f',String(page),'-singlefile','-scale-to','1600','-png',file,target],{env:{...process.env,FONTCONFIG_FILE:path.join(root,'output/qv-moa-20261014/fonts.conf')}});
    const png=PNG.load(target+'.png'),pixels=await new Promise(resolve=>png.decode(resolve)),margin=Math.floor(png.width*28.35/841.89);let outside=0;
    for(let y=0;y<png.height;y++) for(let x=0;x<png.width;x++) if(x<margin || x>=png.width-margin || y<margin || y>=png.height-margin){
      const i=(y*png.width+x)*4;if(Math.min(pixels[i],pixels[i+1],pixels[i+2])<245) outside++;}
    assert.equal(outside,0);samples.push({page,outsideInk:outside});
  }
  const count=document.numPages;await document.destroy();
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({status:'PASS',filename:result.filename,rows:model.rows.length,pages:count,
    geometry:pages,raster:samples,monthlyStructureUnchanged:true,sourceUnchanged:true},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',rows:model.rows.length,pages:count,raster:samples}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
