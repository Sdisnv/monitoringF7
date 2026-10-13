'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pdfjs=require('pdfjs-dist/build/pdf.js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {claims}=require('./scope-qv-roadmap-export-proof');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-post-recette-moa-20261013/pdf');
async function run() {
  const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-post-recette/current.json'),'utf8'));
  const {hooks}=createCatalogUiHarness();hooks.renderQuoVadisProgrammeHtml(qv);
  const model=hooks.quoVadisProgrammeExport(qv);assert.ok(model.rows.length>900);
  fs.mkdirSync(directory,{recursive:true});const results=[];
  for(const mode of ['annual','compact']) {
    const result=await generateQuoVadisProgrammeReport(null,{rows:model.rows,meta:{...model.meta,year:2027,mode}},claims);
    const expected=`QUO VADIS 2027, ${mode==='annual'?'Planning annuel':'Liste compacte'}.pdf`;assert.equal(result.filename,expected);
    const document=await pdfjs.getDocument({data:new Uint8Array(result.buffer),useSystemFonts:true,verbosity:0}).promise;
    try {
      assert.ok(document.numPages>1);const pages=[];
      for(let number=1;number<=document.numPages;number++) {
        const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(item=>item.str);
        assert.ok(Math.abs(page.view[2]-841.89)<0.01 && Math.abs(page.view[3]-595.28)<0.01);
        const headers=['Date','Horaire','Activité','Domaine','OI','Lieu','Salle','Responsable','Public cible','Stat.Com','État'];
        const positions=headers.map(header=>items.find(item=>item.str===header));assert.ok(positions.every(Boolean),`Headers page ${number}`);
        assert.ok(positions.every((item,index)=>index===0 || item.transform[4]>positions[index-1].transform[4]));
        for(const item of items) assert.ok(item.transform[4]>=20 && item.transform[4]+item.width<=page.view[2]-15,
          `Text overflow page ${number}: ${item.str}`);
        pages.push({page:number,width:page.view[2],height:page.view[3],headerOrder:headers});
      }
      fs.writeFileSync(path.join(directory,result.filename),result.buffer);
      results.push({mode,filename:result.filename,rows:model.rows.length,pages:document.numPages,sha256:result.sha256,geometry:pages});
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
