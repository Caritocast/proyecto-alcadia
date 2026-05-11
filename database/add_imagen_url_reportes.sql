-- Agrega soporte de imagen en reportes existentes
ALTER TABLE reportes
ADD COLUMN imagen_url VARCHAR(255) NULL AFTER longitud;
