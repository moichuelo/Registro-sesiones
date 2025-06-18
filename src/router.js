const express = require("express");
const router = express();
const bcrypt = require("bcryptjs");
const db = require("../database/db");
const { body, validationResult } = require("express-validator");

const crud = require("../src/controllers");

//9 4 Definir las rutas
router.get("/", (req, res) => {
    if (req.session.loggedin) {
        res.render("index", {
            user: req.session.name,
            login: true,
        });
    } else {
        res.render("index", {
            user: "Debe iniciar sesión",
            login: false,
        });
    }
});

router.get("/login", (req, res) => {
    res.render("login");
});

router.get("/registro", (req, res) => {
    res.render("register");
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

router.get("/admin", (req, res) => {
    // res.render("admin");
    db.query("SELECT * FROM productos", (error, results) => {
        if (error) {
            throw error;
        } else {
            res.render("admin", {
                productos: results,
            });
        }
    });
});

router.get("/create", (req, res) => {
    res.render("create");
});

//9 8 Definir las rutas POST

router.post(
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
                        });
                    }
                }
            );
        }
    }
);

//Ruta de inicio de sesión
router.post("/auth", async (req, res) => {
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

router.post("/save", crud.save);

module.exports = router;
