//9 1 Iniciar las librerías
const express = require("express");
const app = express();
require("dotenv").config({ path: "./env/.env" });
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);
const db = require("./database/db");
const jwt = require("jsonwebtoken");
const setupSocket = require("./src/sockets/socketHandler");
const security = require("./src/middlewares/security");
const i18n = require("i18n");
const path = require("path");
const setGlobals = require("./src/middlewares/setGlobals");
const { swaggerJSDoc, swaggerUi, swaggerSpec } = require("./swagger");

i18n.configure({
    locales: ["es", "en"],
    directory: path.join(__dirname, "locales"),
    defaultLocale: "es",
    cookie: "lang", // importante si trabajamos con cookies
    queryParameter: "lang", // importante si trabajamos con query strings
    autoReload: true,
    syncFiles: true
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



//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
// app.use(expressLayouts);
// app.set("views", __dirname + "/views");

//9 7 cargar el sockets
setupSocket(io);

//9 2 Crear el servidor
server.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
    console.log("Servidor corriendo en http://localhost:4000/api-docs");
});
