const express = require('express');
const validator = require('validator');
const {
    registerUser,
    loginUser,
    authenticateToken
} = require('../auth');
const { executeQuery, executeQueryOne } = require('../config');

const router = express.Router();

router.post('/registro', async (req, res) => {
    try {
        const { nombre, email, password, telefono } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: nombre, email, password'
            });
        }

        const emailSanitized = validator.normalizeEmail(email.toLowerCase());

        if (!validator.isEmail(emailSanitized)) {
            return res.status(400).json({
                error: 'El email no es válido'
            });
        }

        if (nombre.length < 3) {
            return res.status(400).json({
                error: 'El nombre debe tener al menos 3 caracteres'
            });
        }

        const newUser = await registerUser({
            nombre: validator.escape(nombre),
            email: emailSanitized,
            password: password,
            telefono: telefono ? validator.escape(telefono) : null
        });

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser
        });

    } catch (error) {
        console.error('Error en registro:', error.message);

        if (error.message.includes('ya está registrado')) {
            return res.status(409).json({ error: 'El email ya está registrado' });
        }

        if (error.message.includes('mínimo 8 caracteres')) {
            return res.status(400).json({ error: 'Contraseña muy corta (mín. 8 caracteres)' });
        }

        res.status(500).json({
            error: 'Error al registrar usuario: ' + error.message
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email y contraseña requeridos'
            });
        }

        const emailSanitized = validator.normalizeEmail(email.toLowerCase());

        const user = await loginUser(emailSanitized, password);

        console.log(`✅ Login exitoso: ${emailSanitized}`);

        res.json({
            message: 'Login exitoso',
            user: user
        });

    } catch (error) {
        console.warn(`⚠️ Intento de login fallido: ${req.body.email}`);

        res.status(401).json({
            error: 'Email o contraseña incorrectos'
        });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await executeQueryOne(
            'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            userId: user.id,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            activo: user.activo
        });

    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {

        console.log(`🚪 Logout: usuario ${req.user.userId}`);

        res.json({ message: 'Logout exitoso' });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

module.exports = router;
