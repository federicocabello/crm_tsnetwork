from flask import Flask, jsonify, json
from flask_mysqldb import MySQL
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
import os, re
from flask_cors import CORS
from datetime import datetime

load_dotenv()

app = Flask(__name__)
#CORS(app, resources={r"/api/*": {"origins": "http://localhost:5174"}}, supports_credentials=True)
CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:5175"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],  # Aseguramos que Flask permita estos encabezados
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Permitimos todos los métodos
)

app.config["MYSQL_HOST"] = os.getenv("DB_HOST")
app.config["MYSQL_USER"] = os.getenv("DB_USER")
app.config["MYSQL_PASSWORD"] = os.getenv("DB_PASSWORD")
app.config["MYSQL_DB"] = os.getenv("DB_NAME")
app.config["MYSQL_PORT"] = int(os.getenv("DB_PORT", 3306))
app.config["MYSQL_UNIX_SOCKET"] = None
app.config["MYSQL_CURSORCLASS"] = "DictCursor"
app.config["JWT_SECRET_KEY"] = "B!1w6NAt1T^%kvhUI*S^rC"
jwt = JWTManager(app)

mysql = MySQL(app)

from flask import jsonify, request
from flask_jwt_extended import create_access_token

@app.route("/api/me", methods=["GET", "OPTIONS"])
@jwt_required()  # Verifica que el JWT sea válido
def me():
    if request.method == "OPTIONS":
        return '', 204  # Responde correctamente a la solicitud OPTIONS

    user = get_jwt_identity()  # Obtiene la identidad del usuario del JWT
    if user:
        return jsonify({"user": user}), 200  # Devuelve los datos del usuario
    else:
        return jsonify({"msg": "No autorizado"}), 401  # Si el token es inválido

@app.get("/api/usuarios")
def get_usuarios():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM auth ORDER BY fullname;")
    usuarios = cursor.fetchall()
    cursor.close()
    return jsonify(usuarios), 200

@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    username = (body.get("user") or "").strip()
    password = body.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Faltan credenciales"}), 400

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT id, `user`, `password`, fullname, rol, habilitado
        FROM auth
        WHERE `user` = %s
        LIMIT 1
    """, (username,))
    row = cur.fetchone()
    cur.close()

    if not row:
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    if not bool(row.get("habilitado")):
        return jsonify({"error": "Usuario deshabilitado"}), 403

    if password != (row.get("password") or ""):
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    user_payload = {
        "id": row["id"],
        "user": row.get("user"),
        "fullname": row.get("fullname"),
        "rol": row.get("rol"),
        "habilitado": bool(row.get("habilitado")),
    }

    token = create_access_token(identity=user_payload)
    return jsonify({"access_token": token, "user": user_payload})

@app.get("/api/configuracion")
def configuracion():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM auth ORDER BY id DESC;")
    usuarios = cursor.fetchall()
    cursor.execute("SELECT * FROM citas_estados ORDER BY estado;")
    citas_estados = cursor.fetchall()
    
    cursor.close()

    return jsonify({"usuarios": usuarios, "citas_estados": citas_estados}), 200

def generar_username(fullname: str) -> str:
    if not fullname:
        return ""

    partes = fullname.strip().lower().split()

    if len(partes) == 1:
        return partes[0][0]

    nombre = partes[0]
    apellidos = "".join(partes[1:])

    return nombre[0] + apellidos

@app.post("/api/configuracion/nuevo-usuario")
def configuracion_nuevo_usuario():
    data = request.get_json(silent=True) or {}
    fullname = data.get("fullname").strip().upper()
    username = generar_username(fullname)
    cursor = mysql.connection.cursor()
    cursor.execute("INSERT INTO auth (`user`, `password`, fullname, rol, habilitado) VALUES (%s, %s, %s, %s, %s)", (username, "ts7985", fullname, "invitado", 1))
    mysql.connection.commit()
    cursor.close()
    msg = f"Usuario creado con éxito.\n\nUsuario: {username}\nContraseña: ts7985\nEl usuario creado por primera vez tiene el rol de invitado, por lo que no tiene permisos para acceder a ninguna sección del sistema. Para otorgarle permisos, es necesario editar el usuario y asignarle el rol correspondiente."
    return jsonify({"msg": msg}), 201

@app.post("/api/configuracion/gestion-de-usuarios")
def configuracion_gestion_de_usuarios():
    acciones = ["user", "password", "fullname", "rol", "habilitado"]
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute(f"UPDATE auth SET {acciones[data.get('accion')]} = %s WHERE id = %s", (data.get("nuevo"), data.get("ident")))
    mysql.connection.commit()
    cursor.close()
    return jsonify({"msg": "Usuario modificado con éxito."}), 201

@app.get("/api/inicio")
def inicio():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname;")
    usuarios = cursor.fetchall()
    cursor.execute("SELECT citas.id AS idcita, clientes.id AS idcliente, clientes.nombre AS nombre, DATE_FORMAT(citas.dia, '%Y-%m-%d') AS dia, DATE_FORMAT(citas.hora, '%H:%i') AS hora, DATE_FORMAT(citas.hora, '%H:%i %p') AS hora_format, citas.notas AS notas, auth.id AS idagente, auth.fullname AS fullname, citas.tipo AS tipo, citas.estado AS idestado, citas_estados.estado AS estado, citas_estados.color AS color FROM citas JOIN clientes ON clientes.id=citas.cliente JOIN auth ON auth.id=citas.asignado JOIN citas_estados ON citas_estados.id=citas.estado;")
    citas = cursor.fetchall()
    cursor.execute("SELECT * FROM citas_estados;")
    citas_estados = cursor.fetchall()
    cursor.close()
    
    return jsonify({"usuarios": usuarios, "citas": citas, "citas_estados": citas_estados}), 200

@app.post("/api/nuevo-registro/speech")
def nuevo_registro_speech():
    data = request.get_json(silent=True) or {}
    filtro = data.get("filtro")
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id, titulo, descripcion, img, seccion, orden FROM speech WHERE seccion = %s ORDER BY orden;", (filtro,))
    rows = cursor.fetchall()
    cursor.close()
    return jsonify(rows), 200

@app.post("/api/nuevo-registro/speech/sync")
def sync_speech():
    data = request.get_json(silent=True) or {}
    seccion = (data.get("seccion") or "").strip()
    items = data.get("items") or []
    deleted_ids = data.get("deletedSpeech") or []

    if not seccion:
        return jsonify({"error": "Falta 'seccion'"}), 400

    cur = mysql.connection.cursor()

    # 1) borrar eliminados
    try:
        if deleted_ids:
            deleted_ids = [int(x) for x in deleted_ids if str(x).isdigit()]
            if deleted_ids:
                placeholders = ",".join(["%s"] * len(deleted_ids))
                cur.execute(f"DELETE FROM speech WHERE id IN ({placeholders}) AND seccion=%s", (*deleted_ids, seccion))

        # 2) upsert (insert nuevos / update existentes)
        for s in items:
            sid = s.get("id")
            titulo = (s.get("titulo") or "").strip()
            descripcion = s.get("descripcion") or ""
            img = s.get("img") or ""
            orden = int(s.get("orden") or 0)
            
            if not sid or isinstance(sid, str):
                cur.execute("""
                    INSERT INTO speech (titulo, descripcion, img, seccion, orden)
                    VALUES (%s, %s, %s, %s, %s)
                """, (titulo, descripcion, img, seccion, orden))
            else:
                # UPDATE existente
                cur.execute("""
                    UPDATE speech
                    SET titulo=%s, descripcion=%s, img=%s, orden=%s
                    WHERE id=%s AND seccion=%s
                """, (titulo, descripcion, img, orden, sid, seccion))

        mysql.connection.commit()
        cur.close()
        return jsonify(), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()

@app.post("/api/nuevo-registro/guardar")
def nuevo_registro_guardar():
    data = request.get_json(silent=True) or {}
    datos = data.get("datos")
    telefono = re.sub(r'\D', '', datos["telefono"])
    current_user = data.get("user")["id"]
    tipocita = data.get("tipocita")
    
    preguntas = data.get("preguntas")
    cursor = mysql.connection.cursor()
    
    if tipocita == "camaras":
        tipocitacamaras = data.get("tipocitacamaras")
        if tipocitacamaras == "desdecero":
            cursor.execute("INSERT INTO clientes (nombre, telefono, domicilio, email, fecha, agente) VALUES (%s, %s, %s, %s, now(), %s)", (datos["nombre"].strip().upper(), telefono, datos["direccion"].strip().upper(), datos["email"].strip().lower(), current_user))
            id_cliente = cursor.lastrowid
        cursor.execute("INSERT INTO citas (cliente, dia, hora, creador, tipo, estado, asignado, notas) VALUES (%s, %s, %s, %s, %s, 1, %s, %s)", (id_cliente, datos["fecha"], data.get("hora"), current_user, tipocita+tipocitacamaras, datos["asignado"], data.get("notas").strip()))
        id_cita = cursor.lastrowid
    for pregunta, respuesta in preguntas.items():
        if pregunta == "presupuesto":
            productos_insert = []

            for producto, info in respuesta.items():
                productos_insert.append((
                    id_cita,
                    int(producto),
                    int(info["cantidad"]),
                    float(info["precioFinal"])
                ))

            cursor.executemany(
                """
                INSERT INTO hojas_productos (hoja, producto, cantidad, precio_final)
                VALUES (%s, %s, %s, %s)
                """,
                productos_insert
            )
    
        cursor.execute(
            """
            INSERT INTO citas_preguntas (cita, pregunta, respuesta)
            VALUES (%s, %s, %s)
            """,
            (id_cita, pregunta, str(respuesta))
        )
    mysql.connection.commit()
    cursor.close()
    return jsonify({"status": "ok"})

@app.post("/api/nuevo-registro/camaras/tiene/nuevo")
def nuevo_registro_camaras_tiene_nuevo():
    data = request.get_json(silent=True) or {}
    datos = data.get("datos")
    telefono = re.sub(r'\D', '', datos["telefono"])
    current_user = data.get("user")["id"]
    preguntas = data.get("preguntas")
    cursor = mysql.connection.cursor()
    cursor.execute("INSERT INTO clientes (nombre, telefono, domicilio, email, fecha, agente) VALUES (%s, %s, %s, %s, now(), %s)", (datos["nombre"].strip().upper(), telefono, datos["direccion"].strip().upper(), datos["email"].strip().lower(), current_user))
    id_cliente = cursor.lastrowid
    cursor.execute("INSERT INTO citas (cliente, dia, hora, creador, tipo, estado, asignado, notas) VALUES (%s, %s, %s, %s, 'camaras-tiene-nuevo-'+%s, 1, %s, %s)", (id_cliente, datos["fecha"], data.get("hora"), current_user, data.get("opcionTipoInstalacion"), datos["asignado"], data.get("notas").strip()))
    id_cita = cursor.lastrowid
    for pregunta, respuesta in preguntas.items():
        if isinstance(respuesta, bool):
            if respuesta:
                cursor.execute("INSERT INTO citas_preguntas (cita, pregunta, respuesta) VALUES (%s, %s, %s)", (id_cita, pregunta, respuesta))
    mysql.connection.commit()
    cursor.close()

    return jsonify({"status": "ok"})

@app.post("/api/configuracion/nuevo-estado")
def configuracion_nuevo_estado():
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute("INSERT INTO citas_estados (estado, color) VALUES (%s, '#383838')", (data.get("estado").strip().upper(),))
    mysql.connection.commit()
    cursor.close()
    return jsonify({"msg": "Estado de cita creado con éxito."}), 201

@app.post("/api/configuracion/nuevo-color-estado")
def configuracion_nuevo_color_estado():
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE citas_estados SET color = %s WHERE id = %s", (data.get("color"), data.get("idestado")))
    mysql.connection.commit()
    cursor.close()
    return jsonify({"msg": "Color actualizado con éxito."}), 201

@app.post("/api/agenda/cambiar-hora")
def agenda_cambiar_hora():
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE citas SET hora = %s WHERE id = %s", (data.get("nuevaHora"), data.get("idcita")))
    mysql.connection.commit()
    cursor.close()
    return jsonify(), 201

@app.post("/api/agenda/cambiar-estado")
def agenda_cambiar_estado():
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE citas SET estado = %s WHERE id = %s", (data.get("nuevoEstado"), data.get("idcita")))
    mysql.connection.commit()
    cursor.close()
    return jsonify(), 201

@app.get("/api/productos")
def get_productos():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM productos")
    query_productos = cursor.fetchall()
    productos = [
    {
        "id": producto["id"],
        "descrip": producto["descrip"],
        "precio": float(producto["precio"]),
        "stock": producto["stock"]
    }
    for producto in query_productos
]

    cursor.close()
    return jsonify(productos), 201

@app.get("/api/cotizacion/<int:idCotizacion>")
def get_cotizacion(idCotizacion):
    cursor = mysql.connection.cursor()

    # 🔹 Productos
    cursor.execute(
        """
        SELECT 
            hp.producto,
            p.descrip,
            hp.cantidad,
            hp.precio_final
        FROM hojas_productos hp
        JOIN productos p ON hp.producto = p.id
        WHERE hp.hoja = %s
        """,
        (idCotizacion,)
    )

    query_productos = cursor.fetchall()

    productos = [
        {
            "id": hoja["producto"],
            "cantidad": float(hoja["cantidad"]),
            "precioFinal": float(hoja["precio_final"]),
            "descrip": hoja["descrip"],
        }
        for hoja in query_productos
    ]

    # 🔹 Total
    cursor.execute(
        """
        SELECT SUM(precio_final) as total
        FROM hojas_productos
        WHERE hoja = %s
        """,
        (idCotizacion,)
    )

    total = cursor.fetchone()["total"] or 0

    cursor.close()

    return jsonify({
        "productos": productos,
        "total": float(total)
    }), 200

if __name__ == "__main__":
    app.run(debug=True)
