import mimetypes
import mimetypes
from flask import Flask, jsonify, send_from_directory
from flask_mysqldb import MySQL
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, get_jwt, get_jwt_identity, jwt_required
import os, re, json
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
#CORS(app, resources={r"/api/*": {"origins": "http://localhost:5174"}}, supports_credentials=True)
CORS(
    app,
    resources={
        r"/api/*": {"origins": "http://localhost:5177"},
        r"/uploads/*": {"origins": "http://localhost:5177"}
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
app.config["JWT_VERIFY_SUB"] = False
jwt = JWTManager(app)

mysql = MySQL(app)

def table_has_column(table_name, column_name):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT COUNT(*) AS cantidad
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME = %s
            """,
            (table_name, column_name)
        )
        row = cursor.fetchone() or {}
        return int(row.get("cantidad") or 0) > 0
    finally:
        cursor.close()

from flask import jsonify, request
from flask_jwt_extended import create_access_token

@app.route("/api/me", methods=["GET", "OPTIONS"])
@jwt_required()
def me():
    if request.method == "OPTIONS":
        return '', 204  # Responde correctamente a la solicitud OPTIONS

    claims = get_jwt()
    user = claims.get("user") or get_jwt_identity()

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

    token = create_access_token(
        identity=str(user_payload["id"]),
        additional_claims={"user": user_payload},
    )
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

@app.post("/api/reclutamiento/postular")
def reclutamiento_postular():
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    email = (data.get("email") or "").strip().lower()
    telefono = (data.get("telefono") or "").strip()
    direccion = (data.get("direccion") or "").strip()
    experiencia = (data.get("experiencia") or "").strip()
    respuestas = data.get("respuestas") or {}

    if not nombre or not email or not telefono or not direccion:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    if not isinstance(respuestas, (dict, list)) or not respuestas:
        return jsonify({"error": "Debes completar la prueba tecnica"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO postulaciones_tecnicos
                (nombre, email, telefono, direccion, experiencia, respuestas)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (nombre, email, telefono, direccion, experiencia, json.dumps(respuestas)),
        )
        mysql.connection.commit()
        return jsonify({"msg": "Postulacion enviada correctamente", "id": cursor.lastrowid}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/reclutamiento/postulaciones")
def reclutamiento_postulaciones():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT
                p.id,
                p.nombre,
                p.email,
                p.telefono,
                p.direccion,
                p.experiencia,
                p.respuestas,
                p.estado,
                p.comentarios,
                p.tecnico_usuario_id,
                DATE_FORMAT(p.fecha_postulacion, '%Y-%m-%d %H:%i') AS fecha_postulacion,
                DATE_FORMAT(p.fecha_evaluacion, '%Y-%m-%d %H:%i') AS fecha_evaluacion,
                a.user AS tecnico_user,
                a.fullname AS tecnico_fullname
            FROM postulaciones_tecnicos p
            LEFT JOIN auth a ON a.id = p.tecnico_usuario_id
            ORDER BY p.fecha_postulacion DESC
            """
        )
        postulaciones = cursor.fetchall()

        for postulacion in postulaciones:
            respuestas = postulacion.get("respuestas")
            if isinstance(respuestas, str):
                try:
                    postulacion["respuestas"] = json.loads(respuestas)
                except Exception:
                    postulacion["respuestas"] = {}

        return jsonify(postulaciones), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/reclutamiento/postulaciones/<int:postulacion_id>/evaluar")
def reclutamiento_evaluar_postulacion(postulacion_id):
    data = request.get_json(silent=True) or {}
    estado = (data.get("estado") or "").strip()
    comentarios = (data.get("comentarios") or "").strip()
    username = (data.get("user") or data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if estado not in {"aprobado", "rechazado"}:
        return jsonify({"error": "Estado invalido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT * FROM postulaciones_tecnicos WHERE id = %s LIMIT 1", (postulacion_id,))
        postulacion = cursor.fetchone()

        if not postulacion:
            return jsonify({"error": "Postulacion no encontrada"}), 404

        tecnico_usuario_id = postulacion.get("tecnico_usuario_id")

        if estado == "aprobado" and not tecnico_usuario_id:
            if not username or not password:
                return jsonify({"error": "Usuario y contrasena requeridos para contratar"}), 400

            cursor.execute("SELECT id FROM auth WHERE `user` = %s LIMIT 1", (username,))
            if cursor.fetchone():
                return jsonify({"error": "El usuario ya existe"}), 409

            cursor.execute(
                """
                INSERT INTO auth (`user`, `password`, fullname, rol, habilitado)
                VALUES (%s, %s, %s, 'tecnico', 1)
                """,
                (username, password, postulacion.get("nombre")),
            )
            tecnico_usuario_id = cursor.lastrowid

        cursor.execute(
            """
            UPDATE postulaciones_tecnicos
            SET estado = %s,
                comentarios = %s,
                tecnico_usuario_id = %s,
                fecha_evaluacion = NOW()
            WHERE id = %s
            """,
            (estado, comentarios, tecnico_usuario_id, postulacion_id),
        )

        mysql.connection.commit()
        return jsonify({"msg": "Postulacion evaluada correctamente", "tecnico_usuario_id": tecnico_usuario_id}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/tecnico/videos-vistos")
@jwt_required()
def tecnico_videos_vistos():
    tecnico_usuario_id = get_jwt_identity()
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "SELECT video_id FROM tecnicos_videos_vistos WHERE tecnico_usuario_id = %s",
            (tecnico_usuario_id,),
        )
        videos = [row["video_id"] for row in cursor.fetchall()]
        return jsonify({"videos_vistos": videos}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/tecnico/marcar-video-visto")
@jwt_required()
def tecnico_marcar_video_visto():
    tecnico_usuario_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    video_id = (data.get("video_id") or "").strip()

    if not video_id:
        return jsonify({"error": "video_id requerido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO tecnicos_videos_vistos (tecnico_usuario_id, video_id)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE visto_en = visto_en
            """,
            (tecnico_usuario_id, video_id),
        )
        mysql.connection.commit()
        return jsonify({"msg": "Video marcado como visto", "video_id": video_id}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/configuracion/usuarios/<int:usuario_id>/archivos")
def get_usuario_archivos(usuario_id):
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM usuarios_archivos WHERE usuario = %s", (usuario_id,))
    archivos = cursor.fetchall()
    cursor.close()
    return jsonify(archivos), 200

@app.post("/api/configuracion/usuarios/<int:usuario_id>/archivos")
def upload_usuario_archivo(usuario_id):
    if "archivo" not in request.files:
        return jsonify({"msg": "No se encontró archivo"}), 400
    
    file = request.files["archivo"]
    if file.filename == "":
        return jsonify({"msg": "Ningún archivo seleccionado"}), 400
    
    original = secure_filename(file.filename)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S_")
    directorio = timestamp + original
    
    save_path = os.path.join(app.root_path, "uploads", "usuarios", directorio)
    file.save(save_path)
    
    cursor = mysql.connection.cursor()
    cursor.execute(
        "INSERT INTO usuarios_archivos (usuario, original, directorio) VALUES (%s, %s, %s)",
        (usuario_id, original, directorio)
    )
    mysql.connection.commit()
    cursor.close()
    
    return jsonify({"msg": "Archivo subido correctamente"}), 201

@app.delete("/api/configuracion/usuarios/archivos/<int:archivo_id>")
def delete_usuario_archivo(archivo_id):
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT directorio FROM usuarios_archivos WHERE id = %s", (archivo_id,))
    row = cursor.fetchone()
    
    if row:
        directorio = row["directorio"]
        file_path = os.path.join(app.root_path, "uploads", "usuarios", directorio)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        cursor.execute("DELETE FROM usuarios_archivos WHERE id = %s", (archivo_id,))
        mysql.connection.commit()
    
    cursor.close()
    return jsonify({"msg": "Archivo eliminado con éxito"}), 200

@app.get("/uploads/usuarios/<path:filename>")
def get_upload_usuario(filename):
    return send_from_directory(os.path.join(app.root_path, "uploads", "usuarios"), filename)

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
                        END AS tiene_hoja,
                        hojas_inspeccion.id AS idinspeccion,
                        CASE 
                            WHEN hojas_inspeccion.id IS NOT NULL THEN 1
                            ELSE 0
                        END AS tiene_inspeccion
                    FROM citas
                    JOIN clientes ON clientes.id = citas.cliente
                    JOIN auth ON auth.id = citas.asignado
                    JOIN citas_estados ON citas_estados.id = citas.estado
                    LEFT JOIN hojas ON hojas.cita = citas.id
                    LEFT JOIN hojas_inspeccion ON hojas_inspeccion.cita = citas.id;
                   """)
    citas = cursor.fetchall()
    cursor.execute("SELECT * FROM citas_estados;")
    citas_estados = cursor.fetchall()
    cursor.execute("SELECT dia FROM citas GROUP BY dia ORDER BY dia DESC;")
    dias = cursor.fetchall()
    cursor.execute("""
        SELECT
            pagos_cuotas.id AS idcuota,
            pagos.id AS idpago,
            clientes.id AS idcliente,
            clientes.nombre AS cliente,
            citas.id AS idcita,
            pagos_cuotas.monto AS monto,
            pagos_cuotas.interes AS interes,
            DATE_FORMAT(pagos_cuotas.vencimiento, '%Y-%m-%d') AS vencimiento,
            DATEDIFF(pagos_cuotas.vencimiento, CURDATE()) AS dias
        FROM pagos_cuotas
        JOIN pagos ON pagos.id = pagos_cuotas.pago
        JOIN clientes ON clientes.id = pagos.cliente
        LEFT JOIN citas ON citas.id = pagos.cita
        WHERE pagos_cuotas.pagado = 0
          AND pagos_cuotas.vencimiento <= DATE_ADD(CURDATE(), INTERVAL 5 DAY)
        ORDER BY pagos_cuotas.vencimiento ASC, clientes.nombre ASC;
    """)
    cuotas_alertas = cursor.fetchall()
    cursor.close()
    
    return jsonify({"usuarios": usuarios, "citas": citas, "citas_estados": citas_estados, "dias": dias, "cuotas_alertas": cuotas_alertas}), 200

@app.get("/api/tareas/registros")
def tareas_registros():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            SELECT 
                citas.id AS idcita,
                clientes.id AS idcliente,
                clientes.nombre AS nombre,
                DATE_FORMAT(citas.dia, '%Y-%m-%d') AS dia,
                DATE_FORMAT(citas.hora, '%H:%i') AS hora,
                DATE_FORMAT(citas.hora, '%h:%i %p') AS hora_format,
                citas.notas AS notas,
                auth.id AS idagente,
                auth.fullname AS fullname,
                citas.tipo AS tipo,
                citas.estado AS idestado,
                citas_estados.estado AS estado,
                citas_estados.color AS color,
                citas.telefono AS telefono,
                citas.domicilio AS direccion
            FROM citas
            JOIN clientes ON clientes.id = citas.cliente
            JOIN auth ON auth.id = citas.asignado
            JOIN citas_estados ON citas_estados.id = citas.estado
            ORDER BY citas.dia DESC, citas.hora DESC;
        """)
        registros = cursor.fetchall()

        cursor.execute("SELECT * FROM citas_estados ORDER BY estado;")
        estados = cursor.fetchall()

        cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname;")
        usuarios = cursor.fetchall()

        return jsonify({
            "registros": registros,
            "estados": estados,
            "usuarios": usuarios,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

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

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf", "docx", "xlsx", "txt"}
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def allowed_image_file(file):
    filename = file.filename or ""
    extension_ok = "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS
    mimetype_ok = (file.mimetype or "").lower() in {
        "image/png", "image/jpeg", "image/jpg", "image/gif",
        "image/webp", "image/heic", "image/heif"
    }
    # Accept if either extension OR mimetype is valid (camera photos may lack extension)
    return extension_ok or mimetype_ok

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
FRONTEND_UPLOADS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "uploads"))
COMPROBANTES_UPLOADS_DIR = os.path.join(FRONTEND_UPLOADS_DIR, "comprobantes")
UPLOAD_FOLDER = os.getenv("UPLOADS_DIR") or UPLOADS_DIR

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    backend_file = os.path.abspath(os.path.join(UPLOADS_DIR, filename))
    frontend_file = os.path.abspath(os.path.join(FRONTEND_UPLOADS_DIR, filename))

    if backend_file.startswith(os.path.abspath(UPLOADS_DIR)) and os.path.isfile(backend_file):
        return send_from_directory(UPLOADS_DIR, filename)

    if frontend_file.startswith(os.path.abspath(FRONTEND_UPLOADS_DIR)) and os.path.isfile(frontend_file):
        return send_from_directory(FRONTEND_UPLOADS_DIR, filename)

    return send_from_directory(UPLOADS_DIR, filename)

@app.post("/api/comprobantes/<int:id_cita>")
def subir_comprobante_pago(id_cita):
    archivo = request.files.get("comprobante")
    comprobante_anterior = (request.form.get("comprobanteAnterior") or "").strip()

    if not archivo:
        return jsonify({"error": "No se envio ningun comprobante"}), 400

    nombre_original = archivo.filename or ""
    if not allowed_file(nombre_original):
        return jsonify({"error": "Tipo de archivo no permitido"}), 400

    nombre_seguro = secure_filename(nombre_original)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    nombre_final = f"{timestamp}_{nombre_seguro}"
    carpeta = os.path.join(COMPROBANTES_UPLOADS_DIR, f"cita_{id_cita}")
    os.makedirs(carpeta, exist_ok=True)

    ruta_guardado = os.path.join(carpeta, nombre_final)
    archivo.save(ruta_guardado)

    prefijo_permitido = f"/uploads/comprobantes/cita_{id_cita}/"
    if comprobante_anterior.startswith(prefijo_permitido):
        ruta_relativa = comprobante_anterior.replace("/uploads/", "", 1)
        ruta_anterior = os.path.abspath(os.path.join(FRONTEND_UPLOADS_DIR, ruta_relativa))
        carpeta_comprobantes = os.path.abspath(COMPROBANTES_UPLOADS_DIR)
        if ruta_anterior.startswith(carpeta_comprobantes) and os.path.isfile(ruta_anterior):
            os.remove(ruta_anterior)

    directorio = f"/uploads/comprobantes/cita_{id_cita}/{nombre_final}"
    return jsonify({"comprobante": directorio, "original": nombre_original}), 200

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

@app.post("/api/configuracion/nuevo-nombre-estado")
def configuracion_nuevo_nombre_estado():
    data = request.get_json(silent=True) or {}
    estado = (data.get("estado") or "").strip().upper()
    idestado = data.get("idestado")

    if not estado or not idestado:
        return jsonify({"error": "Faltan datos"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE citas_estados SET estado = %s WHERE id = %s", (estado, idestado))
    mysql.connection.commit()
    cursor.close()
    return jsonify({"msg": "Estado actualizado correctamente."}), 200

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

@app.put("/api/productos/<int:id_producto>")
def actualizar_producto(id_producto):
    data = request.get_json(silent=True) or {}
    descrip = data.get("descrip")
    precio = data.get("precio")
    stock = data.get("stock")
    
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            UPDATE productos 
            SET descrip = %s, precio = %s, stock = %s 
            WHERE id = %s
            """,
            (descrip, precio, stock, id_producto)
        )
        mysql.connection.commit()
        return jsonify({"msg": "Producto actualizado correctamente"}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/productos")
def crear_producto():
    data = request.get_json(silent=True) or {}
    descrip = data.get("descrip")
    precio = data.get("precio")
    stock = data.get("stock")
    
    if not descrip or precio is None or stock is None:
        return jsonify({"error": "Faltan datos"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO productos (descrip, precio, stock)
            VALUES (%s, %s, %s)
            """,
            (descrip, precio, stock)
        )
        mysql.connection.commit()
        return jsonify({"msg": "Producto creado correctamente"}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.delete("/api/productos/<int:id_producto>")
def eliminar_producto(id_producto):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("DELETE FROM productos WHERE id = %s", (id_producto,))
        mysql.connection.commit()
        return jsonify({"msg": "Producto eliminado correctamente"}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

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

    cursor.execute(
        "SELECT firma_instalacion, firma_foto_instalacion FROM hojas WHERE id = %s",
        (idCotizacion,),
    )
    hoja_info = cursor.fetchone()
    firma_instalacion = hoja_info["firma_instalacion"] if hoja_info else None
    firma_foto_instalacion = hoja_info["firma_foto_instalacion"] if hoja_info else None

    cursor.close()

    return jsonify({
        "productos": productos,
        "total": float(total),
        "firma_instalacion": firma_instalacion,
        "firma_foto_instalacion": firma_foto_instalacion,
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

@app.post("/api/cotizaciones/<int:id_hoja>/confirmar-instalacion-legacy")
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

@app.post("/api/cotizaciones/<int:id_hoja>/firma-instalacion-legacy")
def guardar_firma_instalacion(id_hoja):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id, cita, tipo FROM hojas WHERE id = %s", (id_hoja,))
        hoja = cursor.fetchone()
        if not hoja:
            return jsonify({"error": "Cotizacion no encontrada"}), 404
        if hoja.get("tipo") != "instalacion_confirmada":
            return jsonify({"error": "La instalacion no esta confirmada aun"}), 400

        id_cita = hoja["cita"]
        archivo_firma = request.files.get("firma")
        
        firma_path = None
        if archivo_firma:
            from werkzeug.utils import secure_filename
            import os
            import time
            nombre_seguro = secure_filename(archivo_firma.filename)
            timestamp = int(time.time())
            nombre_final = f"firma_inst_{timestamp}_{nombre_seguro}"
            carpeta = os.path.join(app.root_path, "uploads", f"cita_{id_cita}")
            os.makedirs(carpeta, exist_ok=True)
            archivo_firma.save(os.path.join(carpeta, nombre_final))
            firma_path = f"/uploads/cita_{id_cita}/{nombre_final}"
            
            cursor.execute("UPDATE hojas SET firma_instalacion = %s WHERE id = %s", (firma_path, id_hoja))
            mysql.connection.commit()
            
        return jsonify({"msg": "Firma guardada correctamente", "firma_instalacion": firma_path}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/cotizacion/<int:idCotizacion>")
def get_cotizacion_detallada(idCotizacion):
    cursor = mysql.connection.cursor()

    try:
        cursor.execute(
            """
            SELECT id, cita, firma_instalacion, firma_foto_instalacion
            FROM hojas
            WHERE id = %s
            """,
            (idCotizacion,)
        )
        hoja_info = cursor.fetchone()

        if not hoja_info:
            return jsonify({"error": "Cotizacion no encontrada"}), 404

        cursor.execute(
            """
            SELECT
                hp.producto,
                p.descrip,
                hp.cantidad,
                hp.precio_final,
                hp.detalle
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
                "precioFinal": float(hoja["precio_final"] or 0),
                "descrip": hoja["descrip"],
                "detalle": hoja.get("detalle") or "",
            }
            for hoja in query_productos
        ]

        cursor.execute(
            """
            SELECT SUM(precio_final) as total
            FROM hojas_productos
            WHERE hoja = %s
            """,
            (idCotizacion,)
        )
        total = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT id
            FROM hojas_inspeccion
            WHERE cita = %s
            """,
            (hoja_info["cita"],)
        )
        inspeccion = cursor.fetchone()

        inspeccion_items = []

        if inspeccion:
            cursor.execute(
                """
                SELECT
                    hi.producto_id,
                    p.descrip AS producto_descrip,
                    p.stock AS producto_stock,
                    p.precio AS producto_precio,
                    hi.cantidad,
                    hi.detalle
                FROM hojas_inspeccion_items hi
                JOIN productos p ON p.id = hi.producto_id
                WHERE hi.inspeccion_id = %s
                """,
                (inspeccion["id"],)
            )
            inspeccion_items = cursor.fetchall()

        return jsonify({
            "productos": productos,
            "total": float(total),
            "firma_instalacion": hoja_info.get("firma_instalacion"),
            "firma_foto_instalacion": hoja_info.get("firma_foto_instalacion"),
            "inspeccion_items": inspeccion_items,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/cotizaciones/<int:id_hoja>/confirmar-instalacion")
def confirmar_instalacion_sin_stock(id_hoja):
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

        return jsonify({"msg": "Instalacion confirmada"}), 200

    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()

@app.post("/api/cotizaciones/<int:id_hoja>/firma-instalacion")
def guardar_firma_instalacion_con_materiales(id_hoja):
    items_str = request.form.get("items", "[]")
    try:
        items = json.loads(items_str)
    except Exception:
        items = []

    archivo_firma = request.files.get("firma")
    archivo_foto = request.files.get("firma_foto")

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT id, cita, tipo, firma_instalacion
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

        if hoja.get("tipo") != "instalacion_confirmada":
            mysql.connection.rollback()
            return jsonify({"error": "La instalacion no esta confirmada aun"}), 400

        if hoja.get("firma_instalacion"):
            mysql.connection.rollback()
            return jsonify({"error": "La hoja de instalacion ya esta firmada y no se puede editar"}), 409

        productos_insert = []
        producto_ids = []

        for item in items:
            producto_id = int(item.get("producto_id") or item.get("id") or 0)
            cantidad = int(float(item.get("cantidad", 0) or 0))

            if producto_id <= 0 or cantidad <= 0:
                continue

            producto_ids.append(producto_id)
            productos_insert.append({
                "producto_id": producto_id,
                "cantidad": cantidad,
                "precio_final": float(item.get("precioFinal", item.get("precio_final", 0)) or 0),
                "detalle": (item.get("detalle") or "")[:255],
            })

        if archivo_firma and not productos_insert:
            mysql.connection.rollback()
            return jsonify({"error": "La hoja de instalacion debe tener materiales para firmar"}), 400

        if archivo_firma:
            if archivo_foto and not allowed_image_file(archivo_foto):
                mysql.connection.rollback()
                return jsonify({"error": "La foto del cliente debe ser una imagen PNG o JPG"}), 400

        precios_actuales = {}
        if producto_ids:
            placeholders = ", ".join(["%s"] * len(producto_ids))
            cursor.execute(
                f"""
                SELECT producto, precio_final
                FROM hojas_productos
                WHERE hoja = %s AND producto IN ({placeholders})
                """,
                tuple([id_hoja] + producto_ids)
            )
            precios_actuales = {
                int(row["producto"]): float(row["precio_final"] or 0)
                for row in cursor.fetchall()
            }

        cursor.execute("DELETE FROM hojas_productos WHERE hoja = %s", (id_hoja,))

        if productos_insert:
            rows = []
            for item in productos_insert:
                precio_final = item["precio_final"]
                if precio_final <= 0:
                    precio_final = precios_actuales.get(item["producto_id"], 0)

                rows.append((
                    id_hoja,
                    item["producto_id"],
                    item["cantidad"],
                    precio_final,
                    item["detalle"],
                ))

            cursor.executemany(
                """
                INSERT INTO hojas_productos (hoja, producto, cantidad, precio_final, detalle)
                VALUES (%s, %s, %s, %s, %s)
                """,
                rows
            )

        firma_path = None
        foto_path = None
        productos_actualizados = []

        if archivo_firma:
            id_cita = hoja["cita"]
            carpeta = os.path.join(UPLOADS_DIR, f"cita_{id_cita}")
            os.makedirs(carpeta, exist_ok=True)

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
                    "error": "Stock insuficiente para firmar la instalacion",
                    "productos": sin_stock,
                }), 409

            for producto in productos:
                cantidad = int(producto["cantidad"] or 0)
                producto_id = int(producto["producto"])
                stock_anterior = int(producto["stock"] or 0)

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
                    "stock_anterior": stock_anterior,
                    "stock_actual": stock_anterior - cantidad,
                })

            nombre_seguro_firma = secure_filename(archivo_firma.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_final_firma = f"firma_inst_{timestamp}_{nombre_seguro_firma}"
            archivo_firma.save(os.path.join(carpeta, nombre_final_firma))
            firma_path = f"/uploads/cita_{id_cita}/{nombre_final_firma}"

            if archivo_foto:
                nombre_seguro_foto = secure_filename(archivo_foto.filename)
                nombre_final_foto = f"foto_firma_inst_{timestamp}_{nombre_seguro_foto}"
                archivo_foto.save(os.path.join(carpeta, nombre_final_foto))
                foto_path = f"/uploads/cita_{id_cita}/{nombre_final_foto}"
                cursor.execute(
                    "UPDATE hojas SET firma_instalacion = %s, firma_foto_instalacion = %s WHERE id = %s",
                    (firma_path, foto_path, id_hoja)
                )
            else:
                cursor.execute(
                    "UPDATE hojas SET firma_instalacion = %s WHERE id = %s",
                    (firma_path, id_hoja)
                )

        mysql.connection.commit()

        return jsonify({
            "msg": "Hoja de instalacion guardada correctamente",
            "firma_instalacion": firma_path,
            "firma_foto_instalacion": foto_path,
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

        cursor.execute("""
            SELECT
                citas.id AS idcita,
                DATE_FORMAT(citas.dia, '%%e %%M %%Y') AS dia,
                DATE_FORMAT(citas.hora, '%%h:%%i %%p') AS hora,
                tipo,
                notas,
                telefono,
                domicilio,
                auth.fullname AS asignado,
                citas_estados.estado AS estado,
                citas_estados.color AS color,
                DATE_FORMAT(citas.dia, '%%Y-%%m-%%d') AS dia_format,
                DATE_FORMAT(citas.hora, '%%h:%%i %%p') AS hora_format,
                DATE_FORMAT(citas.hora, '%%H:%%i') AS hora_24,
                citas.estado AS idestado,
                citas.asignado AS idasignado,
                COALESCE(deuda_cita.total, 0) AS deuda_cita
            FROM citas
            JOIN auth ON auth.id = citas.asignado
            JOIN citas_estados ON citas_estados.id = citas.estado
            LEFT JOIN (
                SELECT p.cita, SUM(pc.monto) AS total
                FROM pagos p
                JOIN pagos_cuotas pc ON pc.pago = p.id
                WHERE pc.pagado = 0
                GROUP BY p.cita
            ) deuda_cita ON deuda_cita.cita = citas.id
            WHERE citas.cliente = %s
            ORDER BY citas.dia DESC, hora DESC
        """, (id_cliente,))
        citas = cursor.fetchall()
        cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname;")
        users = cursor.fetchall()
        cursor.execute("SELECT id, estado FROM citas_estados ORDER BY estado;")
        estados = cursor.fetchall()
        cursor.execute("""
            SELECT COALESCE(SUM(pc.monto), 0) AS deuda_total
            FROM pagos p
            JOIN pagos_cuotas pc ON pc.pago = p.id
            WHERE p.cliente = %s
              AND pc.pagado = 0;
        """, (id_cliente,))
        deuda_total = cursor.fetchone()
        deuda_total = float(deuda_total["deuda_total"]) if deuda_total else 0.0
        return jsonify({"cliente": cliente, "citas": citas, "users": users, "estados": estados, "deuda_total": deuda_total}), 200
    except Exception as e:
        print("Error interno:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.put("/api/clientes/<int:id_cliente>/email")
def actualizar_email_cliente(id_cliente):
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email requerido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "UPDATE clientes SET email = %s WHERE id = %s",
            (email, id_cliente),
        )
        actualizado = cursor.rowcount
        mysql.connection.commit()

        if actualizado == 0:
            return jsonify({"error": "Cliente no encontrado"}), 404

        return jsonify({"email": email}), 200
    except Exception as e:
        mysql.connection.rollback()
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
        tiene_metodo_enganche = table_has_column("pagos", "enganche_metodo")
        if tiene_metodo_enganche:
            cursor.execute(
                """
                SELECT pagos.id AS id_pago,
                       pagos.total,
                       COALESCE(pagos.enganche, 0) AS enganche,
                       pagos.enganche_metodo AS idmetodo_enganche,
                       pagos_metodos.metodo AS metodo_enganche
                FROM pagos
                LEFT JOIN pagos_metodos ON pagos_metodos.id = pagos.enganche_metodo
                WHERE pagos.cita = %s
                LIMIT 1
                """,
                (id_cita,)
            )
        else:
            cursor.execute(
                "SELECT id AS id_pago, total, COALESCE(enganche, 0) AS enganche FROM pagos WHERE cita = %s LIMIT 1",
                (id_cita,)
            )
        plan = cursor.fetchone()

        if not plan:
            return jsonify({"cuotas": [], "id_pago": None, "total": 0}), 200

        id_pago = plan["id_pago"]
        total   = float(plan["total"])
        enganche = float(plan.get("enganche") or 0)

        cursor.execute(
            """
            SELECT pagos_cuotas.id AS idcuota,
                   pagos_cuotas.monto AS monto,
                   pagos_cuotas.interes AS interes,
                   pagos_cuotas.pagado AS pagado,
                   pagos_cuotas.vencimiento AS vencimiento,
                   pagos_cuotas.fechapago AS fechapago,
                   pagos_cuotas.metodo AS idmetodo,
                   pagos_metodos.metodo AS metodo,
                   pagos_cuotas.nota AS nota,
                   pagos_cuotas.comprobante AS comprobante
            FROM pagos_cuotas
            LEFT JOIN pagos_metodos ON pagos_metodos.id = pagos_cuotas.metodo
            WHERE pagos_cuotas.pago = %s
            ORDER BY pagos_cuotas.vencimiento ASC
            """,
            (id_pago,)
        )
        cuotas = cursor.fetchall()
        return jsonify({
            "cuotas": cuotas,
            "id_pago": id_pago,
            "total": total,
            "enganche": enganche,
            "idmetodo_enganche": plan.get("idmetodo_enganche"),
            "metodo_enganche": plan.get("metodo_enganche") or "",
        }), 200
    except Exception as e:
        print("Error interno:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.put("/api/plan-de-pagos/<int:id_pago>")
def actualizar_plan_de_pagos(id_pago):
    data = request.get_json(silent=True) or {}
    monto_total = data.get("montoTotal")
    enganche    = data.get("enganche", 0)
    id_metodo_enganche = data.get("idMetodoEnganche") or data.get("engancheMetodo")
    cuotas      = data.get("cuotas", [])

    if monto_total is None or not cuotas:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id, COALESCE(enganche, 0) AS enganche FROM pagos WHERE id = %s LIMIT 1", (id_pago,))
        if not cursor.fetchone():
            return jsonify({"error": "Plan de pagos no encontrado"}), 404

        # 1) Actualizar el total del plan padre. El enganche no se modifica; solo su metodo si existe la columna.
        if table_has_column("pagos", "enganche_metodo"):
            id_metodo_enganche = int(id_metodo_enganche) if id_metodo_enganche else None
            cursor.execute(
                "UPDATE pagos SET total = %s, enganche_metodo = %s WHERE id = %s",
                (float(monto_total), id_metodo_enganche, id_pago)
            )
        else:
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
            nota        = (cuota.get("nota") or "").strip()
            comprobante = (cuota.get("comprobante") or "").strip()

            if pagado and not fechapago:
                cursor.execute(
                    """
                    INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, fechapago, metodo, nota, comprobante)
                    VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s)
                    """,
                    (id_pago, monto, interes, vencimiento, pagado, metodo, nota, comprobante)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, fechapago, metodo, nota, comprobante)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (id_pago, monto, interes, vencimiento, pagado, fechapago, metodo, nota, comprobante)
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

    id_cliente = data.get("idCliente")
    id_cita    = data.get("idCita")
    monto_total = data.get("montoTotal")
    enganche    = data.get("enganche", 0)
    id_metodo_enganche = data.get("idMetodoEnganche") or data.get("engancheMetodo")
    cuotas      = data.get("cuotas", [])
    if not id_cliente or not id_cita or monto_total is None or not cuotas:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    enganche = float(enganche or 0)
    if enganche < 0:
        return jsonify({"error": "El enganche no puede ser negativo"}), 400
    id_metodo_enganche = int(id_metodo_enganche) if id_metodo_enganche and enganche > 0 else None

    cursor = mysql.connection.cursor()
    try:
        # 1) Crear el registro de pago padre
        if table_has_column("pagos", "enganche_metodo"):
            cursor.execute(
                "INSERT INTO pagos (cliente, cita, total, enganche, enganche_metodo) VALUES (%s, %s, %s, %s, %s",
                (id_cliente, id_cita, float(monto_total), enganche, id_metodo_enganche)
            )
        else:
            cursor.execute(
                "INSERT INTO pagos (cliente, cita, total, enganche) VALUES (%s, %s, %s, %s",
                (id_cliente, id_cita, float(monto_total), enganche)
            )
        id_pago = cursor.lastrowid

        # 2) Insertar cada cuota con su propio monto e interés
        for cuota in cuotas:
            monto     = float(cuota.get("monto", 0))
            interes   = float(cuota.get("interes", 0))
            vencimiento = cuota.get("vencimiento") or cuota.get("fecha_vencimiento")
            if not vencimiento:
                raise ValueError("Todas las cuotas deben tener fecha de vencimiento")
            vencimiento = datetime.strptime(vencimiento, "%Y-%m-%d").date()
            metodo    = int(cuota.get("idmetodo") or cuota.get("metodo") or 1)
            nota      = (cuota.get("nota") or "").strip()
            comprobante = (cuota.get("comprobante") or "").strip()

            cursor.execute(
                """
                INSERT INTO pagos_cuotas (pago, monto, interes, vencimiento, pagado, metodo, nota, comprobante)
                VALUES (%s, %s, %s, %s, 0, %s, %s, %s)
                """,
                (id_pago, monto, interes, vencimiento, metodo, nota, comprobante)
            )

        mysql.connection.commit()
        return jsonify({"msg": "Plan de pagos guardado correctamente", "id_pago": id_pago}), 201

    except ValueError as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 400

    except Exception as e:
        mysql.connection.rollback()
        print("Error al crear plan de pagos:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/pagos/resumen")
def get_pagos_resumen():
    mes = request.args.get("mes") # Formato YYYY-MM
    tipo_filtro = request.args.get("tipo", "fechapago") # 'fechapago' o 'vencimiento'
    
    if not mes:
        mes = datetime.now().strftime("%Y-%m")
    if tipo_filtro not in ("fechapago", "vencimiento"):
        tipo_filtro = "fechapago"
        
    cursor = mysql.connection.cursor()
    try:
        # Cuotas pagadas en el mes. Siempre se filtran por fecha real de pago.
        cursor.execute("""
            SELECT COUNT(*) as cantidad, COALESCE(SUM(monto), 0) as total
            FROM pagos_cuotas
            WHERE pagado = 1
              AND fechapago IS NOT NULL
              AND DATE_FORMAT(fechapago, %s) = %s
        """, ('%Y-%m', mes))
        cuotas_pagadas_mes = cursor.fetchone() or {"cantidad": 0, "total": 0}

        # Enganches ingresados en el mes. La fecha real del enganche es pagos.fecha.
        cursor.execute("""
            SELECT COUNT(*) as cantidad, COALESCE(SUM(p.enganche), 0) as total
            FROM pagos p
            WHERE COALESCE(p.enganche, 0) > 0
              AND p.fecha IS NOT NULL
              AND DATE_FORMAT(p.fecha, %s) = %s
        """, ('%Y-%m', mes))
        enganches_mes = cursor.fetchone() or {"cantidad": 0, "total": 0}

        pagadas_mes = {
            "cantidad": int(cuotas_pagadas_mes.get("cantidad") or 0) + int(enganches_mes.get("cantidad") or 0),
            "total": float(cuotas_pagadas_mes.get("total") or 0) + float(enganches_mes.get("total") or 0),
            "cuotas": int(cuotas_pagadas_mes.get("cantidad") or 0),
            "enganches": int(enganches_mes.get("cantidad") or 0),
            "total_cuotas": float(cuotas_pagadas_mes.get("total") or 0),
            "total_enganches": float(enganches_mes.get("total") or 0),
        }

        # Cuotas pendientes mes que viene
        y, m = map(int, mes.split('-'))
        m += 1
        if m > 12:
            m = 1
            y += 1
        next_month = f"{y:04d}-{m:02d}"

        cursor.execute("""
            SELECT COUNT(*) as cantidad, SUM(monto) as total
            FROM pagos_cuotas
            WHERE pagado = 0 AND DATE_FORMAT(vencimiento, %s) = %s
        """, ('%Y-%m', next_month))
        pendientes_mes_que_viene = cursor.fetchone()

        # Deuda por cliente
        cursor.execute("""
            SELECT c.id, c.nombre, SUM(pc.monto) as deuda_total
            FROM clientes c
            JOIN pagos p ON p.cliente = c.id
            JOIN pagos_cuotas pc ON pc.pago = p.id
            WHERE pc.pagado = 0
            GROUP BY c.id, c.nombre
            HAVING deuda_total > 0
            ORDER BY deuda_total DESC
        """)
        deuda_por_cliente = cursor.fetchall()

        # Próximos vencimientos
        cursor.execute("""
            SELECT pc.id, c.id as cliente_id, c.nombre as cliente_nombre, 
                   pc.monto, pc.interes,
                   DATE_FORMAT(pc.vencimiento, %s) as vencimiento,
                   p.total as pago_total,
                   pm.metodo as metodo_nombre, pm.color as metodo_color
            FROM pagos_cuotas pc
            JOIN pagos p ON pc.pago = p.id
            JOIN clientes c ON p.cliente = c.id
            LEFT JOIN pagos_metodos pm ON pc.metodo = pm.id
            WHERE pc.pagado = 0
            ORDER BY pc.vencimiento ASC
            LIMIT 50
        """, ('%Y-%m-%d',))
        proximos_vencimientos = cursor.fetchall()
        
        # Filtro de cuotas del mes actual (para mostrar en detalle si es necesario)
        query_cuotas = f"""
            SELECT pc.id, c.id as cliente_id, c.nombre as cliente_nombre, 
                   pc.monto, pc.interes,
                   DATE_FORMAT(pc.vencimiento, %s) as vencimiento,
                   DATE_FORMAT(pc.fechapago, %s) as fechapago,
                   pc.pagado,
                   pm.metodo as metodo_nombre, pm.color as metodo_color
            FROM pagos_cuotas pc
            JOIN pagos p ON pc.pago = p.id
            JOIN clientes c ON p.cliente = c.id
            LEFT JOIN pagos_metodos pm ON pc.metodo = pm.id
            WHERE DATE_FORMAT(pc.{tipo_filtro}, %s) = %s
            ORDER BY pc.vencimiento ASC
        """
        cursor.execute(query_cuotas, ('%Y-%m-%d', '%Y-%m-%d', '%Y-%m', mes))
        cuotas_del_mes = cursor.fetchall()

        cursor.execute("""
            SELECT pc.id, c.id as cliente_id, c.nombre as cliente_nombre,
                   pc.monto, pc.interes,
                   DATE_FORMAT(pc.vencimiento, %s) as vencimiento,
                   DATE_FORMAT(pc.fechapago, %s) as fechapago,
                   pc.pagado,
                   pm.metodo as metodo_nombre, pm.color as metodo_color
            FROM pagos_cuotas pc
            JOIN pagos p ON pc.pago = p.id
            JOIN clientes c ON p.cliente = c.id
            LEFT JOIN pagos_metodos pm ON pc.metodo = pm.id
            WHERE pc.pagado = 1
              AND pc.fechapago IS NOT NULL
              AND DATE_FORMAT(pc.fechapago, %s) = %s
            ORDER BY pc.fechapago DESC, c.nombre ASC
        """, ('%Y-%m-%d', '%Y-%m-%d', '%Y-%m', mes))
        cuotas_pagadas_del_mes = cursor.fetchall()
        # Enganche del mes: planes de pago cuya fecha de enganche cae en el mes seleccionado
        cursor.execute("""
            SELECT COUNT(*) as cantidad, COALESCE(SUM(p.enganche), 0) as total
            FROM pagos p
            WHERE p.enganche > 0
              AND DATE_FORMAT(p.fecha, '%%Y-%%m') = %s
        """, (mes,))
        enganche_mes = cursor.fetchone() or {"cantidad": 0, "total": 0}
        
        
        # Detalle de enganches del mes por cliente
        cursor.execute("""
            SELECT 
                p.id as pago_id,
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                p.enganche,
                pm.metodo as metodo_nombre,
                pm.color as metodo_color,
                DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') as fecha_enganche
            FROM pagos p
            JOIN clientes c ON c.id = p.cliente
            LEFT JOIN pagos_metodos pm ON pm.id = p.enganche_metodo
            WHERE p.enganche > 0
              AND DATE_FORMAT(p.fecha, '%%Y-%%m') = %s
            ORDER BY c.nombre ASC
        """, (mes,))
        enganches_del_mes = cursor.fetchall()

        return jsonify({
            "pagadas_mes": pagadas_mes,
            "pendientes_mes_que_viene": pendientes_mes_que_viene,
            "deuda_por_cliente": deuda_por_cliente,
            "proximos_vencimientos": proximos_vencimientos,
            "cuotas_del_mes": cuotas_del_mes,
            "cuotas_pagadas_del_mes": cuotas_pagadas_del_mes,
            "enganche_mes": enganche_mes,
            "enganches_del_mes": enganches_del_mes,
        }), 200
    except Exception as e:
        print("Error en get_pagos_resumen:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/pagos/metodos")
def get_pagos_metodos():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id, metodo, color FROM pagos_metodos ORDER BY metodo")
        metodos = cursor.fetchall()
        return jsonify(metodos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/pagos/metodos")
def crear_pago_metodo():
    data = request.get_json(silent=True) or {}
    metodo = (data.get("metodo") or "").strip().upper()
    color = (data.get("color") or "#f97316").strip()

    if not metodo:
        return jsonify({"error": "Metodo requerido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO pagos_metodos (metodo, color) VALUES (%s, %s)",
            (metodo, color),
        )
        mysql.connection.commit()
        return jsonify({"msg": "Metodo de pago creado correctamente"}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.put("/api/pagos/metodos/<int:id_metodo>")
def actualizar_pago_metodo(id_metodo):
    data = request.get_json(silent=True) or {}
    metodo = (data.get("metodo") or "").strip().upper()
    color = (data.get("color") or "#f97316").strip()

    if not metodo:
        return jsonify({"error": "Metodo requerido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "UPDATE pagos_metodos SET metodo = %s, color = %s WHERE id = %s",
            (metodo, color, id_metodo),
        )
        actualizado = cursor.rowcount
        mysql.connection.commit()

        if actualizado == 0:
            return jsonify({"error": "Metodo no encontrado"}), 404

        return jsonify({"msg": "Metodo de pago actualizado correctamente"}), 200
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/inspeccion/<int:id_cita>")
def get_inspeccion(id_cita):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT firma_foto_instalacion
            FROM hojas
            WHERE cita = %s
              AND firma_foto_instalacion IS NOT NULL
            ORDER BY id DESC
            LIMIT 1
            """,
            (id_cita,),
        )
        foto_info = cursor.fetchone()
        firma_foto_instalacion = (
            foto_info.get("firma_foto_instalacion") if foto_info else None
        )

        cursor.execute("SELECT id, dibujo, firma FROM hojas_inspeccion WHERE cita = %s", (id_cita,))
        inspeccion = cursor.fetchone()
        
        if not inspeccion:
            return jsonify({
                "id": None,
                "items": [],
                "dibujo": None,
                "firma": None,
                "firma_foto_instalacion": firma_foto_instalacion,
            }), 200
            
        inspeccion_id = inspeccion["id"]
        dibujo = inspeccion.get("dibujo")
        firma  = inspeccion.get("firma")
        
        cursor.execute("""
            SELECT 
                hi.id AS item_id,
                hi.producto_id,
                p.descrip AS producto_descrip,
                p.stock AS producto_stock,
                hi.cantidad,
                hi.detalle
            FROM hojas_inspeccion_items hi
            JOIN productos p ON p.id = hi.producto_id
            WHERE hi.inspeccion_id = %s
        """, (inspeccion_id,))
        
        items = cursor.fetchall()
        return jsonify({
            "id": inspeccion_id,
            "items": items,
            "dibujo": dibujo,
            "firma": firma,
            "firma_foto_instalacion": firma_foto_instalacion,
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/inspeccion/<int:id_cita>")
def guardar_inspeccion(id_cita):
    # Handle JSON or form-data
    if request.is_json:
        data = request.get_json(silent=True) or {}
        items = data.get("items") or []
    else:
        items_str = request.form.get("items", "[]")
        try:
            items = json.loads(items_str)
        except:
            items = []
            
    archivo_dibujo = request.files.get("dibujo")
    archivo_firma  = request.files.get("firma")
    
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id FROM hojas_inspeccion WHERE cita = %s", (id_cita,))
        inspeccion = cursor.fetchone()
        
        if not inspeccion:
            cursor.execute("INSERT INTO hojas_inspeccion (cita) VALUES (%s)", (id_cita,))
            inspeccion_id = cursor.lastrowid
        else:
            inspeccion_id = inspeccion["id"]
            
        carpeta = os.path.join(UPLOADS_DIR, f"cita_{id_cita}")
        os.makedirs(carpeta, exist_ok=True)

        # Process drawing upload if exists
        dibujo_path = None
        if archivo_dibujo:
            nombre_seguro = secure_filename(archivo_dibujo.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_final = f"dibujo_{timestamp}_{nombre_seguro}"
            archivo_dibujo.save(os.path.join(carpeta, nombre_final))
            dibujo_path = f"/uploads/cita_{id_cita}/{nombre_final}"
            cursor.execute("UPDATE hojas_inspeccion SET dibujo = %s WHERE id = %s", (dibujo_path, inspeccion_id))

        # Process signature upload if exists
        if archivo_firma:
            nombre_seguro_firma = secure_filename(archivo_firma.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_final_firma = f"firma_{timestamp}_{nombre_seguro_firma}"
            archivo_firma.save(os.path.join(carpeta, nombre_final_firma))
            firma_path = f"/uploads/cita_{id_cita}/{nombre_final_firma}"
            cursor.execute("UPDATE hojas_inspeccion SET firma = %s WHERE id = %s", (firma_path, inspeccion_id))
            
        cursor.execute("DELETE FROM hojas_inspeccion_items WHERE inspeccion_id = %s", (inspeccion_id,))
        
        if items:
            items_insert = []
            for item in items:
                items_insert.append((
                    inspeccion_id,
                    int(item["producto_id"]),
                    int(item["cantidad"]),
                    item.get("detalle", "")
                ))
                
            cursor.executemany("""
                INSERT INTO hojas_inspeccion_items (inspeccion_id, producto_id, cantidad, detalle)
                VALUES (%s, %s, %s, %s)
            """, items_insert)
            
        mysql.connection.commit()
        return jsonify({"msg": "Hoja de inspeccion guardada exitosamente"}), 200
        
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


# ==========================================
# ENDPOINTS DE RECLUTAMIENTO Y CAPACITACIÓN
# ==========================================

@app.post("/api/reclutamiento/postular")
def postular_tecnico():
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    email = (data.get("email") or "").strip()
    telefono = (data.get("telefono") or "").strip()
    direccion = (data.get("direccion") or "").strip()
    experiencia = (data.get("experiencia") or "").strip()
    respuestas = data.get("respuestas")

    if not nombre or not email or not telefono or not respuestas:
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    cursor = mysql.connection.cursor()
    try:
        # Convert responses to JSON string for MySQL execution
        respuestas_str = json.dumps(respuestas)
        cursor.execute(
            """
            INSERT INTO postulaciones_tecnicos (nombre, email, telefono, direccion, experiencia, respuestas, estado)
            VALUES (%s, %s, %s, %s, %s, %s, 'pendiente')
            """,
            (nombre, email, telefono, direccion, experiencia, respuestas_str)
        )
        mysql.connection.commit()
        return jsonify({"msg": "Postulación recibida con éxito"}), 201
    except Exception as e:
        mysql.connection.rollback()
        print("Error en postular_tecnico:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/reclutamiento/postulaciones")
@jwt_required()
def get_postulaciones():
    claims = get_jwt()
    user_role = (claims.get("user") or {}).get("rol")
    if user_role not in ["administrador", "superadmin", "moderador"]:
        return jsonify({"error": "No autorizado"}), 403

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            """
            SELECT id, nombre, email, telefono, direccion, experiencia, respuestas, estado, comentarios, tecnico_usuario_id,
                   DATE_FORMAT(fecha_postulacion, '%Y-%m-%d %H:%i:%s') as fecha_postulacion,
                   DATE_FORMAT(fecha_evaluacion, '%Y-%m-%d %H:%i:%s') as fecha_evaluacion
            FROM postulaciones_tecnicos
            ORDER BY id DESC
            """
        )
        rows = cursor.fetchall()
        for r in rows:
            if r["respuestas"]:
                try:
                    r["respuestas"] = json.loads(r["respuestas"])
                except Exception:
                    pass
        return jsonify(rows), 200
    except Exception as e:
        print("Error en get_postulaciones:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/reclutamiento/postulaciones/<int:id>/evaluar")
@jwt_required()
def evaluar_postulacion(id):
    claims = get_jwt()
    user_role = (claims.get("user") or {}).get("rol")
    if user_role not in ["administrador", "superadmin"]:
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json(silent=True) or {}
    estado = data.get("estado") # 'aprobado' o 'rechazado'
    comentarios = (data.get("comentarios") or "").strip()
    crear_usuario = data.get("crear_usuario", False)
    username = (data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if estado not in ["aprobado", "rechazado"]:
        return jsonify({"error": "Estado inválido"}), 400

    cursor = mysql.connection.cursor()
    try:
        tecnico_usuario_id = None
        if estado == "aprobado" and crear_usuario:
            if not username or not password:
                return jsonify({"error": "Faltan credenciales del técnico"}), 400

            # Verificar si el usuario ya existe
            cursor.execute("SELECT id FROM auth WHERE `user` = %s", (username,))
            if cursor.fetchone():
                return jsonify({"error": f"El nombre de usuario '{username}' ya está en uso"}), 400

            # Obtener datos de la postulación
            cursor.execute("SELECT nombre FROM postulaciones_tecnicos WHERE id = %s", (id,))
            post = cursor.fetchone()
            if not post:
                return jsonify({"error": "Postulación no encontrada"}), 404

            # Crear usuario técnico
            cursor.execute(
                "INSERT INTO auth (`user`, `password`, fullname, rol, habilitado) VALUES (%s, %s, %s, 'tecnico', 1)",
                (username, password, post["nombre"])
            )
            tecnico_usuario_id = cursor.lastrowid

        cursor.execute(
            """
            UPDATE postulaciones_tecnicos
            SET estado = %s, comentarios = %s, tecnico_usuario_id = %s, fecha_evaluacion = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (estado, comentarios, tecnico_usuario_id, id)
        )
        mysql.connection.commit()
        return jsonify({"msg": "Postulación evaluada correctamente", "tecnico_usuario_id": tecnico_usuario_id}), 200
    except Exception as e:
        mysql.connection.rollback()
        print("Error en evaluar_postulacion:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.get("/api/tecnico/videos-vistos")
@jwt_required()
def get_videos_vistos():
    current_user = get_jwt_identity() # Esto devuelve el id del usuario
    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "SELECT video_id FROM tecnicos_videos_vistos WHERE tecnico_usuario_id = %s",
            (int(current_user),)
        )
        rows = cursor.fetchall()
        video_ids = [r["video_id"] for r in rows]
        return jsonify(video_ids), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

@app.post("/api/tecnico/marcar-video-visto")
@jwt_required()
def marcar_video_visto():
    current_user = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    video_id = (data.get("video_id") or "").strip()

    if not video_id:
        return jsonify({"error": "video_id requerido"}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute(
            "INSERT IGNORE INTO tecnicos_videos_vistos (tecnico_usuario_id, video_id) VALUES (%s, %s)",
            (int(current_user), video_id)
        )
        mysql.connection.commit()
        return jsonify({"msg": "Video marcado como visto"}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()

if __name__ == "__main__":
    app.run(debug=True)

