/* R&A apps: how links to other sites open. Shared by every R&A app; one set of choices per device,
   set in Settings (Open links). Links are sorted into three kinds, each with its own choice:
     claude : claude.ai links             tab | window | app (Claude app) | ask
     drive  : Google Drive, Docs, Sheets  tab | window | app (Drive/Docs app, phones only) | ask
     other  : everything else             tab | window | ask
   tab    : a new browser tab
   window : a window of its own (computers; on a phone this is the same as a tab)
   app    : the Claude app (claude:// on a computer, an Android intent on a phone), or the Drive,
            Docs, Sheets or Slides app on Android. If the app isn't installed, the link opens in a tab.
   default: (Windows) the computer's default browser, via the ra-open: link type that
            tools/ra-default-browser-setup.cmd registers once per computer
   ask    : an "Open with" list every time, with the choices above plus "Another app…" (the phone's
            or computer's share menu), and a box to remember the choice for that kind of link. */
(function () {
  'use strict';
  var KEY = 'ra-links2', OLD = 'ra-links';
  var UA = navigator.userAgent;
  var ANDROID = /Android/i.test(UA);
  var IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
  var MOBILE = ANDROID || IOS;
  var WINDOWS = !MOBILE && /Windows/i.test(UA);
  var SETUP = new URL('tools/ra-default-browser-setup.cmd', document.currentScript ? document.currentScript.src : location.href).href;
  var KINDS = {
    claude: { label: 'Claude links', app: 'Claude app' },
    drive: { label: 'Drive links', app: MOBILE ? 'Drive app' : null },
    other: { label: 'Other links', app: null }
  };

  function defaults() {
    var old = null; try { old = localStorage.getItem(OLD); } catch (e) {}
    var win = MOBILE ? 'tab' : 'window';
    if (old === 'window') return { claude: win, drive: win, other: win };
    if (old === 'apps') return { claude: 'app', drive: MOBILE ? 'app' : 'window', other: win };
    return { claude: 'tab', drive: 'tab', other: 'tab' };
  }
  function load() {
    var d = defaults(), s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var out = {};
    Object.keys(KINDS).forEach(function (k) { var v = (s && s[k]) || d[k]; out[k] = valid(k, v) ? v : 'tab'; });
    return out;
  }
  function valid(k, v) {
    if (v === 'tab' || v === 'ask') return true;
    if (v === 'window') return true; /* stored as-is; acts as a tab on phones */
    if (v === 'app') return !!KINDS[k].app;
    if (v === 'default') return WINDOWS; /* Windows' default browser, through the ra-open: helper */
    return false;
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function get(k) { var o = load(); if (!k) return o; var v = o[k] || 'tab'; return (MOBILE && v === 'window') ? 'tab' : v; }
  /* set('claude:app') sets one kind; set('tab') sets every kind (older callers). */
  function set(v) {
    var o = load();
    if (String(v).indexOf(':') > 0) { var p = String(v).split(':'); if (KINDS[p[0]] && valid(p[0], p[1])) o[p[0]] = p[1]; }
    else Object.keys(KINDS).forEach(function (k) { if (valid(k, v)) o[k] = v; });
    save(o);
  }
  function kindOf(u) {
    var h = u.hostname;
    if (h === 'claude.ai' || /\.claude\.ai$/.test(h)) return 'claude';
    if (h === 'drive.google.com' || h === 'docs.google.com') return 'drive';
    return 'other';
  }
  function options(k) {
    var o = [[k + ':tab', 'Tab']];
    if (!MOBILE) o.push([k + ':window', 'Window']);
    if (WINDOWS) o.push([k + ':default', 'Default']);
    if (KINDS[k].app) o.push([k + ':app', 'App']);
    o.push([k + ':ask', 'Ask']);
    return o;
  }

  /* opening */
  function openTab(url) { window.open(url, '_blank', 'noopener'); }
  function openWindow(url) {
    if (MOBILE) return openTab(url);
    var w = Math.min(1280, screen.availWidth - 80), h = Math.min(900, screen.availHeight - 80);
    var l = Math.max(0, Math.round((screen.availWidth - w) / 2)), t = Math.max(0, Math.round((screen.availHeight - h) / 2));
    window.open(url, '_blank', 'popup=yes,noopener,width=' + w + ',height=' + h + ',left=' + l + ',top=' + t);
  }
  function androidIntent(u, pkg) {
    return 'intent://' + u.host + u.pathname + u.search + u.hash + '#Intent;scheme=https;package=' + pkg +
      ';S.browser_fallback_url=' + encodeURIComponent(u.href) + ';end';
  }
  function drivePkg(u) {
    if (u.hostname === 'docs.google.com') {
      if (/^\/document\//.test(u.pathname)) return 'com.google.android.apps.docs.editors.docs';
      if (/^\/spreadsheets\//.test(u.pathname)) return 'com.google.android.apps.docs.editors.sheets';
      if (/^\/presentation\//.test(u.pathname)) return 'com.google.android.apps.docs.editors.slides';
      return null;
    }
    return 'com.google.android.apps.docs';
  }
  function appName(k, u) {
    if (k === 'claude') return 'Claude app';
    if (k === 'drive') { var p = drivePkg(u) || ''; return /docs\.editors\.docs$/.test(p) ? 'Docs app' : /sheets$/.test(p) ? 'Sheets app' : /slides$/.test(p) ? 'Slides app' : p ? 'Drive app' : null; }
    return null;
  }
  function openApp(k, u) {
    if (k === 'claude') {
      if (ANDROID) { location.href = androidIntent(u, 'com.anthropic.claude'); return; }
      if (IOS) { openTab(u.href); return; } /* iOS hands claude.ai links to the app itself */
      location.href = 'claude://claude.ai' + u.pathname + u.search + u.hash; return;
    }
    if (k === 'drive' && ANDROID) { var pkg = drivePkg(u); if (pkg) { location.href = androidIntent(u, pkg); return; } }
    openTab(u.href);
  }
  /* Hands the link to Windows, which opens it in the default browser (set up once with tools/ra-default-browser-setup.cmd). */
  function openDefault(u) { location.href = 'ra-open:' + encodeURIComponent(u.href); }
  function shareTo(u) {
    if (navigator.share) { navigator.share({ url: u.href }).catch(function () {}); return; }
    openTab(u.href);
  }
  function go(how, k, u) {
    if (how === 'app') return openApp(k, u);
    if (how === 'window') return openWindow(u.href);
    if (how === 'share') return shareTo(u);
    if (how === 'default') return WINDOWS ? openDefault(u) : openTab(u.href);
    return openTab(u.href);
  }

  /* the "Open with" list */
  var CSS = '.ralk-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;animation:ralkF .18s ease-out}' +
    '.ralk{background:var(--surface,#fff);color:var(--ink,#1c1c1c);width:100%;max-width:440px;border-radius:22px 22px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box;box-shadow:0 -10px 30px rgba(0,0,0,.25);animation:ralkU .24s cubic-bezier(.2,.8,.2,1);font:15px/1.4 var(--f-body,system-ui,sans-serif)}' +
    '@media (min-width:600px){.ralk-scrim{align-items:center}.ralk{border-radius:22px;padding:16px 18px 18px}}' +
    '.ralk .g{width:40px;height:5px;border-radius:3px;background:currentColor;opacity:.2;margin:0 auto 10px}' +
    '.ralk h3{margin:0 4px 2px;font:600 17px/1.3 var(--f-body,system-ui,sans-serif)}' +
    '.ralk .u{margin:0 4px 10px;font-size:12px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ralk button.o{display:flex;align-items:center;gap:12px;width:100%;min-height:50px;padding:0 12px;border:0;border-radius:14px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}' +
    '.ralk button.o:hover,.ralk button.o:focus-visible{background:rgba(127,127,127,.14);outline:none}' +
    '.ralk button.o svg{width:22px;height:22px;flex:none;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.8}' +
    '.ralk label{display:flex;align-items:center;gap:10px;margin:8px 4px 4px;font-size:14px;cursor:pointer}' +
    '.ralk label input{width:18px;height:18px;margin:0;accent-color:var(--accent,#3E5C46)}' +
    '.ralk button.x{display:block;width:100%;min-height:46px;margin-top:8px;border:0;border-radius:14px;background:rgba(127,127,127,.14);color:inherit;font:600 15px var(--f-body,system-ui,sans-serif);cursor:pointer}' +
    '@keyframes ralkU{from{transform:translateY(40px);opacity:0}}@keyframes ralkF{from{background:transparent}}';
  var ICON = {
    app: 'M5 4h14v16H5zM9 18h6',
    tab: 'M3 6h18v13H3zM3 10h18M7 6v4',
    window: 'M4 5h16v14H4zM4 9h16M14 13h4v4',
    share: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
    'default': 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9'
  };
  function ask(k, u) {
    if (!document.getElementById('ralk-css')) { var st = document.createElement('style'); st.id = 'ralk-css'; st.textContent = CSS; document.head.appendChild(st); }
    var list = [];
    var an = KINDS[k].app ? appName(k, u) : null;
    if (an) list.push(['app', 'Open in the ' + an]);
    list.push(['tab', 'New tab']);
    if (!MOBILE) list.push(['window', 'New window']);
    if (WINDOWS) list.push(['default', 'Default browser']);
    if (MOBILE && navigator.share) list.push(['share', 'Another app…']);
    var scrim = document.createElement('div'); scrim.className = 'ralk-scrim';
    scrim.innerHTML = '<div class="ralk" role="dialog" aria-modal="true" aria-labelledby="ralk-t"><div class="g"></div><h3 id="ralk-t">Open with</h3><p class="u"></p>' +
      list.map(function (o) { return '<button type="button" class="o" data-how="' + o[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[o[0]] + '"/></svg>' + o[1] + '</button>'; }).join('') +
      '<label><input type="checkbox"> Always do this for ' + (k === 'other' ? 'other links' : KINDS[k].label) + '</label><button type="button" class="x">Cancel</button></div>';
    scrim.querySelector('.u').textContent = u.hostname + u.pathname;
    function close() { if (scrim.parentNode) scrim.parentNode.removeChild(scrim); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.closest('.x')) { close(); return; }
      var b = e.target.closest('button.o'); if (!b) return;
      var how = b.getAttribute('data-how'), keep = scrim.querySelector('label input').checked;
      if (keep && how !== 'share') set(k + ':' + how);
      close(); go(how, k, u);
      if (keep && how !== 'share') { try { window.dispatchEvent(new CustomEvent('ralinks-change')); } catch (_) {} }
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(scrim);
    var first = scrim.querySelector('button.o'); if (first) first.focus();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.origin === location.origin) return;
    var k = kindOf(u), how = get(k);
    e.preventDefault();
    if (how === 'ask') { ask(k, u); return; }
    go(how, k, u);
  }, true);

  window.RALinks = {
    get: get, set: set, mobile: MOBILE, open: function (url) { var u = new URL(url, location.href), k = kindOf(u), how = get(k); if (how === 'ask') ask(k, u); else go(how, k, u); },
    rows: function () { return Object.keys(KINDS).map(function (k) { return { k: k, label: KINDS[k].label, cur: k + ':' + get(k), opts: options(k) }; }); },
    windows: WINDOWS, setupUrl: SETUP,
    help: MOBILE ? 'Tab: a browser tab. App: the Claude or Drive app (a tab if it isn’t installed). Ask: choose each time, including any other app. Only changes this device.'
      : 'Tab: a browser tab. Window: a window of its own. App: the Claude desktop app.' +
        (WINDOWS ? ' Default: your Windows default browser. It needs a one-time setup on this computer: <a href="' + SETUP + '" download>download the setup file</a> and double-click it.' : '') +
        ' Ask: choose each time. Only changes this computer.'
  };
})();
