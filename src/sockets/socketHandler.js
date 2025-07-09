const db = require("../../database/db");
const jwt = require("jsonwebtoken");

function setupSocket(io) {
    //9 8 Autenticar una conexión de socket usando JWT guardado en una cookie
    io.use((socket, next) => {
        const req = socket.request; //guarda la petición http (incluidas las cookies)
        const cookies = req.headers.cookie; // guarda las cookies de la petición

        if (!cookies) { //si no hay cookies
            console.log("❌ No hay cookies en la conexión de socket");
            return next(new Error("No autenticado"));
        }

        // Extrae el token desde la cookie (la información de éste)
        const tokenMatch = cookies.match(/token=([^;]+)/);
        const token = tokenMatch && tokenMatch[1];

        if (!token) { //si no hay token
            console.log("❌ No se encontró el token en las cookies");
            return next(new Error("Token no proporcionado"));
        }

        try { // intenta decodificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // guardamos el usuario decodificado
            next();
        } catch (err) {
            console.log("❌ Token inválido:", err.message);
            return next(new Error("Token inválido"));
        }
    });


    // Manejador de eventos (websocket)
    io.on("connection", (socket) => {
        const { user, name, rol } = socket.request.user; //obtenemos el usuario

        console.log(` Usuario conectado: ${user} (${rol})`);

        //organiza a los usuarios por salas
        socket.join(`user:${user}`); //sala personal de cada usuario
        if (rol === "admin") socket.join("admins"); //sala grupal de los administradores

        socket.on("mensaje_privado", ({ para, mensaje }) => {
            const de = user;

            io.to(`user:${para}`).emit("mensaje_recibido", { de, mensaje });

            if (rol !== "admin") {
                io.to("admins").emit("mensaje_recibido", { de, mensaje });
            }

            // Guardar en la base de datos
            const sql = "INSERT INTO mensajes (de_usuario, para_usuario, mensaje) VALUES (?, ?, ?)";
            db.query(sql, [de, para, mensaje], (err) => {
                if (err) {
                    console.error(" Error al guardar mensaje:", err);
                } else {
                    console.log(" Mensaje guardado:", `${de} -> ${para}`);
                }
            });
        });

        socket.on("disconnect", () => {
            console.log(` Usuario desconectado: ${user}`);
        });
    });
}

module.exports = setupSocket;