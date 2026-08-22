import re
from datetime import datetime

from flask import jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from tareas_programadas import (
    asegurar_tabla,
    normalizar_rango,
    obtener_configuraciones,
    obtener_ocurrencias,
)


def _es_administrador():
    claims = get_jwt()
    usuario = claims.get("user") or {}
    return usuario.get("rol") in ("administrador", "superadmin")


def _tarea_cita(row):
    tipo = (row.get("tipo") or "").lower()
    if "soporte" in tipo:
        tarea = "Soporte tecnico"
    elif "camara" in tipo or "desdecero" in tipo:
        tarea = "Instalacion de camaras"
    elif "internet" in tipo:
        tarea = "Servicio de internet"
    else:
        tarea = "Visita programada"

    tarea = row.get("estado") or tarea

    categoria = "camaras" if "camara" in tipo or "desdecero" in tipo else "internet" if "internet" in tipo else "general"
    return {
        **row,
        "id": f"cita-{row['idcita']}",
        "origen": "cita",
        "id_tarea_programada": None,
        "tarea": tarea,
        "categoria": categoria,
        "frecuencia": None,
    }


def registrar_rutas(app, mysql):
    @app.get("/api/tareas-programadas")
    def listar_tareas_programadas():
        cursor = None
        try:
            asegurar_tabla(mysql)
            desde, hasta = normalizar_rango(
                request.args.get("desde"),
                request.args.get("hasta"),
            )
            cursor = mysql.connection.cursor()
            cursor.execute("""
                SELECT
                    citas.id AS idcita,
                    clientes.id AS idcliente,
                    clientes.nombre AS nombre,
                    DATE_FORMAT(citas.dia, '%%Y-%%m-%%d') AS dia,
                    DATE_FORMAT(citas.hora, '%%H:%%i') AS hora,
                    DATE_FORMAT(citas.hora, '%%h:%%i %%p') AS hora_format,
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
                WHERE citas.dia BETWEEN %s AND %s
                ORDER BY citas.dia, citas.hora, citas.id
            """, (desde.isoformat(), hasta.isoformat()))

            citas = [_tarea_cita(row) for row in cursor.fetchall()]
            recurrentes = obtener_ocurrencias(cursor, desde, hasta)
            configuraciones = obtener_configuraciones(cursor)
            cursor.execute("SELECT id, fullname FROM auth WHERE habilitado = 1 ORDER BY fullname")
            usuarios = cursor.fetchall()
            tareas = sorted(
                citas + recurrentes,
                key=lambda item: (item.get("dia") or "", item.get("hora") or "", str(item.get("id") or "")),
            )
            return jsonify({
                "tareas": tareas,
                "configuraciones": configuraciones,
                "usuarios": usuarios,
                "desde": desde.isoformat(),
                "hasta": hasta.isoformat(),
            }), 200
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            if cursor:
                cursor.close()

    @app.post("/api/tareas-programadas")
    @jwt_required()
    def crear_tarea_programada():
        if not _es_administrador():
            return jsonify({"error": "No tienes permisos para crear tareas programadas"}), 403

        data = request.get_json(silent=True) or {}
        tarea = (data.get("tarea") or "").strip()
        frecuencia = (data.get("frecuencia") or "").strip().lower()
        categoria = (data.get("categoria") or "general").strip().lower()
        fecha_inicio = (data.get("fecha_inicio") or "").strip()
        fecha_fin = (data.get("fecha_fin") or "").strip() or None
        hora = (data.get("hora") or "09:00").strip()
        asignado = data.get("asignado")

        if not tarea or not fecha_inicio or not asignado:
            return jsonify({"error": "Tarea, fecha inicial y responsable son obligatorios"}), 400
        if frecuencia not in ("semanal", "mensual"):
            return jsonify({"error": "La frecuencia debe ser semanal o mensual"}), 400
        if categoria not in ("general", "internet", "camaras"):
            return jsonify({"error": "La categoria no es valida"}), 400

        try:
            inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date() if fecha_fin else None
            datetime.strptime(hora, "%H:%M")
            asignado = int(asignado)
        except (TypeError, ValueError):
            return jsonify({"error": "Revisa las fechas, la hora y el responsable"}), 400

        if fin and fin < inicio:
            return jsonify({"error": "La fecha final no puede ser anterior a la inicial"}), 400

        cursor = mysql.connection.cursor()
        try:
            asegurar_tabla(mysql)
            cursor.execute("SELECT id FROM auth WHERE id = %s AND habilitado = 1", (asignado,))
            if not cursor.fetchone():
                return jsonify({"error": "El responsable seleccionado no esta disponible"}), 400

            telefono = re.sub(r"\D", "", str(data.get("telefono") or "")) or None
            cliente = (data.get("cliente") or "").strip().upper() or None
            direccion = (data.get("direccion") or "").strip().upper() or None
            creador = int(get_jwt_identity())
            cursor.execute("""
                INSERT INTO tareas_programadas
                    (tarea, cliente, telefono, direccion, categoria, frecuencia,
                     fecha_inicio, fecha_fin, hora, asignado, creador)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tarea,
                cliente,
                telefono,
                direccion,
                categoria,
                frecuencia,
                fecha_inicio,
                fecha_fin,
                hora,
                asignado,
                creador,
            ))
            mysql.connection.commit()
            return jsonify({"id": cursor.lastrowid, "msg": "Tarea programada creada"}), 201
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    @app.delete("/api/tareas-programadas/<int:id_tarea>")
    @jwt_required()
    def eliminar_tarea_programada(id_tarea):
        if not _es_administrador():
            return jsonify({"error": "No tienes permisos para eliminar tareas programadas"}), 403

        cursor = mysql.connection.cursor()
        try:
            asegurar_tabla(mysql)
            cursor.execute(
                "UPDATE tareas_programadas SET activa = 0 WHERE id = %s AND activa = 1",
                (id_tarea,),
            )
            mysql.connection.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "La tarea programada no existe"}), 404
            return jsonify({"msg": "Tarea programada eliminada"}), 200
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()
