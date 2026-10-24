"use strict";
/* ===== Datos simulados (sin base de datos real) ===== */
const svgImg = (t, bg) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="${bg}"/><text x="150" y="115" font-size="64" text-anchor="middle">${t}</text></svg>`);

let users = [
  { nick: "ana", pass: "1234", name: "Ana", last: "Pérez", mail: "ana@correo.com", roles: ["comprador", "vendedor"] },
  { nick: "luis", pass: "1234", name: "Luis", last: "Rojas", mail: "luis@correo.com", roles: ["comprador"] },
  { nick: "root", pass: "admin", name: "Admin", last: "BinaryShop", mail: "admin@binaryshop.com", roles: ["admin"] }
];
let products = [
  { id: 1, name: "Laptop 15.6\" 16GB RAM", price: 649.99, cat: "Computadoras", img: "imagenes/laptop.svg", fb: "", seller: "ana" },
  { id: 2, name: "Teléfono 128GB", price: 399, cat: "Teléfonos", img: "imagenes/telefono.svg", fb: "", seller: "ana" },
  { id: 3, name: "Teclado mecánico", price: 79.99, cat: "Computadoras", img: "imagenes/teclado.svg", fb: "", seller: "ana" },
  { id: 4, name: "Mouse inalámbrico", price: 24.9, cat: "Computadoras", img: "imagenes/mouse.svg", fb: "", seller: "ana" },
  { id: 5, name: "Monitor 24\" Full HD", price: 189, cat: "Computadoras", img: "imagenes/monitor.svg", fb: "", seller: "ana" },
  { id: 6, name: "Audífonos inalámbricos", price: 45.5, cat: "Audio", img: "imagenes/audifonos.svg", fb: "", seller: "ana" },
  { id: 7, name: "Vidrio templado para teléfono", price: 6.5, cat: "Teléfonos", img: "imagenes/vidrio.svg", fb: "", seller: "ana" },
  { id: 8, name: "Cargador rápido 30W", price: 15.5, cat: "Teléfonos", img: "imagenes/cargador.svg", fb: "", seller: "ana" },
  { id: 9, name: "Power bank 20000 mAh", price: 29.99, cat: "Teléfonos", img: "imagenes/powerbank.svg", fb: "", seller: "ana" },
  { id: 10, name: "Smartwatch deportivo", price: 99, cat: "Accesorios", img: "imagenes/smartwatch.svg", fb: "", seller: "ana" },
  { id: 11, name: "Cámara web HD", price: 39, cat: "Computadoras", img: "imagenes/camara.svg", fb: "", seller: "ana" },
  { id: 12, name: "Mochila para laptop", price: 32, cat: "Accesorios", img: "imagenes/mochila.svg", fb: "", seller: "ana" }
];
let sales = [], nextId = 13, session = null, cart = [], pending = null, payFromCart = false;

/* ===== Utilidades ===== */
const $ = id => document.getElementById(id);
const money = n => "$" + n.toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let tt;
function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2400); }

const views = ["login", "register", "recover", "catalog", "seller", "admin", "checkout"];
function show(v) {
  views.forEach(x => $(x).hidden = x !== v);
  document.querySelectorAll("nav [data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  $("cartDrop").hidden = true;
  if (v === "catalog") renderCatalog();
  if (v === "seller") renderSales();
  if (v === "admin") renderAdmin();
  window.scrollTo(0, 0);
}
const cardOk = s => /^\d{16}$/.test(s);
const expOk = s => { const m = /^(\d{2})\/(\d{2})$/.exec(s); return !!m && +m[1] >= 1 && +m[1] <= 12; };

/* ===== Cambiar entre Iniciar sesión y Registrarse ===== */
$("toReg").onclick = () => show("register");
$("toLogin").onclick = () => show("login");

/* ===== Iniciar sesión ===== */
$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const nick = $("lNick").value.trim(), pass = $("lPass").value, role = $("lRole").value;
  if (!nick || !pass) { $("lErr").textContent = "Escribe tu nickname y tu contraseña."; return; }
  const u = users.find(x => x.nick === nick && x.pass === pass);
  if (!u) { $("lErr").textContent = "Nickname o contraseña incorrectos."; return; }
  if (!u.roles.includes(role)) { $("lErr").textContent = "Esta cuenta no tiene el rol “" + role + "”."; return; }
  $("lErr").textContent = "";
  session = { nick: u.nick, role }; cart = []; filtro = "Todos"; $("search").value = "";
  $("nav").hidden = false;
  $("who").textContent = u.nick + " (" + role + ")";
  $("navSeller").hidden = role !== "vendedor";
  $("navAdmin").hidden = role !== "admin";
  $("cartWrap").hidden = role !== "comprador";
  updateCart();
  e.target.reset();
  show(role === "admin" ? "admin" : role === "vendedor" ? "seller" : "catalog");
});

/* ===== Registrarse ===== */
$("regForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = id => $(id).value.trim(), err = m => { $("rErr").textContent = m; };
  const nick = v("rNick"), pass = $("rPass").value, roles = [];
  if ($("rBuyer").checked) roles.push("comprador");
  if ($("rSeller").checked) roles.push("vendedor");

  if (!v("rName") || !v("rLast") || !v("rMail") || !v("rBirth") || !v("rAddr") || !nick || !pass || !v("rHolder") || !v("rCard") || !v("rExp") || !v("rCvv"))
    return err("Completa todos los campos.");
  if (!/^\S+@\S+\.\S+$/.test(v("rMail"))) return err("El correo no es válido.");
  const b = new Date(v("rBirth")), hoy = new Date();
  let edad = hoy.getFullYear() - b.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), b.getMonth(), b.getDate())) edad--;
  if (isNaN(edad) || edad < 18 || edad > 120) return err("Debes ser mayor de 18 años.");
  if (pass.length < 4) return err("La contraseña debe tener al menos 4 caracteres.");
  if (!roles.length) return err("Elige al menos un rol (comprar o vender).");
  if (!cardOk(v("rCard"))) return err("La tarjeta debe tener 16 dígitos, sin espacios.");
  if (!expOk(v("rExp"))) return err("El vencimiento debe tener el formato MM/AA, por ejemplo 08/28.");
  if (!/^\d{3}$/.test(v("rCvv"))) return err("El CVV debe tener 3 dígitos.");

  const ex = users.find(u => u.nick === nick);
  if (ex) {
    if (ex.pass !== pass) return err("Ese nickname ya existe. Para habilitar la venta usa su contraseña.");
    roles.forEach(r => { if (!ex.roles.includes(r)) ex.roles.push(r); });
    toast("Roles actualizados para " + nick);
  } else {
    users.push({ nick, pass, name: v("rName"), last: v("rLast"), mail: v("rMail"), birth: v("rBirth"), addr: v("rAddr"), card: v("rCard"), roles });
    toast("Cuenta creada. Ya puedes iniciar sesión.");
  }
  err(""); e.target.reset(); $("rBuyer").checked = true;
  $("lNick").value = nick;
  show("login");
});

/* ===== Recuperar contraseña (simulado, no se envía ningún correo real) ===== */
let recovery = null;
const maskMail = m => m.replace(/^(.{2}).*(@.*)$/, "$1***$2");
function backToLogin() { recovery = null; $("recForm").reset(); $("resetForm").reset(); show("login"); }
$("toRecover").onclick = () => { recovery = null; $("recForm").hidden = false; $("resetForm").hidden = true; $("vErr").textContent = ""; show("recover"); };
$("recBack").onclick = backToLogin;
$("recBack2").onclick = backToLogin;

$("recForm").addEventListener("submit", e => {
  e.preventDefault();
  const nick = $("vNick").value.trim(), mail = $("vMail").value.trim().toLowerCase();
  if (!nick || !mail) { $("vErr").textContent = "Escribe tu nickname y tu correo."; return; }
  const u = users.find(x => x.nick === nick && x.mail && x.mail.toLowerCase() === mail);
  if (!u) { $("vErr").textContent = "No encontramos una cuenta con ese nickname y correo."; return; }
  recovery = { nick: u.nick, code: String(Math.floor(100000 + Math.random() * 900000)), tries: 0 };
  $("vErr").textContent = "";
  $("codeNote").textContent = "Código enviado a " + maskMail(u.mail) + ". Como esta página es una simulación y no envía correos reales, tu código es: " + recovery.code;
  $("recForm").hidden = true; $("resetForm").hidden = false;
});

$("resetForm").addEventListener("submit", e => {
  e.preventDefault();
  const err = m => { $("wErr").textContent = m; };
  const code = $("vCode").value.trim(), p1 = $("vPass").value, p2 = $("vPass2").value;
  if (!recovery) return backToLogin();
  if (code !== recovery.code) {
    recovery.tries++;
    if (recovery.tries >= 3) { backToLogin(); toast("Demasiados intentos. Pide un código nuevo."); return; }
    return err("El código no es correcto. Te quedan " + (3 - recovery.tries) + " intento(s).");
  }
  if (p1.length < 4) return err("La contraseña debe tener al menos 4 caracteres.");
  if (p1 !== p2) return err("Las contraseñas no coinciden.");
  users.find(u => u.nick === recovery.nick).pass = p1;
  const nick = recovery.nick;
  err(""); backToLogin();
  $("lNick").value = nick;
  toast("Contraseña actualizada. Ya puedes iniciar sesión.");
});

$("logout").onclick = () => { session = null; cart = []; $("nav").hidden = true; $("cartWrap").hidden = true; show("login"); };
document.querySelectorAll("nav [data-view]").forEach(b => b.onclick = () => show(b.dataset.view));

/* ===== Catálogo y carrito ===== */
const norm = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const CATS = ["Computadoras", "Teléfonos", "Audio", "Accesorios"];
let filtro = "Todos";
const favs = {};                       // { nickname: [ids de productos] }
const myFavs = () => favs[session.nick] || (favs[session.nick] = []);
function purge(id) { Object.keys(favs).forEach(n => favs[n] = favs[n].filter(x => x !== id)); cart = cart.filter(c => c.id !== id); updateCart(); }

function renderCatalog() {
  const buyer = session && session.role === "comprador";
  if (!buyer && filtro === "Favoritos") filtro = "Todos";
  const mine = buyer ? myFavs() : [];
  const names = ["Todos", ...CATS].concat(buyer ? ["Favoritos"] : []);
  $("chips").innerHTML = names.map(c => `<button type="button" class="chip${c === filtro ? " on" : ""}" data-cat="${c}">${c === "Favoritos" ? "♥ Favoritos (" + mine.length + ")" : c}</button>`).join("");
  const q = norm($("search").value.trim());
  const list = products.filter(p =>
    (filtro === "Todos" || (filtro === "Favoritos" ? mine.includes(p.id) : p.cat === filtro)) && norm(p.name).includes(q));
  const empty = !products.length ? "No hay productos publicados."
    : filtro === "Favoritos" && !mine.length ? "Aún no tienes favoritos. Toca el ♡ de un producto para guardarlo."
    : "No encontramos productos con ese filtro.";
  $("grid").innerHTML = list.length ? list.map(p => `
    <article class="card"><img src="${p.img}" alt="${esc(p.name)}" data-fb="${esc(p.fb || p.img)}" onerror="this.onerror=null;this.src=this.dataset.fb">
      ${buyer ? `<button type="button" class="fav${mine.includes(p.id) ? " on" : ""}" data-fav="${p.id}" aria-label="Favorito">${mine.includes(p.id) ? "♥" : "♡"}</button>` : ""}
      <div><span>${esc(p.name)}</span><small>${esc(p.cat || "Otros")}</small><b>${money(p.price)}</b>
      ${cart.filter(c => c.id === p.id).length ? `<small class="inc">✓ En tu carrito: ${cart.filter(c => c.id === p.id).length}</small>` : ""}
      ${buyer ? `<div class="row"><button data-add="${p.id}">Añadir al carrito</button><button class="buy" data-buy="${p.id}">Comprar de inmediato</button></div>` : `<small>Entra como comprador para comprar.</small>`}
      </div></article>`).join("") : "<p>" + empty + "</p>";
}
$("search").addEventListener("input", renderCatalog);
$("chips").onclick = e => { if (e.target.dataset.cat) { filtro = e.target.dataset.cat; renderCatalog(); } };
$("grid").onclick = e => {
  const add = e.target.dataset.add, buy = e.target.dataset.buy, fav = e.target.dataset.fav;
  if (add) { cart.push(products.find(p => p.id == add)); updateCart(); renderCatalog(); toast("Añadido al carrito"); }
  if (buy) startCheckout([products.find(p => p.id == buy)], false);
  if (fav) {
    const id = Number(fav), l = myFavs(), i = l.indexOf(id);
    if (i >= 0) { l.splice(i, 1); toast("Quitado de favoritos"); } else { l.push(id); toast("Guardado en favoritos"); }
    renderCatalog();
  }
};
/* Agrupa el carrito por producto: [{p, n}] */
function groupCart(list) {
  const g = [];
  list.forEach(p => { const x = g.find(y => y.p.id === p.id); if (x) x.n++; else g.push({ p, n: 1 }); });
  return g;
}
function updateCart() {
  $("cartCount").textContent = cart.length;
  const total = cart.reduce((s, p) => s + p.price, 0);
  $("cartDrop").innerHTML = cart.length
    ? `<h3>Productos seleccionados</h3>` + groupCart(cart).map(g =>
        `<div class="item"><span class="names"><span>${esc(g.p.name)}</span><small>${money(g.p.price)} c/u · cantidad ${g.n}</small></span>
         <span class="btns"><b>${money(g.p.price * g.n)}</b>
         <button class="q" data-less="${g.p.id}" aria-label="Quitar uno">−</button>
         <button class="q" data-more="${g.p.id}" aria-label="Añadir uno">+</button>
         <button data-rm="${g.p.id}" aria-label="Quitar del carrito">✕</button></span></div>`).join("")
      + `<div class="total"><span>Total (${cart.length})</span><span>${money(total)}</span></div><button class="go" id="goPay">Pagar carrito</button>`
    : "<p>Tu carrito está vacío.</p>";
}
$("cartBtn").onclick = () => $("cartDrop").hidden = !$("cartDrop").hidden;
$("cartDrop").onclick = e => {
  const d = e.target.dataset;
  if (d.more) cart.push(products.find(p => p.id == d.more));
  if (d.less) { const i = cart.map(c => c.id).lastIndexOf(Number(d.less)); if (i >= 0) cart.splice(i, 1); }
  if (d.rm) cart = cart.filter(c => c.id !== Number(d.rm));
  if (d.more || d.less || d.rm) { updateCart(); if (!$("catalog").hidden) renderCatalog(); }
  if (e.target.id === "goPay") startCheckout(cart.slice(), true);
};
/* Cierra el desplegable al tocar fuera de él */
document.addEventListener("click", e => { if (!e.composedPath().includes($("cartWrap"))) $("cartDrop").hidden = true; });

/* ===== Pago ===== */
/* CORRECCIÓN 3: payFromCart indica si se paga el carrito; así "Comprar de inmediato" ya no vacía el carrito */
function startCheckout(items, fromCart) {
  if (!items.length) return;
  pending = items; payFromCart = !!fromCart;
  $("payTotal").textContent = items.length + " artículo(s) · Total " + money(items.reduce((s, p) => s + p.price, 0));
  $("payItems").innerHTML = groupCart(items).map(g => `<li><span>${esc(g.p.name)} × ${g.n}</span><b>${money(g.p.price * g.n)}</b></li>`).join("");
  show("checkout");
}
$("payForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!$("cName").value.trim() || !cardOk($("cNum").value) || !expOk($("cExp").value) || !/^\d{3}$/.test($("cCvv").value)) {
    $("cErr").textContent = "Revisa los datos: tarjeta de 16 dígitos, vencimiento MM/AA y CVV de 3 dígitos."; return;
  }
  $("cErr").textContent = "";
  pending.forEach(p => sales.push({ product: p.name, price: p.price, buyer: session.nick, seller: p.seller }));
  if (payFromCart) { cart = cart.filter(c => !pending.includes(c)); updateCart(); }
  pending = null; payFromCart = false; e.target.reset();
  toast("¡Pago aprobado! Gracias por tu compra."); show("catalog");
});
$("payCancel").onclick = () => show("catalog");

/* ===== Vendedor ===== */
$("prodForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("pName").value.trim(), price = parseFloat($("pPrice").value), file = $("pImg").files[0];
  if (!name || !(price > 0) || !file) { $("pErr").textContent = "Escribe el nombre, un precio mayor que 0 y elige una imagen."; return; }
  $("pErr").textContent = "";
  const r = new FileReader();
  r.onload = () => {
    products.push({ id: nextId++, name, price, cat: $("pCat").value, img: r.result, seller: session.nick });
    e.target.reset(); toast("Producto publicado"); renderSales();
  };
  r.readAsDataURL(file);
});
function renderSales() {
  const mineP = products.filter(p => p.seller === session.nick);
  $("myProds").innerHTML = mineP.length ? mineP.map(p =>
    `<li><span class="info"><span>${esc(p.name)}</span><small>${esc(p.cat || "Otros")} · ${money(p.price)}</small></span><button data-retire="${p.id}">Retirar</button></li>`).join("")
    : "<li>No tienes publicaciones activas.</li>";
  const mine = sales.filter(s => s.seller === session.nick);
  $("sales").innerHTML = mine.length ? mine.map(s => `<li><span>${esc(s.product)} → ${esc(s.buyer)}</span><b>${money(s.price)}</b></li>`).join("") : "<li>Aún no tienes ventas.</li>";
}
$("myProds").onclick = e => {
  if (!e.target.dataset.retire) return;
  const id = Number(e.target.dataset.retire), p = products.find(x => x.id === id);
  if (!p || !session || session.role !== "vendedor" || p.seller !== session.nick) return;   // solo el vendedor dueño
  if (!confirm("¿Retirar la publicación “" + p.name + "”?")) return;
  products = products.filter(x => x.id !== id); purge(id);
  toast("Publicación retirada"); renderSales();
};

/* ===== Administrador ===== */
function renderAdmin() {
  $("userList").innerHTML = users.filter(u => !u.roles.includes("admin")).map(u =>
    `<li><span>${esc(u.nick)} — ${esc(u.name)} ${esc(u.last)} (${u.roles.join(", ")})</span><button data-user="${esc(u.nick)}">Eliminar cuenta</button></li>`).join("") || "<li>Sin usuarios.</li>";
  $("prodList").innerHTML = products.map(p =>
    `<li><span>${esc(p.name)} — ${money(p.price)} (${esc(p.seller)})</span><button data-prod="${p.id}">Quitar</button></li>`).join("") || "<li>Sin publicaciones.</li>";
}
$("admin").onclick = e => {
  if (e.target.dataset.user) {
    const n = e.target.dataset.user;
    if (!confirm("¿Eliminar la cuenta " + n + " y sus productos?")) return;
    products.filter(p => p.seller === n).forEach(p => purge(p.id));
    users = users.filter(u => u.nick !== n); products = products.filter(p => p.seller !== n);
    toast("Cuenta eliminada");
  }
  if (e.target.dataset.prod) { purge(Number(e.target.dataset.prod)); products = products.filter(p => p.id != e.target.dataset.prod); toast("Producto removido"); }
  renderAdmin();
};

show("login");