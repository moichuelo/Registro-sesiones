const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // límite de peticiones
    // message: "Demasiadas solicitudes, por favor intente nuevamente luego.",
    handler: (req, res) => {
        res.status(429);
        res.render("errorLimit", {
            mensaje: "Demasiadas solicitudes, por favor intente nuevamente luego."
        });
    }
});

module.exports = limiter;