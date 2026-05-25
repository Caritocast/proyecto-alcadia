const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery, executeQueryOne } = require('../config');
const { authenticateToken } = require('../auth');
const validator = require('validator');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'comentario-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPG, PNG y WebP'), false);
        }
    }
});

router.get('/', async (req, res) => {
    try {
        const { tipo, zona, pagina = 1, limite = 10 } = req.query;
        const pageNum = parseInt(pagina) || 1;
        const limitNum = parseInt(limite) || 10;
        const offset = Math.max(0, (pageNum - 1) * limitNum);

        let query = 'SELECT * FROM comentarios WHERE estado = ?';
        const params = ['publicado'];

        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }

        if (zona) {
            query += ' AND zona LIKE ?';
            params.push(`%${zona}%`);
        }

        query += ` ORDER BY votos_positivos DESC, fecha_creacion DESC LIMIT ${limitNum} OFFSET ${offset}`;

        const comentarios = await executeQuery(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM comentarios WHERE estado = ?';
        const countParams = ['publicado'];

        if (tipo) {
            countQuery += ' AND tipo = ?';
            countParams.push(tipo);
        }
        if (zona) {
            countQuery += ' AND zona LIKE ?';
            countParams.push(`%${zona}%`);
        }

        const countResult = await executeQueryOne(countQuery, countParams);
        const total = countResult.total;

        res.json({
            comentarios,
            total,
            pagina: pageNum,
            limite: limitNum,
            totalPaginas: Math.ceil(total / limitNum)
        });

    } catch (error) {
        console.error('Error listando comentarios:', error);
        res.status(500).json({ error: 'Error al listar comentarios' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const comentario = await executeQueryOne(
            'SELECT * FROM comentarios WHERE id = ? AND estado = ?',
            [id, 'publicado']
        );

        if (!comentario) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        res.json(comentario);

    } catch (error) {
        console.error('Error obteniendo comentario:', error);
        res.status(500).json({ error: 'Error al obtener comentario' });
    }
});

router.post('/', authenticateToken, upload.single('imagen'), async (req, res) => {
    try {
        const { titulo, contenido, zona, tipo, latitud, longitud } = req.body;
        const usuario_id = req.user.userId || req.user.id;

        if (!usuario_id) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
        }

        if (!titulo || titulo.trim().length < 5) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Título debe tener al menos 5 caracteres' });
        }

        if (!contenido || contenido.trim().length < 20) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Contenido debe tener al menos 20 caracteres' });
        }

        if (!['observacion', 'denuncia', 'sugerencia', 'experiencia'].includes(tipo)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Tipo de comentario inválido' });
        }

        const tituloSanitizado = validator.escape(titulo.trim()).substring(0, 255);
        const contenidoSanitizado = validator.escape(contenido.trim());
        const zonaSanitizada = zona ? validator.escape(zona.trim()).substring(0, 150) : 'Chía (General)';

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        let lat = null;
        let lng = null;
        if (latitud && longitud) {
            lat = parseFloat(latitud);
            lng = parseFloat(longitud);
            if (isNaN(lat) || isNaN(lng)) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Coordenadas inválidas' });
            }
        }

        try {
            await executeQuery(
                'INSERT INTO comentarios (usuario_id, titulo, contenido, zona, tipo, imagen_url, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [usuario_id, tituloSanitizado, contenidoSanitizado, zonaSanitizada, tipo, imageUrl, lat, lng]
            );
        } catch (insertError) {
            if (insertError.code === 'ER_BAD_FIELD_ERROR') {
                await executeQuery(
                    'INSERT INTO comentarios (usuario_id, titulo, contenido, zona, tipo) VALUES (?, ?, ?, ?, ?)',
                    [usuario_id, tituloSanitizado, contenidoSanitizado, zonaSanitizada, tipo]
                );
            } else {
                throw insertError;
            }
        }

        res.status(201).json({
            success: true,
            message: '✅ Comentario publicado exitosamente'
        });

    } catch (error) {
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error limpiando archivo:', e);
            }
        }
        console.error('Error creando comentario:', error);
        res.status(500).json({ error: 'Error al crear comentario' });
    }
});

router.post('/:id/voto', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.body;

        if (!['positivo', 'negativo'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de voto inválido' });
        }

        const comentario = await executeQueryOne('SELECT * FROM comentarios WHERE id = ?', [id]);

        if (!comentario) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        const columna = tipo === 'positivo' ? 'votos_positivos' : 'votos_negativos';

        await executeQuery(
            `UPDATE comentarios SET ${columna} = ${columna} + 1 WHERE id = ?`,
            [id]
        );

        res.json({ success: true, message: 'Voto registrado' });

    } catch (error) {
        console.error('Error votando:', error);
        res.status(500).json({ error: 'Error al registrar voto' });
    }
});

/**
 * Eliminar comentario propio (requiere autenticación)
 * DELETE /api/comentarios/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user.userId || req.user.id;

        const comentario = await executeQueryOne('SELECT * FROM comentarios WHERE id = ?', [id]);

        if (!comentario) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        // Solo el autor o admin pueden eliminar
        if (comentario.usuario_id !== usuario_id && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' });
        }

        await executeQuery('DELETE FROM comentarios WHERE id = ?', [id]);

        res.json({ success: true, message: 'Comentario eliminado' });

    } catch (error) {
        console.error('Error eliminando comentario:', error);
        res.status(500).json({ error: 'Error al eliminar comentario' });
    }
});

module.exports = router;
