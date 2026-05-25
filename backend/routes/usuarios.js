const express = require('express');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, executeQuery, executeQueryOne } = require('../config');
const { authenticateToken, authorizeRole } = require('../auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clave-secreta-supersegura';

// 📌 Registro
router.post('/registro', async (req, res) => {
    const { nombre, email, telefono, password } = req.body;

    try {
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO usuarios (nombre, email, telefono, password) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, telefono',
            [nombre, email, telefono || null, hashedPassword]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user });
    } catch (error) {
        console.error('❌ Error al registrar usuario:', error.message);
        res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
    }
});

// 📌 Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT id, nombre, email, telefono, password FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        delete user.password;

        res.json({ token, user });
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        res.status(500).json({ error: 'Error en login: ' + error.message });
    }
});

// 📌 Listar usuarios (solo admin)
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, email, telefono, rol, activo, fecha_registro FROM usuarios ORDER BY fecha_registro DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error listando usuarios:', error.message);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

// 📌 Obtener usuario por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const result = await pool.query('SELECT id, nombre, email, telefono, rol, activo, fecha_registro FROM usuarios WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo usuario:', error.message);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// 📌 Actualizar usuario
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, rol, activo } = req.body;

        let updateFields = [];
        let updateValues = [];

        if (nombre) {
            updateFields.push('nombre = $' + (updateValues.length + 1));
            updateValues.push(nombre);
        }

        if (telefono) {
            updateFields.push('telefono = $' + (updateValues.length + 1));
            updateValues.push(telefono);
        }

        if (rol) {
            updateFields.push('rol = $' + (updateValues.length + 1));
            updateValues.push(rol);
        }

        if (activo !== undefined) {
            updateFields.push('activo = $' + (updateValues.length + 1));
            updateValues.push(activo);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updateValues.push(id);

        await pool.query(`UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${updateValues.length}`, updateValues);

        const result = await pool.query('SELECT id, nombre, email, telefono, rol, activo FROM usuarios WHERE id = $1', [id]);
        res.json({ message: 'Usuario actualizado', usuario: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando usuario:', error.message);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// 📌 Eliminar usuario (solo admin)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error eliminando usuario:', error.message);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

module.exports = router;
