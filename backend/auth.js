const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery, executeQueryOne } = require('./config');
require('dotenv').config();


async function hashPassword(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (error) {
        console.warn('⚠️ Token inválido:', error.message);
        return null;
    }
}

async function registerUser(userData) {
    const { nombre, email, password, telefono } = userData;

    if (!nombre || !email || !password) {
        throw new Error('Faltan datos requeridos: nombre, email, password');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Email inválido');
    }

    if (password.length < 8) {
        throw new Error('La contraseña debe tener mínimo 8 caracteres');
    }

    const existingUser = await executeQueryOne(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
    );

    if (existingUser) {
        throw new Error('El email ya está registrado');
    }

    const passwordHash = await hashPassword(password);

    try {
        const result = await executeQuery(
            `INSERT INTO usuarios (nombre, email, password_hash, telefono, rol) 
            VALUES ($1, $2, $3, $4, 'ciudadano')`,
            [nombre, email, password, telefono || null]
        );

        const userId = result.insertId;

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

async function loginUser(email, password) {
    if (!email || !password) {
        throw new Error('Email y contraseña requeridos');
    }

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

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
        throw new Error('Email o contraseña incorrectos');
    }

    await executeQuery(
        'UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?',
        [user.id]
    );

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

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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
