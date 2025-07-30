const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración de Swagger
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Documentación de la API',
            version: '1.0.0',
            description: 'API documentada con Swagger en Express',
        },
        servers: [
            {
                url: 'http://localhost:4000',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token', // nombre de la cookie donde guardas el JWT
                },
            },
        },
        security: [
            {
                cookieAuth: [],
            },
        ],
    },
    apis: ['./src/router.js', './src/controllers.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
    swaggerUi,
    swaggerSpec,
};