
 // deterministic web of nodes with one glowing path (an agent moving through pages)
 let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
 const svg=document.getElementById('web'), NS='http://www.w3.org/2000/svg';
 const el=(n,a,p=svg)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e};
 const defs=el('defs',{});
 const g=el('filter',{id:'glow',x:'-50%',y:'-50%',width:'200%',height:'200%'},defs);
 el('feGaussianBlur',{stdDeviation:'6',result:'b'},g); const m=el('feMerge',{},g); el('feMergeNode',{in:'b'},m); el('feMergeNode',{in:'SourceGraphic'},m);
 const pts=[]; for(let i=0;i<70;i++){ pts.push({x:1180+rnd()*860, y:30+rnd()*1020, r:3+rnd()*5}); }
 // edges: connect each node to its 2 nearest
 const edges=new Set();
 pts.forEach((p,i)=>{const d=pts.map((q,j)=>({j,d:(p.x-q.x)**2+(p.y-q.y)**2})).filter(o=>o.j!==i).sort((a,b)=>a.d-b.d).slice(0,2);d.forEach(o=>edges.add(i<o.j?i+'-'+o.j:o.j+'-'+i))});
 edges.forEach(k=>{const [a,b]=k.split('-').map(Number);el('line',{x1:pts[a].x,y1:pts[a].y,x2:pts[b].x,y2:pts[b].y,stroke:'#2A3860','stroke-width':1.6})});
 pts.forEach(p=>el('circle',{cx:p.x,cy:p.y,r:p.r,fill:'#1B2750',stroke:'#3A4C80','stroke-width':1.5}));
 // glowing path through 9 nodes sorted by x-ish walk
 let cur=pts.reduce((a,b)=>a.x<b.x?a:b), path=[cur], used=new Set([cur]);
 for(let s=0;s<9;s++){const n=pts.filter(p=>!used.has(p)&&p.x>cur.x-60).map(p=>({p,d:(p.x-cur.x)**2+(p.y-cur.y)**2})).sort((a,b)=>a.d-b.d)[0]; if(!n)break; cur=n.p; used.add(cur); path.push(cur)}
 el('polyline',{points:path.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#3DD9FF','stroke-width':3.2,'stroke-linejoin':'round',filter:'url(#glow)',opacity:.95});
 path.forEach((p,i)=>el('circle',{cx:p.x,cy:p.y,r:i==path.length-1?11:6.5,fill:i==path.length-1?'#3DD9FF':'#0B1020',stroke:'#3DD9FF','stroke-width':3,filter:'url(#glow)'}));
