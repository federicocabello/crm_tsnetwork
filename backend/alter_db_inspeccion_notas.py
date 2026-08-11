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

    # Agregar columna notas a hojas_inspeccion si no existe
    try:
        cur.execute(
            "ALTER TABLE hojas_inspeccion ADD COLUMN notas TEXT DEFAULT NULL;"
        )
        mysql.connection.commit()
        print("Columna 'notas' agregada exitosamente a hojas_inspeccion.")
    except Exception as e:
        if "Duplicate column name" in str(e) or "1060" in str(e):
            print("La columna 'notas' ya existe en hojas_inspeccion. No se realizaron cambios.")
        else:
            raise e

    cur.close()
    print("Migración completada.")
