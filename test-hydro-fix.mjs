import fs from 'node:fs/promises';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { DOMParser, parseHTML } from 'linkedom';

const root = new URL('./', import.meta.url);
const file = name => new URL(name, root);
const original = await fs.readFile(file('competitive-companion-original.js'), 'utf8');
const patch = await fs.readFile(file('hydro-parser-fix.js'), 'utf8');
const marker = 'var HydroContestParser=';
assert.equal(original.split(marker).length, 2);
const fixed = original.replace(marker, patch + '\n' + marker);
function parser(source) {
  const {window} = parseHTML('<html><head></head><body></body></html>');
  const chrome = {runtime:{onMessage:{addListener(){},removeListener(){}}},storage:{local:{async get(){return {};}}}};
  const context = vm.createContext({console,window,document:window.document,DOMParser,chrome,crypto:webcrypto,URL,setTimeout,clearTimeout,TextEncoder,TextDecoder});
  vm.runInContext(source, context);
  const instance = vm.runInContext('new HydroProblemParser()',context);
  instance.selectForUrl = async url => {
    window.location = {href: url};
    return vm.runInContext('getParserToUse()', context);
  };
  return instance;
}
const before = parser(original);
const after = parser(fixed);
const url = 'http://192.168.8.236/d/example/p/1';
const input = '2\n1 2\n3 4\n';
const output = '3\n7\n';
const pre = text => `<div class="code-toolbar"><pre class="syntax-hl language-text"><code class="language-text">${text}</code></pre><div class="toolbar"><a>Copy</a></div></div>`;
const page = body => `<html><body><h1 class="section__title">Example Problem</h1><div class="typo richmedia">${body}</div><span class="icon-stopwatch">3000ms</span><span class="icon-comparison">1024MiB</span></body></html>`;
const html = page(`<h2>输入格式</h2><h2>输出格式</h2><h2>样例输入 1</h2>${pre(input)}<h2>样例输出 1</h2>${pre(output)}<h2>样例说明 1</h2>`);
assert.equal((await before.parse(url, html)).tests.length,0);
const task = await after.parse(url, html);
assert.equal(task.tests.length,1);
assert.equal(task.tests[0].input,input);
assert.equal(task.tests[0].output,output);
assert.equal(task.timeLimit,3000);
assert.equal(task.memoryLimit,1024);
assert(after.getMatchPatterns().includes('http://192.168.8.236/d/*/p/*'));
console.log('PASS: reproduced empty samples in 2.65.0; fixed Chinese heading / Prism structure');
assert.equal((await after.parse(url,page(`<div class="sample"><pre><code>1\n</code></pre><pre><code>2\n</code></pre></div>`))).tests.length,1);
assert.equal((await after.parse(url,page(`<div class="sample">${pre('1\n')}${pre('2\n')}</div>`))).tests.length,1);
console.log('PASS: native Hydro components, with and without toolbars');
const multi = page(`<h2>Sample Input 1</h2>${pre('a\n')}<h2>Sample Output 1</h2>${pre('b\n')}<h2>Explanation</h2>${pre('ignore\n')}<h2>Sample Input 2</h2>${pre('c\n')}<h2>Sample Output 2</h2>${pre('d\n')}<h2>Code</h2>${pre('ignore\n')}`);
assert.equal((await after.parse(url,multi)).tests.length,2);
assert.equal((await after.parse(url,page(`<h2>输入格式</h2>${pre('format')}<h2>解法</h2>${pre('code')}`))).tests.length,0);
console.log('PASS: numbered English samples; explanation, format and solution code excluded');
await assert.rejects(after.parse(url,page(`<h2>样例输入 1</h2>${pre('1')}<h2>样例输出 2</h2>${pre('2')}`)));
await assert.rejects(after.parse(url,page('<h2>样例输入 1</h2>')));
console.log('PASS: mismatched / unloaded labelled samples fail instead of sending empty samples');

// DTOJ wraps each heading/code block in columns and moves limits to a <dl>.
const column = (label, value) => `<div class="dtoj-sample-column"><div class="dtoj-sample-head"><h2>${label}</h2><button>复制</button></div>${pre(value)}</div>`;
const sample = (id, input, output) => `<div class="dtoj-sample-pair">${column(`样例输入 ${id}`, input)}${column(`样例输出 ${id}`, output)}</div>`;
const dtoj = `<html><body><h1 class="section__title"><form><button></button></form><span class="dtoj-title-pid">B1000</span>Example Problem</h1>
<div class="typo richmedia" data-fragment-id="problem-description">
<h2>输入格式</h2>${pre('ignore format')}${sample(1, '1 2\n', '3\n')}
<h2>样例说明 1</h2>${pre('ignore explanation')}${sample(2, '3 4\n', '7\n')}
</div><dl class="dtoj-info-metrics"><div><dt>尝试</dt><dd>999</dd></div><div><dt>内存</dt><dd>1024<small>MiB</small></dd></div><div><dt>时间</dt><dd>2000<small>ms</small></dd></div></dl></body></html>`;
const newUrl = 'http://192.168.8.233/d/oi2026/p/1132?from=course&course=6af9e3f20dac303b6d90c47d&lesson=lesson-04';
const selected = await after.selectForUrl(newUrl);
assert(selected && selected.constructor.name.includes('HydroProblemParser'));
const dtojTask = await selected.parse(newUrl, dtoj);
assert.equal(dtojTask.name, 'B1000 Example Problem');
assert.equal(dtojTask.url, newUrl);
assert.equal(dtojTask.timeLimit, 2000);
assert.equal(dtojTask.memoryLimit, 1024);
assert.deepEqual(JSON.parse(JSON.stringify(dtojTask.tests)), [{input:'1 2\n',output:'3\n'},{input:'3 4\n',output:'7\n'}]);
assert.equal(dtojTask.input.type, 'stdin');
assert.equal(dtojTask.output.type, 'stdout');
assert.equal(dtojTask.batch.size, 1);
assert.equal(dtojTask.testType, 'single');
await assert.rejects(after.parse(newUrl, dtoj.replace('<dt>时间</dt>', '<dt>其他</dt>')), /无法读取 Hydro 题目限制/);
console.log('PASS: DTOJ columns, copy buttons, labelled/reordered metrics, title and CPH task schema');

for (const host of ['192.168.8.233', '192.168.8.236']) {
  for (const scheme of ['http', 'https']) {
    for (const path of ['p/1132', 'd/oi2026/p/1132', 'contest/example/p/1132']) {
      const candidate = await after.selectForUrl(`${scheme}://${host}/${path}?from=course&lesson=lesson-04`);
      assert(candidate && candidate.constructor.name.includes('HydroProblemParser'));
    }
  }
}
for (const url of ['http://192.168.8.233/d/oi2026/p', 'http://192.168.8.233/login', 'http://192.168.8.233.example.com/p/1', 'http://192.168.8.2330/p/1']) {
  assert.equal(await after.selectForUrl(url), null);
}
for (const pattern of before.getMatchPatterns()) assert(after.getMatchPatterns().includes(pattern));
console.log('PASS: actual automatic parser selection for both hosts/protocols/routes/query strings; unrelated URLs excluded');
await fs.writeFile(file('competitive-companion-fixed/js/content.js'),fixed);
console.log('Built competitive-companion-fixed/js/content.js');
