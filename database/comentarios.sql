CREATE TABLE IF NOT EXISTS comentarios (
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
