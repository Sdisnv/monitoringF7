'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process'),pdfjs=require('pdfjs-dist/build/pdf.js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service'),{claims,options}=require('./scope-qv-roadmap-export-proof');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness'),{input,baseline}=require('./scope-qv-cmdt-tests');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-cmdt/exports'),hash=v=>createHash('sha256').update(v).digest('hex');
async function run(){
  fs.mkdirSync(out,{recursive:true});const qv=JSON.parse(fs.readFileSync(input,'utf8')),{hooks}=createCatalogUiHarness(),old=baseline(),results=[];
  const immutable=JSON.stringify(qv);
  for(const [oi,slug] of [['DAP:Y1','y1'],['SDIS','sdis']]){
    const model=hooks.quoVadisProgrammeExport(qv,{oi}),before=old.quoVadisProgrammeExport(qv,{oi}),csv=hooks.quoVadisProgrammeCsvText(model.rows);
    const expected=oi==='SDIS'?44:95;assert.equal(model.rows.length,expected);
    if(oi==='SDIS') assert.equal(JSON.stringify(model),JSON.stringify(before));else assert.equal(before.rows.length-model.rows.length,26);
    fs.writeFileSync(path.join(out,slug+'.csv'),csv);
    const pdf=await generateQuoVadisProgrammeReport(null,{rows:model.rows,meta:{...model.meta,mode:'annual',year:2027}},claims,options);
    assert.equal(pdf.meta.rows,expected);fs.writeFileSync(path.join(out,slug+'.pdf'),pdf.buffer);
    const document=await pdfjs.getDocument({data:new Uint8Array(pdf.buffer),verbosity:0,useSystemFonts:true}).promise;
    let text='';const pages=[];
    try{
      for(let number=1;number<=document.numPages;number++){
        const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(item=>item.str);
        assert.ok(Math.abs(page.view[2]-841.89)<0.01 && Math.abs(page.view[3]-595.28)<0.01);
        const headers=['Date','Horaire','Activité','Domaine','Famille','OI','Public cible','Lieu','Salle','Responsable','Stat.Com','État'];
        const positions=headers.map(header=>items.find(item=>item.str===header));assert.ok(positions.every(Boolean));
        assert.ok(positions.every((item,index)=>!index || item.transform[4]>positions[index-1].transform[4]));
        for(const item of items) assert.ok(item.transform[4]>=20 && item.transform[4]+item.width<=page.view[2]-15);
        pages.push({page:number,width:page.view[2],height:page.view[3],headerOrder:headers});text+=items.map(item=>item.str).join(' ')+' ';
      }
      for(const label of ['Séance État-major','Séance Codir','Séance CRDIS','Conférence des Commandants']){
        assert.equal(text.includes(label),oi==='SDIS');assert.equal(csv.includes(label),oi==='SDIS');
      }
      results.push({oi,rows:expected,before:before.rows.length,pdfPages:document.numPages,pdfSha256:hash(pdf.buffer),csvSha256:hash(csv),
        inputModelHash:hash(JSON.stringify(model.rows)),samePdfCsvSelection:true,globalSdisIdentical:oi==='SDIS'?true:undefined,geometry:pages});
    }finally{await document.destroy();}
    execFileSync('/opt/homebrew/bin/pdftoppm',['-f','1','-singlefile','-scale-to','1600','-png',path.join(out,slug+'.pdf'),path.join(out,slug+'-page1')]);
  }
  assert.equal(JSON.stringify(qv),immutable);
  assert.equal(execFileSync('git',['diff','0d1fc89','--','netlify/lib/_scope-report-service.js','assets/js/scope-ui.js'],{cwd:root,encoding:'utf8'}),'');
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',templatesAndColumnsUnchanged:true,format:'PDF annuel et CSV Excel existants',results},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',exports:results.map(({oi,rows,pdfPages})=>({oi,rows,pdfPages}))}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
