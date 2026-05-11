/**
 * ============================================================================
 * RUTAS DE AUTENTICACIÓN
 * ============================================================================
 * POST /api/auth/registro    - Crear nueva cuenta
 * POST /api/auth/login       - Iniciar sesión
 * POST /api/auth/logout      - Cerrar sesión
 * GET  /api/auth/me          - Datos del usuario actual
 * ============================================================================
 */

const express = require('express');
const validator = require('validator');
const { 
    registerUser, 
    loginUser, 
    authenticateToken 
} = require('../auth');
const { executeQuery, executeQueryOne } = require('../config');

const router = express.Router();

/**
 * POST /api/auth/registro
 * Crea una nueva cuenta de usuario
 * 
 * Body JSON:
 * {
 *   "nombre": "Juan Pérez",
 *   "email": "juan@example.com",
 *   "password": "MiPassword123",
 *   "telefono": "3101234567"
 * }
 * 
 * Respuesta exitosa (201):
 * {
 *   "id": 5,
 *   "nombre": "Juan Pérez",
 *   "email": "juan@example.com",
 *   "rol": "ciudadano",
 *   "token": "eyJhbGciOiJIUzI1NiIs..."
 * }
 */
router.post('/registro', async (req, res) => {
    try {
        const { nombre, email, password, telefono } = req.body;

        // VALIDACIÓN FRONTEND (debería estar en JS también, pero validar en backend es obligatorio)
        if (!nombre || !email || !password) {
            return res.status(400).json({
                error: 'Faltan campos requeridos: nombre, email, password'
            });
        }

        // Sanitización: elimina espacios extras, convierte a minúsculas
        const emailSanitized = validator.normalizeEmail(email.toLowerCase());

        // Validación adicional
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

        // Registrar usuario
        const newUser = await registerUser({
            nombre: validator.escape(nombre), // Escapa caracteres especiales
            email: emailSanitized,
            password: password,
            telefono: telefono ? validator.escape(telefono) : null
        });

        // Respuesta 201 Created
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser
        });

    } catch (error) {
        console.error('Error en registro:', error.message);

        // Errores específicos
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

/**
 * POST /api/auth/login
 * Autentica y retorna JWT
 * 
 * Body JSON:
 * {
 *   "email": "juan@example.com",
 *   "password": "MiPassword123"
 * }
 * 
 * Respuesta exitosa (200):
 * {
 *   "userId": 5,
 *   "nombre": "Juan Pérez",
 *   "email": "juan@example.com",
 *   "rol": "ciudadano",
 *   "token": "eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Respuesta error (401):
 * {
 *   "error": "Email o contraseña incorrectos"
 * }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email y contraseña requeridos'
            });
        }

        // Sanitizar email
        const emailSanitized = validator.normalizeEmail(email.toLowerCase());

        // Login (lanza error si falla)
        const user = await loginUser(emailSanitized, password);

        // Log de seguridad
        console.log(`✅ Login exitoso: ${emailSanitized}`);

        res.json({
            message: 'Login exitoso',
            user: user
        });

    } catch (error) {
        console.warn(`⚠️ Intento de login fallido: ${req.body.email}`);

        // No devuelves exactamente si fue email o password para no revelar usuarios
        res.status(401).json({
            error: 'Email o contraseña incorrectos'
        });
    }
});

/**
 * GET /api/auth/me
 * Devuelve datos del usuario autenticado
 * Requiere token válido en header Authorization
 * 
 * REQUEST:
 * GET /api/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 * 
 * RESPUESTA:
 * {
 *   "userId": 5,
 *   "email": "juan@example.com",
 *   "rol": "ciudadano"
 * }
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // El middleware authenticateToken ya validó el token
        // y puso los datos en req.user
        
        // Obtener información actualizada de BD
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

/**
 * POST /api/auth/logout
 * Invalida la sesión (borra token)
 * 
 * En una arquitectura stateless (JWT), el logout es principalmente
 * un evento del cliente (borrar token del localStorage)
 * 
 * Pero podemos mantener registro en BD para auditoría
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // En aplicaciones reales, podrías:
        // 1. Marcar token como "revocado" en BD
        // 2. Agregar IP/token a blacklist
        // 3. Disminuir sesión activas del usuario
        
        console.log(`🚪 Logout: usuario ${req.user.userId}`);

        res.json({ message: 'Logout exitoso' });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

module.exports = router;

/**
 * ============================================================================
 * EXPLICACIÓN EDUCATIVA
 * ============================================================================
 * 
 * ¿CÓDIGOS HTTP?
 * - 200 OK: todo salió bien
 * - 201 Created: recurso creado exitosamente
 * - 400 Bad Request: datos inválidos del cliente
 * - 401 Unauthorized: no autenticado (falta token o es inválido)
 * - 403 Forbidden: autenticado pero sin permiso
 * - 404 Not Found: recurso no existe
 * - 409 Conflict: conflicto (email duplicado)
 * - 500 Internal Server Error: error del servidor
 * 
 * ¿FLUJO DE REGISTRO?
 * 1. Usuario completa formulario
 * 2. JavaScript valida datos (nombre, email, password... longitud)
 * 3. Envía POST /api/auth/registro
 * 4. Backend valida NUEVAMENTE (nunca confíes en frontend)
 * 5. Sanitiza datos (escapa caracteres especiales)
 * 6. Verifica email no existe
 * 7. Hashea password con bcrypt
 * 8. Inserta en BD
 * 9. Genera JWT
 * 10. Retorna token al cliente
 * 11. Cliente guarda token en localStorage
 * 
 * ¿FLUJO DE LOGIN?
 * 1. Usuario escribe email y password
 * 2. JS valida mínimamente y envía POST /api/auth/login
 * 3. Backend valida datos
 * 4. Busca usuario por email
 * 5. Compara password con hash (bcrypt)
 * 6. Si coincide:
 *    - Actualiza última_sesión
 *    - Genera JWT
 *    - Retorna token
 * 7. Si no coincide:
 *    - Devuelve error genérico (sin decir si es email o password)
 *    - Esto previene que alguien enumere usuarios
 * 
 * ¿SEGURIDAD?
 * - Validar EN BACKEND (no confiar en validación JS)
 * - Sanitize inputs (escapa caracteres, normaliza emails)
 * - Hashing de passwords (bcrypt)
 * - Rate limiting en /login (previene ataques de fuerza bruta)
 * - Errores genéricos (no reveles si existe el usuario)
 * - HTTPS en producción (para que token no viaje en plano)
 * - Tokens con expiracion (que expiren después de tiempo)
 * 
 * ¿VALIDATOR?
 * Librería que valida y sanitiza strings
 * - validator.isEmail() -> true/false
 * - validator.normalizeEmail() -> juan@example.com → juan@example.com
 * - validator.escape() -> <script> → &lt;script&gt;
 */
