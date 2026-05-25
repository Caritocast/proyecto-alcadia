const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config');

const authRoutes = require('./routes/auth');
const reportesRoutes = require('./routes/reportes');
const contactosRoutes = require('./routes/contactos');
const usuariosRoutes = require('./routes/usuarios');
const traficoRoutes = require('./routes/trafico');
const comentariosRoutes = require('./routes/comentarios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://movilchia.onrender.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiados requests desde esta IP, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Demasiados intentos de login, intenta en 15 minutos',
    skipSuccessfulRequests: true
});

app.use(generalLimiter);


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});


app.use('/api/auth', loginLimiter, authRoutes);


app.use('/api/reportes', reportesRoutes);
app.use('/api/contactos', contactosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/trafico', traficoRoutes);
app.use('/api/comentarios', comentariosRoutes);

app.use(express.static('public'));

app.use('/views', express.static('views'));

app.get('/', (req, res) => {
    const filePath = path.join(__dirname, '..', 'movilidad-chia.html');
    res.sendFile(filePath);
});

app.get('/dashboard', (req, res) => {
    const filePath = path.join(__dirname, '..', 'public', 'dashboard.html');
    res.sendFile(filePath);
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use((error, req, res, next) => {
    console.error('❌ Error no capturado:', error);

    res.status(error.status || 500).json({
        error: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { details: error })
    });
});


async function startServer() {
    try {
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos. Abortando.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 SERVIDOR MOVILIDAD CHÍA INICIADO                      ║
╠════════════════════════════════════════════════════════════╣
║  🌐 http://movilchia.onrender.com:${PORT}
║  📚 API:  https://movilchia.onrender.com${PORT}/api/*
║  🛠️  Ambiente: ${process.env.NODE_ENV || 'development'}
║  🔒 CORS: ${process.env.CORS_ORIGIN || 'https://movilchia.onrender.com'}
╚════════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
