// =========================================================
// admin.js — Panel de administrador (todo se guarda en la base de datos)
// =========================================================

const CATEGORIAS = { 1: "Fritos", 2: "Snacks", 3: "Bebidas", 4: "Frutas y Helados" };
let productos = [], usuarios = [], pedidos = [];
let filtroPedidos = "pendiente";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cop = v => "$" + Number(v || 0).toLocaleString("es-CO");

function aviso(texto, error = false) {
    const a = $("aviso");
    a.textContent = texto; a.className = "aviso" + (error ? " error" : ""); a.hidden = false;
    clearTimeout(aviso._t); aviso._t = setTimeout(() => a.hidden = true, 2800);
}

async function api(url, opciones) {
    const resp = await fetch(url, opciones);
    const datos = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(datos.error || "Ocurrió un error.");
    return datos;
}

function enviarProducto(datos) {
    const fd = new FormData();
    Object.entries(datos).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v); });
    return api("api/productos.php", { method: "POST", body: fd });
}

document.addEventListener("DOMContentLoaded", async () => {
    // Solo el administrador entra (auth.js también lo valida; el servidor es el que manda)
    const u = await usuarioActual();
    if (!u || u.rol !== "administrador") { window.location.replace("login.html"); return; }

    $("btnSalir").addEventListener("click", () => { if (confirm("¿Cerrar sesión?")) cerrarSesion(); });

    document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(x => x.classList.toggle("activa", x === b));
        document.querySelectorAll(".panel").forEach(p => p.classList.toggle("activa", p.id === "tab-" + b.dataset.tab));
        if (b.dataset.tab === "usuarios") cargarUsuarios();
        if (b.dataset.tab === "pedidos") cargarPedidos();
    }));

    document.querySelectorAll("#filtrosPedidos .chip").forEach(c => c.addEventListener("click", () => {
        document.querySelectorAll("#filtrosPedidos .chip").forEach(x => x.classList.toggle("activa", x === c));
        filtroPedidos = c.dataset.filtro; pintarPedidos();
    }));

    $("buscarUsuario").addEventListener("input", pintarUsuarios);

    // ---- Agregar producto ----
    $("nuevaCategoria").innerHTML = Object.entries(CATEGORIAS).map(([id, n]) => `<option value="${id}">${n}</option>`).join("");
    $("btnAbrirAgregar").addEventListener("click", () => { $("formAgregar").hidden = false; $("btnAbrirAgregar").hidden = true; $("nuevoNombre").focus(); });
    $("btnCancelarAgregar").addEventListener("click", cerrarFormAgregar);
    $("formAgregar").addEventListener("submit", async e => {
        e.preventDefault();
        try {
            await enviarProducto({
                accion: "crear", categoria: $("nuevaCategoria").value, nombre: $("nuevoNombre").value.trim(),
                precio: $("nuevoPrecio").value, descripcion: $("nuevaDescripcion").value.trim(),
                imagen: $("nuevaImagen").files[0] || null
            });
            aviso("Producto agregado ✔"); cerrarFormAgregar(); await cargarProductos();
        } catch (err) { aviso(err.message, true); }
    });

    await cargarProductos();
    await cargarPedidos();                       // para la burbuja de pendientes
    setInterval(cargarPedidos, 15000);           // pedidos nuevos aparecen solos
});

function cerrarFormAgregar() { $("formAgregar").reset(); $("formAgregar").hidden = true; $("btnAbrirAgregar").hidden = false; }

// =========================================================
// PRODUCTOS
// =========================================================
async function cargarProductos() {
    try { productos = (await api("api/productos.php", { cache: "no-store" })).productos; pintarProductos(); }
    catch (e) { $("listaProductos").innerHTML = `<p class="vacio">${esc(e.message)}</p>`; }
}

function pintarProductos() {
    $("listaProductos").innerHTML = Object.entries(CATEGORIAS).map(([cat, nombre]) => {
        const lista = productos.filter(p => p.categoria === Number(cat));
        return `<div class="categoria-bloque">
            <h2>${nombre} <span>${lista.length}</span></h2>
            <div class="grid">${lista.map(tarjetaProducto).join("") || '<p class="vacio">Sin productos en esta categoría.</p>'}</div>
        </div>`;
    }).join("");
}

function tarjetaProducto(p) {
    return `<div class="tarjeta ${p.agotado ? "agotada" : ""}" data-id="${p.id}" data-cat="${p.categoria}">
        <div class="foto">
            ${p.imagen ? `<img src="${esc(p.imagen)}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-image sin-foto"></i>'}
            ${p.agotado ? '<span class="etq-agotado">Agotado</span>' : ""}
            <label class="cambiar"><i class="fa-solid fa-camera"></i> Cambiar imagen<input type="file" accept="image/*" onchange="previsualizar(this)"></label>
        </div>
        <input type="text" class="nombre" value="${esc(p.nombre)}" maxlength="100" oninput="marcarSucio(this)">
        <textarea rows="2" maxlength="255" placeholder="Descripción" oninput="marcarSucio(this)">${esc(p.descripcion)}</textarea>
        <div class="fila-precio">$ <input type="number" class="precio" min="100" step="100" value="${p.precio}" oninput="marcarSucio(this)"></div>
        <div class="pie-tarjeta">
            <label class="interruptor" title="Si lo apagas, a los estudiantes les sale como agotado">
                <input type="checkbox" ${p.agotado ? "" : "checked"} onchange="cambiarDisponibilidad(${p.id}, this.checked)">
                <span class="pista"></span><span>${p.agotado ? "Agotado" : "Disponible"}</span>
            </label>
            <button class="btn-borrar" type="button" title="Eliminar" onclick="eliminarProducto(${p.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
        <button class="btn-guardar" type="button" onclick="guardarProducto(${p.id})"><i class="fa-solid fa-floppy-disk"></i> Guardar cambios</button>
    </div>`;
}

function marcarSucio(el) { el.closest(".tarjeta").querySelector(".btn-guardar").classList.add("sucio"); }

function previsualizar(input) {
    const t = input.closest(".tarjeta"), f = input.files[0];
    if (!f) return;
    const foto = t.querySelector(".foto");
    let img = foto.querySelector("img");
    if (!img) { img = document.createElement("img"); foto.prepend(img); foto.querySelector(".sin-foto")?.remove(); }
    img.src = URL.createObjectURL(f);
    marcarSucio(input);
}

async function guardarProducto(id) {
    const t = document.querySelector(`.tarjeta[data-id="${id}"]`);
    try {
        await enviarProducto({
            accion: "actualizar", id, categoria: t.dataset.cat,
            nombre: t.querySelector(".nombre").value.trim(), descripcion: t.querySelector("textarea").value.trim(),
            precio: t.querySelector(".precio").value, imagen: t.querySelector('input[type=file]').files[0] || null
        });
        aviso("Cambios guardados ✔"); await cargarProductos();
    } catch (e) { aviso(e.message, true); }
}

async function cambiarDisponibilidad(id, disponible) {
    try { await enviarProducto({ accion: "estado", id, agotado: disponible ? "0" : "1" }); aviso(disponible ? "Marcado como disponible" : "Marcado como agotado"); await cargarProductos(); }
    catch (e) { aviso(e.message, true); await cargarProductos(); }
}

async function eliminarProducto(id) {
    const p = productos.find(x => x.id === id);
    if (!confirm(`¿Eliminar "${p?.nombre}"? Esta acción no se puede deshacer.`)) return;
    try { await enviarProducto({ accion: "eliminar", id }); aviso("Producto eliminado"); await cargarProductos(); }
    catch (e) { aviso(e.message, true); }
}

// =========================================================
// USUARIOS
// =========================================================
async function cargarUsuarios() {
    try { usuarios = (await api("api/usuarios.php", { cache: "no-store" })).usuarios; pintarUsuarios(); }
    catch (e) { $("cuerpoUsuarios").innerHTML = ""; $("usuariosVacio").hidden = false; $("usuariosVacio").textContent = e.message; }
}

function pintarUsuarios() {
    const q = $("buscarUsuario").value.trim().toLowerCase();
    const lista = usuarios.filter(u => !q || `${u.nombre} ${u.apellidos} ${u.correo}`.toLowerCase().includes(q));
    $("conteoUsuarios").textContent = usuarios.length;
    $("usuariosVacio").hidden = lista.length > 0;
    $("usuariosVacio").textContent = "No hay usuarios.";
    $("cuerpoUsuarios").innerHTML = lista.map(u => `<tr>
        <td>${esc(u.nombre)} ${esc(u.apellidos)}</td>
        <td>${esc(u.correo)}</td>
        <td><span class="etq ${/personal/i.test(u.tipo) ? "personal" : "estudiante"}">${esc(u.tipo)}</span></td>
        <td>${esc(u.grado || "—")}</td>
        <td>${u.pedidos}</td>
        <td>${esc((u.registro || "").slice(0, 10))}</td></tr>`).join("");
}

// =========================================================
// PEDIDOS
// =========================================================
const esListo = p => /listo/i.test(p.estadoPago || "");

async function cargarPedidos() {
    try { pedidos = (await api("api/pedidos.php?todos=1", { cache: "no-store" })).pedidos || []; }
    catch { return; }
    const pend = pedidos.filter(p => !esListo(p)).length;
    $("burbujaPedidos").hidden = pend === 0; $("burbujaPedidos").textContent = pend;
    pintarPedidos();
}

function pintarPedidos() {
    let lista = pedidos;
    if (filtroPedidos === "pendiente") lista = pedidos.filter(p => !esListo(p));
    else if (filtroPedidos === "listo") lista = pedidos.filter(esListo);
    if (filtroPedidos === "pendiente") lista = [...lista].reverse(); // el más antiguo primero: así se atienden en orden

    $("listaPedidos").innerHTML = lista.length ? lista.map(p => `
        <div class="pedido">
            <div class="turno"><small>TURNO</small><strong>${p.turno ?? "—"}</strong></div>
            <div class="datos">
                <h4>${esc(p.clienteNombre || "Cliente")} <span class="etq-estado ${esListo(p) ? "listo" : "pendiente"}">${esListo(p) ? "Listo" : "Por preparar"}</span></h4>
                <p>${esc(p.clienteCorreo || "")} · ${esc(p.fecha)} · ${esc(p.numero)} · ${esc(p.metodoPago)}</p>
                <ul>${(p.productos || []).map(i => `<li><strong>${i.cantidad}×</strong> ${esc(i.nombre)}</li>`).join("")}</ul>
                ${p.comprobante ? `<a class="ver-comprobante" href="${p.comprobante}" target="_blank" rel="noopener"><i class="fa-solid fa-image"></i> Ver comprobante de pago</a>` : ""}
            </div>
            <div class="lado">
                <span class="total">${cop(p.total)}</span>
                ${esListo(p) ? "" : `<button class="btn-listo" type="button" onclick="marcarListo(${p.id})"><i class="fa-solid fa-check"></i> Marcar como listo</button>`}
            </div>
        </div>`).join("")
        : `<p class="vacio">${filtroPedidos === "pendiente" ? "No hay pedidos pendientes 🎉" : "No hay pedidos en este filtro."}</p>`;
}

async function marcarListo(id) {
    try {
        await api("api/pedidos.php", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estadoPago: "Listo" }) });
        aviso("Pedido marcado como listo ✔"); await cargarPedidos();
    } catch (e) { aviso(e.message, true); }
}