import{a as e,c as t,f as n,l as r,o as i,p as a,r as o,s,t as c,u as l}from"./page-index-Bw8QXOEx.js";var u=`playground-repro-side-by-side`,d=[`for`,`form`,`list`,`headers`,`popovertarget`,`commandfor`,`anchor`,`aria-activedescendant`,`aria-controls`,`aria-describedby`,`aria-details`,`aria-errormessage`,`aria-flowto`,`aria-labelledby`,`aria-owns`],f=(e,t)=>{let n=document.createElement(`a`);return n.href=e,n.textContent=t,n},p=(...e)=>{let t=document.createElement(`span`);return t.append(...e),t};function m(e,n,i){let o=[],s=t[n?.dataset.status];if(s){let e=document.createElement(`span`);e.className=`badge badge-subtle theme-${s.theme}`,e.textContent=s.text,o.push(e)}let c=n?.content.trim();if(c){let e=r(c);o.push(p(`Upstream: `,e?f(e,c):c))}let l=n?.dataset.tracking?.trim();if(l){let e=r(l),t=`#${l.split(`#`)[1]}`;o.push(p(`Tracking: `,e?f(e,t):l))}let u=a.url?f(a.url,a.label):a.label;o.push(p(`Bootstrap: `,u));let d=i?.content.trim();if(d){let e=d.slice(0,7),t=f(`https://github.com/twbs/bootstrap/commit/${d}`,e);o.push(a.sha===d?p(`(reproduced on this commit)`):p(`(reproduced on `,t,`)`))}e.replaceChildren(...o)}function h(e,t){let n=e.cloneNode(!0),r=[n,...n.querySelectorAll(`*`)],i=new Set(r.filter(e=>e.id).map(e=>e.id));for(let e of r){e.id&&(e.id+=t),e.matches(`input[type="radio"][name], details[name]`)&&e.setAttribute(`name`,e.getAttribute(`name`)+t);for(let n of[...e.attributes])d.includes(n.name)?n.value=n.value.split(/\s+/).map(e=>i.has(e)?e+t:e).join(` `):(n.name===`href`||n.name.startsWith(`data-bs-`))&&(n.value=n.value.replace(/#([\w-]+)/g,(e,n)=>i.has(n)?`#${n}${t}`:e))}return n}var g=()=>{try{return localStorage.getItem(u)!==`false`}catch{return!0}},_=e=>{try{localStorage.setItem(u,String(e))}catch{}};function v(e,t,n){let r=document.createElement(`div`);r.className=`md:col-6`;let i=document.createElement(`p`);i.className=`small fg-2 mb-2`,i.dataset.playgroundChrome=``,i.textContent=t;let a=document.createElement(`div`);return a.className=`bg-body fg-body border rounded p-3`,a.dataset.bsTheme=e,a.append(n),r.append(i,a),{column:r,caption:i,wrapper:a}}function y(e){let t=document.createElement(`div`);t.className=`row g-3`,e.before(t);let n=v(`light`,`Light`,e),r=v(`dark`,`Dark`,h(e,`-dark`));return t.append(n.column,r.column),{row:t,apply:e=>{r.column.hidden=!e,n.column.className=e?`md:col-6`:`col-12`,n.caption.hidden=!e,e?n.wrapper.dataset.bsTheme=`light`:delete n.wrapper.dataset.bsTheme}}}function b(e,t){let n=document.createElement(`div`);n.className=`form-field mb-3`,n.dataset.playgroundChrome=``,n.innerHTML=`<div class="switch"><input type="checkbox" id="playground-repro-side-by-side" role="switch" switch></div>
    <label for="playground-repro-side-by-side">Light and dark side by side</label>`,e.before(n);let r=n.querySelector(`input`),i=e=>{r.checked=e;for(let n of t)n(e)};i(g()),r.addEventListener(`change`,()=>{i(r.checked),_(r.checked)})}function x(){let e=document.querySelector(`[data-playground-repro-meta]`);if(e){let t=document.querySelector(`meta[name="playground-upstream"]`),r=document.querySelector(`meta[name="playground-bootstrap"]`);m(e,t,r),n(()=>m(e,t,r))}let t=[...document.querySelectorAll(`[data-playground-repro]`)];if(t.length>0){let e=t.map(e=>y(e));b(e[0].row,e.map(({apply:e})=>e))}}var S=`bootstrap-playground-tab-order`,C=[`playground-toolbar`,`playground-palette`,`playground-tab-order`],w=`a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), details > summary:first-of-type, [tabindex]`;function*T(e){for(let t of e.children)C.includes(t.id)||(yield t,t.shadowRoot&&(yield*T(t.shadowRoot)),yield*T(t))}var E=(e,t)=>!e.matches(w)||e.tabIndex<0||e.matches(`:disabled`)||e.closest(`[inert]`)||t&&!t.contains(e)?!1:e.checkVisibility({visibilityProperty:!0,contentVisibilityAuto:!1});function D(e=document){let t=[...e.querySelectorAll(`dialog:modal`)],n=t.find(t=>t.contains(e.activeElement))??t.at(-1),r=[...T(e.documentElement)].filter(e=>E(e,n)),i=new Map;for(let e of r.filter(e=>e.matches(`input[type="radio"][name]`))){let t=e.form??e.getRootNode(),n=i.get(t)??new Map;i.set(t,n);let r=n.get(e.name);(!r||e.checked&&!r.checked)&&n.set(e.name,e)}let a=new Set([...i.values()].flatMap(e=>[...e.values()])),o=r.filter(e=>!e.matches(`input[type="radio"][name]`)||a.has(e)),s=e=>e.tabIndex>0?e.tabIndex:2**53-1;return o.sort((e,t)=>s(e)-s(t))}var O=`
  :host { all: initial; }
  [popover] {
    position: fixed;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    max-inline-size: none;
    max-block-size: none;
    padding: 0;
    margin: 0;
    overflow: hidden;
    pointer-events: none;
    background: transparent;
    border: 0;
  }
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 2px dashed #cd2b31;
    border-radius: 3px;
  }
  .box.positive { border-color: #f5a524; }
  .number {
    position: absolute;
    inset-block-start: -11px;
    inset-inline-start: -11px;
    min-inline-size: 20px;
    block-size: 20px;
    padding: 0 5px;
    box-sizing: border-box;
    font: 600 11px/20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    text-align: center;
    background: #cd2b31;
    border-radius: 999px;
    box-shadow: 0 0 0 2px #fff;
  }
  .positive .number { color: #111; background: #f5a524; }
  .focused { border-style: solid; }
  .focused .number { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #111; }
`;function ee({onChange:e=()=>{}}={}){let t,n,r=0,i,a=``,o=()=>{r=0;let e=D(),t=[...document.querySelectorAll(`:modal, :popover-open`)].filter(e=>e!==n).length;String(t)!==a&&(a=String(t),n.hidePopover(),n.showPopover());let i=document.documentElement.clientWidth,o=document.documentElement.clientHeight,s=[];for(let[t,n]of e.entries()){let e=n.getBoundingClientRect();if(e.bottom<0||e.top>o||e.right<0||e.left>i)continue;let r=document.createElement(`div`);r.className=`box${n.tabIndex>0?` positive`:``}${n===document.activeElement||n.contains(document.activeElement)?` focused`:``}`,r.dataset.index=t+1,r.style.cssText=`left: ${e.left}px; top: ${e.top}px; width: ${e.width}px; height: ${e.height}px;`;let a=document.createElement(`span`);a.className=`number`,a.textContent=t+1,r.append(a),s.push(r)}n.replaceChildren(...s),n.dataset.count=e.length},s=()=>{r||=requestAnimationFrame(o)},c=()=>{t=document.createElement(`div`),t.id=`playground-tab-order`,t.setAttribute(`aria-hidden`,`true`);let e=t.attachShadow({mode:`open`});e.innerHTML=`<style>${O}</style><div popover="manual"></div>`,n=e.querySelector(`[popover]`),document.body.append(t),a=``,i=new MutationObserver(s),i.observe(document.documentElement,{subtree:!0,childList:!0,attributes:!0,attributeFilter:[`class`,`style`,`hidden`,`open`,`disabled`,`tabindex`,`inert`,`href`,`type`,`checked`,`contenteditable`,`dir`]});for(let e of[`scroll`,`resize`,`focusin`,`change`,`toggle`,`transitionend`])window.addEventListener(e,s,{capture:!0,passive:!0});o()},l=()=>{i.disconnect();for(let e of[`scroll`,`resize`,`focusin`,`change`,`toggle`,`transitionend`])window.removeEventListener(e,s,{capture:!0});cancelAnimationFrame(r),r=0,t.remove(),t=void 0},u=e=>{try{sessionStorage.setItem(S,e?`1`:``)}catch{}},d={get on(){return!!t},toggle(n=!t){n!==!!t&&(n?c():l(),u(n),e(n))}},f=!1;try{f=sessionStorage.getItem(S)===`1`}catch{}return f&&d.toggle(!0),d}var te=`textarea, input:not([type="button"], [type="checkbox"], [type="color"], [type="file"], [type="hidden"], [type="image"], [type="radio"], [type="range"], [type="reset"], [type="submit"])`;function k(e){if(e.defaultPrevented||e.isComposing)return!0;let[t]=e.composedPath();if(!(t instanceof Element))return!1;let n=t.getRootNode();return n instanceof ShadowRoot&&C.includes(n.host.id)?!1:t.isContentEditable||t.matches(te)}var A=50,j=`
  :host { all: initial; }
  dialog {
    inline-size: min(40rem, calc(100vw - 24px));
    max-block-size: min(32rem, calc(100vh - 96px));
    margin-block-start: 12vh;
    padding: 0;
    overflow: hidden;
    font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
    background: rgb(24 24 27 / .97);
    border: 1px solid rgb(255 255 255 / .12);
    border-radius: 12px;
    box-shadow: 0 24px 64px rgb(0 0 0 / .45);
  }
  dialog[open] { display: flex; flex-direction: column; }
  dialog::backdrop { background: rgb(0 0 0 / .35); backdrop-filter: blur(2px); }
  input {
    box-sizing: border-box;
    inline-size: 100%;
    padding: 14px 16px;
    font: inherit;
    font-size: 16px;
    color: inherit;
    background: transparent;
    border: 0;
    border-block-end: 1px solid rgb(255 255 255 / .1);
    outline: 0;
  }
  input::placeholder { color: rgb(255 255 255 / .4); }
  ul { flex: 1; margin: 0; padding: 6px; overflow-y: auto; list-style: none; }
  li { margin: 0; }
  .heading { padding: 8px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
  a {
    display: flex;
    gap: 10px;
    align-items: baseline;
    padding: 8px 10px;
    color: inherit;
    text-decoration: none;
    border-radius: 8px;
  }
  a[aria-selected="true"] { background: rgb(255 255 255 / .1); }
  .title { overflow: hidden; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .section { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .75; }
  .group { flex-shrink: 0; margin-inline-start: auto; font-size: 12px; opacity: .7; }
  .current { font-size: 11px; opacity: .7; }
  .status { flex-shrink: 0; padding: 0 6px; font-size: 11px; border: 1px solid currentcolor; border-radius: 999px; }
  .status-unreported { color: #f5c46b; }
  .status-reported { color: #7cc4f5; }
  .status-fixed { color: #7ed69a; }
  .match { flex-shrink: 0; padding: 0 5px; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; background: rgb(255 255 255 / .08); border-radius: 4px; opacity: .8; }
  .empty { padding: 24px; text-align: center; opacity: .6; }
  footer { display: flex; gap: 16px; padding: 8px 14px; font-size: 11px; border-block-start: 1px solid rgb(255 255 255 / .1); opacity: .55; }
  kbd { font: inherit; padding: 0 4px; border: 1px solid rgb(255 255 255 / .25); border-radius: 4px; }
`,M=e=>String(e).replace(/[&<>"]/g,e=>`&#${e.charCodeAt(0)};`),N=/Mac|iPhone|iPad/.test(navigator.platform)?`⌘K`:`Ctrl+K`;function ne(){let n=document.createElement(`div`);n.id=`playground-palette`;let r=n.attachShadow({mode:`open`});r.innerHTML=`
    <style>${j}</style>
    <dialog aria-label="Go to page">
      <input type="text" placeholder="Go to a page, an example, a class or a --token…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list">
      <ul id="palette-results" role="listbox" aria-label="Pages"></ul>
      <footer><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></footer>
    </dialog>`;let a=r.querySelector(`dialog`),s=r.querySelector(`input`),l=r.querySelector(`ul`),u=[],d=0,f=(n,r)=>{let{page:i,section:a}=n,o=i.url===location.pathname;return`
      <li role="presentation">
        <a href="${M(e(n))}" role="option" id="palette-option-${r}" data-index="${r}" aria-selected="${r===d}">
          <span class="title">${M(i.title)}</span>
          ${t[i.repro?.status]?`<span class="status status-${i.repro.status}" title="${t[i.repro.status].text}">${t[i.repro.status].short}</span>`:``}
          ${a?`<span class="section">› ${M(a.title)}</span>`:``}
          ${(n.matches??[]).map(({label:e})=>`<code class="match">${M(e)}</code>`).join(``)}
          ${o?`<span class="current">(this page)</span>`:``}
          <span class="group">${M(i.groupLabel)}</span>
        </a>
      </li>`},p=()=>{let e=s.value.trim(),t=``;if(e)u=i(e).slice(0,A),t=u.map(f).join(``);else{let e=o(),n=c.filter(t=>!e.includes(t));u=[...e,...n].slice(0,A).map(e=>({page:e})),t=[e.length>0?`<li class="heading" role="presentation">Recent</li>`:``,...u.slice(0,e.length).map(f),u.length>e.length?`<li class="heading" role="presentation">${e.length>0?`All pages`:`Pages`}</li>`:``,...u.slice(e.length).map((t,n)=>f(t,n+e.length))].join(``)}l.innerHTML=u.length>0?t:`<li class="empty" role="presentation">No matching page</li>`,s.setAttribute(`aria-activedescendant`,u.length>0?`palette-option-${d}`:``)},m=e=>{if(u.length!==0){d=(e+u.length)%u.length;for(let e of l.querySelectorAll(`a`))e.setAttribute(`aria-selected`,String(Number(e.dataset.index)===d));s.setAttribute(`aria-activedescendant`,`palette-option-${d}`),l.querySelector(`[data-index="${d}"]`)?.scrollIntoView({block:`nearest`})}},h=()=>{a.open?s.select():(s.value=``,d=0,p(),a.showModal(),s.focus())},g=(e,t)=>{t?window.open(e,`_blank`,`noopener`):(a.close(),location.href=e)};return s.addEventListener(`input`,()=>{d=0,p()}),s.addEventListener(`keydown`,t=>{t.key===`ArrowDown`||t.key===`ArrowUp`?(t.preventDefault(),m(d+(t.key===`ArrowDown`?1:-1))):t.key===`Escape`?(t.preventDefault(),a.close()):t.key===`Enter`&&u[d]&&(t.preventDefault(),g(e(u[d]),t.metaKey||t.ctrlKey))}),l.addEventListener(`mousemove`,e=>{let t=e.target.closest(`a`);t&&Number(t.dataset.index)!==d&&m(Number(t.dataset.index))}),a.addEventListener(`click`,e=>{e.target===a&&a.close()}),document.addEventListener(`keydown`,e=>{e.key.toLowerCase()!==`k`||!e.metaKey&&!e.ctrlKey||e.altKey||e.shiftKey||k(e)||(e.preventDefault(),h())}),document.body.append(n),{open:h}}var re=[`default`,`indigo`,`violet`,`purple`,`pink`,`red`,`orange`,`amber`,`lime`,`green`,`teal`,`cyan`,`brown`,`gray`],ie=[`auto`,`light`,`dark`],ae=`bootstrap-playground-toolbar-open`,oe=`bootstrap-playground-toolbar-hint`,se=`https://github.com/julien-deramond/bootstrap-test-playground`,P=e=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e}</svg>`,F={home:P(`<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`),search:P(`<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>`),sliders:P(`<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>`),close:P(`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`)},ce=`
  :host { all: initial; }
  * { box-sizing: border-box; }
  .dock, dialog {
    font: 12px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #e6e6e6;
  }
  .dock {
    position: fixed;
    inset-block-end: 12px;
    inset-inline-end: 12px;
    z-index: 2147483000;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    max-inline-size: calc(100vw - 24px);
  }
  .pill, .origin {
    background: rgb(24 24 27 / .92);
    border: 1px solid rgb(255 255 255 / .12);
    box-shadow: 0 6px 24px rgb(0 0 0 / .25);
    backdrop-filter: blur(6px);
  }
  .pill { display: flex; align-items: center; gap: 2px; max-inline-size: 100%; padding: 3px; border-radius: 999px; }
  .origin { padding: 3px 10px; font-size: 11px; border-radius: 999px; }
  .origin a { text-decoration: underline; text-underline-offset: 2px; }
  a { color: inherit; font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  button, input { font: inherit; color: inherit; }
  button { background: transparent; border: 0; cursor: pointer; }
  :is(button, a, input):focus-visible, label:has(> input:focus-visible) { outline: 2px solid #7aa7ff; outline-offset: 1px; }
  kbd { font: inherit; font-size: 10px; opacity: .75; }
  .icon { display: inline-grid; place-items: center; min-inline-size: 26px; block-size: 26px; padding: 0 6px; border-radius: 999px; }
  .icon:hover, .summary:hover, .pager a:hover { text-decoration: none; background: rgb(255 255 255 / .1); }
  .pager { display: inline-flex; }
  .pager a { display: inline-grid; place-items: center; min-inline-size: 24px; block-size: 26px; border-radius: 999px; }
  .pager [aria-disabled] { opacity: .3; pointer-events: none; }
  .summary {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    min-inline-size: 0;
    block-size: 26px;
    padding: 0 10px;
    font-weight: 600;
    border: 1px solid rgb(255 255 255 / .18);
    border-radius: 999px;
  }
  .summary-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .search { display: inline-flex; gap: 4px; align-items: center; }

  .hint {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    max-inline-size: 280px;
    padding: 10px 10px 10px 12px;
    background: rgb(24 24 27);
    border: 1px solid #7aa7ff;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgb(0 0 0 / .3);
  }
  .hint p { margin: 0; }
  .hint strong { display: block; margin-block-end: 2px; }
  .hint kbd { font-size: 11px; opacity: .75; }
  .hint .dismiss { flex: none; margin: -4px -4px 0 0; }
  .summary[aria-describedby] { border-color: #7aa7ff; box-shadow: 0 0 0 2px rgb(122 167 255 / .35); }
  @media (prefers-reduced-motion: no-preference) {
    .hint { animation: hint-in .3s ease-out; }
    @keyframes hint-in { from { opacity: 0; transform: translateY(6px); } }
  }

  dialog {
    position: fixed;
    inset: auto;
    inset-block-end: 56px;
    inset-inline-end: 12px;
    inline-size: min(420px, calc(100vw - 24px));
    max-inline-size: none;
    max-block-size: calc(100dvh - 80px);
    padding: 0;
    margin: 0;
    overflow: auto;
    overscroll-behavior: contain;
    background: rgb(24 24 27);
    border: 1px solid rgb(255 255 255 / .14);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgb(0 0 0 / .4);
    scrollbar-color: rgb(255 255 255 / .25) transparent;
  }
  dialog::backdrop { background: transparent; }
  /* The dock and the panel sit at the page's inline end, but their contents
     stay left to right: code in RTL descriptions would scramble otherwise. */
  .dock > *, dialog > * { direction: ltr; }
  @media (max-width: 575.98px) {
    dialog { inset-inline: 0; inset-block-end: 0; inline-size: 100%; max-block-size: 85dvh; border-radius: 12px 12px 0 0; }
  }
  header, footer { display: flex; gap: 8px; align-items: center; padding: 10px 14px; }
  header { position: sticky; inset-block-start: 0; z-index: 1; background: rgb(24 24 27); border-block-end: 1px solid rgb(255 255 255 / .1); }
  h2 { flex: 1; margin: 0; font-size: 13px; }
  h3 { margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; opacity: .6; }
  section { padding: 12px 14px; border-block-end: 1px solid rgb(255 255 255 / .08); }
  fieldset { min-inline-size: 0; padding: 0; margin: 0; border: 0; }
  .row { display: grid; grid-template-columns: 7.5em 1fr; gap: 8px; align-items: center; }
  .row + .row { margin-block-start: 6px; }
  legend { float: inline-start; padding: 0; opacity: .8; }
  legend kbd { display: block; }

  .segmented { display: inline-flex; justify-self: start; flex-wrap: wrap; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; overflow: hidden; }
  .segmented label { position: relative; padding: 3px 9px; cursor: pointer; }
  .segmented label + label { border-inline-start: 1px solid rgb(255 255 255 / .18); }
  .segmented label:has(> input:checked) { color: #111; background: #e6e6e6; }
  .segmented label:has(> input:focus-visible) { outline-offset: -2px; }
  input[type="radio"] { position: absolute; inset: 0; margin: 0; opacity: 0; pointer-events: none; }

  .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .swatch { position: relative; display: grid; place-items: center; inline-size: 22px; block-size: 22px; cursor: pointer; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(255 255 255 / .2); }
  .swatch.default { inline-size: auto; padding: 0 8px; border-radius: 999px; }
  .swatch:has(> input:checked) { box-shadow: 0 0 0 2px rgb(24 24 27), 0 0 0 4px #e6e6e6; }
  .swatch:has(> input:focus-visible) { outline-offset: 5px; }

  .filter { inline-size: 100%; padding: 5px 8px; margin-block-end: 4px; background: rgb(255 255 255 / .06); border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  .filter::placeholder { color: inherit; opacity: .5; }
  .category { margin-block-start: 10px; }
  .category legend { float: none; display: flex; gap: 6px; align-items: baseline; margin-block-end: 4px; font-weight: 600; opacity: 1; }
  .category legend span { font-weight: 400; opacity: .55; }
  .config { position: relative; display: grid; gap: 2px; padding: 6px 8px; border: 1px solid transparent; border-radius: 6px; }
  .config:hover { background: rgb(255 255 255 / .05); }
  .config:has(input:checked) { background: rgb(122 167 255 / .12); border-color: rgb(122 167 255 / .5); }
  .config:has(input:focus-visible) { outline: 2px solid #7aa7ff; outline-offset: 1px; }
  .config label { display: grid; gap: 2px; cursor: pointer; }
  .config label::after { position: absolute; inset: 0; content: ""; }
  .config-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; }
  .config-description { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; opacity: .7; }
  .config-description code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
  .config-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-self: start; font-size: 11px; }
  .config-meta a { font-weight: 400; color: #9ab8ff; }
  .badge { padding: 0 6px; border: 1px solid rgb(255 255 255 / .25); border-radius: 999px; opacity: .8; }
  .note { margin: 8px 0 0; padding: 6px 8px; font-size: 11px; background: rgb(255 200 80 / .1); border-radius: 6px; }
  .empty { padding: 12px; text-align: center; opacity: .6; }
  [hidden] { display: none !important; }

  footer { flex-wrap: wrap; }
  .action { padding: 4px 10px; font-weight: 600; border: 1px solid rgb(255 255 255 / .18); border-radius: 6px; }
  .action:hover { text-decoration: none; background: rgb(255 255 255 / .1); }
  .action[aria-pressed="true"] { color: #111; background: #e6e6e6; }
  .action kbd { margin-inline-start: 4px; }
  .source { flex-basis: 100%; font-size: 11px; font-weight: 400; opacity: .55; overflow-wrap: anywhere; }
`,I=e=>String(e).replace(/[&<>"]/g,e=>`&#${e.charCodeAt(0)};`),le=e=>I(e).replace(/`([^`]+)`/g,`<code>$1</code>`),L=e=>e.charAt(0).toUpperCase()+e.slice(1);function R({source:e,onSourceChange:t,configs:n,swappable:r}){let i=window.playgroundPrefs;if(!i){console.warn(`[playground] playground-prefs.js is not loaded on this page; the toolbar is disabled.`);return}let a=e=>n.find(t=>t.name===e),o=e=>[...new Set([...ie,...a(e.config)?.colorModes??[],e.colorMode])],c=()=>{},u=()=>{},d=()=>{},f=()=>{},p=i.embedded?void 0:ee({onChange:e=>f(e)});if(document.addEventListener(`keydown`,e=>{if(!e.altKey||!e.shiftKey||e.ctrlKey||e.metaKey||k(e))return;let t=i.effective();if(e.code===`KeyT`){let e=o(t);c(i.save({colorMode:e[(e.indexOf(t.colorMode)+1)%e.length]}))}else if(e.code===`KeyD`)c(i.save({dir:t.dir===`rtl`?`ltr`:`rtl`}));else if(e.code===`KeyP`&&!i.embedded)u();else if(e.code===`KeyO`&&p)p.toggle();else return;e.preventDefault(),d()}),window.addEventListener(`storage`,()=>{i.apply(i.effective()),c(i.effective())}),window.addEventListener(`playground-prefs`,()=>c(i.effective())),i.embedded)return;let m=document.createElement(`div`);m.id=`playground-toolbar`;let h=m.attachShadow({mode:`open`}),g=(e,t,n,{className:r=``,label:i=``,style:a=``}={})=>`
    <label${r?` class="${r}"`:``}${a?` style="${a}"`:``}${i?` title="${I(i)}"`:``}>
      <input type="radio" name="${e}" value="${I(t)}"${i?` aria-label="${I(i)}"`:``}>${n}
    </label>`,_=(e,t)=>t.map(([t,n])=>g(e,t,I(n))).join(``),v=e=>e.map(e=>[e,L(e)]),y=[[`src`,`Source`],[`dist`,`Dist`]],b=(e,t,n,r=``)=>`
    <fieldset class="row">
      <legend>${e}${r?` <kbd>${r}</kbd>`:``}</legend>
      <div class="segmented" data-radios="${t}">${_(t,n)}</div>
    </fieldset>`,x=re.map(e=>e==="default"?g(`primary`,e,`Default`,{className:`swatch default`,label:`Default primary`}):g(`primary`,e,``,{className:`swatch`,label:L(e),style:`background: var(--bs-${e}-500, #71717a)`})).join(``),S={name:`working`,label:`src/styles`,category:`baseline`,description:"The working copy in `src/styles/`, what pages use until a config is applied.",gaps:[]},C=({name:e,label:t,description:n,gaps:i,tokensOnly:a})=>`
    <div class="config" data-config="${I(e)}" data-search="${I(`${e} ${t??``} ${n}`.toLowerCase())}">
      <label>
        <input type="radio" name="config" value="${I(e)}"${r?``:` disabled`}>
        <span class="config-name">${I(t??e)}</span>
        ${n?`<span class="config-description">${le(n)}</span>`:``}
      </label>
      ${a&&e!=="default"||i.length>0?`
        <span class="config-meta">
          ${a&&e!=="default"?`<span class="badge" title="Only changes tokens.css, so it also applies on top of the prebuilt dist">tokens only</span>`:``}
          ${i.map(e=>`<a href="${se}/issues/${e}" target="_blank" rel="noopener" title="Known gap: tracking issue #${e}">#${e}</a>`).join(``)}
        </span>`:``}
    </div>`,w=l([S,...n]).map(({id:e,label:t,description:n,configs:r})=>`
    <fieldset class="category" data-category="${I(e)}">
      <legend>${I(t)} <span>${r.filter(e=>e!==S).length}</span></legend>
      ${r.map(C).join(``)}
    </fieldset>`).join(``),T=`/bootstrap-test-playground/pr-475/compare.html?page=${encodeURIComponent(location.pathname)}`,E=`/bootstrap-test-playground/pr-475/matrix.html?page=${encodeURIComponent(location.pathname)}`,D=ne(),{group:O,previous:te,next:A}=s(location.pathname),j=(e,t,n)=>e?`<a href="${I(e.url)}" title="${t}: ${I(e.title)}" aria-label="${t}: ${I(e.title)}">${n}</a>`:`<a aria-disabled="true" aria-label="${t}">${n}</a>`,M=O?`
      <span class="pager" role="group" aria-label="${I(O.label)}">${j(te,`Previous`,`&#x2039;`)}${j(A,`Next`,`&#x203A;`)}</span>`:``,P=document.querySelector(`meta[name="playground-source"]`),R=P?`
      <span class="origin">Adapted from <a href="${I(P.dataset.url)}" target="_blank" rel="noopener">${I(P.content)}</a>${P.dataset.license?` (${I(P.dataset.license)})`:``}</span>`:``,z=`/bootstrap-test-playground/pr-475/`,B=location.pathname.startsWith(z)?location.pathname.slice(34).match(/^issues\/([a-z0-9][a-z0-9-]*)\/(?:index\.html)?$/)?.[1]:void 0,V=B?`
        <a class="action" href="${z}issues/${B}/export.html" download="bootstrap-repro-${B}.html" title="This reproduction as one HTML file, with Bootstrap from jsDelivr or inlined">Export HTML</a>
        <a class="action" href="${z}open-in-stackblitz.html?issue=${B}" target="_blank" rel="noopener" title="This reproduction as a Vite + Sass project, compiled from the same Bootstrap commit">Open in StackBlitz</a>`:``;h.innerHTML=`
    <style>${ce}</style>
    <div class="dock">${R}
      <div class="hint" role="note" aria-labelledby="hint-title" hidden>
        <p><strong id="hint-title">Playground settings</strong><span id="hint-text">Switch the config, color mode, direction, primary color and dist from here.</span> <kbd>Alt+Shift+P</kbd></p>
        <button type="button" class="icon dismiss" aria-label="Dismiss" title="Dismiss">${F.close}</button>
      </div>
      <div class="pill" role="group" aria-label="Playground">
        <a class="icon" href="/bootstrap-test-playground/pr-475/" title="All pages" aria-label="All pages">${F.home}</a>${M}
        <button type="button" class="summary" aria-haspopup="dialog" aria-expanded="false" aria-controls="panel" aria-keyshortcuts="Alt+Shift+P" title="Playground settings (Alt+Shift+P)">
          ${F.sliders}<span class="summary-text"></span>
        </button>
        <button type="button" class="icon search" title="Go to another page (${N})" aria-label="Go to another page, ${N}" aria-keyshortcuts="${N===`⌘K`?`Meta+K`:`Control+K`}">${F.search}<kbd>${N}</kbd></button>
      </div>
    </div>
    <dialog id="panel" aria-labelledby="panel-title">
      <header>
        <h2 id="panel-title">Playground settings</h2>
        <button type="button" class="icon close" aria-label="Close" title="Close (Esc)">${F.close}</button>
      </header>
      <section aria-labelledby="panel-environment">
        <h3 id="panel-environment">Environment</h3>
        ${b(`Color mode`,`colorMode`,[],`Alt+Shift+T`)}
        ${b(`Direction`,`dir`,[[`ltr`,`LTR`],[`rtl`,`RTL`]],`Alt+Shift+D`)}
        ${b(`CSS`,`css`,y)}
        ${b(`JavaScript`,`js`,y)}
      </section>
      <section aria-labelledby="panel-theme">
        <h3 id="panel-theme">Theme</h3>
        <fieldset class="row">
          <legend>Primary</legend>
          <div class="swatches">${x}</div>
        </fieldset>
      </section>
      <section aria-labelledby="panel-inspect">
        <h3 id="panel-inspect">Inspect</h3>
        <button type="button" class="action tab-order" aria-pressed="false" aria-keyshortcuts="Alt+Shift+O" title="Number every tab stop in the order Tab visits them (Alt+Shift+O)">Show tab order <kbd>Alt+Shift+O</kbd></button>
      </section>
      <section aria-labelledby="panel-config">
        <h3 id="panel-config">Config</h3>
        <input type="search" class="filter" placeholder="Filter ${n.length} configs…" aria-label="Filter configs" autocomplete="off" spellcheck="false">
        <p class="note" data-note="swappable"${r?` hidden`:``}>This page compiles its own styles, like an issue reproduction: configs don't apply here.</p>
        <p class="note" data-note="dist" hidden>With the CSS from dist, only this config's <code>tokens.css</code> applies: its Sass options can't.</p>
        ${w}
        <p class="empty" hidden>No matching config</p>
      </section>
      <footer>
        <button type="button" class="action copy">Copy link</button>
        <a class="action" href="${T}">Compare</a>
        <a class="action" href="${E}">Matrix</a>${V}
        <button type="button" class="action reset" title="Back to Bootstrap's defaults">Reset</button>
        <a class="source"></a>
      </footer>
    </dialog>`;let H=h.querySelector(`dialog`),U=h.querySelector(`.summary`),W=h.querySelector(`.summary-text`),G=h.querySelector(`[data-radios="colorMode"]`),K=h.querySelector(`.filter`),q=h.querySelector(`.copy`),J=h.querySelector(`.tab-order`);f=e=>J.setAttribute(`aria-pressed`,String(e)),f(p.on);let Y=h.querySelector(`.source`),ue=({label:e,path:t,url:n})=>{Y.textContent=e,Y.title=`Bootstrap source: ${t}`,n?(Y.href=n,Y.rel=`noopener`):(Y.removeAttribute(`href`),Y.removeAttribute(`rel`))};ue(e),t?.(ue);let de=e=>{let t=r?a(e.config)?e.config:`src/styles`:`own styles`,n=e.css===`dist`&&e.js===`dist`?`dist`:e.css===`dist`?`CSS dist`:e.js===`dist`?`JS dist`:``;return[t,e.colorMode!==`auto`&&e.colorMode,e.dir===`rtl`&&`RTL`,e.primary!=="default"&&e.primary,n].filter(Boolean).join(` · `)},fe=e=>{let t=new URL(location.href);for(let[n,r]of Object.entries(i.URL_PARAMS))e[r]===i.DEFAULTS[r]?t.searchParams.delete(n):t.searchParams.set(n,e[r]);return t.href},X=(e,t)=>(t.js!==e.js&&location.reload(),t);c=e=>{let t=o(e);G.dataset.modes!==t.join()&&(G.innerHTML=_(`colorMode`,v(t)),G.dataset.modes=t.join());let n={...e,config:a(e.config)?e.config:`working`};for(let e of h.querySelectorAll(`input[type="radio"]`))e.checked=n[e.name]===e.value;let i=de(e);W.textContent=i,U.setAttribute(`aria-label`,`Playground settings: ${i}`),h.querySelector(`[data-note="dist"]`).hidden=!(r&&e.css===`dist`&&a(e.config)&&!a(e.config).tokensOnly)};let Z=()=>{let e=K.value.toLowerCase().split(/\s+/).filter(Boolean),t=0;for(let n of h.querySelectorAll(`.category`)){let r=n.querySelector(`legend`).textContent.toLowerCase(),i=0;for(let t of n.querySelectorAll(`.config`)){let n=e.every(e=>t.dataset.search.includes(e)||r.includes(e));t.hidden=!n,i+=n}n.hidden=i===0,t+=i}h.querySelector(`.empty`).hidden=t>0},pe=e=>{try{sessionStorage.setItem(ae,e?`1`:``)}catch{}},Q=h.querySelector(`.hint`);d=()=>{if(!Q.hidden){Q.hidden=!0,U.removeAttribute(`aria-describedby`);try{localStorage.setItem(oe,`seen`)}catch{}}};let $=()=>{d(),!H.open&&(H.showModal(),U.setAttribute(`aria-expanded`,`true`),pe(!0),h.querySelector(`input[name="config"]:checked`)?.closest(`.config`)?.scrollIntoView({block:`nearest`}))};u=()=>H.open?H.close():$(),H.addEventListener(`close`,()=>{U.setAttribute(`aria-expanded`,`false`),pe(!1)}),H.addEventListener(`click`,e=>{e.target===H&&H.close()}),h.addEventListener(`click`,e=>{let t=e.target.closest(`button`);t&&(t===U?$():t.classList.contains(`close`)?H.close():t.classList.contains(`dismiss`)?d():t.classList.contains(`search`)?D.open():t===J?p.toggle():t===q?navigator.clipboard.writeText(fe(i.effective())).then(()=>`Copied`,()=>`Copy failed`).then(e=>{q.textContent=e,setTimeout(()=>{q.textContent=`Copy link`},1500)}):t.classList.contains(`reset`)&&(K.value=``,Z(),c(X(i.effective(),i.reset()))))}),h.addEventListener(`change`,e=>{let{name:t,value:n}=e.target;e.target.type===`radio`&&c(X(i.effective(),i.save({[t]:n})))}),K.addEventListener(`input`,Z),K.addEventListener(`keydown`,e=>{e.key===`Escape`&&K.value&&(e.preventDefault(),K.value=``,Z())}),c(i.effective()),document.body.append(m);let me=!1;try{me=sessionStorage.getItem(ae)===`1`}catch{}if(me){$();return}let he=!0;try{he=localStorage.getItem(oe)===`seen`}catch{}!he&&!navigator.webdriver&&(Q.hidden=!1,U.setAttribute(`aria-describedby`,`hint-text`))}var z=`modulepreload`,B=function(e){return`/bootstrap-test-playground/pr-475/`+e},V={},H=function(e){return e.pathname.endsWith(`.css`)},U=function(e,t,n){if(t in e)return e[t];let r=n();if(!r){e[t]=void 0;return}let i=r.then(()=>{e[t]=void 0},n=>{throw e[t]=void 0,n});return e[t]=i,i},W=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e,i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}function s(e){return import.meta.resolve?new URL(import.meta.resolve(e)):new URL(e,import.meta.url)}r=o(t.map(t=>{t=B(t,n);let r=s(t),i=H(r);return U(V,r.href,()=>{if(e===void 0){e={all:new Set,styles:new Set};let t=document.getElementsByTagName(`link`);for(let n=t.length-1;n>=0;n--){let r=t[n];e.all.add(r.href),r.rel===`stylesheet`&&e.styles.add(r.href)}}if((i?e.styles:e.all).has(r.href))return;let t=document.createElement(`link`);if(t.rel=i?`stylesheet`:z,i||(t.as=`script`),t.crossOrigin=``,t.href=r.href,a&&t.setAttribute(`nonce`,a),document.head.appendChild(t),i)return new Promise((e,n)=>{t.addEventListener(`load`,e),t.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${r}`)))})})}).filter(e=>e!==void 0))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};export{x as i,R as n,h as r,W as t};