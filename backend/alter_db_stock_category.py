import os

from dotenv import load_dotenv
from flask import Flask
from flask_mysqldb import MySQL


load_dotenv()

app = Flask(__name__)
app.config["MYSQL_HOST"] = os.getenv("DB_HOST", "localhost")
app.config["MYSQL_USER"] = os.getenv("DB_USER", "root")
app.config["MYSQL_PASSWORD"] = os.getenv("DB_PASSWORD", "")
app.config["MYSQL_DB"] = os.getenv("DB_NAME", "administracion_tsnetwork")
app.config["MYSQL_PORT"] = int(os.getenv("DB_PORT", 3306))
app.config["MYSQL_CURSORCLASS"] = "DictCursor"

mysql = MySQL(app)


with app.app_context():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'productos'
              AND COLUMN_NAME = 'categoria'
            """,
            (app.config["MYSQL_DB"],),
        )
        if cursor.fetchone()["total"]:
            print("La columna productos.categoria ya existe.")
        else:
            cursor.execute(
                """
                ALTER TABLE productos
                ADD COLUMN categoria ENUM('internet', 'camaras', 'ambos')
                NOT NULL DEFAULT 'ambos'
                """
            )
            mysql.connection.commit()
            print("Columna productos.categoria agregada correctamente.")
    except Exception:
        mysql.connection.rollback()
        raise
    finally:
        cursor.close()
