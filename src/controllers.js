const db = require("../database/db");

exports.save = (req, res) => {
    const nombre = req.body.nombre;
    const precio = req.body.precio;
    const stock = req.body.stock;

    // console.log(nombre + " " + precio + " " + stock);

    db.query(
        "INSERT INTO productos SET ?",
        {
            nombre: nombre,
            precio: precio,
            stock: stock,
        },
        (error, results) => {
            if (error) {
                console.log(error);
                res.redirect("/admin");
            } else {
                res.redirect("/admin");
            }
        }
    );
};

exports.update = (req, res) => {
    const ref = req.body.ref;
    const nombre = req.body.nombre;
    const precio = req.body.precio;
    const stock = req.body.stock;

    db.query(
        "UPDATE productos SET ? WHERE ref = ?", [{
            nombre: nombre,
            precio: precio,
            stock: stock,
        }
        , ref,
    ],
        (error, results) => {
            if (error) {
                console.log(error);
                res.redirect("/admin");
            } else {
                res.redirect("/admin");
            }
        }
    );
};