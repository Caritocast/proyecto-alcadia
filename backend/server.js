/**
 * ============================================================================
 * SERVIDOR PRINCIPAL - MOVILIDAD CHÍA
 * ============================================================================
 * Configura Express, middlewares de seguridad, y rutas API
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config');

/**
 * Importar rutas
 * Se agregan como módulos para mejor organización
 */
const authRoutes = require('./routes/auth');
const reportesRoutes = require('./routes/reportes');
const contactosRoutes = require('./routes/contactos');
const usuariosRoutes = require('./routes/usuarios');
const traficoRoutes = require('./routes/trafico');
const comentariosRoutes = require('./routes/comentarios');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * ============================================================================
 * MIDDLEWARES DE SEGURIDAD
 * ============================================================================
 */

/**
 * Helmet: configura headers HTTP de seguridad
 * - Previene clickjacking (X-Frame-Options)
 * - Desactiva MIME type sniffing (X-Content-Type-Options)
 * - Habilita HSTS (fuerza HTTPS)
 */
app.use(helmet());

/**
 * CORS: permite requests desde ciertos orígenes
 * En desarrollo: permite localhost:3000
 * En producción: solo desde tu dominio
 */
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Rate Limiting: limita número de requests por IP
 * Previene ataques de fuerza bruta y DoS
 * 
 * Límite general: 100 requests por 15 minutos
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: 'Demasiados requests desde esta IP, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate Limiter más estricto para login
 * Previene ataques de diccionario
 * 
 * Límite login: 5 intentos por 15 minutos
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de login, intenta en 15 minutos',
    skipSuccessfulRequests: true // No cuenta logins exitosos
});

app.use(generalLimiter);

/**
 * Body Parser: convierte JSON en objetos JavaScript
 * Limita tamaño de payload a 10MB (previene ataques de negación de servicio)
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Logger middleware: registra cada request (para debugging)
 */
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * ============================================================================
 * RUTAS API
 * ============================================================================
 * /api/auth     - Registro, login, logout
 * /api/reportes - CRUD de reportes
 * /api/contactos - Enviar contacto
 * /api/usuarios - Gestión de usuarios (admin)
 */

// Autenticación
app.use('/api/auth', loginLimiter, authRoutes);

// Recursos
app.use('/api/reportes', reportesRoutes);
app.use('/api/contactos', contactosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/trafico', traficoRoutes);
app.use('/api/comentarios', comentariosRoutes);

/**
 * Servir archivos estáticos (CSS, JS, imágenes)
 * /public/* será accesible en /
 */
app.use(express.static('public'));

/**
 * Servir páginas HTML desde views
 */
app.use('/views', express.static('views'));

/**
 * Ruta raíz: sirve el HTML principal
 */
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, '..', 'movilidad-chia.html');
    res.sendFile(filePath);
});

/**
 * Ruta dashboard: sirve página del dashboard
 */
app.get('/dashboard', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'dashboard.html');
    res.sendFile(filePath);
});

/**
 * ============================================================================
 * MANEJO DE ERRORES
 * ============================================================================
 */

/**
 * Ruta 404: si no coincide ninguna ruta
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

/**
 * Error handler global
 * Captura errores no anticipados
 */
app.use((error, req, res, next) => {
    console.error('❌ Error no capturado:', error);
    
    res.status(error.status || 500).json({
        error: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { details: error })
    });
});

/**
 * ============================================================================
 * INICIAR SERVIDOR
 * ============================================================================
 */

async function startServer() {
    try {
        // Verificar conexión a BD
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos. Abortando.');
            process.exit(1);
        }

        // Iniciar servidor HTTP
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 SERVIDOR MOVILIDAD CHÍA INICIADO                      ║
╠════════════════════════════════════════════════════════════╣
║  🌐 http://localhost:${PORT}
║  📚 API:  http://localhost:${PORT}/api/*
║  🛠️  Ambiente: ${process.env.NODE_ENV || 'development'}
║  🔒 CORS: ${process.env.CORS_ORIGIN || 'localhost:3000'}
╚════════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar si se ejecuta directamente (no si se importa como módulo)
if (require.main === module) {
    startServer();
}

module.exports = app;

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿QUÉ ES EXPRESS?
 * - Framework minimalista para Node.js
 * - Simplifica crear servidores HTTP
 * - Maneja rutas, middlewares, requests/responses
 * 
 * ¿MIDDLEWARES?
 * - Funciones que procesan requests antes de llegar a la ruta
 * - Orden importa
 * - Pueden modificar req/res o terminar la cadena
 * 
 * FLUJO DE UN REQUEST:
 * 1. Cliente envía GET /api/reportes
 * 2. Helmet añade headers de seguridad
 * 3. CORS valida origen
 * 4. Rate limiter chequea IP
 * 5. Body parser convierte JSON
 * 6. Logger registra el request
 * 7. Se ejecuta la ruta correspondiente (/api/reportes)
 * 8. Middleware de error captura cualquier error
 * 9. Se envía respuesta al cliente
 * 
 * ¿POR QUÉ HELMET?
 * Configura headers HTTP que previenen vulnerabilidades:
 * - X-Frame-Options: DENY -> previene clickjacking
 * - X-Content-Type-Options: nosniff -> previene MIME sniffing
 * - Strict-Transport-Security: fuerza HTTPS
 * 
 * ¿POR QUÉ RATE LIMITING?
 * - Ataque de fuerza bruta: 10000 intentos de login/segundo
 * - Con rate limiting: máximo 5 intentos en 15 min
 * - Hace los ataques inviables
 * 
 * ¿STATELESS APIS?
 * - Este servidor NO guarda estado (sessiones)
 * - Cada request es independiente
 * - Usa JWT para autenticar
 * - Ventaja: scales horizontalmente (múltiples servidores)
 * - Desventaja: token debe verificarse en cada request
 * 
 * FLUJO DE ARQUITECTURA:
 * 
 * Client (HTML/JS) 
 *   ↓ 
 * Express Server (server.js)
 *   ├─ Middlewares (seguridad, parsing)
 *   ├─ Rutas (auth, reportes, contactos)
 *   └─ Conecta a MySQL via config.js
 *      ↓
 *     MySQL Database
 * 
 * PRÓXIMOS PASOS:
 * 1. Crear routes/auth.js
 * 2. Crear routes/reportes.js
 * 3. Crear routes/contactos.js
 * 4. Crear routes/usuarios.js
 * 5. Crear frontend JS mejorado
 */
