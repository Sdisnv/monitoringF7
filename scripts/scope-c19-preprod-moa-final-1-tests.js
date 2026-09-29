'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const final=require('./scope-c19-preprod-moa-final-1');
const engine=require('../netlify/lib/_scope-functional-catalog');
const statCom=require('../netlify/lib/_scope-statcom-referential');

const report=final.buildGate();
const app=fs.readFileSync(path.join(__dirname,'scope-c19-ux-recette/app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'scope-c19-ux-recette/index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'scope-c19-ux-recette/styles.css'),'utf8');
const tests=[]; const test=(name,fn)=>tests.push([name,fn]);

test('01 matérialise le programme massif réel',()=>{ assert.equal(report.volume.programObjects,613); assert.equal(report.volume.occurrences,603); assert.equal(report.volume.sessions,613); });
test('02 dépasse les 72 dates explicites sans date inventée',()=>{ assert.equal(report.volume.datedEvents,125); assert.equal(report.volume.sourceExplicitDated,72); assert.equal(report.volume.ctaRuleDated,53); assert.equal(report.controls.final.only72Dated,false); });
test('03 ferme exactement l’équation des statuts',()=>{ assert.equal(report.volume.datedEvents+report.volume.atPosition+report.volume.arbitrations+report.volume.insufficient,report.volume.programObjects); assert.equal(report.controls.final.volumeEquation,'125+479+3+6=613'); });
test('04 réconcilie 302 définitions sans perte',()=>{ assert.equal(report.truthMatrix.length,302); assert.equal(report.controls.final.silentLosses,0); assert(report.truthMatrix.every(row=>row.ruleApplied&&row.result2027&&row.provenance&&row.confidence&&row.proof&&!row.loss)); });
test('05 conserve une provenance explicite sur chaque objet',()=>{ assert(report.program.every(row=>row.provenance)); assert(report.program.some(row=>row.provenance==='RECURRENCE_RULE')); assert(report.program.some(row=>row.provenance==='CTA_RULE')); assert(report.program.some(row=>row.provenance.includes('FOBA_TRANSITION'))); });
test('06 contrôle les quatre codes JSP avec origine et présence SCOPE',()=>{ assert.deepEqual(report.statCom.auditFour.map(row=>row.code),['010JB1','010JC1','010JG1','COURJSP']); assert(report.statCom.auditFour.every(row=>row.scopePresence&&row.projectDocumentPresence&&!row.announcedPdfPresence)); });
test('07 applique la succession 010JY3 vers 010JC1',()=>{ assert.deepEqual(statCom.resolveStatComCode('010JY3','2027-01-01').canonicalCode,'010JC1'); assert.equal(report.statCom.successionFinal.sourceActive,false); });
test('08 garde EMSEA à arbitrer',()=>{ assert.match(report.statCom.emsea.verdict,/Ne pas convertir automatiquement/); });
test('09 ne classe pas l’externe sans StatCom en anomalie',()=>{ assert.equal(report.controls.final.externalWithoutStatComNotAnomaly,true); assert(report.statCom.missingReview.filter(row=>row.external).every(row=>row.result==='EXTERNAL_CODE_OPTIONAL')); });
test('10 applique FOBA et la fonction Chef FOBA',()=>{ const row=report.program.find(item=>item.id==='qv-source-852'); assert.deepEqual(row.publics,['FOBA:2']); assert.equal(row.responsible,'C FOBA'); assert.equal(row.responsibleRole,'CHEF-FOBA'); assert.equal(report.coherence.fobaInconsistent,0); });
test('11 conserve la structure et les capacités CTA',()=>{ assert.deepEqual(report.cta.organisation.G1,['N01','N02','N03','N04','N05','N06']); assert.equal(report.cta.capacities.G1.sectionMaximum,15); assert.equal(report.cta.capacities.G1.halfSectionMaximum,8); assert.equal(report.cta.capacities.C1,null); });
test('12 refuse les bords calendaires ordinaires et autorise les permanences',()=>{ assert.equal(report.calendarEdges.length,10); assert(report.calendarEdges.every(row=>row.ordinaryAllowed===false&&row.permanenceAllowed===true)); });
test('13 utilise le moteur partagé pour la cohérence',()=>{ assert.equal(report.coherence.engine,'netlify/lib/_scope-functional-catalog.js'); assert(report.programConflicts.examinedPairs>0); assert(report.programConflicts.pairs.every(row=>row.activityA&&row.activityB&&row.date&&row.level&&row.provenanceA&&row.action)); });
test('14 ne crée ni Public dupliqué ni cible/salle impossible',()=>{ assert.equal(report.coherence.duplicatePublics,0); assert.equal(report.coherence.missingTarget,0); assert.equal(report.coherence.roomLocationImpossible,0); });
test('15 mesure le dataset réel comme preuve principale',()=>{ assert.equal(report.performance.realDataset.objects,613); assert.equal(report.performance.realDataset.sorted,613); assert(report.performance.realDataset.moveCandidates>0); assert.equal(report.performance.syntheticSupplement.primaryProof,false); });
test('16 charge les 613 objets dans la preview',()=>{ assert.equal(report.preview.events.length,613); assert.equal(report.preview.announcements.length,0); assert.equal(report.controls.final.announcements,0); });
test('17 place Entrée en service dans les occurrences',()=>{ assert.match(app,/occ-entry-/); assert.match(app,/data-occ-field="entryService"/); assert.doesNotMatch(app,/def-entry-service/); assert.match(app,/Préremplie depuis occurrence 1/); assert.match(css,/occurrence-collapsed/); });
test('18 corrige les écrans 9 10 et 11',()=>{ assert.match(app,/compatible-cases/); assert.match(app,/activities-scroll/); assert.match(app,/A_POSITIONNER/); assert.match(app,/QUO VADIS '/); assert.match(css,/max-height:calc\(100vh/); });
test('19 rend la marque SCOPE carrée 8x8 sans badge texte',()=>{ assert.match(html,/class="brand-mark" aria-hidden="true"><\/span>/); assert.match(css,/\.brand-mark,.scope-mark\{width:8px;height:8px/); });
test('20 produit le retour obligatoire A à BU',()=>{ const markdown=final.markdown(report); for(const code of ['A','Z','AA','AZ','BA','BU']) assert.match(markdown,new RegExp(`## ${code}\\.`)); });

(async()=>{ let failed=0; for(const [name,fn] of tests){ try{ await fn(); console.log(`PASS ${name}`); }catch(error){ failed+=1; console.error(`FAIL ${name}`); console.error(error.stack||error); } } console.log(`\nMOA FINAL 1 ciblé: ${tests.length-failed}/${tests.length} PASS`); if(failed) process.exitCode=1; })();
