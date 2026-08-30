const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'../js/sync.js'),'utf8');
eval(src.slice(src.indexOf('function mergeState'), src.indexOf('/** Pull, merge, push')));
const ok=(c,m)=>console.log((c?'  ✓ ':'  ✗ FAIL ')+m);
const base=()=>({progress:{},log:{},packs:[],removed:[],verify:{},overrides:{},custom:[],challenges:{},game:{},
  practice:{lexicon:[],msgs:[],monologues:[],sessions:[],circum:[],recent:[]}});

console.log('── both devices worked offline, different entries ──');
let A=base(),B=base();
A.practice.lexicon=[{id:'x1',ar:'أ',en:'a'},{id:'x2',ar:'ب',en:'b'}];
B.practice.lexicon=[{id:'x3',ar:'ج',en:'c'},{id:'x4',ar:'د',en:'d'}];
A.practice.sessions=[{id:'s1',d:'1',type:'read',min:5}];
B.practice.sessions=[{id:'s2',d:'1',type:'shadow',min:9}];
let m=mergeState(A,B);
ok(m.practice.lexicon.length===4,`both devices' new entries survive (${m.practice.lexicon.length})`);
ok(m.practice.sessions.length===2,`both devices' sessions survive (${m.practice.sessions.length})`);

console.log('── merge is symmetric (order must not change the outcome) ──');
const f=mergeState(A,B), r=mergeState(B,A);
const key=o=>[o.practice.lexicon.length,o.practice.sessions.length].join(',');
ok(key(f)===key(r),`same counts either direction (${key(f)} vs ${key(r)})`);

console.log('── same entry edited on both: the richer one wins ──');
A=base();B=base();
A.practice.lexicon=[{id:'x1',ar:'القرار الصعب',en:'',sm2:{last:100}}];       // captured, no gloss yet
B.practice.lexicon=[{id:'x1',ar:'القرار الصعب',en:'the hard decision',sm2:{last:50}}]; // glossed
m=mergeState(A,B);
ok(m.practice.lexicon[0].en==='the hard decision','a glossed entry beats an unglossed one even if older');
A.practice.lexicon=[{id:'x1',ar:'أ',en:'a',sm2:{last:900}}];
B.practice.lexicon=[{id:'x1',ar:'أ',en:'a',sm2:{last:100}}];
ok(mergeState(A,B).practice.lexicon[0].sm2.last===900,'between two glossed entries, the later review wins');

console.log('── a reviewed monologue is never replaced by its unreviewed copy ──');
A=base();B=base();
A.practice.monologues=[{id:'mo1',q:'س',at:1,unlock:2}];
B.practice.monologues=[{id:'mo1',q:'س',at:1,unlock:2,rating:4,notes:'ملاحظاتي'}];
ok(mergeState(A,B).practice.monologues[0].rating===4,'rating survives from the other device');
ok(mergeState(B,A).practice.monologues[0].rating===4,'…in both directions');

console.log('── message bank keeps the higher rehearsal count ──');
A=base();B=base();
A.practice.msgs=[{id:'m1',q:'س',a:'قديم',reps:2}];
B.practice.msgs=[{id:'m1',q:'س',a:'محدّث',reps:9}];
ok(mergeState(A,B).practice.msgs[0].reps===9,'higher reps wins');
ok(mergeState(A,B).practice.msgs[0].a==='محدّث','and its answer text comes with it');

console.log('── legacy rows with no id are not lost ──');
A=base();B=base();
A.practice.sessions=[{d:'1',type:'read',min:5}];             // old shape
B.practice.sessions=[{d:'1',type:'read',min:5},{id:'s9',d:'2',type:'mono',min:2}];
m=mergeState(A,B);
ok(m.practice.sessions.length===2,`identical legacy rows dedupe, new row kept (${m.practice.sessions.length})`);

console.log('── nothing else regressed ──');
A=base();B=base();
A.packs=['connectors'];B.packs=['proverbs','space'];
A.game={xp:10,best:{gender:500}};B.game={xp:80,best:{gender:200,cloze:300}};
A.settings={newPerDay:5,lang:'ar'};B.settings={newPerDay:12,lang:'bi'};
m=mergeState(A,B);
ok(m.packs.length===3,'packs union');
ok(m.game.xp===80&&m.game.best.gender===500&&m.game.best.cloze===300,'game maxima preserved');
ok(m.settings.newPerDay===5&&m.settings.lang==='ar','this device wins on settings');

console.log('── empty / missing practice on one side ──');
A=base();delete A.practice;B=base();B.practice.lexicon=[{id:'z',ar:'أ',en:'a'}];
ok(mergeState(A,B).practice.lexicon.length===1,'missing practice on local does not wipe remote');
A=base();A.practice.lexicon=[{id:'z',ar:'أ',en:'a'}];B=base();delete B.practice;
ok(mergeState(A,B).practice.lexicon.length===1,'missing practice on remote does not wipe local');
