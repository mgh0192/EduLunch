// =========================================================
// COMPROBANTE DE PAGO (página del carrito)
// ---------------------------------------------------------
// - El botón "Subir comprobante" manda la foto a api/comprobante.php,
//   que la guarda en el servidor y en la base de datos.
// - El botón verde de WhatsApp está DESHABILITADO hasta que la
//   foto se haya subido bien.
// Este archivo se carga ANTES que tienda.js, porque tienda.js usa
// la función comprobanteFueEnviado().
// =========================================================

let comprobanteSubido = false;

function comprobanteFueEnviado() {
    return comprobanteSubido;
}

(function () {
    function ponerEstado(texto, tipo) {
        const e = document.getElementById("estadoComprobante");
        if (!e) return;
        e.textContent = texto;
        e.className = "comprobante-estado" + (tipo ? " " + tipo : "");
        e.hidden = !texto;
    }

    // Habilita o deshabilita el botón de WhatsApp y muestra la miniatura
    function aplicar(subido, id) {
        comprobanteSubido = subido;

        const btnWsp = document.getElementById("btnConfirmarPedido");
        if (btnWsp) {
            btnWsp.disabled = !subido;
            btnWsp.title = subido ? "" : "Primero sube tu comprobante de pago";
        }

        const btnSubir = document.getElementById("btnSubirComprobante");
        if (btnSubir) {
            btnSubir.innerHTML = subido
                ? '<i class="fa-solid fa-rotate"></i> Cambiar comprobante'
                : '<i class="fa-solid fa-upload"></i> Subir comprobante de pago';
        }

        const mini = document.getElementById("miniComprobante");
        if (mini) {
            if (subido && id) {
                mini.src = "api/comprobante.php?id=" + id + "&t=" + Date.now();
                mini.hidden = false;
            } else {
                mini.hidden = true;
            }
        }

        if (subido) ponerEstado("✓ Comprobante subido. Ya puedes confirmar tu pedido.", "ok");
        else ponerEstado("", "");
    }

    async function consultar() {
        try {
            const r = await fetch("api/comprobante.php", { cache: "no-store" });
            const d = await r.json();
            aplicar(!!d.subido, d.id);
        } catch {
            aplicar(false, null);
        }
    }

    async function subir(archivo) {
        if (!archivo) return;

        if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
            ponerEstado("Sube una foto en formato JPG, PNG o WEBP.", "error");
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            ponerEstado("La foto pesa más de 5 MB. Sube una más liviana.", "error");
            return;
        }

        const btnSubir = document.getElementById("btnSubirComprobante");
        if (btnSubir) btnSubir.disabled = true;
        ponerEstado("Subiendo comprobante…", "");

        const datos = new FormData();
        datos.append("comprobante", archivo);

        try {
            const r = await fetch("api/comprobante.php", { method: "POST", body: datos });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.error || "No se pudo subir el comprobante.");
            aplicar(true, d.id);
        } catch (e) {
            ponerEstado(e.message, "error");
        } finally {
            if (btnSubir) btnSubir.disabled = false;
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const input = document.getElementById("inputComprobante");
        const btnSubir = document.getElementById("btnSubirComprobante");
        if (!input || !btnSubir) return;

        // Mientras se consulta, el botón de WhatsApp ya queda bloqueado
        aplicar(false, null);
        consultar();

        btnSubir.addEventListener("click", () => input.click());
        input.addEventListener("change", () => {
            subir(input.files[0]);
            input.value = ""; // permite volver a elegir el mismo archivo
        });
    });
})();