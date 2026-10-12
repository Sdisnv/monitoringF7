'use strict';

async function run() {
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({nip:'recipe.p0',password:'Recipe-P0-Local-2026!'})});
  const session = await login.json();
  if (!login.ok || !session.accessToken) throw new Error('Local recipe login failed');
  const created = [];
  for (const [label,date] of [['RECETTE P0 Safari','2027-01-20'],['RECETTE P0 Cible','2027-01-21']]) {
    const response = await fetch(`${base}/api/scope/quo-vadis/programme-items`,{method:'POST',
      headers:{'content-type':'application/json',authorization:`Bearer ${session.accessToken}`},
      body:JSON.stringify({year:2027,activityLabel:label,domain:'F7',statCom:'011PR',ecawinActivityCode:'EXERCI',themes:['Controle isolé'],
        oiCodes:['SDIS'],publicCodes:[],date,startTime:'18:00',endTime:'20:00',saveAction:'SAVE'})});
    const data = await response.json();
    if (!response.ok || !data.updated) throw new Error(data.message || 'Recipe creation failed');
    created.push({id:data.itemId,label,date});
  }
  console.log(JSON.stringify({created}));
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
