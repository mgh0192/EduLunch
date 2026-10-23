document.addEventListener("DOMContentLoaded", async () => {
    // usuarioActual() ahora le pregunta al servidor (api/sesion.php),
    // por eso hay que esperarla con "await". auth.js ya protege esta
    // página, pero repetimos el chequeo aquí por si esta carga
    // llega antes que la de auth.js termine de redirigir.
    const u = await usuarioActual();
    if (!u) { window.location.replace("login.html"); return; }

    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    const rolFormateado=(u.rol||"estudiante").replace(/^./,c=>c.toUpperCase());
    set("nombreNavbar",u.nombre); set("nombreUsuario",u.nombre); set("nombrePerfil",u.nombre); set("nombreCompleto",u.nombre); set("correoPerfil",u.correo); set("correoInstitucional",u.correo);
    // Antes solo se actualizaba el rol de la tarjeta (.rol); el de "Información de mi cuenta"
    // quedaba fijo en "Estudiante". Ahora se actualizan los dos.
    document.querySelectorAll(".rol").forEach(e=>e.textContent=rolFormateado);
    set("rolCuenta",rolFormateado);

    const esAdmin = (u.rol||"").toLowerCase()==="administrador";
    if(esAdmin){
        const etiqueta=document.querySelector(".bienvenida .etiqueta");
        if(etiqueta) etiqueta.textContent="CUENTA DE ADMINISTRADOR";
        const tarjetaAdmin=document.getElementById("accionPanelAdmin");
        if(tarjetaAdmin) tarjetaAdmin.hidden=false;
        const btnPanel=document.getElementById("btnIrPanelAdmin");
        if(btnPanel) btnPanel.addEventListener("click",()=>location.href="admin.html");
    }

    // ---------- EDITAR DATOS (solo nombre y correo; el rol NO se puede cambiar) ----------
    const btnEditar = document.getElementById("btnEditarDatos");
    const modalEditar = document.getElementById("modalEditar");
    if (btnEditar && modalEditar) {
        // La cuenta de administrador es fija, no se edita desde el perfil.
        if (esAdmin) btnEditar.hidden = true;

        const inNombre = document.getElementById("editNombre");
        const inCorreo = document.getElementById("editCorreo");
        const inRol = document.getElementById("editRol");
        const msg = document.getElementById("editMensaje");
        const btnGuardar = document.getElementById("btnGuardarEditar");

        const mostrarMsg = (texto, error) => {
            msg.textContent = texto;
            msg.className = "edit-mensaje" + (error ? " error" : " ok");
            msg.hidden = !texto;
        };
        const cerrarModal = () => { modalEditar.hidden = true; };

        btnEditar.addEventListener("click", () => {
            inNombre.value = document.getElementById("nombrePerfil").textContent.trim();
            inCorreo.value = document.getElementById("correoPerfil").textContent.trim();
            inRol.value = rolFormateado;
            mostrarMsg("", false);
            modalEditar.hidden = false;
            inNombre.focus();
        });

        document.getElementById("btnCancelarEditar").addEventListener("click", cerrarModal);
        modalEditar.addEventListener("click", e => { if (e.target === modalEditar) cerrarModal(); });

        btnGuardar.addEventListener("click", async () => {
            btnGuardar.disabled = true;
            mostrarMsg("Guardando…", false);
            try {
                // Solo se envían nombre y correo. El rol ni siquiera viaja en la petición.
                const resp = await fetch("api/perfil.php", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: inNombre.value.trim(), correo: inCorreo.value.trim() })
                });
                const datos = await resp.json().catch(() => ({}));
                if (!resp.ok) throw new Error(datos.error || "No se pudo guardar.");

                const n = datos.usuario.nombre, c = datos.usuario.correo;
                set("nombreNavbar", n); set("nombreUsuario", n); set("nombrePerfil", n); set("nombreCompleto", n);
                set("correoPerfil", c); set("correoInstitucional", c);
                mostrarMsg("✓ Datos actualizados", false);
                setTimeout(cerrarModal, 900);
            } catch (e) {
                mostrarMsg(e.message, true);
            } finally {
                btnGuardar.disabled = false;
            }
        });
    }

    const cerrar=document.getElementById("btnCerrarSesion");
    if(cerrar) cerrar.addEventListener("click",()=>{if(confirm("¿Estás seguro de que quieres cerrar sesión?")){cerrarSesion();}});
    document.querySelectorAll(".accion button").forEach(btn=>{
        if(btn.id!=="btnCerrarSesion" && btn.id!=="btnIrPanelAdmin" && btn.textContent.includes("Ver productos")) btn.onclick=()=>location.href="menu.html";
        if(btn.id!=="btnCerrarSesion" && btn.id!=="btnIrPanelAdmin" && btn.textContent.includes("Ver pedidos")) btn.onclick=()=>location.href="mis-pedidos.html";
    });
});