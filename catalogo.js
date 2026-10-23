// =========================================================
// catalogo.js — Catálogo de productos "base" (los que ya
// venían escritos directamente en cada página de categoría)
// y utilidades para marcarlos como agotados desde el panel
// de administrador.
//
// TODO backend: cuando conectes la base de datos, este
// catálogo ya no hace falta a mano: cada producto (base o
// creado por el admin) debería venir de GET /api/productos
// con su propio campo "disponible" en la base de datos.
// =========================================================

const CATALOGO_BASE = {
    fritos: [
        { nombre: "Galleta de Helado", precio: 3000 },
        { nombre: "Chococono Mini", precio: 2500 },
        { nombre: "Paletas", precio: 2000 },
        { nombre: "Paleta de Mango Biche", precio: 2500 },
        { nombre: "Paleta Maracamango", precio: 2500 },
        { nombre: "Porción de Mango", precio: 4000 },
        { nombre: "Porción de Banano", precio: 4000 },
        { nombre: "Porción de Papaya", precio: 4000 }
    ],
    snacks: [
        { nombre: "Limoncitas limon", precio: 2500 },
        { nombre: "Limoncitas tocineta", precio: 2500 },
        { nombre: "Limoncitas BBQ", precio: 2500 },
        { nombre: "Limoncitas pimienta", precio: 2500 },
        { nombre: "Papas de limón", precio: 2500 },
        { nombre: "Papas limón y pimienta", precio: 2500 },
        { nombre: "Papas naturales", precio: 2500 },
        { nombre: "Platanitos naturales", precio: 2500 },
        { nombre: "Platanitos de limón", precio: 2500 },
        { nombre: "Rosquillas", precio: 3500 }
    ],
    bebidas: [
        { nombre: "Agua Cristal", precio: 2500 },
        { nombre: "Agua de Coco", precio: 2500 },
        { nombre: "Agua de Manzana", precio: 2500 },
        { nombre: "Agua de Limón", precio: 2500 },
        { nombre: "Agua de Frutos Rojos", precio: 2500 },
        { nombre: "Agua de Maracuya", precio: 2500 },
        { nombre: "Coca-Cola 600ml", precio: 4000 },
        { nombre: "Coca-Cola 400ml", precio: 3000 },
        { nombre: "Mr Tea Durazno", precio: 3000 },
        { nombre: "Quatro", precio: 4000 },
        { nombre: "Sprite", precio: 4000 },
        { nombre: "Premio gaseosa", precio: 4000 },
        { nombre: "Jugo del Valle", precio: 3000 },
        { nombre: "Pony Malta", precio: 4000 },
        { nombre: "Pool Manzana Mini", precio: 2000 },
        { nombre: "Pool Manzana Grande", precio: 2500 },
        { nombre: "Hydratade Pool", precio: 4000 },
        { nombre: "Pool Negra Grande", precio: 2500 },
        { nombre: "Pool Negra 250ml", precio: 2000 }
    ],
    helados: [
        { nombre: "Galleta de Helado", precio: 3000 },
        { nombre: "Chococono Mini", precio: 2500 },
        { nombre: "Paletas", precio: 2000 },
        { nombre: "Paleta de Mango Biche", precio: 2500 },
        { nombre: "Paleta Maracamango", precio: 2500 },
        { nombre: "Porción de Mango", precio: 4000 },
        { nombre: "Porción de Banano", precio: 4000 },
        { nombre: "Porción de Papaya", precio: 4000 }
    ]
};

const NOMBRES_CATEGORIA = {
    fritos: "Fritos",
    snacks: "Snacks",
    bebidas: "Bebidas",
    helados: "Frutas y Helados"
};

function leerAgotadosBase() {
    try { return JSON.parse(localStorage.getItem("edulunchAgotadosBase")) || {}; } catch { return {}; }
}
function guardarAgotadosBase(datos) {
    localStorage.setItem("edulunchAgotadosBase", JSON.stringify(datos));
}
function claveAgotado(categoria, nombre) {
    return categoria + "::" + nombre;
}
function estaAgotadoBase(categoria, nombre) {
    return !!leerAgotadosBase()[claveAgotado(categoria, nombre)];
}
function establecerAgotadoBase(categoria, nombre, agotado) {
    const datos = leerAgotadosBase();
    const clave = claveAgotado(categoria, nombre);
    if (agotado) datos[clave] = true; else delete datos[clave];
    guardarAgotadosBase(datos);
}
