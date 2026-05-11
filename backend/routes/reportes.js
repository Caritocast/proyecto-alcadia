/**
 * ============================================================================
 * RUTAS DE REPORTES
 * ============================================================================
 * GET    /api/reportes              - Listar todos (con filtros)
 * GET    /api/reportes/:id          - Obtener uno
 * POST   /api/reportes              - Crear reporte
 * PUT    /api/reportes/:id          - Actualizar
 * DELETE /api/reportes/:id          - Eliminar (solo admin)
 * 
 * CRUD: Create, Read, Update, Delete
 * ============================================================================
 */

const express = require('express');
const validator = require('validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRole } = require('../auth');
const { executeQuery, executeQueryOne } = require('../config');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `reporte-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPG o PNG'), false);
        }
    }
});

/**
 * ============================================================================
 * VALIDADORES PERSONALIZADOS
 * ============================================================================
 */

function validateReporte(data) {
    const errors = [];

    if (!data.titulo || data.titulo.length < 5) {
        errors.push('Título debe tener al menos 5 caracteres');
    }

    if (!data.descripcion || data.descripcion.length < 20) {
        errors.push('Descripción debe tener al menos 20 caracteres');
    }

    const tiposValidos = ['congestión', 'infraestructura', 'transporte_público', 
                         'ciclovía', 'seguridad_vial', 'ambiental', 'conexión_bogotá', 'otro'];
    if (!tiposValidos.includes(data.tipo)) {
        errors.push('Tipo de reporte no válido');
    }

    const severidadesValidas = ['baja', 'media', 'alta', 'crítica'];
    if (!severidadesValidas.includes(data.severidad)) {
        errors.push('Severidad no válida');
    }

    return errors;
}

async function ensureReportesTableExists() {
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS reportes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            usuario_id INT NOT NULL,
            tipo ENUM('congestión', 'infraestructura', 'transporte_público', 'ciclovía',
                      'seguridad_vial', 'ambiental', 'conexión_bogotá', 'otro') NOT NULL,
            severidad ENUM('baja', 'media', 'alta', 'crítica') DEFAULT 'media',
            titulo VARCHAR(200) NOT NULL,
            descripcion TEXT NOT NULL,
            ubicacion VARCHAR(255),
            latitud DECIMAL(10, 8),
            longitud DECIMAL(11, 8),
            imagen_url VARCHAR(255),
            estado ENUM('nuevo', 'en_revisión', 'resuelto', 'rechazado') DEFAULT 'nuevo',
            respuesta_admin TEXT,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            INDEX idx_estado (estado),
            INDEX idx_tipo (tipo),
            INDEX idx_fecha (fecha_creacion),
            INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

/**
 * ============================================================================
 * GET /api/reportes
 * Listar reportes con filtros opcionales
 * 
 * Query parameters:
 * ?estado=nuevo
 * ?tipo=congestión
 * ?severidad=crítica
 * ?usuario_id=5
 * ?page=1&limit=10
 * 
 * RESPUESTA:
 * {
 *   "total": 42,
 *   "page": 1,
 *   "reportes": [
 *     {
 *       "id": 1,
 *       "titulo": "Congestión Autopista Norte",
 *       "tipo": "congestión",
 *       "severidad": "crítica",
 *       "estado": "nuevo",
 *       "usuario_id": 5,
 *       "nombre_usuario": "Juan Pérez",
 *       "fecha_creacion": "2026-03-28T10:30:00Z"
 *     }
 *   ]
 * }
 * ============================================================================
 */
router.get('/', async (req, res) => {
    try {
        const { estado, tipo, severidad, usuario_id, page = 1, limit = 10 } = req.query;

        // Construir query dinámicamente
        let query = `
            SELECT r.*, u.nombre as nombre_usuario
            FROM reportes r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Filtros opcionales
        if (estado) {
            query += ' AND r.estado = ?';
            params.push(estado);
        }
        if (tipo) {
            query += ' AND r.tipo = ?';
            params.push(tipo);
        }
        if (severidad) {
            query += ' AND r.severidad = ?';
            params.push(severidad);
        }
        if (usuario_id) {
            query += ' AND r.usuario_id = ?';
            params.push(usuario_id);
        }

        // Contar total
        const [{ total }] = await executeQuery(
            `SELECT COUNT(*) as total FROM (${query}) as temp`,
            params
        );

        // Pagination
        const offset = (page - 1) * limit;
        query += ' ORDER BY r.fecha_creacion DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const reportes = await executeQuery(query, params);

        res.json({
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            reportes: reportes
        });

    } catch (error) {
        console.error('Error listando reportes:', error);
        res.status(500).json({ error: 'Error al listar reportes' });
    }
});

/**
 * ============================================================================
 * GET /api/reportes/:id
 * Obtener un reporte específico
 * ============================================================================
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que id sea número
        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const reporte = await executeQueryOne(
            `SELECT r.*, u.nombre as nombre_usuario, u.email as email_usuario
             FROM reportes r
             LEFT JOIN usuarios u ON r.usuario_id = u.id
             WHERE r.id = ?`,
            [id]
        );

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        res.json(reporte);

    } catch (error) {
        console.error('Error obteniendo reporte:', error);
        res.status(500).json({ error: 'Error al obtener reporte' });
    }
});

/**
 * ============================================================================
 * POST /api/reportes
 * Crear nuevo reporte (requiere autenticación)
 * 
 * Body JSON:
 * {
 *   "titulo": "Congestión en Autopista Norte a las 8am",
 *   "descripcion": "Todos los días a las 8 de la mañana hay caos vehicular...",
 *   "tipo": "congestión",
 *   "severidad": "crítica",
 *   "ubicacion": "Autopista Norte, Calle 193",
 *   "latitud": null,
 *   "longitud": null
 * }
 * 
 * RESPUESTA (201):
 * {
 *   "id": 42,
 *   "usuario_id": 5,
 *   "titulo": "Congestión en Autopista Norte a las 8am",
 *   "estado": "nuevo",
 *   "fecha_creacion": "2026-03-28T14:22:00Z"
 * }
 * ============================================================================
 */
router.post('/', authenticateToken, upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, descripcion, tipo, severidad, ubicacion, latitud, longitud } = req.body;

        // Validar datos
        const errors = validateReporte({ titulo, descripcion, tipo, severidad });
        if (errors.length > 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ errors });
        }

        if (latitud && !validator.isFloat(String(latitud))) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Latitud inválida' });
        }

        if (longitud && !validator.isFloat(String(longitud))) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Longitud inválida' });
        }

        const imagenUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Sanitizar strings
        const data = {
            usuario_id: req.user.userId,
            titulo: validator.escape(titulo),
            descripcion: validator.escape(descripcion),
            tipo: validator.escape(tipo), // aunque es enum, escapar igual
            severidad: validator.escape(severidad),
            ubicacion: ubicacion ? validator.escape(ubicacion) : null,
            latitud: latitud ? parseFloat(latitud) : null,
            longitud: longitud ? parseFloat(longitud) : null,
            imagen_url: imagenUrl
        };

        let result;
        try {
            result = await executeQuery(
                `INSERT INTO reportes 
                 (usuario_id, titulo, descripcion, tipo, severidad, ubicacion, latitud, longitud, imagen_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.usuario_id,
                    data.titulo,
                    data.descripcion,
                    data.tipo,
                    data.severidad,
                    data.ubicacion,
                    data.latitud,
                    data.longitud,
                    data.imagen_url
                ]
            );
        } catch (insertError) {
            // Compatibilidad con bases antiguas que aún no tienen la columna imagen_url.
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
                result = await executeQuery(
                    `INSERT INTO reportes 
                     (usuario_id, titulo, descripcion, tipo, severidad, ubicacion, latitud, longitud)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.usuario_id,
                        data.titulo,
                        data.descripcion,
                        data.tipo,
                        data.severidad,
                        data.ubicacion,
                        data.latitud,
                        data.longitud
                    ]
                );
            } else if (insertError.code === 'ER_NO_SUCH_TABLE') {
                await ensureReportesTableExists();
                result = await executeQuery(
                    `INSERT INTO reportes 
                     (usuario_id, titulo, descripcion, tipo, severidad, ubicacion, latitud, longitud, imagen_url)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.usuario_id,
                        data.titulo,
                        data.descripcion,
                        data.tipo,
                        data.severidad,
                        data.ubicacion,
                        data.latitud,
                        data.longitud,
                        data.imagen_url
                    ]
                );
            } else {
                throw insertError;
            }
        }

        const tipoForoMap = {
            'congestión': 'observacion',
            'infraestructura': 'observacion',
            'transporte_público': 'sugerencia',
            'ciclovía': 'sugerencia',
            'seguridad_vial': 'denuncia',
            'ambiental': 'observacion',
            'conexión_bogotá': 'observacion',
            'otro': 'observacion'
        };

        const tipoForo = tipoForoMap[data.tipo] || 'observacion';
        const contenidoForo = `${data.descripcion}\n\nSeveridad: ${data.severidad}`;

        try {
            await executeQuery(
                'INSERT INTO comentarios (usuario_id, titulo, contenido, zona, tipo) VALUES (?, ?, ?, ?, ?)',
                [
                    data.usuario_id,
                    data.titulo.substring(0, 255),
                    contenidoForo,
                    data.ubicacion || 'Chía (General)',
                    tipoForo
                ]
            );
        } catch (foroError) {
            console.warn('No se pudo replicar el reporte al foro:', foroError.message);
        }

        // Obtener reporte creado
        let reporte;
        try {
            reporte = await executeQueryOne(
                'SELECT * FROM reportes WHERE id = ?',
                [result.insertId]
            );
        } catch (selectError) {
            if (selectError.code === 'ER_NO_SUCH_TABLE') {
                await ensureReportesTableExists();
                reporte = await executeQueryOne(
                    'SELECT * FROM reportes WHERE id = ?',
                    [result.insertId]
                );
            } else {
                throw selectError;
            }
        }

        console.log(`✅ Nuevo reporte: ${result.insertId} por usuario ${req.user.userId}`);

        res.status(201).json({
            message: 'Reporte creado exitosamente',
            reporte: reporte
        });

    } catch (error) {
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error limpiando archivo de reporte:', cleanupError.message);
            }
        }
        console.error('Error creando reporte:', error);
        res.status(500).json({ error: 'Error al crear reporte' });
    }
});

/**
 * ============================================================================
 * PUT /api/reportes/:id
 * Actualizar un reporte
 * 
 * El usuario solo puede actualizar sus propios reportes
 * Los admin pueden actualizar cualquiera y cambiar estado
 * ============================================================================
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, tipo, severidad, ubicacion, estado, respuesta_admin } = req.body;

        // Validar ID
        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Obtener reporte actual
        const reporte = await executeQueryOne(
            'SELECT * FROM reportes WHERE id = ?',
            [id]
        );

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        // Verificar permisos: debe ser el dueño o admin
        if (reporte.usuario_id !== req.user.userId && req.user.rol !== 'admin') {
            return res.status(403).json({
                error: 'No tienes permiso para actualizar este reporte'
            });
        }

        // Preparar actualización
        let updateFields = [];
        let updateValues = [];

        if (titulo) {
            updateFields.push('titulo = ?');
            updateValues.push(validator.escape(titulo));
        }
        if (descripcion) {
            updateFields.push('descripcion = ?');
            updateValues.push(validator.escape(descripcion));
        }
        if (tipo) {
            updateFields.push('tipo = ?');
            updateValues.push(validator.escape(tipo));
        }
        if (severidad) {
            updateFields.push('severidad = ?');
            updateValues.push(validator.escape(severidad));
        }
        if (ubicacion !== undefined) {
            updateFields.push('ubicacion = ?');
            updateValues.push(ubicacion ? validator.escape(ubicacion) : null);
        }

        // Solo admin puede cambiar estado y agregar respuesta
        if (req.user.rol === 'admin') {
            if (estado) {
                updateFields.push('estado = ?');
                updateValues.push(validator.escape(estado));
            }
            if (respuesta_admin) {
                updateFields.push('respuesta_admin = ?');
                updateValues.push(validator.escape(respuesta_admin));
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updateValues.push(id);

        await executeQuery(
            `UPDATE reportes SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        const reporteActualizado = await executeQueryOne(
            'SELECT * FROM reportes WHERE id = ?',
            [id]
        );

        console.log(`✏️ Reporte actualizado: ${id}`);

        res.json({
            message: 'Reporte actualizado',
            reporte: reporteActualizado
        });

    } catch (error) {
        console.error('Error actualizando reporte:', error);
        res.status(500).json({ error: 'Error al actualizar reporte' });
    }
});

/**
 * ============================================================================
 * DELETE /api/reportes/:id
 * Eliminar un reporte (solo el dueño o admin)
 * ============================================================================
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!validator.isInt(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const reporte = await executeQueryOne(
            'SELECT * FROM reportes WHERE id = ?',
            [id]
        );

        if (!reporte) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }

        // Permisos
        if (reporte.usuario_id !== req.user.userId && req.user.rol !== 'admin') {
            return res.status(403).json({
                error: 'No tienes permiso para eliminar este reporte'
            });
        }

        await executeQuery('DELETE FROM reportes WHERE id = ?', [id]);

        console.log(`🗑️ Reporte eliminado: ${id}`);

        res.json({ message: 'Reporte eliminado' });

    } catch (error) {
        console.error('Error eliminando reporte:', error);
        res.status(500).json({ error: 'Error al eliminar reporte' });
    }
});

module.exports = router;

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿REST (Representational State Transfer)?
 * - Estándar para diseñar APIs
 * - Usa métodos HTTP para acciones:
 *   GET    -> Leer datos
 *   POST   -> Crear datos
 *   PUT    -> Actualizar datos
 *   DELETE -> Eliminar datos
 * 
 * ¿RUTAS REST?
 * GET /reportes         -> Listar todos
 * GET /reportes/5       -> Obtener el 5
 * POST /reportes        -> Crear nuevo
 * PUT /reportes/5       -> Actualizar el 5
 * DELETE /reportes/5    -> Eliminar el 5
 * 
 * ¿FILTROS Y BÚSQUEDA?
 * GET /reportes?tipo=congestión&estado=nuevo
 * - Query parameters (?) para filtrar
 * - Construye query SQL dinámicamente
 * - Parámetro LIMIT para paginar resultados grandes
 * 
 * ¿PERMISOS?
 * - Solo dueño del reporte puede editarlo/borrarlo
 * - Admin puede hacer todo
 * - Verificado en cada endpoint
 * 
 * ¿TRANSACCIONES?
 * Si quisieras dar puntos al usuario por crear reporte:
 * 1. Insertar reporte
 * 2. Actualizar tabla puntos del usuario
 * Usarías transacción para garantizar ambas o ninguna
 * 
 * ¿LOGGING?
 * console.log() cada acción importante
 * En producción: usar librería como Winston o Pino
 * Útil para auditoría: "quién hizo qué y cuándo"
 */
