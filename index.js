//9 1 Iniciar las librerías
const express = require("express");
const app = express();
require("dotenv").config({ path: "./env/.env" });
const bcrypt = require("bcryptjs");
const session = require("express-session");

//9 7 Definir la sesión
app.use(
    session({
        secret: "secret", //clave para cifrar la sesión
        resave: false, //se guarda en cada petición
        saveUninitialized: false, //se guarda en cada petición cuando se produzcan cambios
    })
);

//9 3 Definir los middlewares
app.use(express.urlencoded({ extended: false })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API

//9 5 Configurar carpeta pública
app.use("/resources", express.static(__dirname + "/public"));

//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
// app.set("views", __dirname + "/views");

//9 4 Definir las rutas
app.get("/", (req, res) => {
    res.send("Hello World");
});

//9 2 Crear el servidor
app.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
});
