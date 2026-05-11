-- ============================================================================
-- BASE DE DATOS: MOVILIDAD CHÍA
-- Propósito: Almacenar usuarios, reportes, contactos y datos de movilidad
-- ============================================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS movilidad_chia;
USE movilidad_chia;

-- ============================================================================
-- TABLA: USUARIOS
-- Almacena credenciales y datos de usuarios registrados
-- ============================================================================
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL, -- Hash bcrypt (nunca guardes contraseñas planas)
    rol ENUM('ciudadano', 'admin', 'moderador') DEFAULT 'ciudadano',
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion DATETIME,
    
    -- Índices para búsquedas rápidas
    INDEX idx_email (email),
    INDEX idx_activo (activo)
);

-- ============================================================================
-- TABLA: REPORTES DE MOVILIDAD
-- Registra problemas y sugerencias sobre movilidad del municipio
-- ============================================================================
CREATE TABLE reportes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo ENUM('congestión', 'infraestructura', 'transporte_público', 'ciclovía', 
              'seguridad_vial', 'ambiental', 'conexión_bogotá', 'otro') NOT NULL,
    severidad ENUM('baja', 'media', 'alta', 'crítica') DEFAULT 'media',
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(255), -- Barrio, intersección, calle
    latitud DECIMAL(10, 8),  -- Para mapas futuros
    longitud DECIMAL(11, 8),
    imagen_url VARCHAR(255), -- URL de evidencia fotográfica
    
    -- Gestión del reporte
    estado ENUM('nuevo', 'en_revisión', 'resuelto', 'rechazado') DEFAULT 'nuevo',
    respuesta_admin TEXT,
    
    -- Auditoría
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualización TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Relaciones y índices
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_estado (estado),
    INDEX idx_tipo (tipo),
    INDEX idx_fecha (fecha_creacion),
    INDEX idx_usuario (usuario_id)
);

-- ============================================================================
-- TABLA: CONTACTOS
-- Almacena mensajes del formulario de contacto
-- ============================================================================
CREATE TABLE contactos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    respondido BOOLEAN DEFAULT FALSE,
    respuesta_admin TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_leido (leido),
    INDEX idx_email (email),
    INDEX idx_fecha (fecha_creacion)
);

-- ============================================================================
-- TABLA: SESIONES
-- Gestiona sesiones de usuario autenticados
-- ============================================================================
CREATE TABLE sesiones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_expiracion (fecha_expiracion)
);

-- ============================================================================
-- TABLA: CONVERSACIONES (para guardar historial del chatbot)
-- ============================================================================
CREATE TABLE conversaciones_chatbot (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    pregunta TEXT NOT NULL,
    respuesta LONGTEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_timestamp (timestamp)
);

-- ============================================================================
-- TABLA: RUTAS DE TRANSPORTE (información para el chatbot)
-- ============================================================================
CREATE TABLE rutas_transporte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    empresa VARCHAR(150),
    origen VARCHAR(200),
    destino VARCHAR(200),
    descripcion TEXT,
    horario VARCHAR(255),
    valor INT, -- en pesos colombianos
    activa BOOLEAN DEFAULT TRUE,
    
    INDEX idx_nombre (nombre)
);

-- ============================================================================
-- DATOS INICIALES (ejemplos educativos)
-- ============================================================================

-- Usuario administrativo de prueba
-- Contraseña: admin123 (hash bcrypt: $2b$10$FbfY/4Vh99Z9i7J5Z5J5ZO5BvH3EyM8Z9Z9Z9Z9Z9Z9Z9Z9Z9Z)
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Administrador', 'admin@movilidad-chia.local', '$2b$10$FbfY/4Vh99Z9i7J5Z5J5ZO5BvH3EyM8Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9', 'admin', TRUE);

-- Rutas de transporte existentes (ejemplos)
INSERT INTO rutas_transporte (nombre, empresa, origen, destino, descripcion, valor) VALUES
('C11 - Expreso Chía-Bogotá', 'Transportes Chía', 'Centro Chía', 'Centro Bogotá', 'Ruta rápida por Autopista Norte', 2500),
('C1 - Chía Centro', 'Municipalidad', 'Barrio la Florida', 'Centro Chía', 'Ruta interna del municipio', 1200),
('C2 - Zona Sur', 'Municipalidad', 'Vereda Torca', 'Centro Chía', 'Conecta zona rural con centro', 1200);

-- ============================================================================
-- TABLA: COMENTARIOS/FORO (ciudadanos comparten situación de movilidad)
-- ============================================================================
CREATE TABLE comentarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    titulo VARCHAR(255) NOT NULL,
    contenido LONGTEXT NOT NULL,
    zona VARCHAR(150),
    tipo ENUM('observacion', 'denuncia', 'sugerencia', 'experiencia') DEFAULT 'observacion',
    votos_positivos INT DEFAULT 0,
    votos_negativos INT DEFAULT 0,
    estado ENUM('publicado', 'pendiente_revision', 'rechazado') DEFAULT 'publicado',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_zona (zona),
    INDEX idx_tipo (tipo),
    INDEX idx_fecha (fecha_creacion),
    INDEX idx_estado (estado)
);

-- ============================================================================
-- VISTAS ÚTILES PARA ANÁLISIS
-- ============================================================================

-- Vista: Reportes por tipo
CREATE VIEW reporte_por_tipo AS
SELECT tipo, COUNT(*) as total, 
       SUM(CASE WHEN estado='resuelto' THEN 1 ELSE 0 END) as resueltos
FROM reportes
GROUP BY tipo;

-- Vista: Usuarios más activos (reportes)
CREATE VIEW usuarios_activos AS
SELECT u.id, u.nombre, u.email, COUNT(r.id) as total_reportes
FROM usuarios u
LEFT JOIN reportes r ON u.id = r.usuario_id
WHERE u.activo = TRUE
GROUP BY u.id
HAVING total_reportes > 0
ORDER BY total_reportes DESC;

-- ============================================================================
-- EXPLICACIÓN EDUCATIVA
-- ============================================================================
/*
CONCEPTOS CLAVE:

1. PRIMARY KEY (id): Identificador único de cada registro
   - AUTO_INCREMENT: Incrementa automáticamente

2. FOREIGN KEY: Crea relaciones entre tablas
   - usuario_id en reportes apunta a usuarios(id)
   - Garantiza integridad referencial
   - ON DELETE CASCADE: Si se borra usuario, se borran sus reportes

3. UNIQUE: El email no puede repetirse (restricción de negocio)

4. INDEXES: Aceleran búsquedas (muy importante en producción)
   - Por email: búsquedas de login rápidas
   - Por estado: filtrar reportes resueltos
   - Por fecha: ordenar por reciente

5. ENUM: Lista restringida de valores
   - solo permite: 'nuevo' | 'en_revisión' | 'resuelto' | 'rechazado'
   - Garantiza consistencia

6. TIMESTAMP: Registro automático de fecha/hora
   - DEFAULT CURRENT_TIMESTAMP: se llena automáticamente
   - ON UPDATE: se actualiza cada que se modifica el registro

7. VISTAS (CREATE VIEW): Consultas guardadas para análisis
   - reporte_por_tipo: resume datos para dashboards

SEGURIDAD:
- password_hash: nunca guardar contraseñas planas (usar bcrypt)
- FOREIGN KEY: evita datos huérfanos
- Parametrized queries en backend: previene SQL injection
*/
