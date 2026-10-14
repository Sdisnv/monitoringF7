'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pdfjs=require('pdfjs-dist/build/pdf.js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {claims}=require('./scope-qv-roadmap-export-proof');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-post-pr16-moa-20261014/pdf');
async function run() {
  const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-post-pr16/current.json'),'utf8'));
  const {hooks}=createCatalogUiHarness();hooks.renderQuoVadisProgrammeHtml(qv);
  const model=hooks.quoVadisProgrammeExport(qv);assert.ok(model.rows.length>900);
  fs.mkdirSync(directory,{recursive:true});const results=[];
  for(const mode of ['annual','compact','monthly']) {
    const selected=mode==='monthly'?model.rows.filter(row=>row.dateIso.startsWith('2027-02')):model.rows;
    const immutable=JSON.stringify(selected);
    const result=await generateQuoVadisProgrammeReport(null,{rows:selected,meta:{...model.meta,year:2027,monthKey:'2027-02',
      periodLabel:mode==='monthly'?'Février 2027':model.meta.periodLabel,mode}},claims);
    assert.equal(JSON.stringify(selected),immutable);
    const expected=mode==='monthly'?'SCOPE_QUO_VADIS_2027-02_Planning_mensuel.pdf':`QUO VADIS 2027, ${mode==='annual'?'Planning annuel':'Liste compacte'}.pdf`;assert.equal(result.filename,expected);
    const document=await pdfjs.getDocument({data:new Uint8Array(result.buffer),useSystemFonts:true,verbosity:0}).promise;
    try {
      assert.ok(document.numPages>1);const pages=[];let fullText='';
      for(let number=1;number<=document.numPages;number++) {
        const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(item=>item.str);
        const expectedSize=mode==='monthly'?[595.28,841.89]:[841.89,595.28];
        assert.ok(Math.abs(page.view[2]-expectedSize[0])<0.01 && Math.abs(page.view[3]-expectedSize[1])<0.01);
        fullText+=items.map(item=>item.str).join(' ')+' ';
        const headers=['Date','Horaire','Activité','Domaine','OI','Lieu','Salle','Responsable','Public cible','Stat.Com','État'];
        const positions=mode==='monthly'?[]:headers.map(header=>items.find(item=>item.str===header));assert.ok(positions.every(Boolean),`Headers page ${number}`);
        assert.ok(positions.every((item,index)=>index===0 || item.transform[4]>positions[index-1].transform[4]));
        for(const item of items) assert.ok(item.transform[4]>=20 && item.transform[4]+item.width<=page.view[2]-15,
          `Text overflow page ${number}: ${item.str}`);
        pages.push({page:number,width:page.view[2],height:page.view[3],headerOrder:headers});
      }
      fullText=fullText.replace(/\s+/g,' ');
      assert.doesNotMatch(fullText,/\u30fb/);assert.match(fullText,/Sécurité feu · les Zôtres Brandons/);
      if(mode!=='monthly') assert.match(fullText,/Exercice OFSI · infrastructures CFF/);
      fs.writeFileSync(path.join(directory,result.filename),result.buffer);
      results.push({mode,filename:result.filename,rows:selected.length,pages:document.numPages,sha256:result.sha256,geometry:pages});
    } finally {await document.destroy();}
  }
  const dynamic=await generateQuoVadisProgrammeReport(null,{rows:model.rows.slice(0,2),meta:{year:2028,mode:'compact'}},claims);
  assert.equal(dynamic.filename,'QUO VADIS 2028, Liste compacte.pdf');
  const doc=await pdfjs.getDocument({data:new Uint8Array(dynamic.buffer),useSystemFonts:true,verbosity:0}).promise;
  const text=(await (await doc.getPage(1)).getTextContent()).items.map(row=>row.str).join(' ');assert.match(text,/QUO VADIS 2028/);await doc.destroy();
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({status:'PASS',productionWrites:false,dynamicYear:true,results},null,2)+'\n');
  console.log(JSON.stringify(results.map(row=>({mode:row.mode,filename:row.filename,rows:row.rows,pages:row.pages}))));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
