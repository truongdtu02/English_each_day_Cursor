(function(){
  const els = {
    owner: document.getElementById('owner'),
    repo: document.getElementById('repo'),
    branch: document.getElementById('branch'),
    saveCfg: document.getElementById('saveCfg'),
    openRepo: document.getElementById('openRepo'),
    search: document.getElementById('search'),
    reload: document.getElementById('reload'),
    newDay: document.getElementById('newDay'),
    buildReadme: document.getElementById('buildReadme'),
    days: document.getElementById('days'),
    readmePreview: document.getElementById('readmePreview'),
    copyReadme: document.getElementById('copyReadme'),
    editReadme: document.getElementById('editReadme'),
  };

  function cfg(){
    return {
      owner: els.owner.value.trim(),
      repo: els.repo.value.trim(),
      branch: els.branch.value.trim() || 'main',
    };
  }
  function saveCfg(){
    localStorage.setItem('cfg', JSON.stringify(cfg()));
    syncRepoLink();
  }
  function loadCfg(){
    try{ const v = JSON.parse(localStorage.getItem('cfg')||'{}');
      if(v.owner) els.owner.value = v.owner;
      if(v.repo) els.repo.value = v.repo;
      if(v.branch) els.branch.value = v.branch;
    }catch(e){}
    syncRepoLink();
  }
  function syncRepoLink(){
    const c = cfg();
    if(c.owner && c.repo){
      els.openRepo.href = `https://github.com/${c.owner}/${c.repo}`;
      els.editReadme.href = `https://github.com/${c.owner}/${c.repo}/edit/${c.branch}/README.md`;
    }
  }

  async function gh(path){
    const url = `https://api.github.com/repos/${cfg().owner}/${cfg().repo}/${path}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(`GitHub API ${res.status}`);
    return res.json();
  }

  async function listDays(){
    const c = cfg();
    const data = await gh(`contents/days?ref=${encodeURIComponent(c.branch)}`);
    return data
      .filter(x=>x.type==='file' && /^day\d+\.md$/.test(x.name))
      .sort((a,b)=>{
        const na = parseInt(a.name.match(/\d+/)[0],10);
        const nb = parseInt(b.name.match(/\d+/)[0],10);
        return na-nb;
      });
  }

  async function fetchFileRaw(download_url){
    const res = await fetch(download_url);
    if(!res.ok) throw new Error('fetch raw failed');
    return res.text();
  }

  function parseKeywords(md){
    const m = md.match(/\*\*Keywords:\*\*\s*(.+)$/m);
    if(!m) return [];
    return m[1]
      .split(',')
      .map(s=>s.trim())
      .map(s=>s.replace(/^\[|\]$/g,''))
      .filter(Boolean);
  }

  function mdStrip(md){
    return md
      .replace(/```[\s\S]*?```/g,' ')
      .replace(/[#*_`>\-]/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function renderDays(items){
    els.days.innerHTML = '';
    for(const it of items){
      const card = document.createElement('div');
      card.className = 'card';
      const h3 = document.createElement('h3');
      h3.textContent = it.title;
      const kw = document.createElement('div');
      for(const k of it.keywords){
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = k;
        kw.appendChild(b);
      }
      const link = document.createElement('a');
      link.href = it.html_url;
      link.target = '_blank';
      link.textContent = 'Open file';
      card.appendChild(h3);
      card.appendChild(kw);
      card.appendChild(link);
      els.days.appendChild(card);
    }
  }

  function buildReadmeContent(days){
    const lines = [];
    lines.push('# 📚 English Learning Progress');
    lines.push('');
    for(const d of days){
      const n = d.number;
      const focus = d.focus || '';
      const focusText = focus?` — Focus: ${focus}`:'';
      lines.push(`- [Day ${n}](./days/day${n}.md)${focusText}`);
    }
    lines.push('');
    lines.push('## 🔍 Search by Keyword');
    const map = new Map();
    for(const d of days){
      for(const k of d.keywords){
        const prev = map.get(k) || [];
        prev.push(niceLink(d.number));
        map.set(k, prev);
      }
    }
    const sorted = Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
    for(const [k, arr] of sorted){
      lines.push(`- **${k}:** ${arr.join(', ')}`);
    }
    return lines.join('\n');

    function niceLink(n){
      return `[Day ${n}](./days/day${n}.md)`;
    }
  }

  async function reload(){
    try{
      const list = await listDays();
      const details = [];
      for(const f of list){
        const md = await fetchFileRaw(f.download_url);
        const number = parseInt(f.name.match(/\d+/)[0],10);
        const titleMatch = md.match(/^#\s+(.+)$/m);
        const title = titleMatch? titleMatch[1] : `Day ${number}`;
        const kw = parseKeywords(md);
        const focusMatch = md.match(/—\s*Focus:\s*(.+)$/m);
        details.push({
          number,
          title,
          keywords: kw,
          focus: focusMatch?focusMatch[1].trim():'' ,
          html_url: `https://github.com/${cfg().owner}/${cfg().repo}/blob/${cfg().branch}/days/${f.name}`
        });
      }
      const q = els.search.value.trim().toLowerCase();
      let filtered = details;
      if(q){
        filtered = [];
        for(const d of details){
          const md = await fetchFileRaw(`https://raw.githubusercontent.com/${cfg().owner}/${cfg().repo}/${cfg().branch}/days/day${d.number}.md`);
          const hay = mdStrip(md) + ' ' + d.keywords.join(' ').toLowerCase();
          if(hay.includes(q)) filtered.push(d);
        }
      }
      renderDays(filtered);
      els.readmePreview.value = buildReadmeContent(details);
    }catch(e){
      alert('Error: '+e.message);
    }
  }

  function computeNextDayNumber(names){
    let max = 0;
    for(const n of names){
      const m = n.match(/^day(\d+)\.md$/);
      if(m) max = Math.max(max, parseInt(m[1],10));
    }
    return max + 1;
  }

  async function newDay(){
    try{
      const list = await listDays();
      const next = computeNextDayNumber(list.map(x=>x.name));
      const today = new Date().toISOString().slice(0,10);
      const template = `# 📘 Day ${next} — English Learning Sentences\n\n## 🗓️ Date: ${today}\n\n### 🧠 Sentence 1\n**Sentence:** \"...\"\n- **Vocabulary:** ...\n- **Grammar:** ...\n- **Phrasal verbs / idioms:** ...\n- **Example usage:** ...\n\n### 🧠 Sentence 2\n**Sentence:** \"...\"\n- **Vocabulary:** ...\n- **Grammar:** ...\n- **Phrasal verbs / idioms:** ...\n- **Example usage:** ...\n\n### 🧠 Sentence 3\n**Sentence:** \"...\"\n- **Vocabulary:** ...\n- **Grammar:** ...\n- **Phrasal verbs / idioms:** ...\n- **Example usage:** ...\n\n### 🧠 Sentence 4\n**Sentence:** \"...\"\n- **Vocabulary:** ...\n- **Grammar:** ...\n- **Phrasal verbs / idioms:** ...\n- **Example usage:** ...\n\n### 🧠 Sentence 5\n**Sentence:** \"...\"\n- **Vocabulary:** ...\n- **Grammar:** ...\n- **Phrasal verbs / idioms:** ...\n- **Example usage:** ...\n\n---\n**Keywords:** [ ]`;
      const url = `https://github.com/${cfg().owner}/${cfg().repo}/new/${cfg().branch}?filename=days/day${next}.md&value=${encodeURIComponent(template)}`;
      window.open(url,'_blank');
    }catch(e){ alert('Error: '+e.message); }
  }

  function buildReadme(){
    const txt = els.readmePreview.value;
    const url = `https://github.com/${cfg().owner}/${cfg().repo}/edit/${cfg().branch}/README.md`;
    if(confirm('Open README edit page on GitHub?')) window.open(url,'_blank');
  }

  els.saveCfg.addEventListener('click', saveCfg);
  els.reload.addEventListener('click', reload);
  els.search.addEventListener('input', ()=>{ reload(); });
  els.newDay.addEventListener('click', newDay);
  els.buildReadme.addEventListener('click', buildReadme);
  els.copyReadme.addEventListener('click', ()=>{
    navigator.clipboard.writeText(els.readmePreview.value);
  });

  loadCfg();
  reload();
})();
