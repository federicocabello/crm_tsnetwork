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
    cur.execute("SHOW TABLES")
    tables = cur.fetchall()
    for table in tables:
        tname = table.values()
        tname = list(tname)[0]
        print(f"Table: {tname}")
        cur.execute(f"DESCRIBE {tname}")
        cols = cur.fetchall()
        for col in cols:
            print(f"  {col['Field']} - {col['Type']}")
    cur.close()
