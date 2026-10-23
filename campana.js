// =========================================================
// CAMPANA DE NOTIFICACIONES - comportamiento (JS)
// ---------------------------------------------------------
//   campana.js   -> este archivo: carga la plantilla, pide las
//                   notificaciones a api/notificaciones.php y
//                   las actualiza cada 15 segundos.
//
// La campana es un círculo flotante abajo a la izquierda: no depende
// del menú de la página, así que funciona en cualquiera que tenga
// auth.js. El administrador no la ve.
// =========================================================
(function () {
    const CADA_MS = 15000;
    const PLANTILLA = "campana.html";
    const API = "api/notificaciones.php";

    let ultimoConteo = null;

    function fechaBonita(txt) {
        const d = new Date(String(txt).replace(" ", "T"));
        if (isNaN(d)) return "";
        return d.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    }

    function escapar(t) {
        const d = document.createElement("div");
        d.textContent = t;
        return d.innerHTML;
    }

    async function api(metodo, cuerpo) {
        const op = { method: metodo, cache: "no-store" };
        if (cuerpo) {
            op.headers = { "Content-Type": "application/json" };
            op.body = JSON.stringify(cuerpo);
        }
        const r = await fetch(API, op);
        if (!r.ok) throw new Error();
        return r.json();
    }

    async function iniciar() {
        const usuario = typeof usuarioActual === "function" ? await usuarioActual() : null;
        if (!usuario || usuario.rol === "administrador") return;

        // 1) Cargar la estructura desde campana.html
        let html;
        try {
            const r = await fetch(PLANTILLA, { cache: "no-store" });
            if (!r.ok) throw new Error();
            html = await r.text();
        } catch { return; }

        const molde = document.createElement("div");
        molde.innerHTML = html.trim();
        const caja = molde.querySelector(".campana");
        if (!caja) return;
        document.body.appendChild(caja); // círculo flotante abajo a la izquierda

        const btn = caja.querySelector(".campana-btn");
        const num = caja.querySelector(".campana-num");
        const panel = caja.querySelector(".campana-panel");
        const lista = caja.querySelector(".campana-lista");

        // 2) Pintar los datos
        function pintar(datos) {
            const n = datos.noLeidas;
            num.textContent = n > 9 ? "9+" : n;
            num.style.display = n > 0 ? "block" : "none";

            if (ultimoConteo !== null && n > ultimoConteo) {
                btn.classList.add("suena");
                setTimeout(() => btn.classList.remove("suena"), 1400);
            }
            ultimoConteo = n;

            if (!datos.notificaciones.length) {
                lista.innerHTML = '<div class="campana-vacia">No tienes notificaciones todavía.</div>';
                return;
            }
            lista.innerHTML = datos.notificaciones.map(x => `
                <div class="campana-item ${x.leida ? "" : "nueva"}" data-id="${x.id}">
                    <span class="punto"></span>
                    <div>${escapar(x.mensaje)}<small>${fechaBonita(x.fecha)}</small></div>
                </div>`).join("");
        }

        async function cargar() {
            try { pintar(await api("GET")); } catch {}
        }

        // 3) Eventos
        btn.addEventListener("click", e => {
            e.stopPropagation();
            panel.classList.toggle("abierto");
        });
        document.addEventListener("click", e => {
            if (!caja.contains(e.target)) panel.classList.remove("abierto");
        });

        lista.addEventListener("click", async e => {
            const item = e.target.closest(".campana-item");
            if (!item || !item.classList.contains("nueva")) return;
            try { await api("PATCH", { id: Number(item.dataset.id) }); } catch {}
            cargar();
        });

        caja.querySelector(".marcar-todas").addEventListener("click", async () => {
            try { await api("PATCH", { todas: true }); } catch {}
            cargar();
        });

        cargar();
        setInterval(cargar, CADA_MS);
    }

    document.addEventListener("DOMContentLoaded", iniciar);
})();
