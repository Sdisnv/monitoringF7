'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pdfjs=require('pdfjs-dist/build/pdf.js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {claims}=require('./scope-qv-roadmap-export-proof');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-moa-20261014/pdf');
async function rasterProof(filename,pages,mode){
  const {execFileSync}=require('node:child_process'),PNG=require('png-js');
  const poppler='/Users/thierrygrunig/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm';
  const samples=[];
  for(const number of [...new Set([1,pages])]){
    const target=path.join(directory,`${mode}-page-${number}`);
    execFileSync(poppler,['-f',String(number),'-singlefile','-scale-to','1200','-png',path.join(directory,filename),target],
      {env:{...process.env,FONTCONFIG_FILE:path.join(root,'output/qv-moa-20261014/fonts.conf')}});
    const png=PNG.load(target+'.png'),pixels=await new Promise(resolve=>png.decode(resolve));
    const widthPt=mode==='monthly'?595.28:841.89,margin=Math.floor(png.width*28.35/widthPt);
    let outsideInk=0,insideInk=0;
    for(let y=0;y<png.height;y++) for(let x=0;x<png.width;x++){
      const i=(y*png.width+x)*4,ink=Math.min(pixels[i],pixels[i+1],pixels[i+2])<245;
      if(!ink) continue;
      if(x<margin || x>=png.width-margin || y<margin || y>=png.height-margin) outsideInk++;
      else insideInk++;
    }
    assert.equal(outsideInk,0,`${mode} page ${number}: ink outside 10mm safety area`);assert.ok(insideInk>1000);
    samples.push({page:number,pixelMargin:margin,outsideInk,insideInk});
  }
  return samples;
}
async function inspect(result,mode){
  const document=await pdfjs.getDocument({data:new Uint8Array(result.buffer),useSystemFonts:true,verbosity:0}).promise;
  try{
    const pages=[];let text='';
    for(let number=1;number<=document.numPages;number++){
      const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(item=>item.str.trim());
      const size=mode==='monthly'?[595.28,841.89]:[841.89,595.28];
      assert.ok(size.every((value,index)=>Math.abs(page.view[index+2]-value)<0.01));
      for(const item of items){
        assert.ok(item.transform[4]>=28.35 && item.transform[4]+item.width<=size[0]-28.35,`Horizontal safe area page ${number}: ${item.str}`);
        assert.ok(item.transform[5]>=28.35 && item.transform[5]+item.height<=size[1]-28.35,`Vertical safe area page ${number}: ${item.str}`);
      }
      const headers=['Date','Horaire','Activité','Domaine','OI','Lieu','Salle','Responsable','Public cible','Stat.Com','État'];
      if(mode!=='monthly') assert.ok(headers.every(header=>items.some(item=>item.str===header)),`Columns on page ${number}`);
      assert.ok(items.some(item=>item.str.startsWith(`Page ${number} / ${document.numPages}`)));
      text+=items.map(item=>item.str).join(' ')+' ';
      pages.push({page:number,width:size[0],height:size[1],minimumPrintableMarginMm:10});
    }
    return {pages:document.numPages,geometry:pages,text:text.replace(/\s+/g,' ')};
  }finally{await document.destroy();}
}
async function run(){
  const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-moa-20261014/current.json'),'utf8'));
  const {hooks}=createCatalogUiHarness();hooks.renderQuoVadisProgrammeHtml(qv);
  const model=hooks.quoVadisProgrammeExport(qv);assert.ok(model.rows.length>900);
  fs.mkdirSync(directory,{recursive:true});const results=[];
  for(const mode of ['annual','compact','monthly']){
    const selected=mode==='monthly'?model.rows.filter(row=>row.dateIso.startsWith('2027-01')):model.rows;
    const immutable=JSON.stringify(selected),result=await generateQuoVadisProgrammeReport(null,{rows:selected,
      meta:{...model.meta,year:2027,monthKey:'2027-01',periodLabel:mode==='monthly'?'Janvier 2027':model.meta.periodLabel,mode}},claims);
    assert.equal(JSON.stringify(selected),immutable);
    const expected=`QUO VADIS 2027, ${mode==='monthly'?'Planning mensuel - Janvier':mode==='annual'?'Planning annuel':'Liste compacte'}.pdf`;
    assert.equal(result.filename,expected);
    const proof=await inspect(result,mode);assert.doesNotMatch(proof.text,/\u30fb/);
    if(mode!=='monthly'){
      assert.match(proof.text,/Échelon II et III/);assert.match(proof.text,/FOBA 1/);
      assert.match(proof.text,/Sécurité feu · les Zôtres Brandons/);
    }
    fs.writeFileSync(path.join(directory,result.filename),result.buffer);
    const raster=await rasterProof(result.filename,proof.pages,mode);
    results.push({mode,filename:result.filename,rows:selected.length,pages:proof.pages,sha256:result.sha256,geometry:proof.geometry,raster});
  }
  const longRows=[{...model.rows.find(row=>row.dateIso.startsWith('2027-01')),activite:'Évaluation des qualifications et coordination de la formation · activité avec un intitulé long',
    responsable:'Chef formation, Chef communication',publicCible:'OSR, Échelon II à IV, FOBA 1, FOBA 2, FOBA 3, Préposé APR'}];
  for(const mode of ['annual','compact','monthly']){
    const result=await generateQuoVadisProgrammeReport(null,{rows:longRows,meta:{year:2027,monthKey:'2027-01',mode}},claims);
    const proof=await inspect(result,mode);assert.match(proof.text,/Échelon II à IV/);assert.match(proof.text,/Préposé APR/);
  }
  const next=await generateQuoVadisProgrammeReport(null,{rows:[],meta:{year:2028,monthKey:'2028-02',mode:'monthly'}},claims);
  assert.equal(next.filename,'QUO VADIS 2028, Planning mensuel - Février.pdf');
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({status:'PASS',productionWrites:false,
    scalePercent:100,minimumPrintableMarginMm:10,sourceImmutable:true,dynamicYearMonth:true,longLabels:true,results},null,2)+'\n');
  console.log(JSON.stringify(results.map(result=>({mode:result.mode,rows:result.rows,pages:result.pages,filename:result.filename}))));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
