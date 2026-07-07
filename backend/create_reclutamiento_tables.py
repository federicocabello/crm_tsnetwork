from schema import mysql, app


with app.app_context():
    cursor = mysql.connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS postulaciones_tecnicos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(180) NOT NULL,
            email VARCHAR(180) NOT NULL,
            telefono VARCHAR(60) NOT NULL,
            direccion VARCHAR(255) NOT NULL,
            experiencia TEXT,
            respuestas JSON NOT NULL,
            estado ENUM('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'pendiente',
            comentarios TEXT,
            tecnico_usuario_id TINYINT(4) NULL,
            fecha_postulacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_evaluacion TIMESTAMP NULL,
            INDEX idx_postulaciones_estado (estado),
            INDEX idx_postulaciones_fecha (fecha_postulacion),
            CONSTRAINT fk_postulaciones_tecnico_usuario
                FOREIGN KEY (tecnico_usuario_id) REFERENCES auth(id)
                ON DELETE SET NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tecnicos_videos_vistos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tecnico_usuario_id TINYINT(4) NOT NULL,
            video_id VARCHAR(80) NOT NULL,
            visto_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_tecnico_video (tecnico_usuario_id, video_id),
            INDEX idx_tecnico_videos_usuario (tecnico_usuario_id),
            CONSTRAINT fk_tecnicos_videos_usuario
                FOREIGN KEY (tecnico_usuario_id) REFERENCES auth(id)
                ON DELETE CASCADE
        )
        """
    )

    mysql.connection.commit()
    cursor.close()
    print("Tablas de reclutamiento creadas o verificadas correctamente.")
