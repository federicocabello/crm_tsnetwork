-- Ejecutar una sola vez en la base de datos de producción.
ALTER TABLE hojas
    ADD COLUMN descuento DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER notas;

CREATE TABLE cotizaciones_versiones (
    id INT NOT NULL AUTO_INCREMENT,
    hoja_id INT NOT NULL,
    version INT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comentario VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cotizacion_version (hoja_id, version),
    KEY idx_cotizacion_version_hoja (hoja_id),
    KEY idx_cotizacion_version_usuario (creado_por),
    CONSTRAINT fk_cotizacion_version_hoja
        FOREIGN KEY (hoja_id) REFERENCES hojas(id) ON DELETE CASCADE,
    CONSTRAINT fk_cotizacion_version_usuario
        FOREIGN KEY (creado_por) REFERENCES auth(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cotizaciones_versiones_productos (
    id INT NOT NULL AUTO_INCREMENT,
    version_id INT NOT NULL,
    producto_id INT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    precio_final DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_cotizacion_version_producto_version (version_id),
    KEY idx_cotizacion_version_producto (producto_id),
    CONSTRAINT fk_cotizacion_version_producto_version
        FOREIGN KEY (version_id) REFERENCES cotizaciones_versiones(id) ON DELETE CASCADE,
    CONSTRAINT fk_cotizacion_version_producto_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;