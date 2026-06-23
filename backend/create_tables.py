import os
from flask import Flask
from flask_mysqldb import MySQL
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config["MYSQL_HOST"] = os.getenv("DB_HOST")
app.config["MYSQL_USER"] = os.getenv("DB_USER")
app.config["MYSQL_PASSWORD"] = os.getenv("DB_PASSWORD")
app.config["MYSQL_DB"] = os.getenv("DB_NAME")
app.config["MYSQL_PORT"] = int(os.getenv("DB_PORT", 3306))
app.config["MYSQL_CURSORCLASS"] = "DictCursor"

mysql = MySQL(app)

with app.app_context():
    cur = mysql.connection.cursor()
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS hojas_inspeccion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cita INT NOT NULL,
        FOREIGN KEY (cita) REFERENCES citas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS hojas_inspeccion_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        inspeccion_id INT NOT NULL,
        producto_id INT NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        detalle TEXT,
        FOREIGN KEY (inspeccion_id) REFERENCES hojas_inspeccion(id) ON DELETE CASCADE,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    mysql.connection.commit()
    print("Tables created successfully.")
    cur.close()
