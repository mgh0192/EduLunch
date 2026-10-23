function escapeHtml(valor) {
    return String(valor).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function formatoCOP(valor) {
    return "$" + Number(valor || 0).toLocaleString("es-CO");
}

function nombreMetodoPago(metodo) {
    // Hoy solo se paga por transferencia a Bancolombia
    const m = String(metodo || "").toLowerCase();
    if (!m || m === "transferencia") return "Bancolombia";
    return metodo;
}

function formatoFechaHora(texto) {
    // Llega como "2026-09-27 14:35:10" (hora de Colombia)
    const m = String(texto || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (!m) return texto || "";
    const [, a, mes, d, h, min] = m;
    let resultado = `${d}/${mes}/${a}`;
    if (h !== undefined) {
        const hora = Number(h);
        const sufijo = hora >= 12 ? "p. m." : "a. m.";
        const hora12 = hora % 12 === 0 ? 12 : hora % 12;
        resultado += ` - ${hora12}:${min} ${sufijo}`;
    }
    return resultado;
}

function esPedidoPendiente(pedido) {
    return /pendiente/i.test(pedido.estadoPago || "");
}

function renderPedidos(pedidos) {
    const contenedor = document.getElementById("listaPedidos");

    if (!pedidos.length) {
        contenedor.innerHTML = `
            <div class="pedido-vacio">
                Todavía no has hecho ningún pedido 🛒
                <br>
                <a href="menu.html">Ir al menú</a>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = pedidos.map(pedido => {
        const pendiente = esPedidoPendiente(pedido);

        const items = (pedido.productos || []).map(item => `
            <div class="item-pedido">
                <div class="item-pedido-imagen">
                    ${item.imagen
                        ? `<img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.nombre)}" onerror="this.style.display='none'">`
                        : `<span class="sin-imagen"><i class="fa-solid fa-utensils"></i></span>`
                    }
                </div>
                <div class="item-pedido-info">
                    <h3>${escapeHtml(item.nombre)}</h3>
                    <small>Cantidad: ${Number(item.cantidad)}</small>
                </div>
                <div class="item-pedido-precio">
                    ${formatoCOP(Number(item.precio) * Number(item.cantidad))}
                </div>
            </div>
        `).join("");

        return `
            <article class="tarjeta-pedido">
                <div class="tarjeta-pedido-header">
                    <div>
                        <div class="numero">${pedido.turno ? "Turno " + Number(pedido.turno) : "Pedido"}</div>
                        <div class="fecha">${escapeHtml(formatoFechaHora(pedido.fecha))}</div>
                    </div>
                    <span class="etiqueta-estado ${pendiente ? "pendiente" : "confirmado"}">
                        ${escapeHtml(pedido.estadoPago || "—")}
                    </span>
                </div>
                <div class="tarjeta-pedido-productos">
                    ${items}
                </div>
                <div class="tarjeta-pedido-footer">
                    <span class="metodo">Pago: ${escapeHtml(nombreMetodoPago(pedido.metodoPago))}</span>
                    <span class="total">Total: ${formatoCOP(pedido.total)}</span>
                </div>
            </article>
        `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await usuarioActual();
    if (!usuario) { window.location.replace("login.html"); return; }

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("nombreNavbar", usuario.nombre);

    const estadoCarga = document.getElementById("estadoCarga");

    try {
        const resp = await fetch("api/pedidos.php");
        if (!resp.ok) throw new Error("No se pudo cargar el historial.");
        const datos = await resp.json();
        estadoCarga.hidden = true;
        renderPedidos(datos.pedidos || []);
    } catch {
        estadoCarga.textContent = "No se pudieron cargar tus pedidos. Intenta de nuevo más tarde.";
    }
});