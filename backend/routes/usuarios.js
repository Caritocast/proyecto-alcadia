const express = require('express');
const validator = require('validator');
const { authenticateToken, authorizeRole, hashPassword } = require('../auth');
const { executeQuery, executeQueryOne } = require('../config');

const router = express.Router();

function isMissingReportesTable(error) {
    return error && (error.code === 'ER_NO_SUCH_TABLE' || String(error.message || '').includes("reportes"));
}

/**
 * ============================================================================
 * GET /api/usuarios
 * Listar todos los usuarios (solo admin)
 * 
 * Query parameters:
 * ?rol=ciudadano         - Filtrar por rol
 * ?activo=true           - Solo activos
 * ?search=juan           - Buscar por nombre o email
 * ?page=1&limit=20
 * ============================================================================
 */
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { rol, activo, search, page = 1, limit = 20 } = req.query;

        let query = `
            SELECT id, nombre, email, telefono, rol, activo, 
                   fecha_registro, ultima_sesion,
                   (SELECT COUNT(*) FROM reportes WHERE usuario_id = usuarios.id) as total_reportes
            FROM usuarios
            WHERE 1=1
        `;
        const params = [];

        if (rol) {
            query += ' AND rol = ?';
            params.push(rol);
        }

        if (activo !== undefined) {
            query += ' AND activo = ?';
            params.push(activo === 'true' ? 1 : 0);
        }

        if (search) {
            query += ' AND (nombre LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Contar total
        const [{ total }] = await executeQuery(
            `SELECT COUNT(*) as total FROM (${query}) as temp`,
            params
        );

        // Paginar
        const offset = (page - 1) * limit;
        query += ' ORDER BY fecha_registro DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        let usuarios = [];
        try {
            usuarios = await executeQuery(query, params);
        } catch (queryError) {
            if (isMissingReportesTable(queryError)) {
                let fallbackQuery = `
                    SELECT id, nombre, email, telefono, rol, activo, fecha_registro, ultima_sesion,
                           0 as total_reportes
                    FROM usuarios
                    WHERE 1=1
                `;
                const fallbackParams = [];

                if (rol) {
                    fallbackQuery += ' AND rol = ?';
                    fallbackParams.push(rol);
                }
                if (activo !== undefined) {
                    fallbackQuery += ' AND activo = ?';
                    fallbackParams.push(activo === 'true' ? 1 : 0);
                }
                if (search) {
                    fallbackQuery += ' AND (nombre LIKE ? OR email LIKE ?)';
                    const searchTerm = `%${search}%`;
                    fallbackParams.push(searchTerm, searchTerm);
                }

                const offset = (page - 1) * limit;
                fallbackQuery += ' ORDER BY fecha_registro DESC LIMIT ? OFFSET ?';
                fallbackParams.push(parseInt(limit), offset);

                usuarios = await executeQuery(fallbackQuery, fallbackParams);
            } else {
                throw queryError;
            }
        }

        res.json({
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            usuarios: usuarios.map(u => ({
                ...u,
                // No devolver hash de contraseña por seguridad
                password_hash: undefined
            }))
        });

    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

/**
 * ============================================================================
 * GET /api/usuarios/:id
 * Obtener un usuario específico
 * - Admin puede ver cualquiera
 * - Usuario regular solo puede ver su propio perfil
 * ============================================================================
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Permisos: admin o es el mismo usuario
        if (req.user.rol !== 'admin' && req.user.userId !== parseInt(id)) {
            return res.status(403).json({
                error: 'No tienes permiso para ver este usuario'
            });
        }

        let usuario;
        try {
            usuario = await executeQueryOne(
                `SELECT id, nombre, email, telefono, rol, activo, fecha_registro, ultima_sesion,
                        (SELECT COUNT(*) FROM reportes WHERE usuario_id = usuarios.id) as total_reportes
                 FROM usuarios
                 WHERE id = ?`,
                [id]
            );
        } catch (queryError) {
            if (isMissingReportesTable(queryError)) {
                usuario = await executeQueryOne(
                    `SELECT id, nombre, email, telefono, rol, activo, fecha_registro, ultima_sesion,
                            0 as total_reportes
                     FROM usuarios
                     WHERE id = ?`,
                    [id]
                );
            } else {
                throw queryError;
            }
        }

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuario);

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

/**
 * ============================================================================
 * PUT /api/usuarios/:id
 * Actualizar un usuario
 * 
 * Body JSON:
 * {
 *   "nombre": "Juan Pérez García",
 *   "telefono": "3101234567"
 * }
 * 
 * Admin puede cambiar también:
 * {
 *   "rol": "moderador",
 *   "activo": false
 * }
 * ============================================================================
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, rol, activo, password_actual, password_nuevo } = req.body;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Obtener usuario actual
        const usuario = await executeQueryOne(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Permisos: admin o es el mismo usuario
        if (req.user.rol !== 'admin' && req.user.userId !== parseInt(id)) {
            return res.status(403).json({
                error: 'No tienes permiso para actualizar este usuario'
            });
        }

        // Preparar actualización
        let updateFields = [];
        let updateValues = [];

        // Campos que cualquiera puede actualizar de sí mismo
        if (nombre && nombre.length >= 3) {
            updateFields.push('nombre = ?');
            updateValues.push(validator.escape(nombre));
        }

        if (telefono !== undefined) {
            updateFields.push('telefono = ?');
            updateValues.push(telefono ? validator.escape(telefono) : null);
        }

        // Cambiar contraseña
        if (password_actual && password_nuevo) {
            // Usuario regular debe conocer su contraseña actual
            if (req.user.rol !== 'admin' && req.user.userId === parseInt(id)) {
                const bcrypt = require('bcryptjs');
                const isValid = await bcrypt.compare(password_actual, usuario.password_hash);

                if (!isValid) {
                    return res.status(401).json({
                        error: 'Contraseña actual incorrecta'
                    });
                }
            }

            if (password_nuevo.length < 8) {
                return res.status(400).json({
                    error: 'Nueva contraseña debe tener mínimo 8 caracteres'
                });
            }

            const newHash = await hashPassword(password_nuevo);
            updateFields.push('password_hash = ?');
            updateValues.push(newHash);
        }

        // Campos que solo admin puede actualizar
        if (req.user.rol === 'admin') {
            if (rol) {
                const rolesValidos = ['ciudadano', 'admin', 'moderador'];
                if (!rolesValidos.includes(rol)) {
                    return res.status(400).json({ error: 'Rol inválido' });
                }
                updateFields.push('rol = ?');
                updateValues.push(rol);
            }

            if (activo !== undefined) {
                updateFields.push('activo = ?');
                updateValues.push(activo ? 1 : 0);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updateValues.push(id);

        await executeQuery(
            `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        const usuarioActualizado = await executeQueryOne(
            'SELECT id, nombre, email, telefono, rol, activo FROM usuarios WHERE id = ?',
            [id]
        );

        console.log(`✏️ Usuario actualizado: ${id}`);

        res.json({
            message: 'Usuario actualizado',
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

/**
 * ============================================================================
 * DELETE /api/usuarios/:id
 * Eliminar un usuario (solo admin)
 * 
 * Nota: Usa ON DELETE CASCADE en la BD
 * Cuando se borra el usuario, se borran automáticamente sus reportes, etc.
 * ============================================================================
 */
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // No puedes borrarte a ti mismo
        if (req.user.userId === parseInt(id)) {
            return res.status(400).json({
                error: 'No puedes eliminar tu propia cuenta'
            });
        }

        const usuario = await executeQueryOne(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await executeQuery('DELETE FROM usuarios WHERE id = ?', [id]);

        console.log(`🗑️ Usuario eliminado: ${id} (${usuario.email})`);

        res.json({ message: 'Usuario eliminado' });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

/**
 * ============================================================================
 * GET /api/usuarios/:id/reportes
 * Obtener todos los reportes de un usuario
 * ============================================================================
 */
router.get('/:id/reportes', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = Number.parseInt(page, 10);
        const limitNumber = Number.parseInt(limit, 10);

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            return res.status(400).json({ error: 'Parámetro page inválido' });
        }

        if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100) {
            return res.status(400).json({ error: 'Parámetro limit inválido (1-100)' });
        }

        // Verificar que usuario existe
        const usuario = await executeQueryOne(
            'SELECT id FROM usuarios WHERE id = ?',
            [id]
        );

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        let total = 0;
        let reportes = [];
        try {
            // Contar total de reportes
            const totalResult = await executeQuery(
                'SELECT COUNT(*) as total FROM reportes WHERE usuario_id = ?',
                [id]
            );
            total = totalResult[0]?.total || 0;

            // Obtener reportes paginados
            const offset = (pageNumber - 1) * limitNumber;
            reportes = await executeQuery(
                `SELECT * FROM reportes 
                 WHERE usuario_id = ? 
                 ORDER BY fecha_creacion DESC 
                 LIMIT ${limitNumber} OFFSET ${offset}`,
                [id]
            );
        } catch (queryError) {
            if (!isMissingReportesTable(queryError)) {
                throw queryError;
            }
            total = 0;
            reportes = [];
        }

        res.json({
            total,
            page: pageNumber,
            limit: limitNumber,
            reportes
        });

    } catch (error) {
        console.error('Error obteniendo reportes del usuario:', error);
        res.status(500).json({ error: 'Error al obtener reportes' });
    }
});

module.exports = router;

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿CASCADA DE ELIMINACIÓN (ON DELETE CASCADE)?
 * Cuando eliminas usuario:
 * - BD automáticamente elimina todos sus reportes
 * - Evita datos huérfanos
 * - Definido en FOREIGN KEY en setup.sql
 * 
 * ¿SEGURIDAD EN CAMBIO DE CONTRASEÑA?
 * Usuario regular debe proporcionar:
 * 1. password_actual: verifica que conoce su password
 * 2. password_nuevo: nueva contraseña a establecer
 * 
 * Flow seguro:
 * 1. Cliente envía password_actual y password_nuevo
 * 2. Server hashea password_actual, compara con lo que hay en BD
 * 3. Si coincide, hashea password_nuevo y lo almacena
 * 4. Nunca transmitir password en plain text (usar HTTPS)
 * 
 * ¿PROTECCIÓN DE DATOS SENSIBLES?
 * - No devolver password_hash en respuestas JSON
 * - No loguear passwords
 * - Usar HTTPS siempre
 * - Validar en backend (nunca confiar en frontend)
 * 
 * ¿ROLES Y PERMISOS?
 * - ciudadano: usuario regular, solo ve/edita sus propios reportes
 * - moderador: revisa reportes, puede responder (futuro)
 * - admin: acceso completo, gestiona usuarios y datos
 * 
 * ¿AUDITORIA?
 * Cada usuario tiene:
 * - fecha_registro: cuándo se creó cuenta
 * - ultima_sesion: cuándo fue el último login
 * - Sirve para detectar cuentas inactivas o comportamientos sospechosos
 */
