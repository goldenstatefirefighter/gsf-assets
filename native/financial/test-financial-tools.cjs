const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = __dirname;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n${error.stack}\n`);
    process.exitCode = 1;
  }
}

class ClassList {
  constructor(value = '') { this.values = new Set(value.split(/\s+/).filter(Boolean)); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const add = force === undefined ? !this.contains(name) : Boolean(force);
    add ? this.add(name) : this.remove(name);
    return add;
  }
  toString() { return [...this.values].join(' '); }
}

class Element {
  constructor(id, attrs = '') {
    this.id = id;
    this.listeners = {};
    this.attributes = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.clientWidth = 560;
    const classMatch = attrs.match(/class="([^"]*)"/);
    this.classList = new ClassList(classMatch ? classMatch[1] : '');
    const valueMatch = attrs.match(/value="([^"]*)"/);
    this.value = valueMatch ? valueMatch[1] : '';
  }
  get className() { return this.classList.toString(); }
  set className(value) { this.classList = new ClassList(value); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type) { (this.listeners[type] || []).forEach(fn => fn({ preventDefault() {} })); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  getAttribute(name) { return this.attributes[name]; }
  focus() { this.focused = true; }
  getContext() {
    const noOp = () => {};
    return { scale:noOp, clearRect:noOp, beginPath:noOp, moveTo:noOp, lineTo:noOp, stroke:noOp, fillText:noOp, arc:noOp, fill:noOp };
  }
}

function loadTool(fileName) {
  const html = fs.readFileSync(path.join(ROOT, fileName), 'utf8');
  const elements = new Map();
  for (const match of html.matchAll(/<([a-z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    elements.set(match[3], new Element(match[3], match[2]));
  }
  for (const match of html.matchAll(/<select\b([^>]*\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/select>/gi)) {
    const selected = match[3].match(/<option\b[^>]*value="([^"]+)"[^>]*selected[^>]*>/i);
    const first = match[3].match(/<option\b[^>]*value="([^"]+)"[^>]*>/i);
    elements.get(match[2]).value = (selected || first || ['', ''])[1];
  }
  // Baseline cases explicitly assume no future employer/other deferrals and sufficient eligible compensation.
  if(fileName==='tool-457b-maximizer.html'){elements.get('gsf457-future').value='0';elements.get('gsf457-comp').value='1000000';}
  const document = { getElementById: id => elements.get(id) };
  const window = { devicePixelRatio: 1 };
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length, `${fileName} contains executable script`);
  vm.runInNewContext(scripts.at(-1)[1], { document, window, console, Math, parseFloat, parseInt, isFinite }, { filename: fileName });
  return {
    html,
    el: id => {
      assert.ok(elements.has(id), `${fileName} has #${id}`);
      return elements.get(id);
    },
    set(values) { Object.entries(values).forEach(([id, value]) => { elements.get(id).value = String(value); }); },
    blank(...ids) { ids.forEach(id => { elements.get(id).value = ''; }); },
    submit(formId) { elements.get(formId).dispatch('submit'); }
  };
}

function dollars(text) { return Number(String(text).replace(/[$,]/g, '').replace('/check', '')); }
function oracle457(limit, ytd, checksLeft, current) {
  const remaining = Math.max(0, limit - ytd);
  const need = checksLeft > 0 ? remaining / checksLeft : 0;
  return { remaining, need, gap: Math.max(0, need - current) };
}
function oracleQot({ filing, magi, rate, above, bracket }) {
  const caps = { single: 12500, joint: 25000 };
  const thresholds = { single: 150000, joint: 300000 };
  const qualified = above * rate * 0.5;
  const afterCap = Math.min(qualified, caps[filing]);
  const reduction = Math.floor(Math.max(0, magi - thresholds[filing]) / 1000) * 100;
  const deduction = Math.max(0, afterCap - reduction);
  return { qualified, deduction, benefit: deduction * bracket / 100 };
}
function oracleFee(balance, monthly, years, gross, fee) {
  const rate = (gross - fee) / 100 / 12;
  let value = balance;
  for (let month = 0; month < years * 12; month += 1) value = value * (1 + rate) + monthly;
  return value;
}

test('457 midyear calculation uses YTD and remaining checks', () => {
  const t = loadTool('tool-457b-maximizer.html');
  t.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':13000,'gsf457-left':7,'gsf457-wage':'no'});
  t.submit('gsf457-form');
  const expected = oracle457(24500, 13000, 7, 500);
  assert.equal(dollars(t.el('gsf457-limit').textContent), 24500);
  assert.equal(dollars(t.el('gsf457-remaining').textContent), expected.remaining);
  assert.equal(dollars(t.el('gsf457-need').textContent), 1642.86);
  assert.equal(dollars(t.el('gsf457-gap').textContent), 1142.86);
  assert.equal(t.el('gsf457-res').classList.contains('hidden'), false);
});

test('457 age boundaries preserve 2026 catch-up limits', () => {
  for (const [age, expected] of [[49,24500],[50,32500],[59,32500],[60,35750],[63,35750],[64,32500]]) {
    const t = loadTool('tool-457b-maximizer.html');
    t.set({'gsf457-age':age,'gsf457-pp':26,'gsf457-cur':0,'gsf457-ytd':0,'gsf457-left':26,'gsf457-wage':'no'});
    t.submit('gsf457-form');
    assert.equal(dollars(t.el('gsf457-limit').textContent), expected, `age ${age}`);
  }
});

test('457 reached limit, no checks, and excess states are explicit', () => {
  const reached = loadTool('tool-457b-maximizer.html');
  reached.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':24500,'gsf457-left':7,'gsf457-wage':'no'});
  reached.submit('gsf457-form');
  assert.equal(dollars(reached.el('gsf457-remaining').textContent), 0);
  assert.match(reached.el('gsf457-flags').innerHTML, /Illustrated room already allocated/);

  const noChecks = loadTool('tool-457b-maximizer.html');
  noChecks.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':13000,'gsf457-left':0,'gsf457-wage':'no'});
  noChecks.submit('gsf457-form');
  assert.equal(noChecks.el('gsf457-need').textContent, 'No checks left');
  assert.equal(dollars(noChecks.el('gsf457-gap').textContent), 11500);

  const excess = loadTool('tool-457b-maximizer.html');
  excess.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':25000,'gsf457-left':7,'gsf457-wage':'no'});
  excess.submit('gsf457-form');
  assert.match(excess.el('gsf457-flags').innerHTML, /possible excess/);
});

test('457 rejects missing YTD and impossible remaining-check counts', () => {
  const blank = loadTool('tool-457b-maximizer.html');
  blank.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-left':7,'gsf457-wage':'no'});
  blank.blank('gsf457-ytd');
  blank.submit('gsf457-form');
  assert.match(blank.el('gsf457-err').textContent, /year-to-date/i);
  assert.equal(blank.el('gsf457-ytd').getAttribute('aria-invalid'), 'true');

  const tooMany = loadTool('tool-457b-maximizer.html');
  tooMany.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':13000,'gsf457-left':27,'gsf457-wage':'no'});
  tooMany.submit('gsf457-form');
  assert.match(tooMany.el('gsf457-err').textContent, /cannot exceed/);
});

test('qualified OT contains all 7 through 28 day work periods', () => {
  const t = loadTool('tool-qualified-ot-estimator.html');
  const options = [...t.html.matchAll(/<option value="(\d+)"[^>]*>(\d+) days \(ceiling: (\d+) hours\)<\/option>/g)]
    .map(match => ({ days:Number(match[1]), ceiling:Number(match[3]) }));
  assert.equal(options.length, 22);
  assert.deepEqual(options.map(item => item.days).sort((a,b)=>a-b), Array.from({length:22},(_,i)=>i+7));
  assert.equal(options.find(item => item.days === 21).ceiling, 159);
});

test('qualified OT normal and phaseout boundary arithmetic', () => {
  const normal = loadTool('tool-qualified-ot-estimator.html');
  normal.set({'gsfqot-fs':'single','gsfqot-magi':165000,'gsfqot-wp':28,'gsfqot-hrs':224,'gsfqot-rate':48,'gsfqot-brkt':22,'gsfqot-above':150});
  normal.submit('gsfqot-form');
  const expected = oracleQot({filing:'single',magi:165000,rate:48,above:150,bracket:22});
  assert.equal(dollars(normal.el('gsfqot-qual').textContent), expected.qualified);
  assert.equal(dollars(normal.el('gsfqot-ded').textContent), expected.deduction);
  assert.equal(dollars(normal.el('gsfqot-ben').textContent), expected.benefit);

  for (const [magi, deduction] of [[150999,10000],[151000,9900]]) {
    const t = loadTool('tool-qualified-ot-estimator.html');
    t.set({'gsfqot-fs':'single','gsfqot-magi':magi,'gsfqot-wp':28,'gsfqot-hrs':212,'gsfqot-rate':50,'gsfqot-brkt':22,'gsfqot-above':400});
    t.submit('gsfqot-form');
    assert.equal(dollars(t.el('gsfqot-ded').textContent), deduction);
  }
});

test('qualified OT supports 21-day threshold and uses entered regular rate', () => {
  const t = loadTool('tool-qualified-ot-estimator.html');
  t.set({'gsfqot-fs':'single','gsfqot-magi':100000,'gsfqot-wp':21,'gsfqot-hrs':165,'gsfqot-rate':52.75,'gsfqot-brkt':22,'gsfqot-above':100});
  t.submit('gsfqot-form');
  assert.equal(dollars(t.el('gsfqot-qual').textContent), Math.round(100 * 52.75 * 0.5));
  assert.match(t.el('gsfqot-flags').innerHTML, /159-hour ceiling/);
  assert.match(t.html, /FLSA regular rate for these work periods/);
});

test('qualified OT rejects negative hours but permits negative MAGI', () => {
  const badHours = loadTool('tool-qualified-ot-estimator.html');
  badHours.set({'gsfqot-fs':'single','gsfqot-magi':100000,'gsfqot-wp':28,'gsfqot-hrs':212,'gsfqot-rate':50,'gsfqot-brkt':22,'gsfqot-above':-10});
  badHours.submit('gsfqot-form');
  assert.match(badHours.el('gsfqot-err').textContent, /cannot be negative/);
  assert.equal(badHours.el('gsfqot-res').classList.contains('hidden'), true);
  assert.equal(badHours.el('gsfqot-above').getAttribute('aria-invalid'), 'true');

  const negativeMagi = loadTool('tool-qualified-ot-estimator.html');
  negativeMagi.set({'gsfqot-fs':'single','gsfqot-magi':-1,'gsfqot-wp':28,'gsfqot-hrs':212,'gsfqot-rate':50,'gsfqot-brkt':22,'gsfqot-above':100});
  negativeMagi.submit('gsfqot-form');
  assert.equal(dollars(negativeMagi.el('gsfqot-ded').textContent), 2500);
  assert.equal(negativeMagi.el('gsfqot-err').classList.contains('hidden'), true);
});

test('qualified OT MFS branch and 2025 through 2028 notice remain explicit', () => {
  const t = loadTool('tool-qualified-ot-estimator.html');
  t.set({'gsfqot-fs':'mfs'});
  t.submit('gsfqot-form');
  assert.equal(t.el('gsfqot-noel').classList.contains('hidden'), false);
  assert.equal(t.el('gsfqot-nums').classList.contains('hidden'), true);
  assert.match(t.html, /tax years 2025 through 2028/);
});

test('qualified OT preserves the FLSA minimum inside double-time pay', () => {
  const tool = fs.readFileSync(path.join(ROOT, 'tool-qualified-ot-estimator.html'), 'utf8');
  const page = fs.readFileSync(path.join(ROOT, 'page-qualified-ot-estimator.html'), 'utf8');
  assert.match(tool, /double time, the minimum half-rate premium can still qualify/i);
  assert.match(tool, /only the extra premium beyond the FLSA minimum is excluded/i);
  assert.doesNotMatch(tool, /Double-time, holiday premiums[^.]*are excluded/i);
  assert.match(page, /Double time on a qualifying FLSA overtime hour can still contain a qualified half-rate component/i);
  assert.match(page, /Holiday or weekend premiums for hours that are not FLSA overtime/i);
});

test('qualified OT annual-hours input includes qualifying double-time hours', () => {
  const tool = fs.readFileSync(path.join(ROOT, 'tool-qualified-ot-estimator.html'), 'utf8');
  const page = fs.readFileSync(path.join(ROOT, 'page-qualified-ot-estimator.html'), 'utf8');
  assert.match(tool, /Estimated annual hours above the FLSA ceiling that required an overtime premium/);
  assert.match(tool, /Count a qualifying hour even if it was paid at double time/);
  assert.match(tool, /A paystub label alone is not enough to identify qualified hours/);
  assert.doesNotMatch(tool, /Most California firefighter paystub OT/);
  assert.match(page, /hours above the applicable federal ceiling that required an overtime premium/);
  assert.match(page, /A paystub label alone is not enough/);
});

test('fee drag normal arithmetic still matches independent monthly model', () => {
  const t = loadTool('tool-fee-drag.html');
  t.set({'gsffee-bal':40000,'gsffee-mo':800,'gsffee-yrs':20,'gsffee-fee1':1.2,'gsffee-fee2':0.1,'gsffee-ret':6});
  t.submit('gsffee-form');
  const low = oracleFee(40000,800,20,6,0.1);
  const high = oracleFee(40000,800,20,6,1.2);
  assert.equal(dollars(t.el('gsffee-low').textContent), Math.round(low));
  assert.equal(dollars(t.el('gsffee-hi').textContent), Math.round(high));
  assert.equal(dollars(t.el('gsffee-diff').textContent), Math.round(low-high));
});

test('fee drag rejects either blank fee and accepts explicit zero', () => {
  for (const id of ['gsffee-fee1','gsffee-fee2']) {
    const t = loadTool('tool-fee-drag.html');
    t.set({'gsffee-bal':100000,'gsffee-mo':0,'gsffee-yrs':20,'gsffee-fee1':1.2,'gsffee-fee2':0.1,'gsffee-ret':4});
    t.blank(id);
    t.submit('gsffee-form');
    assert.match(t.el('gsffee-err').textContent, /annual fee/i);
    assert.equal(t.el(id).getAttribute('aria-invalid'), 'true');
    assert.equal(t.el('gsffee-res').classList.contains('hidden'), true);
  }

  const zero = loadTool('tool-fee-drag.html');
  zero.set({'gsffee-bal':100000,'gsffee-mo':0,'gsffee-yrs':20,'gsffee-fee1':0,'gsffee-fee2':0,'gsffee-ret':4});
  zero.submit('gsffee-form');
  assert.equal(dollars(zero.el('gsffee-low').textContent), Math.round(oracleFee(100000,0,20,4,0)));
  assert.equal(dollars(zero.el('gsffee-diff').textContent), 0);
});

test('fee drag equal-fee and negative-fee boundaries', () => {
  const equal = loadTool('tool-fee-drag.html');
  equal.set({'gsffee-bal':100000,'gsffee-mo':500,'gsffee-yrs':20,'gsffee-fee1':0.5,'gsffee-fee2':0.5,'gsffee-ret':6});
  equal.submit('gsffee-form');
  assert.equal(dollars(equal.el('gsffee-low').textContent), 517476);
  assert.equal(dollars(equal.el('gsffee-hi').textContent), 517476);
  assert.equal(dollars(equal.el('gsffee-diff').textContent), 0);

  const negative = loadTool('tool-fee-drag.html');
  negative.set({'gsffee-bal':100000,'gsffee-mo':500,'gsffee-yrs':20,'gsffee-fee1':-1,'gsffee-fee2':0.1,'gsffee-ret':6});
  negative.submit('gsffee-form');
  assert.match(negative.el('gsffee-err').textContent, /cannot be negative/);
});

test('all tools expose semantic forms, live errors, live results, and linked labels', () => {
  for (const file of ['tool-457b-maximizer.html','tool-qualified-ot-estimator.html','tool-fee-drag.html','tool-pension-estimator.html']) {
    const html = fs.readFileSync(path.join(ROOT,file),'utf8');
    assert.match(html, /<form id="[^"]+" novalidate>/);
    assert.match(html, /role="alert" aria-live="assertive"/);
    assert.match(html, /role="status" aria-live="polite"/);
    for (const match of html.matchAll(/<label for="([^"]+)"/g)) assert.match(html, new RegExp(`id="${match[1]}"`));
  }
});

test('457 positive future contributions and compensation ceiling affect all outputs',()=>{
 const t=loadTool('tool-457b-maximizer.html');
 t.set({'gsf457-age':38,'gsf457-pp':26,'gsf457-cur':500,'gsf457-ytd':10000,'gsf457-left':10,'gsf457-future':4500,'gsf457-comp':100000,'gsf457-wage':'no'});t.submit('gsf457-form');
 assert.equal(dollars(t.el('gsf457-remaining').textContent),10000);assert.equal(dollars(t.el('gsf457-need').textContent),1000);assert.match(t.el('gsf457-flags').innerHTML,new RegExp('expected employer/other contributions'));
 t.set({'gsf457-future':14500});t.submit('gsf457-form');assert.equal(dollars(t.el('gsf457-remaining').textContent),0);assert.match(t.el('gsf457-flags').innerHTML,/YTD plus expected remaining/);assert.doesNotMatch(t.el('gsf457-flags').innerHTML,/year-to-date amount has reached/);
 t.set({'gsf457-future':0,'gsf457-comp':15000});t.submit('gsf457-form');assert.equal(dollars(t.el('gsf457-limit').textContent),15000);assert.equal(dollars(t.el('gsf457-need').textContent),500);
});
function pension(values={}){const t=loadTool('tool-pension-estimator.html');t.set({'gsfp-tier':'pepra','gsfp-yos':28,'gsfp-age':57,'gsfp-comp':120000,'gsfp-ss':'yes','gsfp-custom':2.5,'gsfp-custommin':50,'gsfp-medic':0,'gsfp-edu':0,'gsfp-biling':0,...values});t.submit('gsfp-form');return t;}
test('pension ages, completed quarters, caps and eligibility remain explicit',()=>{
 assert.match(pension({'gsfp-age':49}).el('gsfp-err').textContent,/starts at age 50/);
 for(const [age,want]of [[56.74,89040],[56.75,89880],[57,90720]])assert.equal(dollars(pension({'gsfp-age':age}).el('gsfp-annual').textContent),want);
 assert.equal(dollars(pension({'gsfp-comp':200000}).el('gsfp-annual').textContent),120758);
 assert.equal(dollars(pension({'gsfp-comp':200000,'gsfp-ss':'no'}).el('gsfp-annual').textContent),144909);
 assert.match(pension({'gsfp-yos':4}).el('gsfp-flags').innerHTML,/Eligibility not established/);
 for(const vals of [{'gsfp-yos':46},{'gsfp-age':76},{'gsfp-tier':'custom','gsfp-custom':100},{'gsfp-tier':'custom','gsfp-age':49}])assert.ok(pension(vals).el('gsfp-err').textContent);
 const custom=pension({'gsfp-tier':'custom','gsfp-age':49,'gsfp-custommin':45,'gsfp-yos':4});assert.equal(custom.el('gsfp-err').textContent,'');assert.match(custom.el('gsfp-flags').innerHTML,/Custom eligibility not established/);assert.doesNotMatch(custom.el('gsfp-flags').innerHTML,/CalPERS service retirement/);
 const pay=pension({'gsfp-comp':132000,'gsfp-medic':12000});assert.equal(dollars(pay.el('gsfp-annual').textContent),99792);assert.equal(dollars(pay.el('gsfp-gross').textContent),12000);
});
test('fee equality yields zero investment growth while contributions increase balance',()=>{
 const t=loadTool('tool-fee-drag.html');t.set({'gsffee-bal':100000,'gsffee-mo':550,'gsffee-yrs':20,'gsffee-fee1':3,'gsffee-fee2':0.1,'gsffee-ret':3});t.submit('gsffee-form');assert.equal(dollars(t.el('gsffee-hi').textContent),232000);assert.match(t.el('gsffee-flags').innerHTML,/Contributions can still increase/);assert.doesNotMatch(t.el('gsffee-flags').innerHTML,/loses ground every year/);
 t.set({'gsffee-fee1':5.01});t.submit('gsffee-form');assert.match(t.el('gsffee-err').textContent,/0% through 5%/);
});
process.on('exit', () => {
  if (!process.exitCode) process.stdout.write(`\n${passed} test groups passed.\n`);
});
