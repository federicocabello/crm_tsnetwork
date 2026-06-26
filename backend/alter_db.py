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
    # Agregar columna 'dibujo' si no existe
    try:
        cur.execute("ALTER TABLE hojas_inspeccion ADD COLUMN dibujo VARCHAR(255) DEFAULT NULL;")
        mysql.connection.commit()
        print("Column 'dibujo' added successfully.")
    except Exception as e:
        print("Error or column already exists (dibujo):", e)

    # Agregar columna 'firma' para guardar la firma del cliente
    try:
        cur.execute("ALTER TABLE hojas_inspeccion ADD COLUMN firma VARCHAR(255) DEFAULT NULL;")
        mysql.connection.commit()
        print("Column 'firma' added successfully.")
    except Exception as e:
        print("Error or column already exists (firma):", e)
    finally:
        cur.close()
