//9 1 Iniciar las librerías
const express = require("express");
const app = express();
require("dotenv").config({ path: "./env/.env" });
const session = require("cookie-session");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const io = socketIO(server);
const db = require("./database/db");


// const expressLayouts = require("express-ejs-layouts");

//9 7 Definir la sesión
const sessionConfig = {
    name: "session", //clave para cifrar la sesión
    keys: ["clave-secreta"],
    maxAge: 24 * 60 * 60 * 1000, //24h
}


app.use(cookieParser());
app.use(cookieSession(sessionConfig));

//9 3 Definir los middlewares
app.use(express.urlencoded({ extended: true })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API
app.use("/", require("./src/router"));

//9 5 Configurar carpeta pública
app.use("/resources", express.static(__dirname + "/public"));

//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
// app.use(expressLayouts);
// app.set("views", __dirname + "/views");



//9 8 Compartir sesión en Socket.IO
io.use((socket, next) => {
    const req = socket.request; //guarda la petición http y las cookies
    cookieSession(sessionConfig)(req, {}, () => { //carga la sesión en req
        if (!req.session || !req.session.loggedin) { //comprueba si la sesión es válida
            console.log("❌ Sesión no válida en socket:", req.session);
            return next(new Error("Sesión inválida"));
        }

        console.log("✅ Sesión activa:", req.session);
        next(); //acepta la conexión
    });
});


// Manejador de conexiones (websocket)
io.on("connection", (socket) => {
    //recuperamos los datos de la sesión
    const session = socket.request.session;
    const username = session.user;
    const role = session.rol;

    console.log(`🟢 Usuario conectado: ${username} (${role})`);

    // Unir al usuario a su propia sala
    socket.join(`user:${username}`);
    // Unir al admin a la sala de admins
    if (role === 'admin') socket.join("admins");

    //escuchador de evento "mensaje_privado" que envía un mensaje a un destinatario
    socket.on("mensaje_privado", ({ para, mensaje }) => {
        const de = username;

        // Emitir mensaje al receptor
        io.to(`user:${para}`).emit("mensaje_recibido", { de, mensaje });

        // Muestra a los admin de que usuario viene el mensaje
        if (role !== "admin") {
            io.to("admins").emit("mensaje_recibido", { de, mensaje });
        }

        // Guardar en la base de datos
        const sql = "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)";
        db.query(sql, [de, para, mensaje], (err) => {
            if (err) {
                console.error("❌ Error al guardar mensaje:", err);
            } else {
                console.log("💾 Mensaje guardado:", `${de} ➡️ ${para}`);
            }
        });
    });

    // detecta cuando el usuario se desconecta del socket y muestra un mensaje
    socket.on("disconnect", () => {
        console.log(`🔴 Usuario desconectado: ${username}`);
    });
});


//9 2 Crear el servidor
server.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
});
