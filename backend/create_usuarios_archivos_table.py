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
    CREATE TABLE IF NOT EXISTS usuarios_archivos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario TINYINT(4) NOT NULL,
        original TEXT NOT NULL,
        directorio TEXT NOT NULL,
        FOREIGN KEY (usuario) REFERENCES auth(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    mysql.connection.commit()
    print("Table usuarios_archivos created successfully.")
    cur.close()
