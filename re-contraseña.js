document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // 0. Obtener el correo desde la URL (?correo=...)
    //    Si no viene, esta página no tiene sentido: mandamos
    //    al usuario de vuelta a pedir el código.
    // =========================================================
    const parametros = new URLSearchParams(window.location.search);
    const correo = (parametros.get("correo") || "").trim().toLowerCase();

    if (!correo) {
        window.location.href = "recuperar.html";
        return;
    }

    let codigoVerificado = false; // se pone en true cuando el código es correcto


    // =========================================================
    // 1. MODAL - VERIFICAR CÓDIGO
    // =========================================================
    const overlay = document.getElementById("overlay-codigo");
    const inputCodigo = document.getElementById("input-codigo");
    const botonVerificar = document.getElementById("boton-verificar-codigo");
    const errorCodigo = document.getElementById("error-codigo");

    async function verificarCodigo() {
        const codigo = inputCodigo.value.trim();
        errorCodigo.textContent = "";

        if (codigo.length !== 6) {
            errorCodigo.textContent = "El código debe tener 6 dígitos.";
            return;
        }

        botonVerificar.disabled = true;
        const textoOriginal = botonVerificar.innerHTML;
        botonVerificar.textContent = "Verificando...";

        let datos;
        try {
            const resp = await fetch("api/verificar_codigo.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo, codigo })
            });
            datos = await resp.json();

            if (!resp.ok) {
                errorCodigo.textContent = datos.error || "El código no es correcto.";
                botonVerificar.disabled = false;
                botonVerificar.innerHTML = textoOriginal;
                return;
            }
        } catch {
            errorCodigo.textContent = "No se pudo conectar con el servidor.";
            botonVerificar.disabled = false;
            botonVerificar.innerHTML = textoOriginal;
            return;
        }

        // Código correcto: cerramos el modal y dejamos que el usuario
        // ponga su nueva contraseña.
        codigoVerificado = true;
        overlay.classList.add("oculto");
    }

    botonVerificar.addEventListener("click", verificarCodigo);

    // También permitimos verificar presionando Enter dentro del campo
    inputCodigo.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            verificarCodigo();
        }
    });


    // =========================================================
    // 2. MOSTRAR / OCULTAR CONTRASEÑA (botones del ojito)
    // =========================================================
    document.querySelectorAll(".boton-ojo").forEach((boton) => {
        boton.addEventListener("click", () => {
            const input = document.getElementById(boton.dataset.target);
            const visible = input.type === "text";
            input.type = visible ? "password" : "text";
            boton.setAttribute("aria-pressed", String(!visible));
            boton.querySelector("i").className = visible ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        });
    });


    // =========================================================
    // 3. VALIDAR REQUISITOS DE LA CONTRASEÑA EN VIVO
    // =========================================================
    const campoNueva = document.getElementById("nueva-contrasena");
    const requisitos = document.getElementById("requisitos");

    const reglas = {
        "req-longitud": (v) => v.length >= 8,
        "req-mayuscula": (v) => /[A-Z]/.test(v),
        "req-minuscula": (v) => /[a-z]/.test(v),
        "req-numero": (v) => /[0-9]/.test(v),
        "req-simbolo": (v) => /[^A-Za-z0-9]/.test(v),
    };

    function cumpleTodo(valor) {
        return Object.values(reglas).every((fn) => fn(valor));
    }

    campoNueva.addEventListener("focus", () => requisitos.classList.add("mostrar"));

    campoNueva.addEventListener("input", () => {
        const valor = campoNueva.value;
        Object.entries(reglas).forEach(([id, cumple]) => {
            const li = document.getElementById(id);
            const icono = li.querySelector("i");
            if (cumple(valor)) {
                li.classList.add("cumplido");
                icono.className = "fa-solid fa-circle-check";
            } else {
                li.classList.remove("cumplido");
                icono.className = "fa-regular fa-circle";
            }
        });
    });


    // =========================================================
    // 4. ENVIAR EL FORMULARIO (guardar la nueva contraseña)
    // =========================================================
    const formulario = document.getElementById("formulario-restablecer");
    const mensajeGeneral = document.getElementById("mensaje-general");
    const errorNueva = document.getElementById("error-nueva");
    const errorConfirmar = document.getElementById("error-confirmar");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        errorNueva.textContent = "";
        errorConfirmar.textContent = "";
        mensajeGeneral.textContent = "";

        if (!codigoVerificado) {
            mensajeGeneral.textContent = "Primero debes verificar el código que te enviamos por correo.";
            overlay.classList.remove("oculto");
            return;
        }

        const nueva = campoNueva.value;
        const confirmar = document.getElementById("confirmar-contrasena").value;

        if (!cumpleTodo(nueva)) {
            errorNueva.textContent = "La contraseña no cumple todos los requisitos de arriba.";
            return;
        }

        if (nueva !== confirmar) {
            errorConfirmar.textContent = "Las contraseñas no coinciden.";
            return;
        }

        const botonEnviar = formulario.querySelector(".boton-restablecer");
        botonEnviar.disabled = true;

        let datos;
        try {
            const resp = await fetch("api/restablecer_contrasena.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo, contrasena: nueva })
            });
            datos = await resp.json();

            if (!resp.ok) {
                mensajeGeneral.textContent = datos.error || "No se pudo cambiar la contraseña.";
                botonEnviar.disabled = false;
                return;
            }
        } catch {
            mensajeGeneral.textContent = "No se pudo conectar con el servidor.";
            botonEnviar.disabled = false;
            return;
        }

        alert("¡Tu contraseña se cambió correctamente! Ahora puedes iniciar sesión.");
        window.location.href = "login.html";
    });

});