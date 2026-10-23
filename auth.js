let _sesionPromesa = null;

function obtenerSesion() {
    if (!_sesionPromesa) {
        _sesionPromesa = fetch("api/sesion.php")
            .then(r => r.json())
            .then(datos => datos.usuario || null)
            .catch(() => null);
    }
    return _sesionPromesa;
}

// OJO: ahora es asíncrona. Cualquier código que la use debe hacer
// "await usuarioActual()" (o ".then(...)").
async function usuarioActual() {
    return await obtenerSesion();
}

async function cerrarSesion() {
    try {
        await fetch("api/logout.php", { method: "POST" });
    } catch {}
    window.location.href = "login.html";
}



document.addEventListener("DOMContentLoaded", async () => {
    const paginaActual = location.pathname.split("/").pop() || "index.html";
    const protegidas = ["menu.html", "fritos.html", "snacks.html", "bebidas.html", "HeladosFR.html", "perfil.html", "carrito.html", "mis-pedidos.html", "admin.html"];

    const usuario = await usuarioActual();

    if (protegidas.includes(paginaActual) && !usuario) {
        window.location.replace("login.html");
        return;
    }

    // Solo un administrador puede entrar a admin.html (la lógica detallada
    // de qué mostrar vive en admin.js; aquí solo bloqueamos el acceso).
    if (paginaActual === "admin.html") {
        if (!usuario || usuario.rol !== "administrador") {
            window.location.replace("menu.html");
            return;
        }
    }


    // Si el usuario es administrador, mostramos un acceso directo flotante
    // al panel en cualquier página protegida (menos en el propio panel).
    if (paginaActual !== "menu.html" && paginaActual !== "index.html" && paginaActual !== "login.html" && paginaActual !== "registro.html" && paginaActual !== "admin.html") {
        if (usuario && usuario.rol === "administrador") {
            const link = document.createElement("a");
            link.href = "admin.html";
            link.textContent = "Panel de administrador";
            // Estilos en línea para que se vea igual sin importar el CSS de cada página.
            Object.assign(link.style, {
                position: "fixed", bottom: "20px", right: "20px", zIndex: "9999",
                background: "#24475c", color: "#fff", textDecoration: "none",
                padding: "12px 18px", borderRadius: "30px",
                fontFamily: "'Poppins', sans-serif", fontSize: "0.85rem", fontWeight: "600",
                boxShadow: "0 6px 18px rgba(0,0,0,0.25)"
            });
            document.body.appendChild(link);
        }
    }
});