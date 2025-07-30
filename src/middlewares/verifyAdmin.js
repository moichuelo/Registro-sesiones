const jwt = require("jsonwebtoken");

/**
 * Middleware para verificar si el usuario es admin
 * *********************************
 * verifica que el usuario tenga el rol de admin, en caso contrario redirige al login con el error 403
 * 
 * Flujo: 
 * -Extrae el token
 * - si no hay token responde acceso denegado
 * - comprueba la validez del token
 * ...
 * 
 * @function
 * @name verifyAdmin
 * @param {object} req 
 * @param {object} res 
 * @param {Function} next - función para pasar al siguiente middleware
 * @returns {void}
 * @exports verifyAdmin
 */
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