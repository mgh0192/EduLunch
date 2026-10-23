document.addEventListener("DOMContentLoaded", () => {
    const buscar = document.getElementById("buscar");
    if (buscar) buscar.addEventListener("input", buscarProducto);

    const todos = document.querySelector("[onclick=\"mostrarTodos()\"]");
    if (todos) todos.removeAttribute("onclick");
});

function buscarProducto() {
    const input = document.getElementById("buscar");
    if (!input) return;
    const texto = input.value.toLowerCase().trim();
    document.querySelectorAll(".producto").forEach(producto => {
        const nombre = (producto.dataset.nombre || "").toLowerCase();
        producto.style.display = nombre.includes(texto) ? "block" : "none";
    });
}

function mostrarTodos() {
    document.querySelectorAll(".producto").forEach(producto => producto.style.display = "block");
}

function ordenarPrecio() {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;
    const productos = Array.from(contenedor.querySelectorAll(".producto"));
    productos.sort((a,b) => Number(a.dataset.precio || 0) - Number(b.dataset.precio || 0));
    productos.forEach(producto => contenedor.appendChild(producto));
}

function irPedido() { window.location.href = "carrito.html"; }
