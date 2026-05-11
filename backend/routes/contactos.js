/**
 * ============================================================================
 * RUTAS DE CONTACTOS
 * ============================================================================
 * POST   /api/contactos           - Crear mensaje de contacto
 * GET    /api/contactos           - Listar (solo admin)
 * PUT    /api/contactos/:id       - Marcar como leído (admin)
 * DELETE /api/contactos/:id       - Eliminar (admin)
 * ============================================================================
 */

const express = require('express');
const validator = require('validator');
const { authenticateToken, authorizeRole } = require('../auth');
const { executeQuery, executeQueryOne } = require('../config');

const router = express.Router();

/**
 * ============================================================================
 * POST /api/contactos
 * Enviar un mensaje de contacto (sin requiere autenticación)
 * 
 * Body JSON:
 * {
 *   "nombre": "María García",
 *   "email": "maria@example.com",
 *   "telefono": "3201234567",
 *   "asunto": "Pregunta sobre REGIOTRAM",
 *   "mensaje": "¿Cuándo entra en operación el REGIOTRAM del Norte?"
 * }
 * 
 * RESPUESTA (201):
 * {
 *   "message": "Mensaje enviado exitosamente",
 *   "id": 15
 * }
 * ============================================================================
 */
router.post('/', async (req, res) => {
    try {
        const { nombre, email, telefono, asunto, mensaje } = req.body;

        // VALIDACIÓN
        const errors = [];

        if (!nombre || nombre.length < 3) {
            errors.push('Nombre debe tener al menos 3 caracteres');
        }

        if (!email || !validator.isEmail(email)) {
            errors.push('Email inválido');
        }

        if (!asunto || asunto.length < 5) {
            errors.push('Asunto debe tener al menos 5 caracteres');
        }

        if (!mensaje || mensaje.length < 20) {
            errors.push('Mensaje debe tener al menos 20 caracteres');
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // SANITIZAR
        const data = {
            nombre: validator.escape(nombre.trim()),
            email: validator.normalizeEmail(email.toLowerCase()),
            telefono: telefono ? validator.escape(telefono.trim()) : null,
            asunto: validator.escape(asunto.trim()),
            mensaje: validator.escape(mensaje.trim())
        };

        // VERIFICAR SPAM: máximo 5 mensajes por email en 24 horas
        const [{ count }] = await executeQuery(
            `SELECT COUNT(*) as count FROM contactos 
             WHERE email = ? AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [data.email]
        );

        if (count >= 5) {
            return res.status(429).json({
                error: 'Has superado el límite de mensajes. Intenta de nuevo en 24 horas.'
            });
        }

        // INSERTAR
        const result = await executeQuery(
            `INSERT INTO contactos (nombre, email, telefono, asunto, mensaje)
             VALUES (?, ?, ?, ?, ?)`,
            [data.nombre, data.email, data.telefono, data.asunto, data.mensaje]
        );

        console.log(`📧 Nuevo contacto: ${result.insertId} de ${data.email}`);

        res.status(201).json({
            message: 'Mensaje enviado exitosamente. Te contactaremos pronto.',
            id: result.insertId
        });

    } catch (error) {
        console.error('Error en contacto:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

/**
 * ============================================================================
 * GET /api/contactos
 * Listar todos los mensajes de contacto (solo admin)
 * 
 * Query parameters:
 * ?leido=false          - Solo no leídos
 * ?respondido=true      - Solo respondidos
 * ?page=1&limit=20
 * ============================================================================
 */
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { leido, respondido, page = 1, limit = 20 } = req.query;

        let query = 'SELECT * FROM contactos WHERE 1=1';
        const params = [];

        if (leido !== undefined) {
            query += ' AND leido = ?';
            params.push(leido === 'true' ? 1 : 0);
        }

        if (respondido !== undefined) {
            query += ' AND respondido = ?';
            params.push(respondido === 'true' ? 1 : 0);
        }

        // Contar total
        const [{ total }] = await executeQuery(
            `SELECT COUNT(*) as total FROM (${query}) as temp`,
            params
        );

        // Paginar
        const offset = (page - 1) * limit;
        query += ' ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const contactos = await executeQuery(query, params);

        res.json({
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            contactos
        });

    } catch (error) {
        console.error('Error listando contactos:', error);
        res.status(500).json({ error: 'Error al listar contactos' });
    }
});

/**
 * ============================================================================
 * GET /api/contactos/:id
 * Obtener un contacto específico y marcarlo como leído (admin)
 * ============================================================================
 */
router.get('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const contacto = await executeQueryOne(
            'SELECT * FROM contactos WHERE id = ?',
            [id]
        );

        if (!contacto) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        // Marcar automáticamente como leído
        if (!contacto.leido) {
            await executeQuery(
                'UPDATE contactos SET leido = TRUE WHERE id = ?',
                [id]
            );
            contacto.leido = true;
        }

        res.json(contacto);

    } catch (error) {
        console.error('Error obteniendo contacto:', error);
        res.status(500).json({ error: 'Error al obtener contacto' });
    }
});

/**
 * ============================================================================
 * PUT /api/contactos/:id
 * Actualizar un contacto (responder, marcar estado)
 * 
 * Body JSON:
 * {
 *   "respuesta_admin": "Gracias por tu pregunta...",
 *   "respondido": true
 * }
 * ============================================================================
 */
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { respuesta_admin, respondido, leido } = req.body;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const contacto = await executeQueryOne(
            'SELECT * FROM contactos WHERE id = ?',
            [id]
        );

        if (!contacto) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        // Preparar actualización
        let updateFields = [];
        let updateValues = [];

        if (respuesta_admin) {
            updateFields.push('respuesta_admin = ?');
            updateValues.push(validator.escape(respuesta_admin));
        }

        if (respondido !== undefined) {
            updateFields.push('respondido = ?');
            updateValues.push(respondido ? 1 : 0);
        }

        if (leido !== undefined) {
            updateFields.push('leido = ?');
            updateValues.push(leido ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updateValues.push(id);

        await executeQuery(
            `UPDATE contactos SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        const contactoActualizado = await executeQueryOne(
            'SELECT * FROM contactos WHERE id = ?',
            [id]
        );

        console.log(`✏️ Contacto actualizado: ${id}`);

        res.json({
            message: 'Contacto actualizado',
            contacto: contactoActualizado
        });

    } catch (error) {
        console.error('Error actualizando contacto:', error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

/**
 * ============================================================================
 * DELETE /api/contactos/:id
 * Eliminar un contacto (admin)
 * ============================================================================
 */
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const contacto = await executeQueryOne(
            'SELECT * FROM contactos WHERE id = ?',
            [id]
        );

        if (!contacto) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        await executeQuery('DELETE FROM contactos WHERE id = ?', [id]);

        console.log(`🗑️ Contacto eliminado: ${id}`);

        res.json({ message: 'Contacto eliminado' });

    } catch (error) {
        console.error('Error eliminando contacto:', error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

module.exports = router;

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿CONTENIDO PÚBLICO vs PRIVADO?
 * POST /contactos: público (sin autenticación)
 *   - Formularios de contacto generalmente son abiertos
 *   - Cualquiera puede escribir
 * 
 * GET /contactos: privado (solo admin)
 *   - Mensajes son confidenciales
 *   - Datos de contacto son sensibles
 *   - Requiere autenticación + rol admin
 * 
 * ¿ANTI-SPAM?
 * Limite de 5 mensajes por email en 24 horas
 * SELECT COUNT(*) WHERE email = ? AND fecha_creacion > DATE_SUB(NOW(), INTERVAL 24 HOUR)
 * - Si count >= 5, rechaza
 * - Previene que alguien spamee el formulario
 * 
 * ¿AUTORIZACIÓN?
 * authorizeRole('admin') es middleware que:
 * 1. Verifica que usuario esté autenticado
 * 2. Verifica que rol sea 'admin'
 * 3. Si pasa, continúa; si no, devuelve 403 Forbidden
 * 
 * ¿AUDITORIA?
 * Cada mensaje tiene:
 * - fecha_creacion: cuándo se recibió
 * - leido: si admin lo revisó
 * - respondido: si se respondió
 * - respuesta_admin: qué se respondió
 * 
 * Sirve para:
 * - Saber qué mensajes no han sido leídos
 * - Rastrear si se respondieron
 * - Mantener histórico completo
 */
