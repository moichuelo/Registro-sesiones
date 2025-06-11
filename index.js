//9 1 Iniciar las librerías
const express = require("express");
const app = express();
require("dotenv").config({ path: "./env/.env" });
const bcrypt = require("bcryptjs");
const session = require("express-session");
const db = require("./database/db");
const { body, validationResult } = require("express-validator");
const expressLayouts = require("express-ejs-layouts");

//9 7 Definir la sesión
app.use(
    session({
        secret: "secret", //clave para cifrar la sesión
        resave: false, //se guarda en cada petición
        saveUninitialized: false, //se guarda en cada petición cuando se produzcan cambios
    })
);

//9 3 Definir los middlewares
app.use(express.urlencoded({ extended: true })); //nos permite recibir datos de un formulario
app.use(express.json()); //nos permite recibir datos de una API

//9 5 Configurar carpeta pública
app.use("/resources", express.static(__dirname + "/public"));

//9 6 Definir el motor de vistas
app.set("view engine", "ejs");
app.use(expressLayouts);
// app.set("views", __dirname + "/views");

//9 4 Definir las rutas
app.get("/", (req, res) => {
    if (req.session.loggedin) {
        res.render("index", {
            user: req.session.name,
            login: true,
            titulo: "Home",
        });
    } else {
        res.render("index", {
            user: "Debe iniciar sesión",
            login: false,
            titulo: "Home",
        });
    }
});
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/registro", (req, res) => {
    res.render("register", { titulo: "Login", css: "body.css" });
});

//9 8 Definir las rutas POST

app.post(
    "/register",
    [
        body("user")
            .exists()
            .isLength({ min: 4 })
            .withMessage("El usuario debe tener al menos 4 caracteres"),
        body("name")
            .isLength({ min: 4 })
            .withMessage("El nombre debe tener al menos 4 caracteres"),
        body("pass")
            .isLength({ min: 4 })
            .withMessage("La contraseña debe tener al menos 4 caracteres"),
        body("email").isEmail().withMessage("El email no es valido"),
        body("edad").isNumeric().withMessage("La edad debe ser un número"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // res.status(400).json({ errors: errors.array() });
            // console.log(errors);

            console.log(req.body);
            const valores = req.body; //se guardan los valores introducidos en el formulario
            const validacionErrores = errors.array(); //se guarda en un array todos los errores producidos
            res.render("register", {
                validaciones: validacionErrores,
                valores: valores,
                titulo: "Registro",
            });
        } else {
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
                            alertMessage:
                                "El usuario se ha registrado correctamente",
                            alertIcon: "success",
                            showConfirmButton: false,
                            timer: 2500,
                            ruta: "",
                            titulo: "Registro",
                        });
                    }
                }
            );
        }
    }
);

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
                        titulo: "Login",
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
                        titulo: "Login",
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
            titulo: "Login",
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
