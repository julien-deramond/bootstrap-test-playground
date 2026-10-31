import"./modulepreload-polyfill-P2Xu9kJm.js";/* empty css             */import{a as e,c as t,f as n,l as r,n as i,o as a,p as o,r as s,t as c,u as l}from"./page-index-Bw8QXOEx.js";import{r as u,t as d}from"./_virtual_playground-pages-vKXQSeZa.js";import{i as f,r as p,t as m}from"./last-update-BrzV7MdX.js";var h=`bootstrap-playground-home-view`,g=e=>String(e).replace(/[&<>"]/g,e=>`&#${e.charCodeAt(0)};`),_=(e,t)=>`${e} ${t}${e===1?``:`s`}`,v=e=>g(e).replace(/`([^`]+)`/g,`<code>$1</code>`),y=document.getElementById(`page-search`),b=document.getElementById(`results`),ee=document.getElementById(`group-filters`),x=document.getElementById(`tag-filters`),S=document.getElementById(`status-filters`),C=document.getElementById(`result-count`),w=document.getElementById(`configs`),T=`configs`,E=`Starter screens, real app screens, every docs example and issue reproductions, all compiled from main source.`,D="Saved styles from `configs/`. The one you apply is used by every example page, like the toolbar’s Config list; this page keeps Bootstrap’s defaults.",O=12,k=!1;function A({label:e,path:t,url:n,dirty:r}){let i=document.getElementById(`bootstrap-source`),a=i.querySelector(`a`);a.querySelector(`code`).textContent=e,a.title=`Bootstrap source: ${t}`,n?(a.href=n,a.rel=`noopener`):(a.removeAttribute(`href`),a.removeAttribute(`rel`)),i.toggleAttribute(`data-dirty`,r)}A(o),n(A);var j=e=>e.slice(0,7),M=e=>`https://github.com/twbs/bootstrap/commit/${e}`,N=e=>g(e).replace(/\(#(\d+)\)/g,`(<a href="https://github.com/twbs/bootstrap/pull/$1" rel="noopener">#$1</a>)`);function P(){let e=document.getElementById(`last-update`),{from:t,to:n,pr:r,commits:i,rendering:a,examples:o}=f,s=new Date(f.date).toLocaleDateString(`en`,{day:`numeric`,month:`short`,year:`numeric`}),c=`https://github.com/twbs/bootstrap/compare/${t}...${n}`;e.querySelector(`summary`).innerHTML=[r?`<strong>Testing twbs/bootstrap#${r.number}</strong>`:`<strong>Last update</strong>`,g(s),i?_(i.length,`upstream commit`):`${j(t)} → ${j(n)}`,`${_(o.length,`changed example`)}${a?``:` (markup only)`}`].join(` <span aria-hidden="true">·</span> `);let l=new Map;for(let e of o)l.set(e.url,[...l.get(e.url)??[],e]);let u=l.size?`<ul class="home-update-pages">${[...l].map(([e,t])=>`
      <li><a href="${g(p(e))}">${g(t[0].page??e)}</a>
        <ul>${t.map(t=>`
          <li><a href="${g(p(`${e}#${t.id}`))}">${g(t.example??t.id)}</a>
            ${m(t).map(({text:e,title:t})=>`<span class="badge badge-subtle theme-warning" title="${g(t)}">${g(e)}</span>`).join(` `)}</li>`).join(``)}
        </ul></li>`).join(``)}</ul>`:`<p>${a?`No kitchen sink example changed: same markup, same rendering.`:`No kitchen sink markup changed.`}</p>`;e.querySelector(`.home-update-body`).innerHTML=`
    <p class="home-update-range">
      <a href="${c}" rel="noopener"><code>${j(t)}</code> → <code>${j(n)}</code></a>
      ${r?`· <a href="${g(r.url)}" rel="noopener">${g(r.title)}</a>${r.behind?`, ${_(r.behind,`commit`)} behind <code>main</code>`:``}`:``}
    </p>
    <div class="home-update-columns">
      <section aria-labelledby="last-update-commits">
        <h2 class="home-update-title" id="last-update-commits">Upstream commits${i?` <span class="home-group-count">${i.length}</span>`:``}</h2>
        ${i?`<ol class="home-update-commits">${i.map(({sha:e,subject:t})=>`<li><a href="${M(e)}" rel="noopener"><code>${j(e)}</code></a> ${N(t)}</li>`).join(``)}</ol>`:`<p><a href="${c}" rel="noopener">See them on GitHub</a>.</p>`}
      </section>
      <section aria-labelledby="last-update-examples">
        <h2 class="home-update-title" id="last-update-examples">Changed examples <span class="home-group-count">${o.length}</span></h2>
        ${u}
        ${a?``:`<p class="home-update-note">Rendering wasn't compared (<code>--no-diff</code>): only the markup changes are listed.</p>`}
      </section>
    </div>`;let d=()=>{location.hash===`#last-update`&&(e.open=!0)};d(),window.addEventListener(`hashchange`,d)}P(),/Mac|iPhone|iPad/.test(navigator.platform)&&(document.getElementById(`palette-key`).textContent=`⌘ K`);var F=new URLSearchParams(location.search),I={q:F.get(`q`)??``,group:(e=>e===T||d.some(t=>t.dir===e))(F.get(`group`))?F.get(`group`):location.hash===`#configs`?T:``,tag:F.get(`tag`)??``,status:F.get(`status`)in t?F.get(`status`):``,view:`grid`};try{I.view=localStorage.getItem(h)===`list`?`list`:`grid`}catch{}y.value=I.q;function L(e,t){let n=i(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);if(n.length===0)return g(e);let r=e.toLowerCase(),a=Array(e.length).fill(!1);for(let e of n){let t=r.indexOf(e);for(;t!==-1;)a.fill(!0,t,t+e.length),t=r.indexOf(e,t+1)}let o=``,s=!1;for(let t=0;t<e.length;t++)a[t]!==s&&(o+=s?`</mark>`:`<mark>`,s=a[t]),o+=g(e[t]);return o+(s?`</mark>`:``)}var R=e=>e?.length?`<p class="page-card-matches">${e.map(({label:e,kind:t,classes:n})=>t===`token`?`<code>${g(e)}</code> on ${n.slice(0,3).map(e=>`<code>.${g(e)}</code>`).join(`, `)}${n.length>3?`…`:``}`:n.slice(0,3).map(e=>`<code>.${g(e)}</code>`).join(`, `)+(n.length>3?`…`:``)).join(` · `)}</p>`:``,z=e=>`<span class="page-card-icon" data-group-icon="${g(e)}" aria-hidden="true"><svg width="16" height="16"><use href="#icon-${g(e)}"/></svg></span>`;function B(e){if(!e.repro)return``;let{status:n,upstream:i,tracking:a}=e.repro,o=e=>g(e.replace(/^.*#/,`#`)),s=[t[n]&&`<span class="badge badge-subtle theme-${t[n].theme}" title="${t[n].text}">${t[n].short}</span>`,r(i)&&`<a href="${g(r(i))}" rel="noopener" title="Upstream: ${g(i)}">Upstream ${o(i)}</a>`,r(a)&&`<a href="${g(r(a))}" rel="noopener" title="Tracking issue in this repository">Tracking ${o(a)}</a>`].filter(Boolean);return s.length>0?`<p class="page-card-repro">${s.join(``)}</p>`:``}function V(t,{showGroup:n}){let{page:r,section:i,matches:a}=t,o=g(r.title);return`
    <li class="page-card">
      ${z(r.group)}
      <div class="page-card-body">
        <div class="page-card-head">
          <h3 class="page-card-title"><a class="page-card-link" href="${g(e({page:r}))}">${L(r.title,I.q)}</a></h3>
          ${n?`<span class="page-card-group">${g(r.groupLabel)}</span>`:``}
        </div>
        ${r.description?`<p class="page-card-description" title="${g(r.description)}">${L(r.description,I.q)}</p>`:``}
        ${B(r)}
        ${R(a)}
        ${i?`<a class="page-card-section" href="${g(e(t))}"><svg width="14" height="14" aria-hidden="true"><use href="#icon-corner"/></svg><span>${L(i.title,I.q)}</span></a>`:``}
      </div>
      <div class="page-card-meta">
        ${r.tags.map(e=>`<button type="button" class="page-card-tag${e===I.tag?` active`:``}" data-tag="${g(e)}" title="Show pages tagged “${g(e)}”">${g(e)}</button>`).join(``)}
        ${r.source?`<span class="page-card-source" title="Adapted from ${g(r.source.label)}">${g(r.source.label.replace(/\s*[“"].*$/,``))}</span>`:``}
        <code class="page-card-path">${g(r.url)}</code>
      </div>
      <div class="page-card-actions">
        <a class="page-card-action" href="/bootstrap-test-playground/pr-475/compare.html?page=${encodeURIComponent(r.url)}" title="Compare ${o} side by side" aria-label="Compare ${o} side by side">
          <svg width="16" height="16" aria-hidden="true"><use href="#icon-columns"/></svg>
        </a>
        ${r.docs?`<a class="page-card-action" href="${g(r.docs)}" rel="noopener" title="${o} docs source" aria-label="${o} docs source">
          <svg width="16" height="16" aria-hidden="true"><use href="#icon-book"/></svg>
        </a>`:``}
      </div>
    </li>`}var H=(e,t={})=>`<ul class="page-list" data-view="${I.view}">${e.map(e=>V(e,t)).join(``)}</ul>`;function U(e){return e===`issues`?`Nothing here yet. Run <code>npm run new-issue 12345</code> to create one.`:`Nothing here yet.`}function W(e){return a(I.q,c.filter(t=>(e===`group`||!I.group||t.group===I.group)&&(e===`tag`||!I.tag||t.tags.includes(I.tag))&&(e===`status`||!I.status||t.repro?.status===I.status)))}function G(){let e=W(`group`),n=(e,t,n,r)=>{let i=I.group===e;return`
      <button type="button" class="home-nav-item${i?` active`:``}" data-group="${g(e)}" aria-pressed="${i}">
        <svg width="16" height="16" aria-hidden="true" data-group-icon="${g(e||`all`)}"><use href="#icon-${n}"/></svg>
        <span class="home-nav-label">${g(t)}</span>
        <span class="home-nav-count">${r}</span>
      </button>`};ee.innerHTML=[n(``,`All pages`,`layers`,e.length),...d.map(t=>n(t.dir,t.label,t.dir,e.filter(({page:e})=>e.group===t.dir).length)),`<hr class="home-nav-divider">`,n(T,`Configs`,`palette`,X().length)].join(``);let r=new Map(Object.keys(t).map(e=>[e,0]));for(let{page:e}of I.group===T?[]:W(`status`))r.has(e.repro?.status)&&r.set(e.repro.status,r.get(e.repro.status)+1);let i=[...r].filter(([e,t])=>t>0||e===I.status);S.hidden=i.length===0,S.innerHTML=`
    <h2 class="home-sidebar-title" id="status-heading">Upstream status</h2>
    <div class="home-tag-list">
      ${i.map(([e,n])=>`
        <button type="button" class="home-tag${I.status===e?` active`:``}" data-repro-status="${e}" aria-pressed="${I.status===e}" title="Reproductions ${t[e].text.toLowerCase()}">
          <span class="home-status-dot theme-${t[e].theme}" aria-hidden="true"></span>${t[e].short} <span class="home-tag-count">${n}</span>
        </button>`).join(``)}
    </div>`;let a=new Map;for(let{page:e}of I.group===T?[]:W(`tag`))for(let t of e.tags)a.set(t,(a.get(t)??0)+1);I.tag&&!a.has(I.tag)&&I.group!==T&&a.set(I.tag,0);let o=[...a].sort((e,t)=>(t[0]===I.tag)-(e[0]===I.tag)||t[1]-e[1]||e[0].localeCompare(t[0])),s=k?o:o.slice(0,O);x.hidden=o.length===0,x.innerHTML=`
    <h2 class="home-sidebar-title" id="tags-heading">Tags</h2>
    <div class="home-tag-list">
      ${s.map(([e,t])=>`
        <button type="button" class="home-tag${I.tag===e?` active`:``}" data-tag="${g(e)}" aria-pressed="${I.tag===e}">
          ${g(e)} <span class="home-tag-count">${t}</span>
        </button>`).join(``)}
      ${o.length>O?`<button type="button" class="home-tag home-tag-more" data-more-tags aria-expanded="${k}">${k?`Fewer`:`+${o.length-O} more`}</button>`:``}
    </div>`}function K(){let e=d.find(({dir:e})=>e===I.group),n=e?.label??`All pages`,r=e?.description??E;I.group===T?(n=`Configs`,r=D):(I.q||I.tag||I.status)&&(n=I.q?`Results`:I.tag?`Tagged “${I.tag}”`:t[I.status].text,r=e?`In ${e.label}.`:``),document.getElementById(`view-title`).textContent=n,document.getElementById(`view-description`).innerHTML=v(r)+(I.group===T?` <a href="https://github.com/julien-deramond/bootstrap-test-playground/tree/main/configs#saved-configs" rel="noopener">What each one stresses</a>`:``),document.querySelector(`.home-view`).hidden=I.group===T}function q(){if(b.hidden=I.group===T,w.hidden=I.group!==T,I.group===T){b.innerHTML=``;let e=X().length;C.textContent=`${_(e,`config`)} found`;return}let n=W(),r=I.q||I.tag||I.status;if(C.textContent=`${_(n.length,`page`)} found`,n.length===0){b.innerHTML=`
      <div class="home-empty">
        <p class="home-empty-title">No pages match${I.q?` “${g(I.q)}”`:``}${I.tag?` tagged “${g(I.tag)}”`:``}${I.status?`, ${t[I.status].text.toLowerCase()}`:``}.</p>
        <button type="button" class="btn-outline theme-secondary btn-sm" data-clear>Clear filters</button>
      </div>`;return}if(r){b.innerHTML=`
      <section class="home-group" aria-label="Results">
        <div class="home-group-head">
          <span class="home-group-count">${_(n.length,`page`)}</span>
          <button type="button" class="btn-link btn-sm ms-auto" data-clear>Clear filters</button>
        </div>
        ${H(n,{showGroup:!I.group})}
      </section>`;return}let i=I.group?[]:s().slice(0,6),a=d.filter(e=>!I.group||e.dir===I.group);b.innerHTML=[i.length>0?`
      <section class="home-recent" aria-labelledby="group-recent">
        <h2 class="home-recent-title" id="group-recent"><svg width="14" height="14" aria-hidden="true"><use href="#icon-clock"/></svg> Recent</h2>
        <ul class="home-recent-list">${i.map(t=>`
          <li><a class="home-recent-item" href="${g(e({page:t}))}" title="${g(`${t.groupLabel}: ${t.title}`)}">${z(t.group)}<span>${g(t.title)}</span></a></li>`).join(``)}
        </ul>
      </section>`:``,...a.map(e=>`
      <section class="home-group" aria-labelledby="group-${e.dir}">
        ${I.group?``:`
          <div class="home-group-head">
            <h2 class="home-group-title" id="group-${e.dir}"><button type="button" data-group="${g(e.dir)}">${g(e.label)}</button></h2>
            <span class="home-group-count">${e.pages.length}</span>
            <p class="home-group-description">${g(e.description)}</p>
          </div>`}
        ${e.pages.length===0?`<p class="home-group-empty">${U(e.dir)}</p>`:H(c.filter(t=>t.group===e.dir).map(e=>({page:e})))}
      </section>`)].join(``),I.group&&b.querySelector(`.home-group`).setAttribute(`aria-labelledby`,`view-title`)}var J=window.playgroundPrefs,te=e=>`https://github.com/julien-deramond/bootstrap-test-playground/issues/${e}`,Y={name:`working`,label:`src/styles`,category:`baseline`,description:"The working copy, what every example page uses until a config is applied. Save it as a config with `npm run save-config <name>`.",gaps:[]};function X(){let e=I.q.toLowerCase().split(/\s+/).filter(Boolean);return[Y,...u].filter(({name:t,label:n,description:r})=>{let i=`${t} ${n??``} ${r}`.toLowerCase();return e.every(e=>i.includes(e))})}function Z(){if(I.group!==T){w.innerHTML=``;return}let e=J?.read().config,t=X(),n=({name:t,label:n,description:r,gaps:i,tokensOnly:a})=>{let o=t===e||t===`working`&&!u.some(t=>t.name===e);return`
      <li class="config-card${o?` active`:``}">
        <div class="config-card-head">
          <h3 class="config-card-title"><code>${L(n??t,I.q)}</code></h3>
          <button type="button" class="btn-sm ${o?`btn-subtle`:`btn-outline`} theme-${o?`success`:`secondary`} config-card-apply" data-config="${g(t)}" aria-pressed="${o}" aria-label="${o?`Applied`:`Apply`} ${g(n??t)}" ${J?``:`disabled`}>${o?`<svg width="14" height="14" aria-hidden="true"><use href="#icon-check"/></svg> Applied`:`Apply`}</button>
        </div>
        <p class="config-card-description" title="${g(r)}">${v(r||`configs/${t}/`)}</p>
        ${a&&t!=="default"||i.length>0?`
          <div class="config-card-meta">
            ${a&&t!=="default"?`<span class="config-card-badge" title="Only changes tokens.css, so it also applies on top of the prebuilt dist">tokens only</span>`:``}
            ${i.map(e=>`<a class="config-card-gap" href="${te(e)}" rel="noopener" title="Known gap: tracking issue #${e}">#${e}</a>`).join(``)}
          </div>`:``}
      </li>`};w.innerHTML=t.length===0?`
      <div class="home-empty">
        <p class="home-empty-title">No configs match “${g(I.q)}”.</p>
        <button type="button" class="btn-outline theme-secondary btn-sm" data-clear>Clear filters</button>
      </div>`:l(t).map(({id:e,label:t,description:r,configs:i})=>`
    <section class="home-group config-group" aria-labelledby="config-group-${e}">
      <div class="home-group-head">
        <h2 class="home-group-title" id="config-group-${e}">${g(t)}</h2>
        <span class="home-group-count">${i.filter(e=>e!==Y).length}</span>
        <p class="home-group-description">${v(r)}</p>
      </div>
      <ul class="config-list">${i.map(n).join(``)}</ul>
    </section>`).join(``)}function ne(){let e=new URL(location.href);for(let t of[`q`,`group`,`tag`,`status`])I[t]?e.searchParams.set(t,I[t]):e.searchParams.delete(t);history.replaceState(history.state,``,e)}function Q(){G(),K(),q(),Z();for(let e of document.querySelectorAll(`button[data-view]`))e.setAttribute(`aria-pressed`,String(e.dataset.view===I.view))}function $(e){Object.assign(I,e),ne(),Q()}y.addEventListener(`input`,()=>{$({q:y.value.trim()});let e=document.querySelector(`.home-main`);e.getBoundingClientRect().top<0&&window.scrollTo({top:window.scrollY+e.getBoundingClientRect().top})}),y.addEventListener(`keydown`,e=>{if(e.key===`Enter`){let t=b.querySelector(`.page-card-section, .page-card-link`);t&&(e.preventDefault(),t.click())}else e.key===`ArrowDown`?(e.preventDefault(),b.querySelector(`.page-card-link`)?.focus()):e.key===`Escape`&&y.value&&(e.preventDefault(),y.value=``,$({q:``}))}),b.addEventListener(`keydown`,e=>{if(![`ArrowDown`,`ArrowUp`].includes(e.key)||!e.target.matches(`.page-card-link`))return;e.preventDefault();let t=[...b.querySelectorAll(`.page-card-link`)],n=t.indexOf(e.target)+(e.key===`ArrowDown`?1:-1);n<0?y.focus():t[Math.min(n,t.length-1)].focus()}),document.addEventListener(`click`,e=>{let t=e.target.closest(`[data-group], [data-tag], [data-repro-status], button[data-view], [data-clear], [data-more-tags]`);if(t){if(t.matches(`[data-more-tags]`))k=!k,G(),x.querySelector(`[data-more-tags]`).focus();else if(t.matches(`[data-group]`))$({group:t.dataset.group,...t.dataset.group===T&&{tag:``,status:``}}),window.scrollTo({top:0});else if(t.matches(`[data-tag]`))$({tag:I.tag===t.dataset.tag?``:t.dataset.tag});else if(t.matches(`[data-repro-status]`))$({status:I.status===t.dataset.reproStatus?``:t.dataset.reproStatus});else if(t.matches(`button[data-view]`)){try{localStorage.setItem(h,t.dataset.view)}catch{}$({view:t.dataset.view})}else y.value=``,$({q:``,tag:``,status:``,group:``}),y.focus()}}),document.addEventListener(`keydown`,e=>{let t=e.target.closest?.(`input, textarea, select, [contenteditable]`),n=e.key===`/`&&!t&&!e.metaKey&&!e.ctrlKey&&!e.altKey,r=e.key.toLowerCase()===`k`&&(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey;(n||r)&&(e.preventDefault(),e.stopImmediatePropagation(),y.focus(),y.select())},{capture:!0}),Q(),window.addEventListener(`hashchange`,()=>{location.hash===`#configs`&&$({group:T,tag:``,status:``})}),w.addEventListener(`click`,e=>{let t=e.target.closest(`[data-config]`);t&&J&&J.save({config:t.dataset.config})}),window.addEventListener(`playground-prefs`,Z),window.addEventListener(`storage`,Z);