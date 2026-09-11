-- Ejecutar una sola vez en la base de datos de produccion.
CREATE TABLE cotizaciones_pdfs (
    id INT NOT NULL AUTO_INCREMENT,
    hoja_id INT NOT NULL,
    version_id INT NULL,
    archivo VARCHAR(500) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    generado_por INT NULL,
    generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cotizacion_pdf_hoja (hoja_id),
    KEY idx_cotizacion_pdf_version (version_id),
    KEY idx_cotizacion_pdf_usuario (generado_por),
    CONSTRAINT fk_cotizacion_pdf_hoja
        FOREIGN KEY (hoja_id) REFERENCES hojas(id) ON DELETE CASCADE,
    CONSTRAINT fk_cotizacion_pdf_version
        FOREIGN KEY (version_id) REFERENCES cotizaciones_versiones(id) ON DELETE SET NULL,
    CONSTRAINT fk_cotizacion_pdf_usuario
        FOREIGN KEY (generado_por) REFERENCES auth(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
