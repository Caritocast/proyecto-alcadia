CREATE DATABASE IF NOT EXISTS movilidad_chia;
USE movilidad_chia;

CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ciudadano', 'admin', 'moderador') DEFAULT 'ciudadano',
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion DATETIME,

    INDEX idx_email (email),
    INDEX idx_activo (activo)
);

CREATE TABLE reportes (
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
);

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
    
    INDEX idx_leido (leido),
    INDEX idx_email (email),
    INDEX idx_fecha (fecha_creacion)
);


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

CREATE TABLE rutas_transporte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    empresa VARCHAR(150),
    origen VARCHAR(200),
    destino VARCHAR(200),
    descripcion TEXT,
    horario VARCHAR(255),
    valor INT,
    activa BOOLEAN DEFAULT TRUE,
    
    INDEX idx_nombre (nombre)
);

INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Administrador', 'admin@movilidad-chia.local', '$2b$10$FbfY/4Vh99Z9i7J5Z5J5ZO5BvH3EyM8Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9', 'admin', TRUE);

INSERT INTO rutas_transporte (nombre, empresa, origen, destino, descripcion, valor) VALUES
('C11 - Expreso Chía-Bogotá', 'Transportes Chía', 'Centro Chía', 'Centro Bogotá', 'Ruta rápida por Autopista Norte', 2500),
('C1 - Chía Centro', 'Municipalidad', 'Barrio la Florida', 'Centro Chía', 'Ruta interna del municipio', 1200),
('C2 - Zona Sur', 'Municipalidad', 'Vereda Torca', 'Centro Chía', 'Conecta zona rural con centro', 1200);


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

CREATE VIEW reporte_por_tipo AS
SELECT tipo, COUNT(*) as total,
    SUM(CASE WHEN estado='resuelto' THEN 1 ELSE 0 END) as resueltos
FROM reportes
GROUP BY tipo;

CREATE VIEW usuarios_activos AS
SELECT u.id, u.nombre, u.email, COUNT(r.id) as total_reportes
FROM usuarios u
LEFT JOIN reportes r ON u.id = r.usuario_id
WHERE u.activo = TRUE
GROUP BY u.id
HAVING total_reportes > 0
ORDER BY total_reportes DESC;
