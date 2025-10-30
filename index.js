//0 Cargar las variables de entorno
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({ path: "./env/.env" });
}

// ===== 0.1) Sentry (inicializar lo PRIMERO) =====
const Sentry = require("@sentry/node");
Sentry.init({
    dsn: process.env.SENTRY_DSN, // ponlo en env/.env
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 0, // súbelo si luego activas profiling
    disableInstrumentationWarnings: true, // opcional: silencia warnings si Express se inicializa tarde
});

//9 1 Iniciar las librerías
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
//@ts-ignore
const io = socketIO(server);
const db = require("./database/db");
const jwt = require("jsonwebtoken");
const setupSocket = require("./src/sockets/socketHandler");
const security = require("./src/middlewares/security");
const i18n = require("i18n");
const path = require("path");
const setGlobals = require("./src/middlewares/setGlobals");
//@ts-ignore
const { swaggerJSDoc, swaggerUi, swaggerSpec } = require("./swagger");
/**
 * @description Nombre de la ciudad. Ejemplo de variable string
 * @type {string}
 */
let city = "Barcelona";

/**
 * @description Nombre del estudio.
 * @type {Array<String|Number>}
 */
let studios = ["Estudio 1", 25];

/**
 * @description Objeto de una persona
 * @type {Object}
 * @property {string} name - Nombre de la persona
 * @property {string} apellido - Apellido de la persona
 * @property {number} edad - Edad de la persona
 */
let persona = {
    name: "pepe",
    apellido: "perez",
    edad: 35,
};

/**
 * @description Objeto de un articulo
 */
class articulo {
    /**
     * @description Stock del articulo
     * @type {number}
     */
    stock = 10;

    /**
     * Constructor de la clase artículo
     * @param {String} titulo
     * @param {Number} precio
     */
    constructor(titulo, precio) {
        this.titulo = titulo;
        this.precio = precio;
    }

    /**
     * Función que devuelve el stock
     * @returns {number}
     */
    getStock() {
        return this.stock;
    }
}
let ordenador = new articulo("ordenador", 500);
console.log(ordenador.getStock());

i18n.configure({
    locales: ["es", "en"],
    directory: path.join(__dirname, "locales"),
    defaultLocale: "es",
    cookie: "lang", // importante si trabajamos con cookies
    queryParameter: "lang", // importante si trabajamos con query strings
    autoReload: true,
    syncFiles: true,
});

//9 3 Definir los middlewares
app.use("/resources", express.static(__dirname + "/public"));
app.use(cookieParser());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: true })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API
app.use(security);
app.use(i18n.init);
app.use(setGlobals);
app.use("/", require("./src/router"));

// Ruta de prueba
app.get("/error", (req, res, next) => {
    next(new Error("Prueba Sentry!"));
});

//HANLDLE ERRORS (debe ir al final de los middlewares)
Sentry.setupExpressErrorHandler(app);

// Tu handler (redirección solo para esta ruta)
app.use((err, req, res, next) => {
    if (req.path === "/error") {
        // Evita bucles: redirige a home con un query
        return res.redirect("/?testError=1");
    }
    // Resto de errores: responde normal
    res.status(500).send("Error interno");
});

// (Opcional) Capturar errores de nivel proceso
process.on("unhandledRejection", (reason) => {
    Sentry.captureException(
        reason instanceof Error ? reason : new Error(String(reason))
    );
});
process.on("uncaughtException", (err) => {
    Sentry.captureException(err);
    // decide si quieres process.exit(1) en producción
});

//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
// app.use(expressLayouts);
// app.set("views", __dirname + "/views");

//9 7 cargar el sockets
setupSocket(io);

//9 2 Crear el servidor
server.listen(process.env.PORT, () => {
    console.log("Servidor corriendo en http://localhost:4000");
    console.log("Servidor corriendo en http://localhost:4000/api-docs");
});

/**
 * Función que saluda al usuario
 * @param {Number} num veces que saluda
 * @param {String} nombre Nombre del usuario
 * @param {String} [apellido] Apellido del usuario
 * @param {Number} [edad] edad del usuario
 * @returns {Number} Las veces que se saludo
 */
function saludar(num, nombre, apellido, edad) {
    for (var i = 0; i < num; i++) {
        console.log("hola " + nombre + " " + apellido + " ");
    }
    return num;
}

saludar(3, "pepe");
