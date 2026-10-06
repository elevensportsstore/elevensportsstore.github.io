const SHEET_ID = '1UHjLOQkVkDI1Y8qmJLHHwRbcRfpc3WSY2iKNpIvWnUY';
const SHEET_TITLE = 'ELEVEN Products';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_TITLE)}`;
const NO_IMAGE = 'https://placehold.co/600x600?text=No+Image';
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', '4XL', '5XL'];

const LEAGUE_ORDER = [
    'პრემიერ ლიგა',
    'ლა ლიგა',
    'ლიგა 1',
    'სერია A',
    'ბუნდესლიგა',
    'სხვა ლიგები',
    'ეროვნული ნაკრები'
];

let products = [];
let cart = JSON.parse(localStorage.getItem('eleven-cart-v2') || '[]');
const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (_) { return d; } };
let favs = readLS('eleven-fav-v1', []).map(String);
const isFav = id => favs.includes(String(id));
const HEART = '<svg class="heart-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
const USER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';
const PERS_NAME_PRICE = 15;
const PERS_PATCH_PRICE = 10;
let sel = { size: '', qty: 1, name: '', num: '', patches: false };
const NAT_LEAGUE = 'ეროვნული ნაკრები';
const f = { league: '', clubs: new Set(), types: new Set(), sizes: new Set(), sort: '' };

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const uniq = a => [...new Set(a)].filter(Boolean);
const num = v => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

/* ===== ძებნა =====
   ეძებს ყველგან: ID, დასახელება, კლუბი, ლიგა, ტიპი, ბეიჯი, აღწერა, ზომები, ფასი.
   დონეები (რაც უფრო მაღალია, მით უფრო მაღლა ჩანს შედეგი):
   4  პირდაპირი დამთხვევა (ნებისმიერ ადგილას, ერთი ასოც საკმარისია)
   3  ფონეტიკური დამთხვევა: ქართული <-> ლათინური (ბარ = bar -> Barcelona)
   ---- ქვემოთა "სუსტი" დონეები ირთვება მხოლოდ მაშინ, თუ 3-4 დონეზე არაფერი მოიძებნა ----
   2  შეცდომით ჩაწერა (chelsa -> chelsea)
   1  ხმოვნების გარეშე დამთხვევა (brslna -> barcelona) */
const KA2LAT = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
    'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
    'ფ': 'f', 'ქ': 'k', 'ღ': 'g', 'ყ': 'k', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts',
    'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

const phon = t =>
    t
        .toLowerCase()
        .replace(/[\u10D0-\u10FF]/g, c => KA2LAT[c] || '')
        .replace(/ch/g, '#')
        .replace(/ph/g, 'f')
        .replace(/c(?=[eiy])/g, 's')
        .replace(/[cq]/g, 'k')
        .replace(/w/g, 'v')
        .replace(/x/g, 'ks')
        .replace(/y/g, 'i')
        .replace(/(.)\1+/g, '$1')
        .replace(/#/g, 'ch');

const norm = t => phon(t).replace(/[^a-z0-9]+/g, ' ').trim();
const skel = t => t.replace(/[aeiou]/g, '');

function editDist(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++)
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
    }
    return prev[b.length];
}

function indexProduct(p) {
    p.raw = [p.id, p.title, p.club, p.league, p.type, p.badge, p.description, p.sizes.join(' '), p.price, p.oldPrice || '']
        .join(' ')
        .toLowerCase();
    p.nrm = norm(p.raw);
    p.titleN = norm(p.title);
    p.tokens = p.nrm.split(' ').filter(Boolean);
    p.skels = p.tokens.map(skel);
}

function wordScore(p, w, weak = false) {
    if (p.raw.includes(w)) return 4;
    const n = norm(w);
    if (!n) return 0;
    if (p.nrm.includes(n)) return 3;
    if (!weak) return 0;
    if (n.length >= 5) {
        const max = n.length >= 9 ? 2 : 1;
        if (p.tokens.some(t => editDist(n, t.slice(0, n.length)) <= max)) return 2;
    }
    const sk = skel(n);
    if (n.length >= 5 && sk.length >= 3 && p.skels.some(s => s.includes(sk))) return 1;
    return 0;
}

function matchScore(p, q, weak = false) {
    const words = q.split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    let total = 0;
    for (const w of words) {
        const sc = wordScore(p, w, weak);
        if (!sc) return 0;
        total += sc;
    }
    const nq = norm(q);
    if (nq && p.titleN.includes(nq)) total += 2;
    return total;
}

function diversifyByClub(list) {
    const byClub = {};
    list.forEach(p => {
        const key = p.club || '_';
        if (!byClub[key]) byClub[key] = [];
        byClub[key].push(p);
    });
    const clubs = Object.keys(byClub);
    const result = [];
    let i = 0;
    let added = true;
    while (added) {
        added = false;
        for (const c of clubs) {
            if (byClub[c][i]) {
                result.push(byClub[c][i]);
                added = true;
            }
        }
        i++;
    }
    return result;
}

/* ===== სურათები: images/{ID}.{გაფართოება} ===== */
const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
const imgUrl = (id, n = 0) => `images/${enc(String(id).trim())}.${IMG_EXTS[n]}`;

function loadSheetJSONP() {
    return new Promise((resolve, reject) => {
        const cbName = '_gviz_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Sheet load timeout'));
        }, 15000);

        function cleanup() {
            clearTimeout(timeout);
            try { delete window[cbName]; } catch (_) {}
            if (script && script.parentNode) script.parentNode.removeChild(script);
        }

        window[cbName] = function (data) {
            cleanup();
            if (!data || data.status !== 'ok') {
                reject(new Error((data && data.errors && data.errors[0] && data.errors[0].detailed_message) || 'Sheet error'));
                return;
            }
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = SHEET_URL + '&tqx=responseHandler:' + cbName;
        script.onerror = () => {
            cleanup();
            reject(new Error('Script load failed'));
        };
        document.head.appendChild(script);
    });
}

async function fetchProducts() {
    try {
        const json = await loadSheetJSONP();
        let rows = json.table.rows || [];
        if (json.table.cols.every(c => !c.label)) rows = rows.slice(1);

        const val = (r, i) => (r.c && r.c[i] && r.c[i].v !== null && r.c[i].v !== undefined ? r.c[i].v : '');

        // სვეტები: 0 ID | 1 სათაური | 2 ფასი | 3 აღწერა | 4 კლუბი | 5 ტიპი | 6 ძველი ფასი | 7 ზომები | 8 ბეჯი | 9 ლიგა
        products = rows.map((r, i) => {
            const id = String(val(r, 0) || i + 1).trim().replace(/\.(jpe?g|png|webp)$/i, '');
            return {
                id,
                title: val(r, 1) || 'პროდუქტი',
                price: num(val(r, 2)),
                description: val(r, 3),
                club: String(val(r, 4)).trim(),
                type: String(val(r, 5)).trim(),
                oldPrice: num(val(r, 6)),
                sizes: String(val(r, 7)).split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
                badge: String(val(r, 8)).trim(),
                league: String(val(r, 9)).trim()
            };
        });

        products.forEach(indexProduct);

        buildLeagueNav();
        readHash();
    } catch (e) {
        console.error('ELEVEN products load error:', e);
        $('products-container').innerHTML =
            '<p class="loading-text">პროდუქტების ჩატვირთვა ვერ მოხერხდა. სცადე გვერდის განახლება.</p>';
    }
    updateCartUI();
    updateFavUI();
}

function readHash() {
    if (!products.length) return;
    const pm = location.hash.match(/product=([^&]*)/);
    const lm = location.hash.match(/league=([^&]*)/);
    const cm = location.hash.match(/club=([^&]*)/);

    f.league = lm ? decodeURIComponent(lm[1]) : '';
    f.clubs.clear();
    if (cm) {
        decodeURIComponent(cm[1])
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .forEach(c => f.clubs.add(c));
    }

    if (pm) showProduct(decodeURIComponent(pm[1]));
    else {
        f.types.clear();
        f.sizes.clear();
        showShop();
    }
    window.scrollTo(0, 0);
}

function buildLeagueNav() {
    document.querySelectorAll('#club-nav a').forEach(a => {
        a.classList.toggle('active', (a.dataset.league || '') === f.league);
    });
}

const priceHTML = p => `${p.price} ₾ ${p.oldPrice > p.price ? `<s>${p.oldPrice} ₾</s>` : ''}`;

function showShop() {
    $('shop-view').hidden = false;
    $('product-view').hidden = true;
    document.title = 'ELEVEN — Sports Store';
    render();
}

function render() {
    let pool = products.filter(p => !f.league || p.league === f.league);
    if (f.clubs.size) pool = pool.filter(p => f.clubs.has(p.club));

    const q = $('search').value.trim().toLowerCase();
    const base = pool.filter(
        p => (!f.types.size || f.types.has(p.type)) && (!f.sizes.size || p.sizes.some(s => f.sizes.has(s)))
    );
    const scores = new Map();
    const run = weak => {
        scores.clear();
        return base.filter(p => {
            const sc = matchScore(p, q, weak);
            scores.set(p, sc);
            return sc > 0;
        });
    };
    // ჯერ მხოლოდ ზუსტი/ფონეტიკური დამთხვევა; თუ არაფერი ჩანს, ირთვება შეცდომების ამოცნობა
    let list = run(false);
    if (!list.length && q) list = run(true);

    if (f.sort) {
        list.sort((a, b) => (f.sort === 'asc' ? a.price - b.price : b.price - a.price));
    } else if (q) {
        list.sort((a, b) => scores.get(b) - scores.get(a));
    } else if (!f.league && !f.clubs.size) {
        list = diversifyByClub(list);
    }

    buildLeagueNav();

    $('hero').classList.toggle('compact', !!f.league || !!f.clubs.size);

    if (f.league || f.clubs.size) {
        $('hero-title').textContent = 'ᲐᲢᲐᲠᲔ ᲡᲘᲐᲛᲐᲧᲘᲗ';
    } else {
        $('hero-title').innerHTML = 'ᲡᲐᲣᲙᲔᲗᲔᲡᲝ<br>ᲝᲜᲚᲐᲘᲜ ᲛᲐᲦᲐᲖᲘᲐ<br>ᲡᲐᲥᲐᲠᲗᲕᲔᲚᲝᲨᲘ';
    }

    const heroSub = $('hero-sub');
    if (heroSub) {
        if (f.clubs.size === 1) heroSub.textContent = [f.league, [...f.clubs][0]].filter(Boolean).join(' · ');
        else if (f.clubs.size > 1) heroSub.textContent = [f.league, f.clubs.size + ' კლუბი'].filter(Boolean).join(' · ');
        else if (f.league) heroSub.textContent = f.league;
        else heroSub.textContent = '';
    }

    const titleParts = [];
    if (f.league) titleParts.push(f.league);
    if (f.clubs.size === 1) titleParts.push([...f.clubs][0]);
    else if (f.clubs.size > 1) titleParts.push(f.clubs.size + ' კლუბი');
    $('result-count').textContent = `${titleParts.length ? titleParts.join(' · ') : 'ყველა პროდუქტი'} (${list.length})`;

    const scopeProducts = products.filter(p => !f.league || p.league === f.league);
    const kaSort = (a, b) => a.localeCompare(b, 'ka');
    const teamClubs = uniq(scopeProducts.filter(p => p.league !== NAT_LEAGUE).map(p => p.club)).sort(kaSort);
    const nationClubs = uniq(scopeProducts.filter(p => p.league === NAT_LEAGUE).map(p => p.club)).sort(kaSort);
    const types = uniq(pool.map(p => p.type)).sort(kaSort);
    const sizes = uniq(pool.flatMap(p => p.sizes)).sort(
        (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
    );

    const openKeys = new Set(
        [...document.querySelectorAll('#filters .f-group.open')].map(g => g.dataset.fkey)
    );
    const chevron =
        '<svg class="f-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

    const fSection = (key, title, count, body) => {
        const open = openKeys.has(key) ? ' open' : '';
        const badge = count ? `<span class="f-head-count">${count}</span>` : '';
        return `<div class="f-group${open}" data-fkey="${key}">
            <button type="button" class="f-head" data-ftoggle aria-expanded="${openKeys.has(key)}">
                <span class="f-head-title">${title}</span>${badge}${chevron}
            </button>
            <div class="f-body">${body}</div>
        </div>`;
    };

    let filtersHTML = '';

    const clubChecks = list =>
        list
            .map(
                c =>
                    `<label><input type="checkbox" data-club="${esc(c)}" ${
                        f.clubs.has(c) ? 'checked' : ''
                    }> ${esc(c)}</label>`
            )
            .join('');

    const selectedIn = list => list.filter(c => f.clubs.has(c)).length;

    if (teamClubs.length && f.league !== NAT_LEAGUE) {
        filtersHTML += fSection('club', 'კლუბი', selectedIn(teamClubs), clubChecks(teamClubs));
    }

    if (nationClubs.length && (!f.league || f.league === NAT_LEAGUE)) {
        filtersHTML += fSection('nation', 'ნაკრები', selectedIn(nationClubs), clubChecks(nationClubs));
    }

    if (types.length) {
        const body = types
            .map(
                t =>
                    `<label><input type="checkbox" data-type="${esc(t)}" ${
                        f.types.has(t) ? 'checked' : ''
                    }> ${esc(t)}</label>`
            )
            .join('');
        filtersHTML += fSection('type', 'ტიპი', f.types.size, body);
    }

    if (sizes.length) {
        const body =
            `<div class="chips">` +
            sizes
                .map(s => `<button data-fsize="${esc(s)}" class="${f.sizes.has(s) ? 'on' : ''}">${esc(s)}</button>`)
                .join('') +
            `</div>`;
        filtersHTML += fSection('size', 'ზომა', f.sizes.size, body);
    }

    if (f.clubs.size || f.types.size || f.sizes.size) {
        filtersHTML += '<button class="f-clear" data-clear>ფილტრის გასუფთავება</button>';
    }
    $('filters').innerHTML = filtersHTML;

    $('products-container').innerHTML = list.length
        ? list
              .map(
                  p => `
        <a class="product-card" href="#product=${enc(p.id)}">
            <div class="pimg">
                ${
                    p.badge
                        ? `<span class="badge">${esc(p.badge)}</span>`
                        : p.oldPrice > p.price
                        ? '<span class="badge sale">SALE</span>'
                        : ''
                }
                <img src="${imgUrl(p.id)}" alt="${esc(p.title)}" loading="lazy" data-fallback data-pid="${esc(p.id)}">
            </div>
            <h3>${esc(p.title)}</h3>
            <div class="price">${priceHTML(p)}</div>
            <button type="button" class="fav-card ${isFav(p.id) ? 'on' : ''}" data-fav="${esc(p.id)}" aria-pressed="${isFav(p.id)}" aria-label="ფავორიტებში დამატება">${HEART}</button>
        </a>`
              )
              .join('')
        : '<p class="loading-text">ამ პარამეტრებით პროდუქტი ვერ მოიძებნა.</p>';
}

function showProduct(id) {
    $('shop-view').hidden = true;
    $('product-view').hidden = false;
    const p = products.find(x => String(x.id) === String(id));
    if (!p) {
        $('product-view').innerHTML =
            '<div class="container"><p class="loading-text">პროდუქტი ვერ მოიძებნა. <a href="./">დაბრუნდი მაღაზიაში</a></p></div>';
        return;
    }
    sel = { size: '', qty: 1, name: '', num: '', patches: false };
    document.title = `${p.title} — ELEVEN`;

    document.querySelectorAll('#club-nav a').forEach(a => {
        a.classList.toggle('active', (a.dataset.league || '') === p.league);
    });

    const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const sizes = [...p.sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    const backHref = p.league ? `#league=${enc(p.league)}` : './';

    $('product-view').innerHTML = `
        <div class="container pdp">
            <a class="back" href="${backHref}">← ${esc(p.league || p.club || 'მაღაზია')}</a>
            <div class="pdp-grid">
                <div class="pdp-gallery">
                    <div class="pdp-img"><img id="pdp-main" src="${imgUrl(p.id)}" alt="${esc(p.title)}" data-fallback data-pid="${esc(p.id)}"></div>
                    <div class="pdp-thumbs" id="pdp-thumbs"></div>
                </div>
                <div class="pdp-info">
                    <div class="pdp-tags">${disc ? `<span class="tag sale">-${disc}%</span>` : ''}${
                        p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ''
                    }</div>
                    <h1>${esc(p.title)}</h1>
                    <p class="pdp-sub">${esc([p.league, p.club, p.type].filter(Boolean).join(' · '))}</p>
                    <div class="pdp-price">${priceHTML(p)}</div>
                    ${
                        sizes.length
                            ? `<h4>ზომა</h4><div class="psizes" id="psizes">${sizes
                                  .map(s => `<button data-psize="${esc(s)}">${esc(s)}</button>`)
                                  .join('')}</div>`
                            : ''
                    }
                    <button class="pers-btn" data-pers-open>✎ პერსონალიზაცია</button>
                    <div class="pers-summary" id="pers-summary" hidden></div>
                    <div class="pdp-buy">
                        <div class="pqty">
                            <button data-pqty="-1" aria-label="ერთით ნაკლები">−</button>
                            <b id="pqty">1</b>
                            <button data-pqty="1" aria-label="ერთით მეტი">+</button>
                        </div>
                        <button class="pdp-add ${sizes.length ? 'wait' : ''}" id="padd" data-padd="${esc(p.id)}">${
                            sizes.length ? 'აირჩიე ზომა' : 'კალათაში დამატება'
                        }</button>
                    </div>
                    ${p.description ? `<p class="pdp-desc">${esc(p.description)}</p>` : ''}
                </div>
            </div>
        </div>`;
    gal = { urls: [], i: 0 };
    loadGallery(p.id);
}

/* ===== გალერეა: images/{ID}.jpg, images/{ID}-2.jpg, images/{ID}-3.jpg ... ===== */
let gal = { urls: [], i: 0 };

function probeImage(name) {
    return new Promise(resolve => {
        let n = 0;
        const next = () => {
            if (n >= IMG_EXTS.length) return resolve(null);
            const url = `images/${name}.${IMG_EXTS[n++]}`;
            const im = new Image();
            im.onload = () => resolve(url);
            im.onerror = next;
            im.src = url;
        };
        next();
    });
}

async function loadGallery(id) {
    const base = enc(String(id).trim());
    const urls = [];
    const first = await probeImage(base);
    if (first) urls.push(first);
    for (let n = 2; n <= 8; n++) {
        const u = await probeImage(`${base}-${n}`);
        if (!u) break;
        urls.push(u);
    }
    const main = $('pdp-main');
    if (urls.length < 2 || !main || main.dataset.pid !== String(id)) return; // სხვა პროდუქტზე გადავიდა
    gal = { urls, i: 0 };
    $('pdp-thumbs').innerHTML = urls
        .map(
            (u, k) =>
                `<button class="${k ? '' : 'on'}" data-thumb="${k}" aria-label="ფოტო ${k + 1}"><img src="${u}" alt=""></button>`
        )
        .join('');
    main.closest('.pdp-img').insertAdjacentHTML(
        'beforeend',
        '<button class="gal-nav prev" data-gal="-1" aria-label="წინა ფოტო">‹</button><button class="gal-nav next" data-gal="1" aria-label="შემდეგი ფოტო">›</button>'
    );
}

function showPhoto(i) {
    if (gal.urls.length < 2) return;
    gal.i = (i + gal.urls.length) % gal.urls.length;
    $('pdp-main').src = gal.urls[gal.i];
    document.querySelectorAll('#pdp-thumbs button').forEach((b, k) => b.classList.toggle('on', k === gal.i));
}

function addToCart(id, size, qty = 1, name = '', num = '', patches = false) {
    const line = cart.find(
        l => l.id == id && l.size == size && (l.name || '') === name && (l.num || '') === num && !!l.patches === !!patches
    );
    line ? (line.qty += qty) : cart.push({ id, size, qty, name, num, patches: !!patches });
    updateCartUI();
    const b = document.querySelector('.cart-badge');
    b.classList.add('bump');
    setTimeout(() => b.classList.remove('bump'), 300);
}

function changeQty(i, d) {
    if (!cart[i]) return;
    cart[i].qty += d;
    if (cart[i].qty <= 0) cart.splice(i, 1);
    updateCartUI();
}

const extraOf = l => (l.name || l.num ? PERS_NAME_PRICE : 0) + (l.patches ? PERS_PATCH_PRICE : 0);

const persText = l => [[l.name, l.num].filter(Boolean).join(' '), l.patches ? 'პაჩები და ბეიჯები' : ''].filter(Boolean).join(' · ');

// p.price უკვე მოიცავს პერსონალიზაციის დანამატს, ამიტომ ჯამები ავტომატურად სწორია
const cartDetails = () =>
    cart
        .map((l, i) => {
            const base = products.find(p => p.id == l.id);
            return { ...l, i, p: base && { ...base, price: base.price + extraOf(l) } };
        })
        .filter(l => l.p);

function updateCartUI() {
    const lines = cartDetails();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
    localStorage.setItem('eleven-cart-v2', JSON.stringify(cart));
    const badge = $('cart-count');
    badge.textContent = count;
    badge.hidden = count === 0;
    $('modal-cart-total').textContent = total;
    const cc = document.querySelector('[data-cart-clear]');
    if (cc) cc.hidden = !cart.length;
    $('cart-items-list').innerHTML = lines.length
        ? lines
              .map(
                  l => `
        <li>
            <span class="ci-title">${esc(l.p.title)}${l.size ? ` <small>(${esc(l.size)})</small>` : ''}${
                l.name || l.num || l.patches ? `<br><small>✎ ${esc(persText(l))}</small>` : ''
            }</span>
            <span class="qty">
                <button data-qty="${l.i}" data-d="-1" aria-label="ერთით ნაკლები">−</button>
                <b>${l.qty}</b>
                <button data-qty="${l.i}" data-d="1" aria-label="ერთით მეტი">+</button>
            </span>
            <strong>${l.qty * l.p.price} ₾</strong>
        </li>`
              )
              .join('')
        : '<li class="empty">კალათა ცარიელია</li>';
}

function toggleCartModal() {
    $('cart-modal').classList.toggle('open');
}

// კალათის გასუფთავება — ერთი დაჭერით
function cartClearClick() {
    cart = [];
    updateCartUI();
}

/* ===== პერსონალიზაცია ===== */
const persCleanName = v =>
    v.toUpperCase().replace(/[^A-Z ]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, 15);
const persCleanNum = v => v.replace(/\D/g, '').slice(0, 2);

function ensurePersModal() {
    if ($('pers-modal')) return;
    const d = document.createElement('div');
    d.id = 'pers-modal';
    d.className = 'pers-modal';
    d.innerHTML = `
        <div class="pers-box" role="dialog" aria-modal="true" aria-labelledby="pers-title">
            <div class="pers-head">
                <h3 id="pers-title">პერსონალიზაცია</h3>
                <button class="close-btn" data-pers-close aria-label="დახურვა">&times;</button>
            </div>
            <div class="pers-row">
                <span>გვარი და ნომერი</span>
                <span class="pers-pr">+${PERS_NAME_PRICE} ₾</span>
            </div>
            <div class="pers-fields">
                <div class="pers-w">
                    <input id="pers-name" type="text" maxlength="15" placeholder="მაგ: KVARATSKHELIA" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="გვარი">
                    <span class="pers-cnt"><span id="pers-cnt">0</span>/15</span>
                </div>
                <div class="pers-w pers-w-num">
                    <input id="pers-num" type="text" maxlength="2" inputmode="numeric" placeholder="7" autocomplete="off" aria-label="ნომერი">
                    <span class="pers-cnt"><span id="pers-ncnt">0</span>/2</span>
                </div>
            </div>
            <label class="pers-opt">
                <input type="checkbox" id="pers-patch">
                <span class="pers-t">პაჩები და ბეიჯები</span>
                <span class="pers-pr">+${PERS_PATCH_PRICE} ₾</span>
            </label>
            <div class="pers-total"><span>პერსონალიზაციის ფასი</span><strong><span id="pers-sum">0</span> ₾</strong></div>
            <button class="checkout-btn" data-pers-ok>დადასტურება</button>
        </div>`;
    document.body.appendChild(d);
}

function persUpdate() {
    const n = $('pers-name'),
        m = $('pers-num');
    const name = persCleanName(n.value),
        num = persCleanNum(m.value);
    if (name !== n.value) n.value = name;
    if (num !== m.value) m.value = num;
    $('pers-cnt').textContent = name.length;
    $('pers-ncnt').textContent = num.length;
    $('pers-sum').textContent =
        (name.trim() || num ? PERS_NAME_PRICE : 0) + ($('pers-patch').checked ? PERS_PATCH_PRICE : 0);
}

function openPers() {
    ensurePersModal();
    $('pers-name').value = sel.name;
    $('pers-num').value = sel.num;
    $('pers-patch').checked = sel.patches;
    persUpdate();
    $('pers-modal').classList.add('open');
    setTimeout(() => $('pers-name').focus(), 50);
}

function closePers() {
    const m = $('pers-modal');
    if (m) m.classList.remove('open');
}

function renderPers() {
    const box = $('pers-summary');
    if (!box) return;
    const text = persText(sel);
    box.hidden = !text;
    if (!text) {
        box.innerHTML = '';
        return;
    }
    const add = $('padd');
    const p = add && products.find(x => String(x.id) === String(add.dataset.padd));
    const total = p ? (p.price + extraOf(sel)) * sel.qty : 0;
    box.innerHTML = `
        <div class="pers-sum-top">
            <span class="pers-sum-text">✎ ${esc(text)} <b>+${extraOf(sel)} ₾</b></span>
            <button class="pers-x" data-pers-clear aria-label="პერსონალიზაციის წაშლა">&times;</button>
        </div>
        <div class="pers-sum-total"><span>ჯამური ფასი${sel.qty > 1 ? ' (' + sel.qty + ' ც.)' : ''}</span><strong>${total} ₾</strong></div>`;
}

function savePers() {
    sel.name = persCleanName($('pers-name').value).trim();
    sel.num = persCleanNum($('pers-num').value);
    sel.patches = $('pers-patch').checked;
    renderPers();
    closePers();
}

function clearPers() {
    sel.name = '';
    sel.num = '';
    sel.patches = false;
    renderPers();
    closePers();
}

function setLeague(league) {
    f.league = league || '';
    f.clubs.clear();
    f.types.clear();
    f.sizes.clear();
    if (f.league) location.hash = 'league=' + enc(f.league);
    else location.hash = '';
}

/* კლუბის ჩექმარკები მხოლოდ UI state — hash არ იცვლება */

document.addEventListener('click', e => {
    const t = e.target;

    if (t.dataset && t.dataset.league !== undefined && t.closest('#club-nav')) {
        e.preventDefault();
        setLeague(t.dataset.league);
        return;
    }

    const ft = t.closest && t.closest('[data-ftoggle]');
    if (ft) {
        const g = ft.closest('.f-group');
        if (g) {
            g.classList.toggle('open');
            ft.setAttribute('aria-expanded', g.classList.contains('open'));
        }
        return;
    }

    if (t.dataset.psize) {
        sel.size = t.dataset.psize;
        document.querySelectorAll('.psizes button').forEach(b => b.classList.toggle('sel', b === t));
        $('psizes').classList.remove('need');
        const b = $('padd');
        b.classList.remove('wait');
        b.textContent = 'კალათაში დამატება';
    }
    if (t.dataset.pqty) {
        sel.qty = Math.max(1, sel.qty + Number(t.dataset.pqty));
        $('pqty').textContent = sel.qty;
        renderPers();
    }
    if (t.dataset.padd) {
        const p = products.find(x => x.id == t.dataset.padd);
        if (p && p.sizes.length && !sel.size) return $('psizes').classList.add('need');
        addToCart(t.dataset.padd, sel.size, sel.qty, sel.name, sel.num, sel.patches);
    }
    if (t.dataset.persOpen !== undefined) openPers();
    if (t.dataset.persClose !== undefined || t.id === 'pers-modal') closePers();
    if (t.dataset.persOk !== undefined) savePers();
    if (t.dataset.persClear !== undefined) clearPers();

    const th = t.closest && t.closest('[data-thumb]');
    if (th) showPhoto(Number(th.dataset.thumb));
    if (t.dataset.gal) showPhoto(gal.i + Number(t.dataset.gal));
    if (t.dataset.qty) changeQty(Number(t.dataset.qty), Number(t.dataset.d));
    if (t.dataset.cartClear !== undefined) cartClearClick(t);
    if (t.dataset.fsize) {
        f.sizes.has(t.dataset.fsize) ? f.sizes.delete(t.dataset.fsize) : f.sizes.add(t.dataset.fsize);
        render();
    }
    if (t.dataset.clear !== undefined) {
        f.types.clear();
        f.sizes.clear();
        f.clubs.clear();
        render();
    }
    if (t.id === 'cart-modal') toggleCartModal();
    if (t.id === 'filter-toggle') document.querySelector('.shop').classList.toggle('show-filters');
});

document.addEventListener('change', e => {
    if (e.target.dataset.club !== undefined) {
        e.target.checked ? f.clubs.add(e.target.dataset.club) : f.clubs.delete(e.target.dataset.club);
        render();
        return;
    }
    if (e.target.dataset.type) {
        e.target.checked ? f.types.add(e.target.dataset.type) : f.types.delete(e.target.dataset.type);
        render();
    }
    if (e.target.id === 'pers-patch') persUpdate();
    if (e.target.id === 'sort') {
        f.sort = e.target.value;
        render();
    }
});

// სურათის ფორმატის ავტომატური მიგნება: jpg → jpeg → png → webp → No Image
document.addEventListener(
    'error',
    e => {
        const img = e.target;
        if (!img.dataset || img.dataset.fallback === undefined || img.dataset.done) return;
        const n = Number(img.dataset.ext || 0) + 1;
        if (n < IMG_EXTS.length) {
            img.dataset.ext = n;
            img.src = imgUrl(img.dataset.pid, n);
        } else {
            img.dataset.done = '1';
            img.src = NO_IMAGE;
        }
    },
    true
);

// სვაიპი მობილურზე: ფოტოზე თითის გადაწევა
let touchX = null;
document.addEventListener(
    'touchstart',
    e => {
        touchX = e.target.closest && e.target.closest('.pdp-img') ? e.touches[0].clientX : null;
    },
    { passive: true }
);
document.addEventListener(
    'touchend',
    e => {
        if (touchX === null || gal.urls.length < 2) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 40) showPhoto(gal.i + (dx < 0 ? 1 : -1));
    },
    { passive: true }
);

document.addEventListener('input', e => {
    if (e.target.id === 'pers-name' || e.target.id === 'pers-num') persUpdate();
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('pers-modal') && $('pers-modal').classList.contains('open')) closePers();
    else if ($('cart-modal').classList.contains('open')) toggleCartModal();
});

$('search').addEventListener('input', () => {
    if (/product=/.test(location.hash)) location.hash = f.league ? 'league=' + enc(f.league) : '';
    else render();
});

window.addEventListener('hashchange', readHash);

// გვერდის განახლებისას ტექსტი მაშინვე სწორი იყოს, პროდუქტების ჩატვირთვამდე
(function initFromHash() {
    const h = location.hash;
    if (/product=/.test(h)) {
        $('shop-view').hidden = true;
        $('product-view').hidden = false;
        return;
    }
    const dec = m => {
        try {
            return m ? decodeURIComponent(m[1]) : '';
        } catch (_) {
            return '';
        }
    };
    f.league = dec(h.match(/league=([^&]*)/));
    const clubHash = dec(h.match(/club=([^&]*)/));
    if (clubHash) clubHash.split(',').map(s => s.trim()).filter(Boolean).forEach(c => f.clubs.add(c));
    buildLeagueNav();
    if (f.league || f.clubs.size) {
        $('hero').classList.add('compact');
        $('hero-title').textContent = 'ᲐᲢᲐᲠᲔ ᲡᲘᲐᲛᲐᲧᲘᲗ';
    }
})();

$('search').placeholder = 'მოძებნე სასურველი პროდუქტი...';

/* header + toolbar სიმაღლე sticky-სთვის */
function syncHeaderH() {
    const nav = document.querySelector('.navbar');
    if (nav) document.documentElement.style.setProperty('--header-h', nav.offsetHeight + 'px');
    const tb = document.querySelector('#shop .toolbar');
    if (tb) document.documentElement.style.setProperty('--toolbar-h', tb.offsetHeight + 'px');
}
syncHeaderH();
window.addEventListener('resize', syncHeaderH);
window.addEventListener('load', syncHeaderH);
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncHeaderH);
}

/* ===== ფავორიტები ===== */
function toggleFav(id) {
    id = String(id);
    favs = isFav(id) ? favs.filter(x => x !== id) : [...favs, id];
    localStorage.setItem('eleven-fav-v1', JSON.stringify(favs));
    updateFavUI();
}

function updateFavUI() {
    const b = $('fav-count');
    b.textContent = favs.length;
    b.hidden = !favs.length;
    document.querySelectorAll('[data-fav]').forEach(el => {
        const on = isFav(el.dataset.fav);
        el.classList.toggle('on', on);
        el.setAttribute('aria-pressed', on);
    });
    renderFavList();
}

function ensureDrawer(id, title, body) {
    if ($(id)) return;
    const d = document.createElement('div');
    d.id = id;
    d.className = 'cart-modal';
    d.innerHTML = `<div class="cart-modal-content">
        <div class="cart-header"><h3>${title}</h3><button class="close-btn" data-drawer-close aria-label="დახურვა">&times;</button></div>
        ${body}</div>`;
    document.body.appendChild(d);
}

function renderFavList() {
    const ul = $('fav-list');
    if (!ul) return;
    const items = favs.map(id => products.find(p => String(p.id) === id)).filter(Boolean);
    ul.innerHTML = items.length
        ? items.map(p => `<li>
            <a class="fav-item" href="#product=${enc(p.id)}" data-drawer-close>
                <img src="${imgUrl(p.id)}" alt="" data-fallback data-pid="${esc(p.id)}">
                <span class="fav-info"><b>${esc(p.title)}</b><span>${priceHTML(p)}</span></span>
            </a>
            <button class="fav-x" data-fav-remove="${esc(p.id)}" aria-label="ფავორიტებიდან წაშლა">&times;</button>
        </li>`).join('')
        : '<li class="empty">ფავორიტები ცარიელია</li>';
}

function openFav() {
    ensureDrawer('fav-modal', 'ფავორიტები', '<ul id="fav-list" class="fav-list"></ul>');
    renderFavList();
    $('fav-modal').classList.add('open');
}

const closeDrawers = () => document.querySelectorAll('#fav-modal, #acc-modal').forEach(d => d.classList.remove('open'));

/* ===== პირადი კაბინეტი =====
   მონაცემები ინახება მხოლოდ ამ ბრაუზერში (localStorage); პაროლი ჰეშირებულია.
   რეალური ანგარიშებისთვის საჭიროა სერვერი. */
const ACC_KEY = 'eleven-acc-v1', SES_KEY = 'eleven-session-v1';
let accounts = readLS(ACC_KEY, []);
let session = readLS(SES_KEY, null);
const me = () => accounts.find(a => a.contact === session);

async function hashPw(pw, salt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function updateAccUI() {
    const a = me(), b = $('acc-btn');
    b.classList.toggle('in', !!a);
    b.innerHTML = a ? `<span class="acc-initial">${esc(a.name.trim().charAt(0).toUpperCase())}</span>` : USER_ICON;
}

function accView(mode) {
    ensureDrawer('acc-modal', 'პირადი კაბინეტი', '<div id="acc-body"></div>');
    const a = me(), box = $('acc-body');
    if (a) {
        box.innerHTML = `<div class="acc-profile">
            <div class="acc-avatar">${esc(a.name.trim().charAt(0).toUpperCase())}</div>
            <h4>${esc(a.name)}</h4><p>${esc(a.contact)}</p>
            <div class="acc-stats"><span><b>${favs.length}</b> ფავორიტი</span><span><b>${cart.reduce((s, l) => s + l.qty, 0)}</b> კალათაში</span></div>
            <button class="checkout-btn" data-acc-fav>ფავორიტების ნახვა</button>
            <p class="acc-switch"><button type="button" class="acc-link" data-acc-logout>გასვლა</button></p>
        </div>`;
    } else {
        const reg = mode !== 'login';
        box.innerHTML = `<form id="acc-form" data-mode="${reg ? 'register' : 'login'}" novalidate>
            ${reg ? '<input class="acc-in" name="name" type="text" placeholder="სახელი და გვარი" autocomplete="name" maxlength="40">' : ''}
            <input class="acc-in" name="contact" type="email" placeholder="ელ-ფოსტა" autocomplete="email">
            <input class="acc-in" name="pw" type="password" placeholder="პაროლი (მინ. 6 სიმბოლო)" autocomplete="${reg ? 'new-password' : 'current-password'}">
            <p class="acc-msg" id="acc-msg"></p>
            <button type="submit" class="checkout-btn">${reg ? 'კაბინეტის შექმნა' : 'შესვლა'}</button>
            <p class="acc-switch">${reg ? 'უკვე გაქვს კაბინეტი?' : 'ახალი ხარ?'} <button type="button" class="acc-link" data-acc-mode="${reg ? 'login' : 'register'}">${reg ? 'შესვლა' : 'რეგისტრაცია'}</button></p>
        </form>`;
    }
    $('acc-modal').classList.add('open');
}

document.addEventListener('submit', async e => {
    if (e.target.id !== 'acc-form') return;
    e.preventDefault();
    const fd = new FormData(e.target), mode = e.target.dataset.mode;
    const name = String(fd.get('name') || '').trim();
    const contact = String(fd.get('contact')).trim().toLowerCase();
    const pw = String(fd.get('pw'));
    const say = m => { $('acc-msg').textContent = m; };
    if (mode === 'register' && name.length < 2) return say('შეიყვანე სახელი');
    if (!/^\S+@\S+\.\S+$/.test(contact)) return say('შეიყვანე სწორი ელ-ფოსტა');
    if (pw.length < 6) return say('პაროლი მინიმუმ 6 სიმბოლოა');
    try {
        if (mode === 'register') {
            if (accounts.some(a => a.contact === contact)) return say('ამ ელ-ფოსტით კაბინეტი უკვე არსებობს');
            const salt = crypto.getRandomValues(new Uint32Array(4)).join('-');
            accounts.push({ name, contact, salt, hash: await hashPw(pw, salt) });
            localStorage.setItem(ACC_KEY, JSON.stringify(accounts));
        } else {
            const a = accounts.find(x => x.contact === contact);
            if (!a || a.hash !== (await hashPw(pw, a.salt))) return say('ელ-ფოსტა ან პაროლი არასწორია');
        }
        session = contact;
        localStorage.setItem(SES_KEY, JSON.stringify(session));
        updateAccUI();
        accView();
    } catch (_) {
        say('შეცდომა. სცადე თავიდან (საჭიროა https კავშირი)');
    }
});

document.addEventListener('click', e => {
    const c = e.target.closest && e.target.closest(
        '[data-fav],[data-fav-open],[data-fav-remove],[data-acc-open],[data-acc-mode],[data-acc-logout],[data-acc-fav],[data-drawer-close],[data-top],#fav-modal,#acc-modal'
    );
    if (!c) return;
    const d = c.dataset;
    if (d.fav !== undefined) { e.preventDefault(); toggleFav(d.fav); }
    else if (d.favRemove !== undefined) toggleFav(d.favRemove);
    else if (d.favOpen !== undefined) openFav();
    else if (d.accOpen !== undefined) accView();
    else if (d.accMode !== undefined) accView(d.accMode);
    else if (d.accLogout !== undefined) { session = null; localStorage.removeItem(SES_KEY); updateAccUI(); accView('login'); }
    else if (d.accFav !== undefined) { closeDrawers(); openFav(); }
    else if (d.drawerClose !== undefined) closeDrawers();
    else if (d.top !== undefined) window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (c.classList.contains('cart-modal') && e.target === c) closeDrawers();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers(); });

/* ===== ზემოთ ასვლის ისარი ===== */
const topBtn = $('to-top');
const syncTop = () => topBtn.classList.toggle('show', window.scrollY > 500);
window.addEventListener('scroll', syncTop, { passive: true });
syncTop();

updateAccUI();
updateFavUI();

fetchProducts();
