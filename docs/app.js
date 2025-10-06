(function(){
  const els = {
    q: document.getElementById('q'),
    btnSearch: document.getElementById('btnSearch'),
    btnClear: document.getElementById('btnClear'),
    days: document.getElementById('days'),
  };

  // Infer owner/repo/branch from GitHub Pages URL or query params
  function detectConfig(){
    const u = new URL(location.href);
    const qp = Object.fromEntries(u.searchParams.entries());
    let owner = qp.owner || '';
    let repo = qp.repo || '';
    let branch = qp.branch || 'main';
    // GitHub Pages: https://{owner}.github.io/{repo}/
    if(!owner || !repo){
      const host = location.host;
      const parts = location.pathname.split('/').filter(Boolean);
      if(host.endsWith('github.io') && parts.length>0){
        owner = owner || host.replace('.github.io','');
        repo = repo || parts[0];
      }
    }
    return {owner, repo, branch};
  }

  let cfg = detectConfig();

  async function gh(path){
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${path}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error(`GitHub API ${res.status}`);
    return res.json();
  }

  async function listDays(){
    const data = await gh(`contents/days?ref=${encodeURIComponent(cfg.branch)}`);
    return data
      .filter(x=>x.type==='file' && /^day\d+\.md$/.test(x.name))
      .sort((a,b)=>{
        const na = parseInt(a.name.match(/\d+/)[0],10);
        const nb = parseInt(b.name.match(/\d+/)[0],10);
        return na-nb;
      });
  }

  async function fetchText(url){
    const r = await fetch(url);
    if(!r.ok) throw new Error('fetch failed');
    return r.text();
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

  function strip(md){
    return md
      .replace(/```[\s\S]*?```/g,' ')
      .replace(/[#*_`>\-]/g,' ')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();
  }

  function render(items){
    els.days.innerHTML = '';
    for(const it of items){
      const card = document.createElement('div');
      card.className = 'card';
      const title = document.createElement('h3');
      title.textContent = it.title;
      const badges = document.createElement('div');
      badges.className = 'badges';
      for(const k of it.keywords){
        const b = document.createElement('span');
        b.className = 'badge';
        b.textContent = k;
        badges.appendChild(b);
      }
      const link = document.createElement('a');
      link.href = `https://github.com/${cfg.owner}/${cfg.repo}/blob/${cfg.branch}/days/day${it.number}.md`;
      link.target = '_blank';
      link.textContent = `Open day${it.number}.md`;
      card.appendChild(title);
      if(it.keywords.length) card.appendChild(badges);
      card.appendChild(link);
      els.days.appendChild(card);
    }
  }

  async function loadAndRender(query){
    const list = await listDays();
    const details = [];
    for(const f of list){
      const md = await fetchText(f.download_url);
      const number = parseInt(f.name.match(/\d+/)[0],10);
      const titleMatch = md.match(/^#\s+(.+)$/m);
      const title = titleMatch? titleMatch[1] : `Day ${number}`;
      const kw = parseKeywords(md);
      details.push({ number, title, keywords: kw });
    }
    if(!query){
      render(details);
      return;
    }
    const q = query.trim().toLowerCase();
    const filtered = [];
    for(const d of details){
      const md = await fetchText(`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/days/day${d.number}.md`);
      const hay = strip(md) + ' ' + d.keywords.join(' ').toLowerCase();
      if(hay.includes(q)) filtered.push(d);
    }
    render(filtered);
  }

  function onSearch(){
    loadAndRender(els.q.value);
  }
  function onClear(){
    els.q.value = '';
    loadAndRender('');
  }

  els.btnSearch.addEventListener('click', onSearch);
  els.btnClear.addEventListener('click', onClear);
  els.q.addEventListener('keydown', (e)=>{ if(e.key==='Enter') onSearch(); });

  // Kick off
  if(!cfg.owner || !cfg.repo){
    console.warn('Missing owner/repo. Provide via GitHub Pages URL or ?owner=...&repo=...');
  }
  loadAndRender('');
})();
