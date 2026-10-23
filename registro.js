document.addEventListener("DOMContentLoaded", () => {

    // VER / OCULTAR CONTRASEÑA (REGISTRO)
    document.querySelectorAll(".ojo-registro").forEach(ojo => {
        ojo.addEventListener("mousedown", e => e.preventDefault());
        ojo.addEventListener("click", () => {
            const campo = document.getElementById(ojo.dataset.target);
            if (!campo) return;
            const visible = campo.type === "text";
            campo.type = visible ? "password" : "text";
            ojo.title = visible ? "Mostrar contraseña" : "Ocultar contraseña";
        });
    });


    // =========================
    // MOSTRAR / OCULTAR CONTRASEÑA
    // =========================

    const mostrarPassword = document.getElementById("mostrarPassword");
    const loginPassword = document.getElementById("loginPassword");

    if (mostrarPassword && loginPassword) {
        mostrarPassword.addEventListener("click", () => {
            const visible = loginPassword.type === "text";
            loginPassword.type = visible ? "password" : "text";
            mostrarPassword.textContent = "◉";
        });
    }


    // =========================
    // INICIAR SESIÓN
    // =========================

    const login = document.getElementById("formularioLogin");

    if (login) {
        login.addEventListener("submit", async e => {
            e.preventDefault();

            const correo = document.getElementById("loginCorreo").value.trim().toLowerCase();
            const contrasena = document.getElementById("loginPassword").value;

            if (!correo || !contrasena) {
                return alert("Por favor completa todos los campos.");
            }

            let datos;
            try {
                const resp = await fetch("api/login.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ correo, contrasena })
                });
                datos = await resp.json();
                if (!resp.ok) {
                    return alert(datos.error || "El correo o la contraseña no son correctos.");
                }
            } catch {
                return alert("No se pudo conectar con el servidor. Revisa que Apache/MySQL estén corriendo.");
            }

            alert("¡Inicio de sesión exitoso! Bienvenido a EDULUNCH.");
            sessionStorage.setItem("edulunchBienvenida", "1");

            window.location.href = datos.usuario.rol === "administrador" ? "admin.html" : "menu.html";
        });
    }


    // =========================
    // CREAR CUENTA
    // =========================

    const registro = document.getElementById("formularioRegistro");

    if (registro) {
        registro.addEventListener("submit", async e => {
            e.preventDefault();

            const nombreCompleto = document.getElementById("nombre").value.trim();
            const correo = document.getElementById("correo").value.trim().toLowerCase();
            const contrasena = document.getElementById("password").value;
            const confirmar = document.getElementById("confirmar").value;
            const rol = document.getElementById("rol").value;

            // Verificar campos vacíos
            if (!nombreCompleto || !correo || !contrasena || !confirmar || !rol) {
                return alert("Por favor completa todos los campos.");
            }

            // Verificar que sea el correo institucional
            if (!/^[^\s@]+@iejesusrey\.edu\.co$/i.test(correo)) {
                return alert("Debes registrarte con tu correo institucional (@iejesusrey.edu.co).");
            }

            // Verificar contraseña
            if (contrasena.length < 8) {
                return alert("La contraseña debe tener mínimo 8 caracteres.");
            }
            if (!/[A-Z]/.test(contrasena)) {
                return alert("La contraseña debe tener al menos una letra mayúscula.");
            }
            if (!/[a-z]/.test(contrasena)) {
                return alert("La contraseña debe tener al menos una letra minúscula.");
            }
            if (!/[0-9]/.test(contrasena)) {
                return alert("La contraseña debe tener al menos un número.");
            }
            if (!/[^A-Za-z0-9]/.test(contrasena)) {
                return alert("La contraseña debe tener al menos un símbolo especial.");
            }

            // Confirmar contraseña
            if (contrasena !== confirmar) {
                return alert("Las contraseñas no coinciden.");
            }

            // El formulario pide "nombre completo" en un solo campo, pero la
            // base de datos guarda Nombre y Apellidos por separado: partimos
            // la primera palabra como nombre y el resto como apellidos.
            const partes = nombreCompleto.split(/\s+/);
            const nombre = partes.shift();
            const apellidos = partes.join(" ") || nombre;

            let datos;
            try {
                const resp = await fetch("api/registro.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre, apellidos, correo, contrasena,
                        tipo_usuario: rol
                    })
                });
                datos = await resp.json();
                if (!resp.ok) {
                    return alert((datos.error || "No se pudo crear la cuenta.") + "\n\n[DEBUG] HTTP " + resp.status + "\nURL: " + resp.url + "\nArchivo PHP: " + (resp.headers.get("X-Archivo") || "SIN MARCA (no es el registro.php nuevo)"));
                }
            } catch {
                return alert("No se pudo conectar con el servidor. Revisa que Apache/MySQL estén corriendo.");
            }

            // registro.php ya deja la sesión iniciada, así que entramos directo.
            alert("¡Cuenta creada correctamente! Ahora inicia sesión con tu correo y contraseña.");
            window.location.href = "login.html";
        });
    }

});