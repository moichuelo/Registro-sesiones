const helmet = require("helmet");

const security = helmet({
    contentSecurityPolicy: false, // desactivada para vistas ejs y scripts
    crossOriginEmbedderPolicy: false, //desactivada para los sockets
});

module.exports = security;