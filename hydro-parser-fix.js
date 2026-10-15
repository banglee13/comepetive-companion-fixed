// Local compatibility fix for Competitive Companion 2.65.0.
// Insert after HydroProblemParser is defined, before HydroContestParser.
(() => {
  function samplesFrom(root) {
    const read = pre => (pre.querySelector('code') || pre).textContent.replace(/\r\n?/g, '\n');
    const pairs = [];
    const used = new Set();
    const add = (input, output) => {
      if (used.has(input) || used.has(output)) return;
      used.add(input);
      used.add(output);
      pairs.push({ input: read(input), output: read(output) });
    };

    // Hydro's native sample component (including Prism toolbar wrappers).
    const native = [...root.querySelectorAll('.sample pre')];
    if (native.length % 2) throw new Error('Hydro 样例输入/输出数量不匹配，请检查题面。');
    for (let i = 0; i < native.length; i += 2) add(native[i], native[i + 1]);

    // Imported Markdown statements use labelled headings and ordinary code blocks.
    // Never pair all <pre> nodes: explanations and source code are not samples.
    const groups = new Map();
    let current = null;
    let labelled = false;
    const content = root.querySelector('[data-fragment-id="problem-description"], .typo.richmedia, .typo') || root;
    for (const node of content.querySelectorAll('h1,h2,h3,h4,h5,h6,pre')) {
      if (node.tagName !== 'PRE') {
        current = null;
        const label = node.textContent.trim();
        const match = /^(?:(?:样例|示例)\s*(输入|输出)|(输入|输出)\s*(?:样例|示例)|(?:sample|example)\s+(input|output)|(input|output)\s+(?:sample|example))\s*[:：#]?\s*(\d*)\s*[:：]?$/i.exec(label);
        if (!match) continue;
        labelled = true;
        const kind = /^(输入|input)$/i.test(match[1] || match[2] || match[3] || match[4]) ? 'input' : 'output';
        current = { kind, id: match[5] || '1' };
      } else if (current) {
        if (!used.has(node)) {
          const group = groups.get(current.id) || {};
          if (group[current.kind]) throw new Error('Hydro 样例编号重复，无法安全配对。');
          group[current.kind] = node;
          groups.set(current.id, group);
        }
        current = null;
      }
    }
    for (const group of groups.values()) {
      if (!group.input || !group.output) throw new Error('Hydro 样例缺少对应的输入或输出，请等待题面加载完成后重试。');
      add(group.input, group.output);
    }
    if (labelled && !pairs.length) throw new Error('找到了样例标题，但未读取到样例代码块，请等待题面加载完成后重试。');
    return pairs;
  }

  const originalPatterns = HydroProblemParser.prototype.getMatchPatterns;
  HydroProblemParser.prototype.getMatchPatterns = function () {
    const local = ['p/*', 'd/*/p/*', 'contest/*/p/*'].flatMap(path =>
      ['http', 'https'].map(scheme => `${scheme}://192.168.8.236/${path}`));
    return [...originalPatterns.call(this), ...local];
  };

  HydroProblemParser.prototype.parse = async function (url, html) {
    const host = new URL(url).hostname;
    const judge = HydroProblemParser.DOMAINS[host] || 'Hydro';
    const elem = htmlToElement(html);
    const task = new TaskBuilder(judge).setUrl(url);
    task.setName(elem.querySelector('.section__title').textContent.trim());
    const pairs = samplesFrom(elem);
    if (!pairs.length && judge === 'Daimayuan Online Judge') {
      const blocks = [...elem.querySelectorAll('h2 + .code-toolbar > pre > code')];
      for (let i = 0; i + 1 < blocks.length; i += 2) {
        pairs.push({ input: blocks[i].textContent, output: blocks[i + 1].textContent });
      }
    }
    for (const pair of pairs) task.addTest(pair.input, pair.output);
    const time = /(\d+)\s*ms/i.exec(elem.querySelector('.icon-stopwatch')?.textContent || '');
    const memory = /(\d+)\s*MiB/i.exec(elem.querySelector('.icon-comparison')?.textContent || '');
    if (!time || !memory) throw new Error('无法读取 Hydro 题目限制，请在题目详情页面重试。');
    return task.setTimeLimit(Number(time[1])).setMemoryLimit(Number(memory[1])).build();
  };
})();
