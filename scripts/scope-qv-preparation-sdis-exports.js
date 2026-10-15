'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const pdfjs=require('pdfjs-dist/build/pdf.js');
const {generateQuoVadisProgrammeReport}=require('../netlify/lib/_scope-report-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {claims,options}=require('./scope-qv-roadmap-export-proof');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-preparation-sdis/exports');
const hash=value=>createHash('sha256').update(value).digest('hex');
async function run(){
  fs.mkdirSync(out,{recursive:true});
  const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-preparation-sdis/current.json'),'utf8'));
  const {hooks}=createCatalogUiHarness(),results=[];
  assert.equal(execFileSync('git',['diff','92cce51','--','netlify/lib/_scope-report-service.js'],{cwd:root,encoding:'utf8'}),'');
  const immutable=JSON.stringify(qv);
  for(const oi of ['DAP:Y1','DPS:G1','JSP:C1']){
    const selected=hooks.filterQuoVadisProgrammeRows(qv,{oi}),model=hooks.quoVadisProgrammeExport(qv,{oi});
    assert.equal(selected.length,model.rows.length);assert.equal(new Set(selected.map(row=>row.id)).size,selected.length);
    const sdis=selected.filter(row=>L.qvProgrammeConfirmedOiCodes(row).includes('SDIS'));assert.equal(sdis.length,44);
    for(const row of sdis) assert.ok(model.rows.some(item=>item.activite===row.activityLabel || item.activite===row.label || item.code===row.businessCode));
    const slug=oi.replace(':','-').toLowerCase(),csv=hooks.quoVadisProgrammeCsvText(model.rows);
    fs.writeFileSync(path.join(out,slug+'.csv'),csv);
    const result=await generateQuoVadisProgrammeReport(null,{rows:model.rows,meta:{...model.meta,mode:'annual',year:2027}},claims,options);
    assert.equal(result.meta.rows,model.rows.length);
    fs.writeFileSync(path.join(out,slug+'.pdf'),result.buffer);
    const document=await pdfjs.getDocument({data:new Uint8Array(result.buffer),useSystemFonts:true,verbosity:0}).promise;
    let text='';const pages=[];
    try{
      for(let number=1;number<=document.numPages;number++){
        const page=await document.getPage(number),items=(await page.getTextContent()).items.filter(item=>item.str);
        assert.ok(Math.abs(page.view[2]-841.89)<0.01 && Math.abs(page.view[3]-595.28)<0.01);
        const headers=['Date','Horaire','Activité','Domaine','OI','Public cible','Lieu','Salle','Responsable','Stat.Com','État'];
        const positions=headers.map(header=>items.find(item=>item.str===header));assert.ok(positions.every(Boolean));
        assert.ok(positions.every((item,index)=>!index || item.transform[4]>positions[index-1].transform[4]));
        for(const item of items) assert.ok(item.transform[4]>=20 && item.transform[4]+item.width<=page.view[2]-15,`Overflow ${oi} ${number}: ${item.str}`);
        text+=items.map(item=>item.str).join(' ')+' ';pages.push({page:number,width:page.view[2],height:page.view[3],headerOrder:headers});
      }
      assert.match(text,/SDIS/);
      assert.ok(text.includes(oi.split(':')[1]));
      results.push({oi,rows:model.rows.length,sdisRows:sdis.length,pdfInputEqualsCsvModel:true,noDuplicateIds:true,
        organizerPreserved:true,csvSha256:hash(csv),pdfSha256:hash(result.buffer),pdfPages:document.numPages,geometry:pages,
        selectedIdHash:hash(JSON.stringify(selected.map(row=>row.id))),modelHash:hash(JSON.stringify(model.rows))});
    }finally{await document.destroy();}
    execFileSync('/opt/homebrew/bin/pdftoppm',['-f','1','-singlefile','-scale-to','1600','-png',path.join(out,slug+'.pdf'),path.join(out,slug+'-page1')]);
  }
  assert.equal(JSON.stringify(qv),immutable);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',format:'PDF annuel existant / CSV UTF-8 BOM compatible Excel existant',
    templatesUnchanged:true,globalModelIdentical:'targeted-results.json clone.globalExportsIdentical',results},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',exports:results.map(({oi,rows,pdfPages})=>({oi,rows,pdfPages})),templatesUnchanged:true}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
