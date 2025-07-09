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


//9 3 Definir los middlewares
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API
app.use("/", require("./src/router"));

//9 5 Configurar carpeta pública
app.use("/resources", express.static(__dirname + "/public"));

//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
// app.use(expressLayouts);
// app.set("views", __dirname + "/views");

//9 7 cargar el sockets
setupSocket(io);

//9 2 Crear el servidor
server.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
});
