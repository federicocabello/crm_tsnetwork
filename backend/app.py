from flask import Flask, jsonify, send_from_directory
from flask_mysqldb import MySQL
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, get_jwt_identity, jwt_required
import os, re
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
#CORS(app, resources={r"/api/*": {"origins": "http://localhost:5174"}}, supports_credentials=True)
CORS(
    app,
    resources={
        r"/api/*": {"origins": "http://localhost:5175"},
        r"/uploads/*": {"origins": "http://localhost:5175"}
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
@jwt_required()
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

    accion = data.get("accion")
    nuevo = data.get("nuevo")
    ident = data.get("ident")

    if acciones[accion] == "habilitado":
        if nuevo == "true":
            nuevo = 1
        else:           
            nuevo = 0

    cursor = mysql.connection.cursor()
    cursor.execute(
        f"UPDATE auth SET {acciones[accion]} = %s WHERE id = %s",
        (nuevo, ident)
    )
    mysql.connection.commit()
    cursor.close()

    return jsonify({"msg": "Usuario modificado con éxito."}), 201

@app.get("/api/clientes/buscar")
def buscar_clientes():
    q = request.args.get("q", "").strip()

    if not q:
        return jsonify([]), 200

    cursor = mysql.connection.cursor()
    try:
        like = f"%{q}%"
        cursor.execute("""
            SELECT clientes.id, clientes.nombre, citas.telefono, citas.domicilio
            FROM clientes
            JOIN citas ON citas.cliente = clientes.id
            WHERE clientes.nombre LIKE %s
               OR citas.telefono LIKE %s
            ORDER BY clientes.nombre ASC
            LIMIT 10
        """, (like, like))
        clientes = cursor.fetchall()
        return jsonify(clientes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/inicio")
def inicio():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname;")
    usuarios = cursor.fetchall()
    cursor.execute("""
                   SELECT 
                        citas.id AS idcita,
                        clientes.id AS idcliente,
                        clientes.nombre AS nombre,
                        DATE_FORMAT(citas.dia, '%Y-%m-%d') AS dia,
                        DATE_FORMAT(citas.hora, '%h:%i') AS hora,
                        DATE_FORMAT(citas.hora, '%h:%i %p') AS hora_format,
                        citas.notas AS notas,
                        auth.id AS idagente,
                        auth.fullname AS fullname,
                        citas.tipo AS tipo,
                        citas.estado AS idestado,
                        citas_estados.estado AS estado,
                        citas_estados.color AS color,
                        citas.telefono AS telefono,
                        citas.domicilio AS direccion,
                        hojas.id AS idhoja,
                        hojas.tipo AS tipo_hoja,
                        CASE 
                            WHEN hojas.id IS NOT NULL THEN 1
                            ELSE 0
                        END AS tiene_hoja
                    FROM citas
                    JOIN clientes ON clientes.id = citas.cliente
                    JOIN auth ON auth.id = citas.asignado
                    JOIN citas_estados ON citas_estados.id = citas.estado
                    LEFT JOIN hojas ON hojas.cita = citas.id;
                   """)
    citas = cursor.fetchall()
    cursor.execute("SELECT * FROM citas_estados;")
    citas_estados = cursor.fetchall()
    cursor.execute("SELECT dia FROM citas GROUP BY dia ORDER BY dia DESC;")
    dias = cursor.fetchall()
    cursor.close()
    
    return jsonify({"usuarios": usuarios, "citas": citas, "citas_estados": citas_estados, "dias": dias}), 200

@app.get("/api/citas_preguntas/<int:id_cita>")
def obtener_preguntas_respuestas(id_cita):
    cursor = mysql.connection.cursor()
    
    try:
        cursor.execute("""
            SELECT pregunta, respuesta
            FROM citas_preguntas
            WHERE cita = %s
        """, (id_cita,))
        
        preguntas_respuestas = cursor.fetchall()
        
        return jsonify(preguntas_respuestas), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()

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

UPLOAD_FOLDER = os.getenv("UPLOADS_DIR")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "docx", "xlsx", "txt"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    return send_from_directory(UPLOADS_DIR, filename)

@app.post("/api/citas/<int:id_cita>/archivos")
def subir_archivos_cita(id_cita):
    archivos = request.files.getlist("archivos")

    if not archivos:
        return jsonify({"error": "No se enviaron archivos"}), 400

    carpeta = os.path.join(UPLOAD_FOLDER, f"cita_{id_cita}")
    os.makedirs(carpeta, exist_ok=True)  # Creamos la carpeta si no existe

    cursor = mysql.connection.cursor()

    try:
        for archivo in archivos:
            nombre_original = archivo.filename
            nombre_seguro = secure_filename(nombre_original)

            # Generamos un nombre único para el archivo
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            nombre_final = f"{timestamp}_{nombre_seguro}"

            # Ruta de almacenamiento en el backend
            ruta_guardado = os.path.join(carpeta, nombre_final)
            archivo.save(ruta_guardado)

            # Ruta accesible desde la web
            directorio = f"/uploads/cita_{id_cita}/{nombre_final}"

            # Guardar el archivo en la base de datos
            cursor.execute("""
                INSERT INTO citas_archivos (cita, original, directorio)
                VALUES (%s, %s, %s)
            """, (id_cita, nombre_original, directorio))

        mysql.connection.commit()

        return jsonify({"msg": "Archivos subidos correctamente"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.get("/api/citas/<int:id_cita>/archivos")
def obtener_archivos_cita(id_cita):
    cursor = mysql.connection.cursor()

    try:
        cursor.execute("""
            SELECT id, original, directorio
            FROM citas_archivos
            WHERE cita = %s
            ORDER BY id DESC
        """, (id_cita,))

        archivos = cursor.fetchall()

        return jsonify(archivos), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        
@app.delete("/api/citas/archivos/<int:id_archivo>")
def eliminar_archivo_cita(id_archivo):
    cursor = mysql.connection.cursor()

    try:
        cursor.execute("""
            SELECT directorio
            FROM citas_archivos
            WHERE id = %s
        """, (id_archivo,))

        archivo = cursor.fetchone()

        if not archivo:
            return jsonify({"error": "Archivo no encontrado"}), 404

        directorio = archivo["directorio"]

        # Convertir la ruta relativa a la ruta absoluta
        ruta_relativa = directorio.lstrip("/")
        ruta_fisica = os.path.join(os.getcwd(), ruta_relativa)

        # Eliminar archivo físicamente
        if os.path.exists(ruta_fisica):
            os.remove(ruta_fisica)

        # Eliminar el registro de la base de datos
        cursor.execute("""
            DELETE FROM citas_archivos
            WHERE id = %s
        """, (id_archivo,))

        mysql.connection.commit()

        return jsonify({"msg": "Archivo eliminado correctamente"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        
@app.post("/api/nuevo-registro/guardar")
def nuevo_registro_guardar():
    data = request.get_json(silent=True) or {}
    datos = data.get("datos")
    telefono = re.sub(r'\D', '', datos["telefono"])
    current_user = data.get("user")["id"]
    cursor = mysql.connection.cursor()
    
    cursor.execute("INSERT INTO clientes (nombre, email, fecha, agente) VALUES (%s, %s, now(), %s)", (datos["nombre"].strip().upper(), datos["email"].strip().lower(), current_user))
    id_cliente = cursor.lastrowid
    cursor.execute("INSERT INTO citas (cliente, dia, hora, creador, tipo, estado, asignado, notas, telefono, domicilio) VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, %s)", (id_cliente, datos["fecha"], data.get("hora"), current_user, "camarasdesdecero", datos["asignado"], data.get("notas").strip(), telefono, datos["direccion"].strip().upper()))
    id_cita = cursor.lastrowid
    
    preguntas = data.get("preguntas")
    if preguntas:
        for pregunta, respuesta in preguntas.items():
            if respuesta not in [None, ""]:
                cursor.execute("INSERT INTO citas_preguntas (cita, pregunta, respuesta) VALUES (%s, %s, %s)", (id_cita, pregunta, respuesta))

    presupuesto = data.get("presupuesto")
    if presupuesto:
        cursor.execute("INSERT INTO hojas (cita, tipo) VALUES (%s, 'instalación')", (id_cita,))
        id_hoja = cursor.lastrowid
        
        productos_insert = []
        for producto, info in presupuesto.items():
            productos_insert.append((
                id_hoja,
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
    mysql.connection.commit()
    cursor.close()
    return jsonify({"status": "ok", "id_cita": id_cita}), 200

@app.post("/api/nuevo-registro/camaras/tiene/nuevo")
def nuevo_registro_camaras_tiene_nuevo():
    data = request.get_json(silent=True) or {}
    datos = data.get("datos")
    telefono = re.sub(r'\D', '', datos["telefono"])
    current_user = data.get("user")["id"]
    
    cursor = mysql.connection.cursor()
    cursor.execute("INSERT INTO clientes (nombre, email, fecha, agente) VALUES (%s, %s, now(), %s)", (datos["nombre"].strip().upper(), datos["email"].strip().lower(), current_user))
    id_cliente = cursor.lastrowid
    
    tipo = 'camaras-tiene-nuevo-'+data.get("opcionTipoInstalacion")
    cursor.execute("INSERT INTO citas (cliente, dia, hora, creador, tipo, estado, asignado, notas, telefono, domicilio) VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, %s)", (id_cliente, datos["fecha"], data.get("hora"), current_user, tipo, datos["asignado"], data.get("notas").strip(), telefono, datos["direccion"].strip().upper()))
    id_cita = cursor.lastrowid
    
    if tipo == "camaras-tiene-nuevo-instalacion":
        preguntas = data.get("preguntas")
        if preguntas:
            for pregunta, respuesta in preguntas.items():
                if respuesta not in [None, ""]:
                    cursor.execute("INSERT INTO citas_preguntas (cita, pregunta, respuesta) VALUES (%s, %s, %s)", (id_cita, pregunta, respuesta))
        
        presupuesto = data.get("presupuesto")
        if presupuesto:
            cursor.execute("INSERT INTO hojas (cita, tipo) VALUES (%s, 'instalación')", (id_cita,))
            id_hoja = cursor.lastrowid
            
            productos_insert = []
            for producto, info in presupuesto.items():
                productos_insert.append((
                    id_hoja,
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
            
    mysql.connection.commit()
    cursor.close()

    return jsonify({"status": "ok"})

@app.get("/api/clientes/buscar-telefono")
def buscar_telefono():
    telefono = request.args.get("telefono")
    if not telefono:
        return jsonify({"error": "Número de teléfono no proporcionado"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT clientes.id, clientes.nombre FROM clientes JOIN citas ON citas.cliente = clientes.id WHERE citas.telefono = %s", (telefono,))
    cliente = cursor.fetchone()
    
    cursor.close()
    
    if cliente:
        return jsonify({"existe": True, "cliente": cliente}), 200
    else:
        return jsonify({"existe": False}), 200

@app.post("/api/nuevo-registro/camaras/tiene/existente")
def nuevo_registro_camaras_tiene_existente():
    data = request.get_json(silent=True) or {}
    datos = data.get("datos")
    current_user = data.get("user")["id"]
    
    cursor = mysql.connection.cursor()
    id_cliente = data.get("clienteSeleccionado")["id"]
    
    telefono = re.sub(r'\D', '', data.get("clienteSeleccionado")["telefono"])
    
    tipo = 'camaras-tiene-existente-'+data.get("opcionTipoInstalacion")
    cursor.execute("INSERT INTO citas (cliente, dia, hora, creador, tipo, estado, asignado, notas, telefono, domicilio) VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, %s)", (id_cliente, datos["fecha"], data.get("hora"), current_user, tipo, datos["asignado"], data.get("notas").strip(), telefono, data.get("clienteSeleccionado")["domicilio"].strip().upper()))
    id_cita = cursor.lastrowid
    
    if tipo == "camaras-tiene-existente-instalacion":
        preguntas = data.get("preguntas")
        if preguntas:
            for pregunta, respuesta in preguntas.items():
                if respuesta not in [None, ""]:
                    cursor.execute("INSERT INTO citas_preguntas (cita, pregunta, respuesta) VALUES (%s, %s, %s)", (id_cita, pregunta, respuesta))
    
        presupuesto = data.get("presupuesto")
        if presupuesto:
            cursor.execute("INSERT INTO hojas (cita, tipo) VALUES (%s, 'instalación')", (id_cita,))
            id_hoja = cursor.lastrowid
            
            productos_insert = []
            for producto, info in presupuesto.items():
                productos_insert.append((
                    id_hoja,
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
    
@app.put("/api/cotizaciones/<int:id_hoja>")
def actualizar_cotizacion(id_hoja):
    data = request.get_json(silent=True) or {}
    productos = data.get("productos", {})

    cursor = mysql.connection.cursor()

    try:
        cursor.execute(
            """
            SELECT citas.estado
            FROM hojas
            JOIN citas ON citas.id = hojas.cita
            WHERE hojas.id = %s
            """,
            (id_hoja,)
        )
        hoja = cursor.fetchone()

        if not hoja:
            return jsonify({"error": "Cotizacion no encontrada"}), 404

        if int(hoja["estado"]) == 9:
            return jsonify({
                "error": "No se puede modificar una cotizacion de una instalacion confirmada"
            }), 409

        cursor.execute(
            "DELETE FROM hojas_productos WHERE hoja = %s",
            (id_hoja,)
        )

        productos_insert = []

        for producto, info in productos.items():
            cantidad = int(info.get("cantidad", 0) or 0)

            if cantidad <= 0:
                continue

            productos_insert.append((
                id_hoja,
                int(producto),
                cantidad,
                float(info.get("precioFinal", 0) or 0)
            ))

        if productos_insert:
            cursor.executemany("""
                INSERT INTO hojas_productos 
                    (hoja, producto, cantidad, precio_final)
                VALUES (%s, %s, %s, %s)
            """, productos_insert)

        mysql.connection.commit()

        return jsonify({"msg": "Cotización actualizada correctamente"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.post("/api/cotizaciones/<int:id_hoja>/confirmar-instalacion")
def confirmar_instalacion(id_hoja):
    cursor = mysql.connection.cursor()

    try:
        cursor.execute(
            """
            SELECT id, tipo, cita
            FROM hojas
            WHERE id = %s
            FOR UPDATE
            """,
            (id_hoja,)
        )
        hoja = cursor.fetchone()

        if not hoja:
            mysql.connection.rollback()
            return jsonify({"error": "Cotizacion no encontrada"}), 404

        if hoja.get("tipo") == "instalacion_confirmada":
            mysql.connection.rollback()
            return jsonify({"error": "Esta instalacion ya fue confirmada"}), 409

        cursor.execute(
            """
            SELECT
                hp.producto,
                hp.cantidad,
                p.descrip,
                p.stock
            FROM hojas_productos hp
            JOIN productos p ON p.id = hp.producto
            WHERE hp.hoja = %s
            FOR UPDATE
            """,
            (id_hoja,)
        )
        productos = cursor.fetchall()

        if not productos:
            mysql.connection.rollback()
            return jsonify({"error": "La cotizacion no tiene productos"}), 400

        sin_stock = [
            {
                "id": producto["producto"],
                "descrip": producto["descrip"],
                "stock": int(producto["stock"] or 0),
                "cantidad": int(producto["cantidad"] or 0),
            }
            for producto in productos
            if int(producto["stock"] or 0) < int(producto["cantidad"] or 0)
        ]

        if sin_stock:
            mysql.connection.rollback()
            return jsonify({
                "error": "Stock insuficiente para confirmar la instalacion",
                "productos": sin_stock,
            }), 409

        productos_actualizados = []
        for producto in productos:
            cantidad = int(producto["cantidad"] or 0)
            producto_id = int(producto["producto"])

            cursor.execute(
                """
                UPDATE productos
                SET stock = stock - %s
                WHERE id = %s
                """,
                (cantidad, producto_id)
            )

            productos_actualizados.append({
                "id": producto_id,
                "descrip": producto["descrip"],
                "cantidad_descontada": cantidad,
                "stock_anterior": int(producto["stock"] or 0),
                "stock_actual": int(producto["stock"] or 0) - cantidad,
            })

        cursor.execute(
            """
            UPDATE hojas
            SET tipo = 'instalacion_confirmada'
            WHERE id = %s
            """,
            (id_hoja,)
        )

        cursor.execute(
            """
            UPDATE citas
            SET estado = 9
            WHERE id = %s
            """,
            (hoja["cita"],)
        )

        mysql.connection.commit()

        return jsonify({
            "msg": "Instalacion confirmada y stock actualizado",
            "productos": productos_actualizados,
        }), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.post("/api/agenda/editar-cita")
def agenda_editar_cita():
    data = request.get_json(silent=True) or {}
    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE clientes SET nombre = %s WHERE id = %s", (data.get("nombre").strip().upper(), data.get("idcliente")))
    cursor.execute("UPDATE citas SET dia = %s, hora = %s, notas = %s, telefono = %s, domicilio = %s WHERE id = %s", (data.get("dia"), data.get("hora"), data.get("notas").strip(), re.sub(r'\D', '', data.get("telefono")), data.get("direccion").strip().upper(), data.get("idcita")))
    mysql.connection.commit()
    cursor.close()
    return jsonify(), 200

@app.post("/api/cotizacion/nueva")
def crear_cotizacion():
    data = request.get_json(silent=True) or {}

    id_cita = data.get("cita")
    productos = data.get("productos", {})

    cursor = mysql.connection.cursor()

    try:
        # 🔹 crear hoja
        cursor.execute(
            "INSERT INTO hojas (cita, tipo) VALUES (%s, 'instalacion')",
            (id_cita,)
        )
        id_hoja = cursor.lastrowid

        productos_insert = []

        for producto, info in productos.items():
            cantidad = int(info.get("cantidad", 0) or 0)

            if cantidad <= 0:
                continue

            productos_insert.append((
                id_hoja,
                int(producto),
                cantidad,
                float(info.get("precioFinal", 0) or 0)
            ))

        if productos_insert:
            cursor.executemany("""
                INSERT INTO hojas_productos (hoja, producto, cantidad, precio_final)
                VALUES (%s, %s, %s, %s)
            """, productos_insert)

        mysql.connection.commit()

        return jsonify({"msg": "Cotización creada"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.get("/api/fetch-detalles/<int:idcita>")
def fetch_detalles(idcita):
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT tipo FROM citas WHERE id = %s", (idcita,))
    tipo = cursor.fetchone()["tipo"]
    if not tipo:
        return jsonify({"error": "Cita no encontrada"}), 404
    cursor.execute("SELECT pregunta, respuesta FROM citas_preguntas WHERE cita = %s", (idcita,))
    detalles = cursor.fetchall()
    cursor.close()
    return jsonify({"tipo": tipo, "detalles": detalles}), 200

@app.put("/api/actualizar-detalles/<int:idcita>")
def actualizar_detalles(idcita):
    data = request.get_json()
    respuestas = data.get("respuestas", {})

    if not respuestas:
        return jsonify({"error": "No se enviaron respuestas"}), 400

    cursor = mysql.connection.cursor()

    try:
        for pregunta, respuesta in respuestas.items():
            cursor.execute("""
                SELECT id 
                FROM citas_preguntas 
                WHERE cita = %s AND pregunta = %s
            """, (idcita, pregunta))

            existe = cursor.fetchone()

            if existe:
                cursor.execute("""
                    UPDATE citas_preguntas
                    SET respuesta = %s
                    WHERE cita = %s AND pregunta = %s
                """, (respuesta, idcita, pregunta))
            else:
                cursor.execute("""
                    INSERT INTO citas_preguntas (cita, pregunta, respuesta)
                    VALUES (%s, %s, %s)
                """, (idcita, pregunta, respuesta))

        mysql.connection.commit()

        return jsonify({"msg": "Detalles actualizados correctamente"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.post("/api/editar_modelo_nvr")
def editar_modelo_nvr():
    data = request.get_json()

    idcita = data.get("idcita")
    nuevo_modelo = data.get("nuevoModelo", "").strip()

    if not idcita:
        return jsonify({"error": "Falta idcita"}), 400

    cursor = mysql.connection.cursor()

    try:
        cursor.execute("""
            SELECT id
            FROM citas_preguntas
            WHERE cita = %s AND pregunta = 'modelonvr'
        """, (idcita,))

        existe = cursor.fetchone()

        if existe:
            cursor.execute("""
                UPDATE citas_preguntas
                SET respuesta = %s
                WHERE cita = %s AND pregunta = 'modelonvr'
            """, (nuevo_modelo, idcita))
        else:
            cursor.execute("""
                INSERT INTO citas_preguntas (cita, pregunta, respuesta)
                VALUES (%s, 'modelonvr', %s)
            """, (idcita, nuevo_modelo))

        mysql.connection.commit()

        return jsonify({
            "msg": "Modelo de NVR actualizado correctamente",
            "idcita": idcita,
            "modelo": nuevo_modelo
        }), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.get("/api/clientes/<int:id_cliente>")
def obtener_datos_cliente(id_cliente):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id AS idcliente, nombre, email FROM clientes WHERE id = %s",(id_cliente,))
        cliente = cursor.fetchone()
        if not cliente:
            return jsonify({"error": "Cliente no encontrado"}), 404

        cursor.execute("SELECT citas.id AS idcita, DATE_FORMAT(citas.dia, '%%e %%M %%Y') AS dia, DATE_FORMAT(citas.hora, '%%h:%%i %%p') AS hora, tipo, notas, telefono, domicilio, auth.fullname AS asignado, citas_estados.estado AS estado, citas_estados.color AS color, DATE_FORMAT(citas.dia, '%%Y-%%m-%%d') AS dia_format, DATE_FORMAT(citas.hora, '%%h:%%i %%p') AS hora_format, DATE_FORMAT(citas.hora, '%%H:%%i') AS hora_24, citas.estado AS idestado, citas.asignado AS idasignado FROM citas JOIN auth ON auth.id = citas.asignado JOIN citas_estados ON citas_estados.id = citas.estado WHERE citas.cliente = %s ORDER BY citas.dia DESC, hora DESC", (id_cliente,))
        citas = cursor.fetchall()
        cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname;")
        users = cursor.fetchall()
        cursor.execute("SELECT id, estado FROM citas_estados ORDER BY estado;")
        estados = cursor.fetchall()
        cursor.execute("""
            SELECT COALESCE(SUM(p.total - COALESCE(cuotas_pagadas.total_pagado, 0)), 0) AS deuda_total
            FROM pagos p
            LEFT JOIN (
                SELECT pago, SUM(monto) AS total_pagado
                FROM pagos_cuotas
                WHERE pagado = 1
                GROUP BY pago
            ) cuotas_pagadas ON cuotas_pagadas.pago = p.id
            WHERE p.cliente = %s;
        """, (id_cliente,))
        deuda_total = cursor.fetchone()
        deuda_total = float(deuda_total["deuda_total"]) if deuda_total else 0.0
        return jsonify({"cliente": cliente, "citas": citas, "users": users, "estados": estados, "deuda_total": deuda_total}), 200
    except Exception as e:
        print("Error interno:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.put("/api/citas/actualizar/<int:id_cita>")
def actualizar_cita(id_cita):
    data = request.get_json(silent=True) or {}
    telefono = re.sub(r'\D', '', data["telefono"])
    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE citas SET dia = %s, hora = %s, notas = %s, telefono = %s, domicilio = %s, asignado = %s, estado = %s WHERE id = %s", (data.get("fecha"), data.get("horario"), data.get("notas").strip(), telefono, data.get("direccion").strip().upper(), data.get("asignado"), data.get("estado"), id_cita))
    mysql.connection.commit()
    cursor.close()
    return jsonify({"msg": "Cita actualizada correctamente"}), 200

@app.get("/api/clientes/buscar/info")
def busqueda_clientes():
    q = request.args.get("q", "").strip()

    if not q:
        return jsonify({"clientes": []}), 200

    cursor = mysql.connection.cursor()
    try:
        query = """
            SELECT id, nombre, email
            FROM clientes
            WHERE nombre LIKE %s GROUP BY nombre
        """
        search_term = f"%{q}%"
        cursor.execute(query, (search_term,))
        clientes = cursor.fetchall()

        return jsonify({"clientes": clientes}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/clientes/buscar/citas/<int:id_cliente>")
def buscar_citas_cliente(id_cliente):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id, DATE_FORMAT(dia, '%%e %%M %%Y') AS dia, DATE_FORMAT(hora, '%%h:%%i %%p') AS hora, DATE_FORMAT(dia, '%%Y-%%m-%%d') AS dia_original FROM citas WHERE cliente = %s ORDER BY dia DESC, hora DESC", (id_cliente,))
        citas = cursor.fetchall()
        return jsonify({"citas": citas}), 200
    except Exception as e:
        print("Error interno:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/clientes/pagos/<int:id_cita>")
def obtener_pagos_cliente(id_cita):
    cursor = mysql.connection.cursor()
    try:
        # Traer el plan de pagos (registro padre)
        cursor.execute(
            "SELECT id AS id_pago, total FROM pagos WHERE cita = %s LIMIT 1",
            (id_cita,)
        )
        plan = cursor.fetchone()

        if not plan:
            return jsonify({"cuotas": [], "id_pago": None, "total": 0}), 200

        id_pago = plan["id_pago"]
        total   = float(plan["total"])

        cursor.execute(
            """
            SELECT pagos_cuotas.id AS idcuota,
                   pagos_cuotas.monto AS monto,
                   pagos_cuotas.interes AS interes,
                   pagos_cuotas.pagado AS pagado,
                   pagos_cuotas.vencimiento AS vencimiento,
                   pagos_cuotas.fechapago AS fechapago,
                   pagos_cuotas.metodo AS idmetodo,
                   pagos_metodos.metodo AS metodo
            FROM pagos_cuotas
            JOIN pagos_metodos ON pagos_metodos.id = pagos_cuotas.metodo
            WHERE pagos_cuotas.pago = %s
            ORDER BY pagos_cuotas.vencimiento ASC
            """,
            (id_pago,)
        )
        cuotas = cursor.fetchall()
        return jsonify({"cuotas": cuotas, "id_pago": id_pago, "total": total}), 200
    except Exception as e:
        print("Error interno:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.put("/api/plan-de-pagos/<int:id_pago>")
def actualizar_plan_de_pagos(id_pago):
    data = request.get_json(silent=True) or {}
    monto_total = data.get("montoTotal")
    cuotas      = data.get("cuotas", [])

    if monto_total is None or not cuotas:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id FROM pagos WHERE id = %s LIMIT 1", (id_pago,))
        if not cursor.fetchone():
            return jsonify({"error": "Plan de pagos no encontrado"}), 404

        # 1) Actualizar el total del plan padre.
        cursor.execute(
            "UPDATE pagos SET total = %s WHERE id = %s",
            (float(monto_total), id_pago)
        )

        # 2) Reemplazar las cuotas: borrar todas y reescribir desde el payload.
        cursor.execute("DELETE FROM pagos_cuotas WHERE pago = %s", (id_pago,))

        for cuota in cuotas:
            monto       = float(cuota.get("monto", 0))
            interes     = float(cuota.get("interes", 0))
            vencimiento = cuota.get("vencimiento")
            pagado      = int(bool(cuota.get("pagado", False)))
            fechapago   = cuota.get("fechapago") if pagado else None
            metodo      = int(cuota.get("idmetodo") or cuota.get("metodo") or 1)

            if pagado and not fechapago:
                cursor.execute(
                    """
                    INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, fechapago, metodo)
                    VALUES (%s, %s, %s, %s, %s, NOW(), %s)
                    """,
                    (id_pago, monto, interes, vencimiento, pagado, metodo)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, fechapago, metodo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (id_pago, monto, interes, vencimiento, pagado, fechapago, metodo)
                )

        mysql.connection.commit()
        return jsonify({"msg": "Plan de pagos actualizado correctamente"}), 200

    except Exception as e:
        mysql.connection.rollback()
        print("Error al actualizar plan de pagos:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/plan-de-pagos")
def crear_plan_de_pagos():
    data = request.get_json(silent=True) or {}
    print(data)

    id_cliente = data.get("idCliente")
    id_cita    = data.get("idCita")
    monto_total = data.get("montoTotal")
    cuotas      = data.get("cuotas", [])

    if not id_cliente or not id_cita or monto_total is None or not cuotas:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    cursor = mysql.connection.cursor()
    try:
        # 1) Crear el registro de pago padre
        cursor.execute(
            "INSERT INTO pagos (cliente, cita, total) VALUES (%s, %s, %s)",
            (id_cliente, id_cita, float(monto_total))
        )
        id_pago = cursor.lastrowid

        # 2) Insertar cada cuota con su propio monto e interés
        for cuota in cuotas:
            monto     = float(cuota.get("monto", 0))
            interes   = float(cuota.get("interes", 0))
            vencimiento = cuota.get("vencimiento")

            cursor.execute(
                """
                INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, metodo)
                VALUES (%s, %s, %s, %s, 0, 1)
                """,
                (id_pago, monto, interes, vencimiento)
            )

        mysql.connection.commit()
        return jsonify({"msg": "Plan de pagos guardado correctamente", "id_pago": id_pago}), 201

    except Exception as e:
        mysql.connection.rollback()
        print("Error al crear plan de pagos:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

if __name__ == "__main__":
    app.run(debug=True)
