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
            SELECT COUNT(*) AS total FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'citas'
              AND COLUMN_NAME = 'soporte_finalizado'
            """,
            (app.config["MYSQL_DB"],),
        )
        if cursor.fetchone()["total"]:
            print("La columna citas.soporte_finalizado ya existe.")
        else:
            cursor.execute(
                "ALTER TABLE citas ADD COLUMN soporte_finalizado "
                "TINYINT(1) NOT NULL DEFAULT 0"
            )
            mysql.connection.commit()
            print("Columna citas.soporte_finalizado agregada correctamente.")
    except Exception:
        mysql.connection.rollback()
        raise
    finally:
        cursor.close()
