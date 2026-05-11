/**
 * ============================================================================
 * AUTENTICACIÓN Y AUTORIZACIÓN
 * ============================================================================
 * Gestiona:
 * - Hashing de contraseñas con bcrypt
 * - Generación de JWT (tokens)
 * - Validación de tokens
 * - Middleware de protección de rutas
 * ============================================================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeQueryOne } = require('./config');
require('dotenv').config();

/**
 * SHA las contraseñas con bcrypt (algoritmo de hashing seguro)
 * Bcrypt es lento adrede: tarda ~100ms, hace ataques de fuerza bruta impracticables
 * 
 * @param {string} password - Contraseña en plano
 * @returns {Promise<string>} - Hash bcrypt
 * 
 * EJEMPLO:
 * const hash = await hashPassword('mi_contraseña123');
 * // $2b$10$SlY.jFAk.xCJZxTcZzE9...
 */
async function hashPassword(password) {
    const saltRounds = 10; // Controla "lentitud" de bcrypt (más = más seguro pero más lento)
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compara una contraseña en plano con su hash
 * Devuelve true si coinciden, false si no
 * 
 * @param {string} password - Contraseña en plano (que escribió el usuario)
 * @param {string} hash - Hash almacenado en BD
 * @returns {Promise<boolean>}
 */
async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Genera un JWT (token de sesión)
 * El token contiene datos del usuario y expira en el tiempo especificado
 * 
 * ESTRUCTURA DEL JWT:
 * - Header: tipo de token y algoritmo (base64)
 * - Payload: datos (userId, email, rol) (base64)
 * - Signature: hash del header + payload + secret (verifica autenticidad)
 * 
 * @param {object} payload - Datos a incluir en el token {userId, email, rol}
 * @returns {string} - Token JWT
 */
function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
}

/**
 * Verifica y decodifica un JWT
 * 
 * @param {string} token 
 * @returns {object|null} - Payload si es válido, null si expiró o es inválido
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
        console.warn('⚠️ Token inválido:', error.message);
        return null;
    }
}

/**
 * Registra un nuevo usuario
 * 
 * @param {object} userData - {nombre, email, password, telefono}
 * @returns {Promise<object>} - {id, email, token}
 * 
 * FLUJO:
 * 1. Valida que email no exista
 * 2. Hashea contraseña con bcrypt
 * 3. Inserta en BD
 * 4. Genera JWT
 * 5. Retorna datos del usuario
 */
async function registerUser(userData) {
    const { nombre, email, password, telefono } = userData;

    // Validaciones básicas
    if (!nombre || !email || !password) {
        throw new Error('Faltan datos requeridos: nombre, email, password');
    }

    // Valida formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Email inválido');
    }

    // Valida que contraseña tenga mínimo 8 caracteres
    if (password.length < 8) {
        throw new Error('La contraseña debe tener mínimo 8 caracteres');
    }

    // Verificar que email no exista
    const existingUser = await executeQueryOne(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
    );

    if (existingUser) {
        throw new Error('El email ya está registrado');
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password);

    // Insertar en BD
    try {
        const result = await executeQuery(
            `INSERT INTO usuarios (nombre, email, password_hash, telefono, rol) 
             VALUES (?, ?, ?, ?, 'ciudadano')`,
            [nombre, email, passwordHash, telefono || null]
        );

        const userId = result.insertId;

        // Generar token
        const token = generateToken({
            userId: userId,
            email: email,
            rol: 'ciudadano'
        });

        return {
            id: userId,
            nombre: nombre,
            email: email,
            rol: 'ciudadano',
            token: token
        };
    } catch (error) {
        throw new Error('Error al registrar usuario: ' + error.message);
    }
}

/**
 * Login: autentica usuario y retorna JWT
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} - {userId, email, rol, token}
 * 
 * FLUJO:
 * 1. Busca usuario por email
 * 2. Compara contraseña
 * 3. Actualiza última_sesión
 * 4. Genera JWT
 */
async function loginUser(email, password) {
    if (!email || !password) {
        throw new Error('Email y contraseña requeridos');
    }

    // Buscar usuario
    const user = await executeQueryOne(
        'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
        [email]
    );

    if (!user) {
        throw new Error('Email o contraseña incorrectos');
    }

    if (!user.activo) {
        throw new Error('Cuenta desactivada. Contacta al administrador.');
    }

    // Comparar contraseña
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
        throw new Error('Email o contraseña incorrectos');
    }

    // Actualizar última sesión
    await executeQuery(
        'UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?',
        [user.id]
    );

    // Generar token
    const token = generateToken({
        userId: user.id,
        email: user.email,
        rol: user.rol
    });

    return {
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: token
    };
}

/**
 * Middleware Express para proteger rutas
 * Valida que el request tenga un JWT válido
 * 
 * USO:
 * router.post('/reportes', authenticateToken, crearReporte);
 * 
 * Si token es válido:
 * - req.user tendrá los datos del usuario
 * - Continúa con la ruta
 * 
 * Si token es inválido/falta:
 * - Responde con 401 Unauthorized
 */
function authenticateToken(req, res, next) {
    // El token viene en el header: "Authorization: Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrae la parte después de "Bearer "

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    req.user = payload;
    next();
}

/**
 * Middleware para verificar rol del usuario
 * 
 * EJEMPLO:
 * router.delete('/usuarios/:id', 
 *   authenticateToken, 
 *   authorizeRole('admin'), 
 *   deleteUsuario
 * );
 */
function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!allowedRoles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Permiso denegado' });
        }

        next();
    };
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    registerUser,
    loginUser,
    authenticateToken,
    authorizeRole
};

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿QUÉ ES BCRYPT?
 * - Algoritmo de hashing criptográfico
 * - A diferencia de MD5 o SHA, es lento adrede
 * - MD5: 'password' -> 5f4dcc3b5aa765d61d8327deb882cf99 (NUNCA usar)
 * - Bcrypt: tarda 100ms + es prácticamente imposible revertir
 * - Las contraseñas se hashean una sola vez (al registrar)
 * - En login, se hashea la input y se compara con el hash almacenado
 * 
 * ¿QUÉ ES JWT?
 * - Token que contiene datos del usuario
 * - Se genera en login y se envía al cliente
 * - Cliente lo envía en cada request (header Authorization)
 * - Server verifica que sea válido sin consultar BD (stateless)
 * - Estructura: header.payload.signature (separados por puntos)
 * 
 * ¿STATELESS vs STATEFUL?
 * - Stateful (sesiones clásicas):
 *   - Servidor guarda sessión en memoria/Redis
 *   - Cliente solo tiene sessionId
 *   - Escalabilidad: difícil (múltiples servidores = múltiple estado)
 * - Stateless (JWT):
 *   - Servidor solo verifica la firma del token
 *   - Cliente guarda todo el token
 *   - Escalabilidad: excelente (cualquier servidor puede verificar)
 * 
 * FLOW DE AUTENTICACIÓN:
 * 1. Usuario escribe email y password
 * 2. POST /auth/login { email, password }
 * 3. Server hashea password, compara con hash en BD
 * 4. Si coincide, genera JWT con userId, email, rol
 * 5. Server retorna { token, userId, rol }
 * 6. Cliente guarda token en localStorage o sessionStorage
 * 7. En próximos requests, cliente incluye Authorization: Bearer <token>
 * 8. Server verifica token, extrae userId, y permite la acción
 * 
 * SEGURIDAD:
 * - NUNCA guardar contraseña plana en BD
 * - NUNCA enviar contraseña en URL o params
 * - SIEMPRE usar HTTPS (no HTTP)
 * - SIEMPRE validar en backend (no confiar en frontend)
 * - Tokens deben expirar (que decaygan después de cierto tiempo)
 * - CSRF tokens en formularios POST
 */
