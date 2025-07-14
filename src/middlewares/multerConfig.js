//importamos las librerías
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({ //configuramos el almacenamiento
    destination: function (req, file, cb) {
        cb(null, "public/uploads/"); //definimos la ruta
    },
    filename: function (req, file, cb) {//definimos el nombre
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9); //fecha actual en milisegundos + numero aleatorio
        cb(null, uniqueName + path.extname(file.originalname)); //concatenamos el número con su extenión
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpg|jpeg|png|gif/;
        const isMime = allowedTypes.test(file.mimetype);
        const isExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());

        if (isMime && isExt) {
            return cb(null, true);
        } else {
            return cb(new Error("Tipo de archivo no permitido"));
        }
    }
});

module.exports = upload;
