//9 1 Iniciar las librerías
const express = require("express");
const app = express();
require("dotenv").config({ path: "./env/.env" });
const bcrypt = require("bcryptjs");
const session = require("express-session");
const db = require("./database/db");

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
    if (req.session.loggedin) {
        res.render("index", { user: req.session.name, login: true });
    } else {
        res.render("index", { user: "Debe iniciar sesión", login: false });
    }
});
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/registro", (req, res) => {
    res.render("register");
});

//9 8 Definir las rutas POST
//Ruta de registro
app.post("/register", async (req, res) => {
    //Recoger los datos del formulario
    const user = req.body.user;
    const name = req.body.name;
    const rol = req.body.rol;
    const pass = req.body.pass;

    //Cifrar la contraseña
    const passwordHash = await bcrypt.hash(pass, 8);

    //Guardar el usuario en la base de datos
    db.query(
        "INSERT INTO usuarios SET ?",
        {
            usuario: user,
            nombre: name,
            rol: rol,
            pass: passwordHash,
        },
        (error, results) => {
            if (error) {
                console.log(error);
            } else {
                res.render("register", {
                    alert: true,
                    alertTitle: "Registro",
                    alertMessage: "El usuario se ha registrado correctamente",
                    alertIcon: "success",
                    showConfirmButton: false,
                    timer: 2500,
                    ruta: "",
                });
            }
        }
    );
});

//Ruta de inicio de sesión
app.post("/auth", async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;

    if (user && pass) {
        db.query(
            "SELECT * FROM usuarios WHERE usuario = ?",
            [user],
            async (error, results) => {
                if (
                    results.length == 0 ||
                    !(await bcrypt.compare(pass, results[0].pass))
                ) {
                    res.render("login", {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage:
                            "El usuario o la contraseña son incorrectos",
                        alertIcon: "error",
                        showConfirmButton: true,
                        timer: false,
                        ruta: "login",
                        login: false,
                    });
                } else {
                    req.session.loggedin = true;
                    req.session.name = results[0].nombre;

                    res.render("login", {
                        alert: true,
                        alertTitle: "Login",
                        alertMessage: "Has iniciado sesión correctamente",
                        alertIcon: "success",
                        showConfirmButton: false,
                        timer: 2500,
                        ruta: "",
                        login: true,
                    });
                }
            }
        );
    } else {
        res.render("login", {
            alert: true,
            alertTitle: "Error",
            alertMessage: "Introduzca su usuario y contraseña",
            alertIcon: "error",
            showConfirmButton: true,
            timer: false,
            ruta: "login",
            login: false,
        });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

//9 2 Crear el servidor
app.listen(4000, () => {
    console.log("Servidor corriendo en http://localhost:4000");
});
