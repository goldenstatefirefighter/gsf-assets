const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),PAGES=path.join(ROOT,'native/career/source');
const rows=JSON.parse(fs.readFileSync(path.join(ROOT,'directory/ca-fire-departments.json')));
let groups=0,cases=0;
class Element{
 constructor(tag='div',attrs=''){this.tag=tag;this.value='';this.dataset={on:'0'};this.children=[];this.options=tag==='select'?[{}]:[];this.attrs={};this.listeners={};this._html='';this.textContent='';this.className='';this.style={};const names=new Set((attrs.match(/class="([^"]*)"/)||[])[1]?.split(' ')||[]);this.classList={add:(...xs)=>xs.forEach(x=>names.add(x)),remove:(...xs)=>xs.forEach(x=>names.delete(x)),contains:x=>names.has(x),toggle:(x,on)=>{on=on===undefined?!names.has(x):on;on?names.add(x):names.delete(x)}};}
 set innerHTML(x){this._html=x;this.children=[];}get innerHTML(){return this._html}
 setAttribute(k,v){this.attrs[k]=String(v)}removeAttribute(k){delete this.attrs[k]}
 appendChild(x){this.children.push(x);if(x.tag==='option')this.options.push(x);return x}remove(i){this.options.splice(i,1)}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}dispatch(k){for(const fn of this.listeners[k]||[])fn.call(this,{preventDefault(){}})}
 querySelector(){return this.bx??=new Element()}focus(){this.focused=true}scrollIntoView(){}
}
async function load(file,data=rows){
 const html=fs.readFileSync(path.join(PAGES,file),'utf8'),els=new Map();
 for(const m of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi))els.set(m[3],new Element(m[1],m[2]));
 const document={getElementById:id=>{if(!els.has(id))els.set(id,new Element());return els.get(id)},createElement:tag=>new Element(tag)};
 const context={document,window:{location:{href:'https://www.goldenstatefirefighter.com/department-directory'}},URL,fetch:()=>data===null?Promise.reject(Error('offline')):Promise.resolve({ok:true,json:()=>Promise.resolve(data)}),console,Math,JSON};
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))vm.runInNewContext(m[1],context,{filename:file});
 await new Promise(r=>setImmediate(r));
 return {html,el:id=>document.getElementById(id)};
}
function test(name,fn){return Promise.resolve().then(fn).then(()=>{groups++;console.log('PASS '+name)})}
(async()=>{
 await test('every staged inline script compiles',()=>{for(const dir of [PAGES,path.join(ROOT,'native/financial')])for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.html')))for(const m of fs.readFileSync(path.join(dir,f),'utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)){new vm.Script(m[1]);cases++;}});
 await test('directory preserves every record and all unapproved fields',()=>{
  const old=JSON.parse(cp.execFileSync('git',['show','4de672f3d092fb55d16355750f218fca05a2d57c:directory/ca-fire-departments.json'],{cwd:ROOT,encoding:'utf8',maxBuffer:5e6}));
  const changes=JSON.parse(fs.readFileSync(path.join(ROOT,'review/directory-changes.json'))),ledger=new Map(changes.map(x=>[x.name,x.changes]));
  assert.equal(rows.length,371);assert.equal(new Set(rows.map(x=>x.name)).size,371);
  for(let i=0;i<rows.length;i++){const expected=structuredClone(old[i]);for(const e of ledger.get(expected.name)||[]){assert.deepEqual(expected[e.field]??null,e.before);expected[e.field]=e.after;}assert.deepEqual(rows[i],expected);cases++;}
 });
 await test('actual directory filters match independent oracle in every region/county/chip combination',async()=>{
  const ui=await load('tool-department-directory.html');
  for(const region of ['',...new Set(rows.map(x=>x.region))])for(const county of ['',...new Set(rows.map(x=>x.county))])for(let flags=0;flags<4;flags++){
   ui.el('gsfd-region').value=region;ui.el('gsfd-county').value=county;ui.el('gsfd-fctc').dataset.on=String(flags&1);ui.el('gsfd-emt').dataset.on=flags&2?'1':'0';ui.el('gsfd-q').dispatch('input');
   const want=rows.filter(x=>(!region||x.region===region)&&(!county||x.county===county)&&(!(flags&1)||x.fctc==='yes')&&(!(flags&2)||x.emt==='yes'));
   assert.ok(ui.el('gsfd-count').textContent.startsWith(want.length+' department'));
   assert.equal((ui.el('gsfd-grid').innerHTML.match(/class="dept"/g)||[]).length,want.length);cases++;
  }
  ui.el('gsfd-reset').dispatch('click');assert.ok(ui.el('gsfd-count').textContent.startsWith('371 department'));assert.equal(ui.el('gsfd-q').focused,true);
  assert.match(ui.el('gsfd-summary').textContent,/164 confirmed yes, 3 confirmed no, 204 not confirmed/);
  for(const q of ['Santa Clara County','not-a-real-agency']){ui.el('gsfd-q').value=q;ui.el('gsfd-q').dispatch('input');const expected=rows.filter(d=>(d.name+' '+(d.former_name||'')+' '+d.region+' '+d.county+' '+(d.city||'')+' '+(d.chief||'')+' '+(d.email||'')).toLowerCase().includes(q.toLowerCase()));assert.ok(ui.el('gsfd-count').textContent.startsWith(expected.length+' department'));cases++;}
 });
 await test('directory failure and malformed payloads retain visibly partial fallback',async()=>{for(const bad of [null,{departments:rows},[],[{name:'fake'}]]){const ui=await load('tool-department-directory.html',bad);assert.match(ui.el('gsfd-count').textContent,/partial list/);assert.match(ui.el('gsfd-summary').textContent,/unavailable/);cases++;}});
 await test('directory escapes hostile record text and rejects dangerous link schemes',async()=>{const ui=await load('tool-department-directory.html',[{...rows[0],name:'<script>bad</script>',site:'javascript:alert(1)',url:'data:text/html,bad',chief:'<img src=x onerror=bad>'}]);const rendered=ui.el('gsfd-grid').innerHTML;assert.ok(rendered.includes('&lt;script&gt;'));assert.ok(!rendered.includes('javascript:'));assert.ok(!rendered.includes('data:text/html'));cases++;});
 await test('cost actual click-handler arithmetic matches independent 16-state oracle',async()=>{
  const pairs=[[800,1475,2,4],[4000,7929,3,6],[160,160,1,2],[50,50,0,1]];
  for(let mask=0;mask<16;mask++){const ui=await load('tool-cost-calculator.html');for(let i=0;i<4;i++)if(mask&(1<<i))ui.el('gsfcalc-togs').children[i].onclick();ui.el('gsfcalc-go').dispatch('click');const n=[0,0,0,0];pairs.forEach((p,i)=>{if(!(mask&(1<<i)))p.forEach((v,j)=>n[j]+=v)});const money=x=>'$'+x.toLocaleString('en-US');assert.equal(ui.el('gsfcalc-cost').textContent,n[1]===0?'$0':n[0]===n[1]?money(n[0]):money(n[0])+' to '+money(n[1]));assert.equal(ui.el('gsfcalc-time').textContent,n[3]===0?'None':n[2]===n[3]?n[2]+' mo':n[2]+' to '+n[3]+' mo');assert.equal(ui.el('gsfcalc-res').classList.contains('hidden'),false);cases++;}
 });
 await test('cost exclusions and all five decoder journeys remain explicit',async()=>{
  const cost=await load('tool-cost-calculator.html');cost.el('gsfcalc-go').dispatch('click');assert.match(cost.el('gsfcalc-fine').innerHTML,/outside certification/);assert.match(cost.html,/\$199 preparation course/);
  for(let i=0;i<5;i++){const ui=await load('tool-testing-decoder.html');ui.el('gsftd-opts').children[i].onclick();ui.el('gsftd-go').dispatch('click');assert.match(ui.el('gsftd-res').innerHTML,/Estimated cost/);assert.ok(!ui.el('gsftd-res').classList.contains('hidden'));if(i===3){assert.match(ui.el('gsftd-res').innerHTML,/Seasonal Fire Fighter I/);assert.match(ui.el('gsftd-res').innerHTML,/Other classifications/);}cases++;}
 });
  await test('quiz repeat, back, and reset flows keep selections and recommendations consistent',async()=>{
   const ui=await load('tool-where-am-i.html');const body=ui.el('gsfq-body');
   const buttons=()=>{let out=[];function walk(e){if(e.tag==='button')out.push(e);e.children.forEach(walk)}walk(body);return out};
   const click=text=>{const b=buttons().find(b=>b.innerHTML===text);assert.ok(b,'button '+text);b.onclick()};
   const qualify=()=>{click('Start');buttons()[1].onclick()};
   const option=i=>buttons()[i].onclick();
   function expectResult(re){assert.match(body.children.find(e=>e.className==='res-step').innerHTML,re)}
   qualify();click('See my next step');expectResult(/Check the required EMS/);cases++;
   click('Back');option(0);click('See my next step');expectResult(/academy is required/);cases++;
   click('Back');assert.equal(buttons()[0].attrs['aria-pressed'],'true');option(1);option(2);click('See my next step');expectResult(/complete eligibility rules/);cases++;
   click('Back');for(let i=0;i<3;i++)assert.equal(buttons()[i].attrs['aria-pressed'],'true');click('Back');buttons()[1].onclick();for(let i=0;i<3;i++)assert.equal(buttons()[i].attrs['aria-pressed'],'true');cases++;
   click('Start over');qualify();for(let i=0;i<3;i++)assert.equal(buttons()[i].attrs['aria-pressed'],'false');click('See my next step');expectResult(/Check the required EMS/);cases++;
  });
  await test('oral disclosure buttons announce expansion and reset on next question',async()=>{const ui=await load('tool-oral-board-drill.html');for(const id of ['gsfdrill-reveal','gsfdrill-exbtn']){ui.el(id).dispatch('click');assert.equal(ui.el(id).attrs['aria-expanded'],'true');}ui.el('gsfdrill-next').dispatch('click');for(const id of ['gsfdrill-reveal','gsfdrill-exbtn'])assert.equal(ui.el(id).attrs['aria-expanded'],'false');cases++;});
  await test('directory displays role deadlines, interim/division labels, archive status and former-name search',async()=>{
 const ui=await load('tool-department-directory.html');
 for(const [name,expected]of [['Banning',/Division Chief/],['East Bay Regional',/Interim Fire Chief/],['California Rehab',/historical institution/],['Marin County',/Paramedic after hire/],['Scotts Valley',/closed October 9/]]){ui.el('gsfd-q').value=name;ui.el('gsfd-q').dispatch('input');assert.match(ui.el('gsfd-grid').innerHTML,expected);cases++;}
 ui.el('gsfd-q').value='Central Fire Department Santa Cruz';ui.el('gsfd-q').dispatch('input');assert.match(ui.el('gsfd-grid').innerHTML,/Central Fire District of Santa Cruz County/);cases++;
});
await test('jobs schema2 exposes restricted access, safe links, observed dates, expiry and stale-feed guards',async()=>{
 const html=fs.readFileSync(path.join(PAGES,'jobs-v2.html'),'utf8'),script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].find(m=>m[1].includes('var LISTINGS_URL'))[1];
 const candidate=JSON.parse(fs.readFileSync(path.join(ROOT,'../evidence/current-job-feeds/listings.candidate.json')));
 async function run(feed){const els=new Map();const document={getElementById:id=>{if(!els.has(id))els.set(id,new Element());return els.get(id)}};class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-12T18:00:00Z']))}}
 vm.runInNewContext(script,{document,window:{location:{href:'https://www.goldenstatefirefighter.com/jobs'}},URL,Date:FixedDate,fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(feed)}),console});await new Promise(r=>setImmediate(r));return id=>document.getElementById(id);}
 let el=await run(candidate);assert.equal(el('gsfj-count').textContent,'36 open roles');const h=el('gsfj-grid').innerHTML;assert.equal((h.match(/Internal only/g)||[]).length,2);assert.equal((h.match(/Promotional only/g)||[]).length,2);assert.equal((h.match(/Public application/g)||[]).length,32);assert.match(h,/Observed/);assert.doesNotMatch(h,/NaN|undefined/);cases++;
 el=await run({meta:{generated:'2026-10-12T17:00:00Z'},listings:[{title:'<img bad>',source_url:'javascript:bad',close_date:'2099-01-01',access_status:'unknown'},{title:'Expired',close_date:'2026-01-01'}]});assert.match(el('gsfj-grid').innerHTML,/&lt;img bad&gt;/);assert.doesNotMatch(el('gsfj-grid').innerHTML,/javascript:|Expired/);assert.match(el('gsfj-grid').innerHTML,/Access: confirm in bulletin/);cases++;
 el=await run({...candidate,meta:{generated:'2000-01-01'}});assert.match(el('gsfj-grid').innerHTML,/could not be reached/);cases++;
});
const receipt={test_groups:groups,cases,passed:true,at:new Date().toISOString(),method:'Node VM executes staged scripts, independent arithmetic/filter oracles; not a browser-rendering certification'};
 fs.writeFileSync(path.join(ROOT,'review/career-test-results.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
})().catch(e=>{console.error(e);process.exitCode=1});
