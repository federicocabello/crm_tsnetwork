import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="administracion_tsnetwork",
        port=3306
    )
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT tipo FROM citas")
    rows = cursor.fetchall()
    print("Appointment types in DB:")
    for r in rows:
        print(f" - {r[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error querying database:", e)
