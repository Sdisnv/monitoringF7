'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4410',reference='74ac904ff78c464dbc57482c2d7d06ccf3d2300f';
const fixture=process.env.SCOPE_QV_LAYOUT_FIXTURE || '/private/tmp/scope-qv-complement-moa-20261015/output/qv-complement/current.json';
const data=fs.readFileSync(fixture,'utf8'),qv=JSON.parse(data),out=path.join(root,'docs/captures/qv-horaire-layout');
const old=execFileSync('git',['show',`${reference}:assets/js/scope-ui.js`],{cwd:root,encoding:'utf8',maxBuffer:2000000});
const current=fs.readFileSync(path.join(root,'assets/js/scope-ui.js'),'utf8');
const source=(text,name)=>text.slice(text.indexOf(`  function ${name}(`),text.indexOf('\n  function ',text.indexOf(`  function ${name}(`)+1));

async function metrics(page){
  return page.locator('.qv-programme-table tbody tr').evaluateAll(rows=>rows.filter(row=>row.cells.length===12).map(row=>{
    const time=row.cells[2],activity=row.cells[3],bounds=time.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(time);
    const text=range.getBoundingClientRect(),lines=[...time.querySelectorAll('.qv-programme-time > span')].map(span=>{
      const rect=span.getBoundingClientRect();const content=document.createRange();content.selectNodeContents(span);
      return {value:span.textContent,top:rect.top,bottom:rect.bottom,textRight:content.getBoundingClientRect().right};
    });
    return {id:decodeURIComponent(row.querySelector('a.qv-programme-action').hash.split('/').pop()),
      time:time.textContent,cellLeft:bounds.left,cellRight:bounds.right,activityLeft:activity.getBoundingClientRect().left,
      textRight:text.right,lines,otherCells:[...row.cells].filter((_,index)=>index!==2).map(cell=>cell.textContent)};
  }));
}

async function run(){
  assert.equal(source(current,'qvProgrammeTime'),source(old,'qvProgrammeTime'));
  assert.equal(source(current,'renderQuoVadisProgrammeFiche'),source(old,'renderQuoVadisProgrammeFiche'));
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],writes=[],results=[],fiches={};
  try{
    for(const viewport of [{name:'desktop',width:1920,height:1080},{name:'laptop',width:1366,height:768}]){
      const byVersion={};
      for(const version of ['before','after']){
        const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
        assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
        const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
        await page.route('**/*',async route=>{
          const request=route.request(),url=new URL(request.url());
          if(url.origin===base && url.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
            writes.push(url.pathname);return route.abort();
          }
          if(url.origin===base && url.pathname==='/api/scope/quo-vadis/programmes/2027')
            return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:qv})});
          if(url.origin===base && url.pathname==='/assets/js/scope-ui.js')
            return route.fulfill({contentType:'application/javascript',body:version==='before'?old:current});
          if(url.origin===base && ['/assets/js/scope-ui-logic.js','/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(url.pathname))
            return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,url.pathname.slice(1)),'utf8')});
          return route.continue();
        });
        await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor({timeout:60000});
        await page.locator('#qv-filter-type').selectOption('Conduite');
        await page.locator('#qv-filter-q').fill('01522F7');
        await page.waitForFunction(()=>[...document.querySelectorAll('.qv-programme-table tbody tr')].filter(row=>row.cells.length===12).length===16);
        const dap=await metrics(page);assert.equal(dap.length,16);
        assert.deepEqual([...new Set(dap.map(row=>qv.canonicalProgramme.rows.find(item=>item.id===row.id).ois[0]))].sort(),['Y1','Y2','Y3','Y4']);
        await page.locator('.qv-programme-table-wrap').screenshot({path:path.join(out,`programme-${version}-${viewport.name}.png`)});
        if(version==='before') assert.ok(dap.some(row=>row.textRight>row.activityLeft+1));
        else for(const row of dap){
          assert.deepEqual(row.lines.map(line=>line.value),['18:30','21:30']);
          assert.ok(row.lines[1].top>=row.lines[0].bottom);
          assert.ok(row.lines.every(line=>line.textRight<=row.cellRight+1 && line.textRight<row.activityLeft));
        }
        await page.locator('#qv-filter-type').selectOption('tous');
        await page.locator('#qv-filter-q').fill('Exercice PR 1.');
        await page.waitForFunction(()=>[...document.querySelectorAll('.qv-programme-table tbody tr')].filter(row=>row.cells.length===12).length===6);
        const other=await metrics(page);assert.equal(other.length,6);
        if(version==='after') for(const row of other){assert.equal(row.lines.length,2);assert.ok(row.lines[1].top>=row.lines[0].bottom);assert.ok(row.lines.every(line=>line.textRight<=row.cellRight+1));}
        byVersion[version]={dap,other};
        if(viewport.name==='desktop'){
          for(const oi of ['Y1','Y2','Y3','Y4']){
            const row=qv.canonicalProgramme.rows.find(item=>item.conduiteRule==='QV-DAP-001' && item.ois[0]===oi);
            await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(row.id));await page.locator('#qv-programme-family').waitFor();
            const section=page.locator('section.scope-form-section').filter({has:page.getByRole('heading',{name:'Conducteurs VL',exact:true})});
            const text=await section.locator('tbody tr').allTextContents();assert.equal(text.length,4);
            for(const value of text) assert.equal((value.match(/\d{2}:\d{2} - \d{2}:\d{2}/g)||[]).length,3);
            fiches[`${version}-${oi}`]=await section.locator('table').evaluate(table=>table.outerHTML);
            if(oi==='Y1') await section.screenshot({path:path.join(out,`conducteurs-vl-${version}.png`)});
          }
        }
        await context.close();
      }
      for(const kind of ['dap','other']) for(const row of byVersion.before[kind]){
        const next=byVersion.after[kind].find(item=>item.id===row.id);assert.ok(next);assert.deepEqual(next.otherCells,row.otherCells);
        assert.equal(next.cellLeft,row.cellLeft);assert.equal(next.cellRight,row.cellRight);assert.equal(next.activityLeft,row.activityLeft);
      }
      results.push({viewport,before:byVersion.before,after:byVersion.after});
    }
    for(const oi of ['Y1','Y2','Y3','Y4']) assert.equal(fiches[`before-${oi}`],fiches[`after-${oi}`]);
    // All bounded Programme rows, including CTA, retain the existing two-line container.
    const fn=source(current,'qvProgrammeTimeHtml');const render=new Function('qvProgrammeTime','qvTime','escapeHtml',`return (${fn.trim()})(arguments[3]);`);
    let bounded=0;
    for(const row of qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive)){
      if(!row.startsAt || !row.endsAt) continue;
      const start=row.startsAt.slice(11,16),end=row.endsAt.slice(11,16);
      const html=render(item=>item.definitionId==='CTA-PERMANENCE'?start:`${start}${item.conduiteRule==='QV-DAP-001'?' - ':' \u2013 '}${end}`,value=>value?.slice(11,16),value=>value,row);
      assert.equal((html.match(/<span>/g)||[]).length,2);bounded++;
    }
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(fs.readFileSync(fixture,'utf8'),data);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',reference,boundedRows:bounded,
      dataSha256:crypto.createHash('sha256').update(data).digest('hex'),businessApiWrites:writes,errors,results,
      conducteursTablesIdentical:true,businessTimeFunctionIdentical:true,ficheRendererIdentical:true,
      mode:'same existing clone projection in isolated browser sessions; no production access or SQL writes'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',viewports:2,dapPerViewport:16,otherPerViewport:6,boundedRows:bounded,writes:0,errors:0}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
