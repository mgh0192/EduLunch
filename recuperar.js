document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formularioRecuperar");
    if (!formulario) return;

    const botonEnviar = formulario.querySelector(".btn-restablecer");

    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        const correo = document.getElementById("correoRecuperar").value.trim().toLowerCase();

        if (!correo) {
            return alert("Por favor ingresa tu correo.");
        }

        // Evitamos doble clic mientras se envía el correo (puede tardar un par de segundos)
        botonEnviar.disabled = true;
        const textoOriginal = botonEnviar.innerHTML;
        botonEnviar.textContent = "Enviando...";

        let datos;
        try {
            const resp = await fetch("api/recuperar.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo })
            });
            datos = await resp.json();

            if (!resp.ok) {
                botonEnviar.disabled = false;
                botonEnviar.innerHTML = textoOriginal;
                return alert(datos.error || "No se pudo procesar la solicitud.");
            }
        } catch {
            botonEnviar.disabled = false;
            botonEnviar.innerHTML = textoOriginal;
            return alert("No se pudo conectar con el servidor. Revisa que Apache/MySQL estén corriendo.");
        }

        // Todo bien: mandamos al usuario a la página donde ingresa el
        // código y luego su nueva contraseña. Le pasamos el correo por
        // la URL para que esa página sepa a quién validar.
        window.location.href = "re-contraseña.html?correo=" + encodeURIComponent(correo);
    });

});