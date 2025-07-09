const jwt = require("jsonwebtoken");

function verifyAdmin(req, res, next) {
    const token = req.cookies.token;


    if (!token) {
        return res.redirect("/login");
    }


    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.rol === "admin") {
            req.user = decoded;
            next();
        } else {
            return res.status(403).send({ error: "Acceso denegado" });
        }

    } catch (error) {
        return res.status(403).send({ error: "Token inválido" });
    }
}

module.exports = verifyAdmin;