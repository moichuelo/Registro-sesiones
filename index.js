//9 1 Iniciar las librerías
const express = require("express");
const app = express();

//9 3 Definir los middlewares
app.use(express.urlencoded({ extended: false })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API

//9 Definir
app.get("/", (req, res) => {
    res.send("Hello World");
});

//9 2 Crear el servidor
app.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
});
