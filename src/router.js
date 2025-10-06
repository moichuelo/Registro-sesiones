const express = require("express");
const router = express();
const bcrypt = require("bcryptjs");
const db = require("../database/db");
const { body, validationResult } = require("express-validator");
const crud = require("../src/controllers");
const jwt = require("jsonwebtoken");
const verificarSesion = require("./middlewares/verifyToken");
const verificarAdmin = require("./middlewares/verifyAdmin");
const upload = require("./middlewares/multerConfig");
const limiter = require("./middlewares/authLimiter");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");
const PDFDocument = require("pdfkit");

//9 4 Definir las rutas

/**
 * @swagger
 * /:
 *   get:
 *     summary: Renderiza la página de inicio con el estado de autenticación del usuario
 *     description: Verifica si el usuario tiene un token JWT válido en las cookies y, en función de eso, renderiza la página de inicio con los datos del usuario o un mensaje de que debe iniciar sesión.
 *     tags:
 *       - Inicio
 *     responses:
 *       200:
 *         description: Página de inicio renderizada el nombre de usuario en caso de estar registrado o por el contrario con un botón de iniciar sesión
 *
 *
 *     cookies:
 *       - name: token
 *         description: Token JWT usado para verificar la autenticación del usuario
 *         required: false
 *         schema:
 *           type: string
 *           example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvY8OqbiBDb21wdXQiLCJpYXQiOjE1MTYyMzkwMjJ9.dGzP9wE9FcP3EwAq78rGbPI5o7OlPZ_VdJ0eP_fLfhQ'
 */
router.get("/", (req, res) => {
    if (req.cookies.token) {
        const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        req.user = payload;
        res.render("index", {
            user: req.user?.name || U,
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
    if (req.cookies.token) {
        res.render("login", {
            login: true,
        });
    } else {
        res.render("login", {
            login: false,
        });
    }
});

router.get("/registro", (req, res) => {
    if (req.cookies.token) {
        res.render("register", {
            login: true,
        });
    } else {
        res.render("register", {
            login: false,
        });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/");
});

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: Página de administración
 *     description: Renderiza la vista admin con los productos y el usuario logueado
 *     tags:
 *       - Administración
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Vista HTML con datos de productos y usuario
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: |
 *                 <!-- Renderiza la vista admin con los siguientes datos -->
 *                 {
 *                   "productos": [
 *                     {
 *                       ref: "int(11) NOT NULL AUTO_INCREMENT",
 *                       nombre: "varchar(30) NOT NULL",
 *                       precio: "decimal(10,2) NOT NULL",
 *                       stock: "int(11) NULL"
 *                     }
 *                   ],
 *                   "login": true,
 *                   "rol": "admin"
 *                 }
 *       401:
 *         description: Token inválido o ausente, redirige a iniciar sesión (`login`),
 *       500:
 *         description: Error del servidor o en la consulta a la base de datos, redirige a iniciar sesión (`login`)
 */

router.get("/admin", verificarSesion, (req, res) => {
    db.query("SELECT * FROM productos", (error, results) => {
        if (error) {
            throw error;
        } else {
            res.render("admin", {
                productos: results,
                login: true,
                rol: req.user.rol,
                user: req.user,
            });
        }
    });
});

router.get("/pdfAdmin", verificarSesion, (req, res) => {
    db.query("SELECT * FROM productos", (error, results) => {
        if (error) {
            throw error;
        } else {
            res.render("pdfTabla", {
                productos: results,
            });
        }
    });
});

router.get("/create", verificarAdmin, (req, res) => {
    if (req.cookies.token) {
        res.render("create", {
            login: true,
        });
    } else {
        res.redirect("/");
    }
});

/**
 * @swagger
 * /edit/{id}:
 *   get:
 *     summary: Renderiza el formulario de edición de un producto
 *     description: Obtiene un producto por su referencia (`ref`) y renderiza la vista `edit` con sus datos.
 *     tags:
 *       - Editar un producto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Referencia única del producto, que obtenemos de la URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vista con el formulario de edición del producto
 *       404:
 *         description: Producto no encontrado
 *       500:
 *         description: Error al consultar la base de datos
 */
router.get("/edit/:ref", verificarAdmin, (req, res) => {
    const ref = req.params.ref;
    db.query(
        "SELECT * FROM productos WHERE ref = ?",
        [ref],
        (error, results) => {
            if (error) {
                throw error;
            } else {
                res.render("edit", {
                    producto: results[0],
                    login: true,
                });
            }
        }
    );
});

router.get("/delete/:ref", verificarAdmin, (req, res) => {
    const ref = req.params.ref;
    db.query("DELETE FROM productos WHERE ref = ?", [ref], (error, results) => {
        if (error) {
            throw error;
        } else {
            res.redirect("/admin");
        }
    });
});

router.get("/soporte", verificarSesion, (req, res) => {
    res.render("soporte", {
        user: {
            username: req.user.user,
            role: req.user.rol,
        },
    });
});

router.get("/api/mensajes", verificarAdmin, (req, res) => {
    const usuario = req.query.con; // Extrae el usuario desde la url (...?con=usuarioX)

    if (!usuario) {
        //si no hay usuario que devuelva el error
        return res
            .status(400)
            .json({ error: "Falta el parámetro ?con=usuario" });
    }

    const sql = `
    SELECT de_usuario, para_usuario, mensaje, fecha
    FROM mensajes
    WHERE 
      (de_usuario = ? OR para_usuario = ?)
    ORDER BY fecha ASC
    `;

    db.query(sql, [usuario, usuario], (err, results) => {
        if (err) {
            console.error("❌ Error al consultar mensajes:", err);
            return res.status(500).json({ error: "Error al obtener mensajes" });
        }

        // Devuelve los mensajes en formato JSON
        res.json(results);
    });
});

router.get("/api/mensajes/mios", verificarSesion, (req, res) => {
    const usuario = req.user.user;

    const sql = `
    SELECT de_usuario, para_usuario, mensaje, fecha
    FROM mensajes
    WHERE 
      (de_usuario = ? OR para_usuario = ?)
    ORDER BY fecha ASC
    `;

    db.query(sql, [usuario, usuario], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener mensajes:", err);
            return res.status(500).json({ error: "Error interno" });
        }

        // Devuelve los mensajes en formato JSON
        res.json(results);
    });
});

router.get("/api/usuarios-conversaciones", verificarAdmin, (req, res) => {
    /*Busca mensajes donde participen administradores.
    usa UNION para combinar las dos consultas y elimina duplicados
    renombra las dos columnas como "usuario" para poder procesarlas
    filtra los que no son administradores y elimina los duplicados

    Devuelve un array de usuarios
    */
    const sql = `
    SELECT DISTINCT usuario
    FROM (
      SELECT de_usuario AS usuario FROM mensajes
      WHERE para_usuario IN (SELECT usuario FROM usuarios WHERE rol = 'admin')
      
      UNION
      
      SELECT para_usuario AS usuario FROM mensajes
      WHERE de_usuario IN (SELECT usuario FROM usuarios WHERE rol = 'admin')
    ) AS conversaciones
    WHERE usuario NOT IN (SELECT usuario FROM usuarios WHERE rol = 'admin')
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ Error al obtener lista de usuarios:", err);
            return res.status(500).json({ error: "Error interno" });
        }

        const usuarios = results.map((r) => r.usuario); // Extrae los nombres de los usuarios
        res.json(usuarios); //los devuelve en formato JSON
    });
});

router.get("/pdfProductos", verificarSesion, async (req, res) => {
    //ruta para generar el pdf con puppeteer
    db.query("SELECT * FROM productos", async (error, results) => {
        if (error) {
            throw error;
        } //obtenemos todos los productos de la BBDD

        try {
            //renderizamos el archivo ejs y lo guardamos en una constante
            const html = await ejs.renderFile(
                path.join(__dirname, "../views/pdfTabla.ejs"),
                { productos: results }
            );

            const browser = await puppeteer.launch({
                //generamos el navegador
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            });

            const page = await browser.newPage(); //creamos una nueva pagina
            await page.setContent(html, { waitUntil: "networkidle0" }); //cargamos el html en la página

            const pdfBuffer = await page.pdf({
                //generamos el pdf sobre la información que hay en el navegador virtual
                format: "A4",
                printBackground: true,
                margin: {
                    top: "1cm",
                    right: "1cm",
                    bottom: "1cm",
                    left: "1cm",
                },
            });

            await browser.close(); //cerramos el navegador

            res.setHeader("Content-Type", "application/pdf"); //establece el tipo de contenido
            res.setHeader(
                "Content-Disposition",
                "attachment; filename=productos.pdf"
            ); //establece el nombre del archivo
            res.send(pdfBuffer); //envia el archivo
        } catch (error) {
            console.error("Error al generar el PDF:", error);
            res.status(500).send("Error al generar el PDF");
        }
    });
});

router.get("/pdfProductosKIT", verificarSesion, (req, res) => {
    //ruta para generar el pdf con pdfkit
    db.query("SELECT * FROM productos", async (error, results) => {
        if (error) {
            throw error;
        } //obtenemos todos los productos de la BBDD

        const doc = new PDFDocument({ margin: 40, size: "A4" }); //creamos un nuevo documento

        //definir los encabezados
        res.setHeader("Content-Type", "application/pdf"); //establece el tipo de contenido
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=productosKit.pdf"
        ); //establece el nombre del archivo

        doc.pipe(res); //envia el archivo

        //título
        doc.fontSize(25)
            .text("Listado productos", { align: "center" })
            .moveDown(); //establece el título y hace un salto de línea con moveDown

        //encabezados de la tabla
        doc.font("Helvetica-Bold").fontSize(15); //establece la fuente y el tamaño para las siguientes líneas
        let y = doc.y; //obtenemos la coordenada y actual del documento
        doc.text("Referencia", 50, y); //añadimos los encabezados a las coordenadas x e y
        doc.text("Nombre", 150, y);
        doc.text("Precio", 300, y);
        doc.text("Stock", 400, y);

        //añadimos espaciado vertical en y
        y = y + 20;

        //cuerpo
        doc.font("Helvetica").fontSize(12); //establece la fuente y el tamaño para las siguientes líneas
        results.forEach((producto) => {
            //recorremos el array de resultados de la BBDD e introducimos los datos en el documento
            doc.text(producto.ref, 50, y);
            doc.text(producto.nombre, 150, y);
            doc.text(producto.precio, 300, y);
            doc.text(producto.stock, 400, y);
            y = y + 20; //añadimos espaciado vertical en y tras cada producto
        });

        doc.end(); //terminamos el documento
    });
});

router.get("/set-lang/:lang", (req, res) => {
    const lang = req.params.lang; //capturamos el parámetro lang de la ruta
    const returnTo = req.query.returnTo || "/"; //capturamos el parámetro returnTo de la URL

    if (["es", "en"].includes(lang)) {
        res.cookie("lang", lang, { maxAge: 900000, httpOnly: true }); //establecemos la cookie con el idioma seleccionado
    }

    res.redirect(returnTo);
});

//9 ******************************************************************************************************
//9 ******************************************************************************************************
//9 8 Definir las rutas POST
//9 ******************************************************************************************************
//9 ******************************************************************************************************

router.post(
    "/register",
    limiter,
    upload.single("profileImage"),
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
            // const email = req.body.email;
            // const edad = req.body.edad;
            const profileImage = req.file.filename;

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
                    imagen: profileImage,
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

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Autentica al usuario y establece una cookie JWT
 *     description: Valida las credenciales del usuario. Si son correctas, genera un token JWT y lo guarda en una cookie HTTP (`token`). Luego renderiza la vista `/`.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - pass
 *             properties:
 *               user:
 *                 type: string
 *                 description: Nombre de usuario
 *               pass:
 *                 type: string
 *                 description: Contraseña del usuario
 *     responses:
 *       200:
 *         description: Autenticación exitosa. Se establece una cookie JWT y se renderiza la vista `/`.
 *         headers:
 *           Set-Cookie:
 *             description: Cookie HTTP que contiene el JWT (token válido por 1 hora)
 *             schema:
 *               type: string
 *               example: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Max-Age=3600
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html>...</html>"
 *       400:
 *         description: Usuario o contraseña faltantes
 *       401:
 *         description: Credenciales incorrectas
 *       500:
 *         description: Error interno del servidor o de base de datos
 */

router.post("/auth", limiter, async (req, res) => {
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
                    return res.render("login", {
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
                    const payload = {
                        //creamos el cuerpo del token
                        user: results[0].usuario,
                        name: results[0].nombre,
                        rol: results[0].rol,
                        imagen: results[0].imagen,
                    };

                    // creamos el token con su firma y su duración
                    const token = jwt.sign(payload, process.env.JWT_SECRET, {
                        expiresIn: "1d",
                    });

                    res.cookie("token", token, {
                        maxAge: 86400000,
                        httpOnly: true,
                        secure: false,
                    });

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
router.post("/update", crud.update);

module.exports = router;
