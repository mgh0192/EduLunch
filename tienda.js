// ---------------------------------------------------------
// Productos agotados: inyecta un pequeño estilo una sola vez
// y marca visualmente las tarjetas que el admin desactivó.
// ---------------------------------------------------------
(function inyectarEstiloAgotado() {
    if (document.getElementById("estiloAgotadoEduLunch")) return;
    const estilo = document.createElement("style");
    estilo.id = "estiloAgotadoEduLunch";
    estilo.textContent = `
        .producto--agotado{opacity:.5;filter:grayscale(65%)}
        .producto--agotado button{cursor:not-allowed!important;background:#e3e3e3!important;color:#8a8a8a!important}
        .imagen-producto{position:relative}
        .etiqueta-agotado{position:absolute;top:8px;left:8px;background:#c0392b;color:#fff;font-size:.7rem;
            font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.3px;z-index:2}
    `;
    document.head.appendChild(estilo);
})();

function marcarTarjetaAgotada(card, boton, agotado) {
    if (!card) return;
    card.classList.toggle("producto--agotado", agotado);
    if (boton) boton.disabled = agotado;
    let etiqueta = card.querySelector(".etiqueta-agotado");
    if (agotado) {
        if (!etiqueta) {
            etiqueta = document.createElement("span");
            etiqueta.className = "etiqueta-agotado";
            etiqueta.textContent = "Agotado";
            (card.querySelector(".imagen-producto") || card).appendChild(etiqueta);
        }
    } else if (etiqueta) {
        etiqueta.remove();
    }
}

// =========================================================
// CARRITO (guardado en la base de datos: api/carrito.php)
// =========================================================

// Copia en memoria del último carrito que devolvió el servidor.
let carritoCache = [];

async function apiCarrito(metodo = "GET", cuerpo = null, consulta = "") {
    const opciones = { method: metodo, cache: "no-store" };
    if (cuerpo) {
        opciones.headers = { "Content-Type": "application/json" };
        opciones.body = JSON.stringify(cuerpo);
    }
    const resp = await fetch("api/carrito.php" + consulta, opciones);
    const datos = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(datos.error || "No se pudo actualizar el carrito.");
    carritoCache = datos.carrito || [];
    actualizarContadores();
    return carritoCache;
}

// Devuelve lo último que trajo el servidor (síncrona).
function leerCarrito() { return carritoCache; }

// Pide el carrito al servidor.
async function cargarCarrito() {
    try {
        return await apiCarrito("GET");
    } catch {
        carritoCache = [];
        actualizarContadores();
        return carritoCache;
    }
}

function actualizarContadores() {
    const total = carritoCache.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    document.querySelectorAll(".contador-carrito").forEach(el => el.textContent = total);
}

async function agregarProducto(id, nombre) {
    try {
        await apiCarrito("POST", id ? { id: Number(id) } : { nombre });
        renderCarrito();
        alert(nombre + " fue agregado a tu carrito 🛒");
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarProducto(id) {
    try {
        await apiCarrito("DELETE", null, "?id=" + Number(id));
        renderCarrito();
    } catch (error) {
        alert(error.message);
    }
}

async function cambiarCantidad(id, cambio) {
    const item = carritoCache.find(x => Number(x.id) === Number(id));
    if (!item) return;
    try {
        await apiCarrito("PATCH", { id: Number(id), cantidad: Number(item.cantidad) + cambio });
        renderCarrito();
    } catch (error) {
        alert(error.message);
    }
}

// =========================================================
// COMPROBANTE DE PAGO
// ---------------------------------------------------------
// Ahora el comprobante se SUBE desde la página (ver comprobante.js,
// que define comprobanteFueEnviado()). El pedido solo se puede
// confirmar cuando la foto ya está guardada en la base de datos.
// =========================================================

// =========================================================
// CONFIRMAR PEDIDO
// =========================================================

let errorTurno = "";

async function confirmarPedido() {
    const carrito = await cargarCarrito();
    if (!carrito.length) {
        alert("Tu carrito está vacío. Agrega productos antes de confirmar el pedido.");
        return;
    }

    if (!comprobanteFueEnviado()) {
        alert("Primero sube la foto de tu comprobante de pago para continuar.");
        return;
    }

    const botonConfirmar = document.getElementById("btnConfirmarPedido");
    if (botonConfirmar) {
        botonConfirmar.disabled = true;
        botonConfirmar.textContent = "Confirmando...";
    }

    const metodo = document.querySelector('input[name="metodoPago"]:checked')?.value || "transferencia";
    const total = carrito.reduce((s, item) => s + Number(item.precio) * Number(item.cantidad), 0);
    const estadoPago = "Pendiente de verificación";

    let usuario = await usuarioActual();

    // Le pedimos al servidor el siguiente número de turno (1 al 200,
    // sin repetirse entre pedidos, aunque confirmen al mismo tiempo).
    let turno = null;
    errorTurno = "";
    try {
        const respTurno = await fetch("api/Turno.php", { method: "POST", cache: "no-store" });
        const textoTurno = await respTurno.text();
        let datosTurno = {};
        try { datosTurno = JSON.parse(textoTurno); } catch { datosTurno = {}; }

        if (respTurno.ok && datosTurno.turno) {
            turno = datosTurno.turno;
        } else {
            errorTurno = "Turno.php respondió " + respTurno.status + ": " +
                (datosTurno.detalle || datosTurno.error || textoTurno.slice(0, 150) || "sin respuesta");
        }
    } catch (e) {
        errorTurno = "No se pudo llamar a api/Turno.php (" + e.message + ")";
    }
    if (errorTurno) console.error("[EduLunch] " + errorTurno);

    const numero = "#" + String(Date.now()).slice(-6);

    const pedido = {
        numero,
        turno,
        productos: carrito,
        total,
        fecha: new Date().toLocaleString("es-CO"),
        metodoPago: metodo,
        estadoPago,
        clienteNombre: usuario?.nombre || "",
        clienteCorreo: usuario?.correo || ""
    };

    // Guardamos el pedido en la base de datos, con foto, nombre y precio
    // de cada producto, para verlo después en "Mis pedidos" del perfil.
    let guardadoOk = false;
    try {
        const respGuardar = await fetch("api/pedidos.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                productos: carrito.map(item => ({
                    nombre: item.nombre,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    imagen: item.imagen || ""
                })),
                total,
                metodoPago: metodo,
                estadoPago,
                numero,
                turno
            })
        });
        guardadoOk = respGuardar.ok;
    } catch {
        guardadoOk = false;
    }

    if (!guardadoOk) {
        alert("No se pudo guardar tu pedido en el servidor. Verifica tu conexión e intenta de nuevo.");
        if (botonConfirmar) {
            botonConfirmar.disabled = false;
            botonConfirmar.textContent = "Confirmar y enviar por WhatsApp";
        }
        return;
    }

    localStorage.setItem("edulunchUltimoPedido", JSON.stringify(pedido));

    try { await apiCarrito("DELETE"); } catch {}
    if (botonConfirmar) {
        botonConfirmar.disabled = false;
        botonConfirmar.textContent = "Confirmar y enviar por WhatsApp";
    }

    mostrarModalConfirmacion(turno);
}

// =========================================================
// BOTÓN VERDE: CONFIRMAR PEDIDO + ABRIR EL CHAT DE WHATSAPP
// =========================================================
const WHATSAPP_NUMERO = "573243994212";

function armarMensajeWhatsApp(carrito) {
    const total = carrito.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);
    const lineas = carrito.map(i =>
        "• " + i.cantidad + " x " + i.nombre + " — $" + (Number(i.precio) * Number(i.cantidad)).toLocaleString("es-CO")
    );
    return "Hola, quiero confirmar mi pedido en EduLunch:\n\n" +
        lineas.join("\n") +
        "\n\nTotal: $" + total.toLocaleString("es-CO") +
        "\nPago: transferencia Bancolombia (adjunto el comprobante).";
}

function confirmarYEnviarWhatsApp() {
    const carrito = leerCarrito();
    if (!carrito.length) {
        alert("Tu carrito está vacío. Agrega productos antes de confirmar el pedido.");
        return;
    }
    // Sin comprobante subido no se abre WhatsApp ni se crea el pedido.
    if (!comprobanteFueEnviado()) {
        alert("Primero sube la foto de tu comprobante de pago para continuar.");
        return;
    }

    // Se abre WhatsApp ahora mismo (dentro del clic) para que el navegador no lo bloquee.
    const url = "https://wa.me/" + WHATSAPP_NUMERO + "?text=" + encodeURIComponent(armarMensajeWhatsApp(carrito));
    window.open(url, "_blank", "noopener");

    // El comprobante ya está subido: guardamos el pedido.
    confirmarPedido();
}

function mostrarModalConfirmacion(turno) {
    const modal = document.getElementById("modalConfirmacion");

    // Si por alguna razón esta página no tiene el modal, no
    // bloqueamos al usuario: lo mandamos directo a confirmación.
    if (!modal) {
        window.location.href = "confirmacion.html";
        return;
    }

    document.getElementById("modalNumeroTurno").textContent = turno ?? "—";
    const avisoTurno = document.getElementById("modalErrorTurno");
    if (avisoTurno) avisoTurno.textContent = turno ? "" : ("No se pudo generar el turno. " + errorTurno);
    modal.classList.remove("oculto");
}

function renderCarrito() {

    const contenedor = document.getElementById("listaCarrito");

    if (!contenedor) return;

    const carrito = leerCarrito();

    // Mostrar mensaje cuando el carrito está vacío.

    if (!carrito.length) {

        contenedor.innerHTML = `
            <div class="carrito-vacio">
                Tu carrito está vacío 🛒
                <br>
                <a href="menu.html">Volver al menú</a>
            </div>
        `;

        actualizarTotal();

        return;
    }

    // Dibujar los productos del carrito.

    contenedor.innerHTML = carrito.map(item => `

        <div class="item-carrito">

            <!-- Fotografía del producto -->

            <div class="producto-carrito-imagen">

                ${
                    item.imagen
                    ? `
                        <img
                            src="${escapeHtml(item.imagen)}"
                            alt="${escapeHtml(item.nombre)}"
                            onerror="this.style.display='none'"
                        >
                    `
                    : `
                        <div class="imagen-sin-producto">
                            <i class="fa-solid fa-utensils"></i>
                        </div>
                    `
                }

            </div>


            <!-- Información del producto -->

            <div class="info-carrito">

                <h3>${escapeHtml(item.nombre)}</h3>

                <p>
                    $${Number(item.precio).toLocaleString("es-CO")}
                </p>

            </div>


            <!-- Controles de cantidad -->

 <div class="controles">

    <button
        type="button"
        aria-label="Disminuir cantidad"
        onclick="cambiarCantidad(${Number(item.id)}, -1)"
    >
        −
    </button>

    <strong>${Number(item.cantidad)}</strong>

    <button
        type="button"
        aria-label="Aumentar cantidad"
        onclick="cambiarCantidad(${Number(item.id)}, 1)"
    >
        +
    </button>

 </div>
            <!-- Botón X para eliminar -->

            <button
                type="button"
                class="eliminar"
                aria-label="Eliminar ${escapeHtml(item.nombre)} del carrito"
                title="Eliminar producto"
                onclick="eliminarProducto(${Number(item.id)})"
            >
                <i class="fa-solid fa-xmark"></i>
            </button>

        </div>

    `).join("");

    actualizarTotal();
}

function actualizarTotal(){ const total=leerCarrito().reduce((s,i)=>s+Number(i.precio)*Number(i.cantidad),0); const el=document.getElementById("totalCarrito"); if(el) el.textContent='$'+total.toLocaleString('es-CO'); }
function escapeHtml(v){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function escapeJs(v){return String(v).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
// Pinta los productos de la categoría desde la base de datos (api/productos.php).
// Así, todo lo que el administrador cambia (precio, imagen, agotado,
// productos nuevos) aparece aquí automáticamente.
async function cargarProductosDesdeBD() {
    const grid = document.getElementById("grid-productos-bd");
    if (!grid) return;
    try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch("api/productos.php?categoria=" + encodeURIComponent(grid.dataset.categoria), { cache: "no-store", signal: ctrl.signal });
        
        if (!resp.ok) throw new Error();
        const { productos } = await resp.json();
        if (!productos.length) { grid.innerHTML = '<p class="cargando-productos">Aún no hay productos en esta categoría.</p>'; return; }
        grid.innerHTML = productos.map(p => `
            <div class="producto ${p.agotado ? "producto--agotado" : ""}" data-nombre="${escapeHtml(p.nombre)}">
                <div class="imagen-producto">
                    ${p.imagen ? `<img src="${escapeHtml(p.imagen)}" alt="${escapeHtml(p.nombre)}" onerror="this.style.display='none'">` : ""}
                    ${p.agotado ? '<span class="etiqueta-agotado">Agotado</span>' : ""}
                </div>
                <h3>${escapeHtml(p.nombre)}</h3>
                <p>${escapeHtml(p.descripcion || "")}</p>
                <div class="parte-inferior">
                    <span class="precio">$${Number(p.precio).toLocaleString("es-CO")}</span>
                    <button class="btn-agregar" type="button" ${p.agotado ? "disabled" : ""} data-id="${p.id}" data-nombre="${escapeHtml(p.nombre)}" data-precio="${p.precio}">+</button>
                </div>
            </div>`).join("");
    } catch {
        grid.innerHTML = '<p class="cargando-productos">No se pudieron cargar los productos. Intenta de nuevo.</p>';
    }
}

document.addEventListener("DOMContentLoaded", () => {

    cargarProductosDesdeBD();

    // Delegación de eventos: funciona también con los productos que se pintan después.
    document.addEventListener("click", ev => {
        const btn = ev.target.closest("button.agregar, button.btn-agregar");
        if (!btn) return;
        {

            if (btn.disabled) return; // Producto agotado

            const tarjeta = btn.closest(".producto");

            // Obtener el nombre del producto
            const nombre =
                btn.dataset.nombre ||
                tarjeta?.querySelector("h3")?.textContent.trim() ||
                "Producto";


            // Agregar el producto con su fotografía
            agregarProducto(btn.dataset.id, nombre)
        }
    });

       localStorage.removeItem("edulunchCarrito"); // limpia el carrito viejo del navegador
    cargarCarrito().then(renderCarrito);

    // Botón "Aceptar" del modal de confirmación de pedido: cierra el
    // modal y lleva a la pantalla final con el resumen del pedido.
    const btnCerrarModalConfirmacion = document.getElementById("btnCerrarModalConfirmacion");
    if (btnCerrarModalConfirmacion) {
        btnCerrarModalConfirmacion.addEventListener("click", () => {
            window.location.href = "confirmacion.html";
        });
    }

});

    




function actualizarMetodoPago() {
    const metodo = document.querySelector('input[name="metodoPago"]:checked')?.value;
    const transferencia = document.getElementById("datosTransferencia");
    const efectivo = document.getElementById("datosEfectivo");
    if (transferencia) transferencia.hidden = metodo !== "transferencia";
    if (efectivo) efectivo.hidden = metodo !== "efectivo";
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
        radio.addEventListener("change", actualizarMetodoPago);
    });
    actualizarMetodoPago();
});
// =========================
// VENTANA DE BIENVENIDA
// =========================

// =========================
// VENTANA DE BIENVENIDA
// =========================

document.addEventListener("DOMContentLoaded", async () => {

    const ventana = document.getElementById("ventanaBienvenida");
    const nombreBienvenida = document.getElementById("nombreBienvenida");
    const cerrar = document.getElementById("cerrarBienvenida");
    const continuar = document.getElementById("continuarBienvenida");

    // Si la ventana no existe en esta página, no hacemos nada
    if (!ventana) return;

    // Solo se muestra cuando el usuario acaba de iniciar sesión.
    // La marca se borra al usarla, así no vuelve a salir al regresar
    // a "Inicio" ni al recargar la página.
    if (sessionStorage.getItem("edulunchBienvenida") !== "1") return;
    sessionStorage.removeItem("edulunchBienvenida");
    ventana.classList.remove("ocultar");

    // Obtener el usuario que inició sesión (le preguntamos al servidor)
    const usuario = typeof usuarioActual === "function"
        ? await usuarioActual()
        : null;

    // Mostrar el nombre
    if (nombreBienvenida) {
        nombreBienvenida.textContent = usuario?.nombre || "Bienvenido";
    }

    // Cerrar la ventana
    function cerrarBienvenida() {
        ventana.classList.add("ocultar");
    }

    if (cerrar) cerrar.addEventListener("click", cerrarBienvenida);
    if (continuar) continuar.addEventListener("click", cerrarBienvenida);

});