import html
import io
import os
from datetime import date

from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from facturacion_recurrente import (
    asegurar_tablas,
    fecha_desde_iso,
    generar_facturas_pendientes,
    monto_decimal,
)


def _entero(valor, predeterminado, minimo=1, maximo=None):
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        numero = predeterminado
    numero = max(minimo, numero)
    return min(numero, maximo) if maximo is not None else numero


def _mes_valido(valor):
    texto = str(valor or "").strip()
    if not texto:
        return date.today().strftime("%Y-%m")
    try:
        fecha_desde_iso(f"{texto}-01", "mes")
    except ValueError as error:
        raise ValueError("mes debe usar el formato YYYY-MM") from error
    return texto


def registrar_rutas(app, mysql):
    @app.get("/api/facturacion/movimientos")
    def listar_movimientos_facturacion():
        cursor = None
        try:
            asegurar_tablas(mysql)
            mes = _mes_valido(request.args.get("mes"))
            pagina = _entero(request.args.get("pagina"), 1)
            por_pagina = _entero(request.args.get("por_pagina"), 25, maximo=100)
            estado = (request.args.get("estado") or "todos").lower()
            origen = (request.args.get("origen") or "todos").lower()
            vista = (request.args.get("vista") or "facturas").lower()
            metodo = request.args.get("metodo")
            query = (request.args.get("q") or "").strip()
            cliente_id = _entero(request.args.get("cliente_id"), 0, minimo=0)
            todos_periodos = request.args.get("todos_periodos") == "1"
            desde = request.args.get("desde")
            hasta = request.args.get("hasta")
            if desde:
                desde = fecha_desde_iso(desde, "desde").isoformat()
            if hasta:
                hasta = fecha_desde_iso(hasta, "hasta").isoformat()
            if desde and hasta and desde > hasta:
                raise ValueError("La fecha inicial no puede ser posterior a la fecha final")

            if estado not in ("todos", "pendiente", "vencida", "pagada"):
                raise ValueError("El estado seleccionado no es valido")
            if origen not in ("todos", "manual", "recurrente"):
                raise ValueError("El origen seleccionado no es valido")
            if vista not in ("facturas", "pagos"):
                raise ValueError("La vista seleccionada no es valida")

            condiciones = []
            parametros = []
            if vista == "pagos":
                condiciones.extend(["pc.pagado = 1", "DATE_FORMAT(pc.fechapago, '%%Y-%%m') = %s"])
                parametros.append(mes)
            elif cliente_id and todos_periodos:
                # La vista de un cliente muestra su historial completo.
                pass
            elif desde or hasta:
                if desde:
                    condiciones.append("pc.vencimiento >= %s")
                    parametros.append(desde)
                if hasta:
                    condiciones.append("pc.vencimiento <= %s")
                    parametros.append(hasta)
            else:
                condiciones.append("DATE_FORMAT(pc.vencimiento, '%%Y-%%m') = %s")
                parametros.append(mes)

            if cliente_id:
                condiciones.append("c.id = %s")
                parametros.append(cliente_id)

            if vista == "facturas":
                if estado == "pagada":
                    condiciones.append("NOT EXISTS (SELECT 1 FROM pagos_cuotas pce WHERE pce.pago = p.id AND pce.pagado = 0)")
                elif estado == "vencida":
                    condiciones.append("EXISTS (SELECT 1 FROM pagos_cuotas pce WHERE pce.pago = p.id AND pce.pagado = 0 AND pce.vencimiento < CURDATE())")
                elif estado == "pendiente":
                    condiciones.append("EXISTS (SELECT 1 FROM pagos_cuotas pce WHERE pce.pago = p.id AND pce.pagado = 0)")
            else:
                if estado == "pagada":
                    condiciones.append("pc.pagado = 1")
                elif estado == "vencida":
                    condiciones.extend(["pc.pagado = 0", "pc.vencimiento < CURDATE()"])
                elif estado == "pendiente":
                    condiciones.append("pc.pagado = 0")

            if origen == "manual":
                condiciones.append("frg.id IS NULL")
            elif origen == "recurrente":
                condiciones.append("frg.id IS NOT NULL")

            if metodo:
                condiciones.append("pc.metodo = %s")
                parametros.append(_entero(metodo, 0, minimo=0))

            if query:
                like = f"%{query}%"
                condiciones.append("""
                    (c.nombre LIKE %s OR c.telefono LIKE %s OR ci.telefono LIKE %s
                     OR pc.nota LIKE %s OR pc.comprobante LIKE %s
                     OR CAST(p.id AS CHAR) LIKE %s OR CAST(pc.id AS CHAR) LIKE %s)
                """)
                parametros.extend([like] * 7)

            where_sql = " AND ".join(condiciones) or "1 = 1"
            joins = """
                FROM pagos_cuotas pc
                JOIN pagos p ON p.id = pc.pago
                JOIN clientes c ON c.id = p.cliente
                LEFT JOIN citas ci ON ci.id = p.cita
                LEFT JOIN pagos_metodos pm ON pm.id = pc.metodo
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.pago_id = p.id
                LEFT JOIN cobros_recurrentes cr ON cr.id = frg.cobro_recurrente_id
            """

            cursor = mysql.connection.cursor()
            contador = "COUNT(DISTINCT p.id)" if vista == "facturas" else "COUNT(*)"
            cursor.execute(f"SELECT {contador} AS total {joins} WHERE {where_sql}", tuple(parametros))
            total = int((cursor.fetchone() or {}).get("total") or 0)
            offset = (pagina - 1) * por_pagina

            if vista == "facturas":
                cursor.execute(f"""
                    SELECT
                        MIN(pc.id) AS movimiento_id,
                        p.id AS factura_id,
                        CONCAT('FAC-', LPAD(p.id, 6, '0')) AS numero_factura,
                        c.id AS cliente_id,
                        c.nombre AS cliente_nombre,
                        COALESCE(c.telefono, ci.telefono, '') AS telefono,
                        DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') AS fecha_emision,
                        DATE_FORMAT(COALESCE(
                            (SELECT MIN(pcv.vencimiento) FROM pagos_cuotas pcv WHERE pcv.pago = p.id AND pcv.pagado = 0),
                            (SELECT MAX(pcv.vencimiento) FROM pagos_cuotas pcv WHERE pcv.pago = p.id)
                        ), '%%Y-%%m-%%d') AS vencimiento,
                        DATE_FORMAT((SELECT MAX(pcp.fechapago) FROM pagos_cuotas pcp WHERE pcp.pago = p.id), '%%Y-%%m-%%d') AS fecha_pago,
                        p.total AS monto,
                        0 AS interes,
                        COALESCE((SELECT SUM(pcs.monto) FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0), 0) AS saldo,
                        CASE WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0) THEN 0 ELSE 1 END AS pagado,
                        CASE
                            WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0 AND pcs.vencimiento < CURDATE()) THEN 'vencida'
                            WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0) THEN 'pendiente'
                            ELSE 'pagada'
                        END AS estado,
                        NULL AS metodo_id,
                        (SELECT GROUP_CONCAT(DISTINCT pmm.metodo ORDER BY pmm.metodo SEPARATOR ', ')
                         FROM pagos_cuotas pcm
                         LEFT JOIN pagos_metodos pmm ON pmm.id = pcm.metodo
                         WHERE pcm.pago = p.id AND pmm.metodo IS NOT NULL) AS metodo_nombre,
                        NULL AS metodo_color,
                        NULL AS nota,
                        NULL AS comprobante,
                        CASE WHEN frg.id IS NULL THEN 'manual' ELSE 'recurrente' END AS origen,
                        cr.concepto,
                        frg.cobro_recurrente_id
                    {joins}
                    WHERE {where_sql}
                    GROUP BY p.id, c.id, c.nombre, c.telefono, ci.telefono, p.fecha,
                             p.total, frg.id, frg.cobro_recurrente_id, cr.concepto
                    ORDER BY
                        CASE estado WHEN 'vencida' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END,
                        vencimiento DESC, factura_id DESC
                    LIMIT %s OFFSET %s
                """, tuple(parametros + [por_pagina, offset]))
            else:
                cursor.execute(f"""
                    SELECT
                        pc.id AS movimiento_id,
                        p.id AS factura_id,
                        CONCAT('FAC-', LPAD(p.id, 6, '0')) AS numero_factura,
                        c.id AS cliente_id,
                        c.nombre AS cliente_nombre,
                        COALESCE(c.telefono, ci.telefono, '') AS telefono,
                        DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') AS fecha_emision,
                        DATE_FORMAT(pc.vencimiento, '%%Y-%%m-%%d') AS vencimiento,
                        DATE_FORMAT(pc.fechapago, '%%Y-%%m-%%d') AS fecha_pago,
                        pc.monto,
                        pc.interes,
                        CASE WHEN pc.pagado = 1 THEN 0 ELSE pc.monto END AS saldo,
                        pc.pagado,
                        CASE
                            WHEN pc.pagado = 1 THEN 'pagada'
                            WHEN pc.vencimiento < CURDATE() THEN 'vencida'
                            ELSE 'pendiente'
                        END AS estado,
                        pm.id AS metodo_id,
                        pm.metodo AS metodo_nombre,
                        pm.color AS metodo_color,
                        pc.nota,
                        pc.comprobante,
                        CASE WHEN frg.id IS NULL THEN 'manual' ELSE 'recurrente' END AS origen,
                        cr.concepto,
                        frg.cobro_recurrente_id
                    {joins}
                    WHERE {where_sql}
                    ORDER BY pc.fechapago DESC, pc.id DESC
                    LIMIT %s OFFSET %s
                """, tuple(parametros + [por_pagina, offset]))
            return jsonify({
                "items": cursor.fetchall(),
                "pagina": pagina,
                "por_pagina": por_pagina,
                "total": total,
                "paginas": max(1, (total + por_pagina - 1) // por_pagina),
            }), 200
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            if cursor:
                cursor.close()

    @app.get("/api/facturacion/facturas/<int:id_pago>")
    def detalle_factura(id_pago):
        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("""
                SELECT
                    p.id,
                    CONCAT('FAC-', LPAD(p.id, 6, '0')) AS numero_factura,
                    c.id AS cliente_id,
                    c.nombre AS cliente_nombre,
                    COALESCE(c.telefono, ci.telefono, '') AS telefono,
                    DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') AS fecha_emision,
                    p.total,
                    p.enganche,
                    CASE WHEN frg.id IS NULL THEN 'manual' ELSE 'recurrente' END AS origen,
                    cr.concepto
                FROM pagos p
                JOIN clientes c ON c.id = p.cliente
                LEFT JOIN citas ci ON ci.id = p.cita
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.pago_id = p.id
                LEFT JOIN cobros_recurrentes cr ON cr.id = frg.cobro_recurrente_id
                WHERE p.id = %s
                LIMIT 1
            """, (id_pago,))
            factura = cursor.fetchone()
            if not factura:
                return jsonify({"error": "Factura no encontrada"}), 404
            cursor.execute("""
                SELECT pc.id, pc.monto, pc.interes, pc.pagado,
                       DATE_FORMAT(pc.vencimiento, '%%Y-%%m-%%d') AS vencimiento,
                       DATE_FORMAT(pc.fechapago, '%%Y-%%m-%%d') AS fecha_pago,
                       pm.metodo AS metodo_nombre, pm.color AS metodo_color,
                       pc.nota, pc.comprobante
                FROM pagos_cuotas pc
                LEFT JOIN pagos_metodos pm ON pm.id = pc.metodo
                WHERE pc.pago = %s
                ORDER BY pc.vencimiento, pc.id
            """, (id_pago,))
            factura["cuotas"] = cursor.fetchall()
            return jsonify(factura), 200
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    @app.get("/api/facturacion/recurrentes")
    def listar_cobros_recurrentes():
        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("""
                SELECT cr.id, cr.cliente_id, c.nombre AS cliente_nombre,
                       cr.cita_id, cr.concepto, cr.monto, cr.dia_vencimiento,
                       cr.frecuencia_meses,
                       DATE_FORMAT(cr.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                       DATE_FORMAT(cr.fecha_fin, '%Y-%m-%d') AS fecha_fin,
                       DATE_FORMAT(cr.proxima_generacion, '%Y-%m-%d') AS proxima_generacion,
                       cr.metodo_id, pm.metodo AS metodo_nombre, cr.activa,
                       COUNT(frg.id) AS facturas_generadas,
                       MAX(DATE_FORMAT(frg.periodo, '%Y-%m')) AS ultimo_periodo,
                       MAX(frg.pago_id) AS ultima_factura_id,
                       CASE
                           WHEN MAX(frg.pago_id) IS NOT NULL
                           THEN CONCAT('FAC-', LPAD(MAX(frg.pago_id), 6, '0'))
                           ELSE NULL
                       END AS ultimo_numero_factura
                FROM cobros_recurrentes cr
                JOIN clientes c ON c.id = cr.cliente_id
                LEFT JOIN pagos_metodos pm ON pm.id = cr.metodo_id
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.cobro_recurrente_id = cr.id
                GROUP BY cr.id, cr.cliente_id, c.nombre, cr.cita_id, cr.concepto,
                         cr.monto, cr.dia_vencimiento, cr.frecuencia_meses,
                         cr.fecha_inicio, cr.fecha_fin, cr.proxima_generacion,
                         cr.metodo_id, pm.metodo, cr.activa
                ORDER BY cr.activa DESC, c.nombre, cr.concepto
            """)
            return jsonify(cursor.fetchall()), 200
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    @app.post("/api/facturacion/recurrentes")
    @jwt_required()
    def crear_cobro_recurrente():
        data = request.get_json(silent=True) or {}
        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cliente_id = _entero(data.get("cliente_id"), 0, minimo=0)
            concepto = (data.get("concepto") or "").strip().upper()
            monto = monto_decimal(data.get("monto"))
            dia_vencimiento = _entero(data.get("dia_vencimiento"), 1, maximo=31)
            fecha_inicio = fecha_desde_iso(data.get("fecha_inicio"), "fecha_inicio")
            fecha_fin = (
                fecha_desde_iso(data.get("fecha_fin"), "fecha_fin")
                if data.get("fecha_fin")
                else None
            )
            metodo_id = data.get("metodo_id") or None
            if not cliente_id or not concepto:
                raise ValueError("Cliente y concepto son obligatorios")
            if fecha_fin and fecha_fin < fecha_inicio:
                raise ValueError("La fecha final no puede ser anterior a la fecha inicial")

            cursor.execute("SELECT id FROM clientes WHERE id = %s", (cliente_id,))
            if not cursor.fetchone():
                raise ValueError("El cliente seleccionado no existe")
            cita_id = data.get("cita_id")
            if cita_id:
                cursor.execute("SELECT id FROM citas WHERE id = %s AND cliente = %s", (cita_id, cliente_id))
            else:
                cursor.execute("SELECT id FROM citas WHERE cliente = %s ORDER BY dia DESC, id DESC LIMIT 1", (cliente_id,))
            cita = cursor.fetchone()
            if not cita:
                raise ValueError("El cliente necesita una cita asociada para crear facturas")
            cita_id = cita["id"]

            if metodo_id:
                cursor.execute("SELECT id FROM pagos_metodos WHERE id = %s", (metodo_id,))
                if not cursor.fetchone():
                    raise ValueError("El metodo de pago seleccionado no existe")

            cursor.execute("""
                INSERT INTO cobros_recurrentes
                    (cliente_id, cita_id, concepto, monto, dia_vencimiento,
                     frecuencia_meses, fecha_inicio, fecha_fin,
                     proxima_generacion, metodo_id)
                VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, %s)
            """, (
                cliente_id, cita_id, concepto, monto, dia_vencimiento,
                fecha_inicio.isoformat(), fecha_fin.isoformat() if fecha_fin else None,
                fecha_inicio.isoformat(), metodo_id,
            ))
            nuevo_id = cursor.lastrowid
            mysql.connection.commit()
            resultado = generar_facturas_pendientes(mysql, cobro_id=nuevo_id)
            return jsonify({"id": nuevo_id, "msg": "Cobro recurrente creado", **resultado}), 201
        except ValueError as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    @app.patch("/api/facturacion/recurrentes/<int:id_cobro>")
    @jwt_required()
    def actualizar_cobro_recurrente(id_cobro):
        data = request.get_json(silent=True) or {}
        permitidos = {
            "activa": "activa",
            "concepto": "concepto",
            "monto": "monto",
            "dia_vencimiento": "dia_vencimiento",
            "fecha_fin": "fecha_fin",
            "metodo_id": "metodo_id",
        }
        asignaciones = []
        valores = []
        try:
            for campo, columna in permitidos.items():
                if campo not in data:
                    continue
                valor = data[campo]
                if campo == "activa":
                    valor = int(bool(valor))
                elif campo == "concepto":
                    valor = str(valor or "").strip().upper()
                    if not valor:
                        raise ValueError("El concepto no puede estar vacio")
                elif campo == "monto":
                    valor = monto_decimal(valor)
                elif campo == "dia_vencimiento":
                    valor = _entero(valor, 1, maximo=31)
                elif campo == "fecha_fin":
                    valor = fecha_desde_iso(valor, "fecha_fin").isoformat() if valor else None
                elif campo == "metodo_id":
                    valor = _entero(valor, 0, minimo=0) or None
                asignaciones.append(f"{columna} = %s")
                valores.append(valor)

            if not asignaciones:
                raise ValueError("No se enviaron cambios")

            asegurar_tablas(mysql)
            cursor = mysql.connection.cursor()
            if "metodo_id" in data and data.get("metodo_id"):
                cursor.execute("SELECT id FROM pagos_metodos WHERE id = %s", (data["metodo_id"],))
                if not cursor.fetchone():
                    raise ValueError("El metodo de pago seleccionado no existe")

            valores.append(id_cobro)
            cursor.execute(
                f"UPDATE cobros_recurrentes SET {', '.join(asignaciones)} WHERE id = %s",
                tuple(valores),
            )
            if cursor.rowcount == 0:
                mysql.connection.rollback()
                return jsonify({"error": "Cobro recurrente no encontrado"}), 404
            mysql.connection.commit()
            return jsonify({"msg": "Cobro recurrente actualizado"}), 200
        except ValueError as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()

    @app.post("/api/facturacion/recurrentes/generar")
    @jwt_required()
    def generar_cobros_recurrentes():
        data = request.get_json(silent=True) or {}
        try:
            hasta = fecha_desde_iso(data.get("hasta"), "hasta") if data.get("hasta") else date.today()
            resultado = generar_facturas_pendientes(mysql, hasta=hasta)
            return jsonify({"msg": "Generacion completada", **resultado}), 200
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        except Exception as error:
            return jsonify({"error": str(error)}), 500

    # ------------------------------------------------------------------ #
    #  PDF de factura mensual                                              #
    # ------------------------------------------------------------------ #

    @app.get("/api/facturacion/facturas/<int:id_pago>/pdf")
    def descargar_pdf_factura(id_pago):
        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("""
                SELECT
                    p.id,
                    CONCAT('FAC-', LPAD(p.id, 6, '0')) AS numero_factura,
                    c.nombre AS cliente_nombre,
                    COALESCE(c.telefono, ci.telefono, '') AS telefono,
                    COALESCE(c.email, '') AS email,
                    COALESCE(ci.domicilio, '') AS domicilio,
                    DATE_FORMAT(ci.dia, '%%Y-%%m-%%d') AS fecha_cita,
                    COALESCE(ci.hora, '') AS hora_cita,
                    DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') AS fecha_emision,
                    p.total,
                    COALESCE(p.enganche, 0) AS enganche,
                    CASE WHEN frg.id IS NULL THEN 'manual' ELSE 'recurrente' END AS origen,
                    cr.concepto,
                    DATE_FORMAT(frg.periodo, '%%Y-%%m') AS periodo
                FROM pagos p
                JOIN clientes c ON c.id = p.cliente
                LEFT JOIN citas ci ON ci.id = p.cita
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.pago_id = p.id
                LEFT JOIN cobros_recurrentes cr ON cr.id = frg.cobro_recurrente_id
                WHERE p.id = %s
                LIMIT 1
            """, (id_pago,))
            factura = cursor.fetchone()
            if not factura:
                return jsonify({"error": "Factura no encontrada"}), 404

            cursor.execute("""
                SELECT pc.id, pc.monto, pc.interes, pc.pagado,
                       DATE_FORMAT(pc.vencimiento, '%%Y-%%m-%%d') AS vencimiento,
                       DATE_FORMAT(pc.fechapago, '%%Y-%%m-%%d') AS fecha_pago,
                       pm.metodo AS metodo_nombre,
                       pc.nota
                FROM pagos_cuotas pc
                LEFT JOIN pagos_metodos pm ON pm.id = pc.metodo
                WHERE pc.pago = %s
                ORDER BY pc.vencimiento, pc.id
            """, (id_pago,))
            cuotas = cursor.fetchall()

            pdf_bytes = _generar_pdf_factura(factura, cuotas)
            nombre_archivo = f"{factura['numero_factura']}.pdf"
            return send_file(
                io.BytesIO(pdf_bytes),
                mimetype="application/pdf",
                as_attachment=True,
                download_name=nombre_archivo,
            )
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    # ------------------------------------------------------------------ #
    #  Marcar factura / cuota como pagada                                  #
    # ------------------------------------------------------------------ #

    @app.post("/api/facturacion/facturas/<int:id_pago>/pagar")
    def marcar_factura_pagada(id_pago):
        data = request.get_json(silent=True) or {}
        pagado = bool(data.get("pagado", True))
        metodo_id = data.get("metodo_id")
        fecha_pago = data.get("fecha_pago") or date.today().isoformat()
        nota = (data.get("nota") or "").strip()

        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("SELECT id FROM pagos WHERE id = %s LIMIT 1", (id_pago,))
            if not cursor.fetchone():
                return jsonify({"error": "Factura no encontrada"}), 404

            if pagado:
                if metodo_id:
                    metodo_id = int(metodo_id)
                else:
                    cursor.execute("SELECT MIN(id) AS id FROM pagos_metodos")
                    metodo_id = (cursor.fetchone() or {}).get("id") or 1

                if nota:
                    cursor.execute("""
                        UPDATE pagos_cuotas
                        SET pagado = 1,
                            fechapago = %s,
                            metodo = COALESCE(%s, metodo),
                            nota = CASE WHEN nota = '' OR nota IS NULL THEN %s ELSE CONCAT(nota, ' | ', %s) END
                        WHERE pago = %s
                    """, (fecha_pago, metodo_id, nota, nota, id_pago))
                else:
                    cursor.execute("""
                        UPDATE pagos_cuotas
                        SET pagado = 1,
                            fechapago = %s,
                            metodo = COALESCE(%s, metodo)
                        WHERE pago = %s
                    """, (fecha_pago, metodo_id, id_pago))
            else:
                cursor.execute("""
                    UPDATE pagos_cuotas
                    SET pagado = 0,
                        fechapago = NULL
                    WHERE pago = %s
                """, (id_pago,))

            mysql.connection.commit()
            return jsonify({
                "msg": "Factura marcada como pagada" if pagado else "Factura marcada como pendiente",
                "id_pago": id_pago,
                "pagado": pagado,
            }), 200
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    @app.post("/api/facturacion/cuotas/<int:id_cuota>/pagar")
    def marcar_cuota_pagada(id_cuota):
        data = request.get_json(silent=True) or {}
        pagado = bool(data.get("pagado", True))
        metodo_id = data.get("metodo_id")
        fecha_pago = data.get("fecha_pago") or date.today().isoformat()
        nota = (data.get("nota") or "").strip()

        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("SELECT id, pago FROM pagos_cuotas WHERE id = %s LIMIT 1", (id_cuota,))
            cuota = cursor.fetchone()
            if not cuota:
                return jsonify({"error": "Cuota no encontrada"}), 404

            if pagado:
                if metodo_id:
                    metodo_id = int(metodo_id)
                else:
                    cursor.execute("SELECT MIN(id) AS id FROM pagos_metodos")
                    metodo_id = (cursor.fetchone() or {}).get("id") or 1

                if nota:
                    cursor.execute("""
                        UPDATE pagos_cuotas
                        SET pagado = 1,
                            fechapago = %s,
                            metodo = COALESCE(%s, metodo),
                            nota = CASE WHEN nota = '' OR nota IS NULL THEN %s ELSE CONCAT(nota, ' | ', %s) END
                        WHERE id = %s
                    """, (fecha_pago, metodo_id, nota, nota, id_cuota))
                else:
                    cursor.execute("""
                        UPDATE pagos_cuotas
                        SET pagado = 1,
                            fechapago = %s,
                            metodo = COALESCE(%s, metodo)
                        WHERE id = %s
                    """, (fecha_pago, metodo_id, id_cuota))
            else:
                cursor.execute("""
                    UPDATE pagos_cuotas
                    SET pagado = 0,
                        fechapago = NULL
                    WHERE id = %s
                """, (id_cuota,))

            mysql.connection.commit()
            return jsonify({
                "msg": "Cuota marcada como pagada" if pagado else "Cuota marcada como pendiente",
                "id_cuota": id_cuota,
                "pagado": pagado,
            }), 200
        except Exception as error:
            mysql.connection.rollback()
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()

    # ------------------------------------------------------------------ #
    #  Facturación completa del cliente                                  #
    # ------------------------------------------------------------------ #

    @app.get("/api/facturacion/clientes/<int:id_cliente>")
    def obtener_facturacion_cliente(id_cliente):
        cursor = mysql.connection.cursor()
        try:
            asegurar_tablas(mysql)
            cursor.execute("""
                SELECT
                    p.id,
                    CONCAT('FAC-', LPAD(p.id, 6, '0')) AS numero_factura,
                    p.cliente AS cliente_id,
                    p.cita AS cita_id,
                    DATE_FORMAT(p.fecha, '%%Y-%%m-%%d') AS fecha_emision,
                    p.total,
                    COALESCE(p.enganche, 0) AS enganche,
                    CASE WHEN frg.id IS NULL THEN 'manual' ELSE 'recurrente' END AS origen,
                    cr.concepto,
                    COALESCE((SELECT SUM(pcs.monto) FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0), 0) AS saldo,
                    CASE WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0) THEN 0 ELSE 1 END AS pagado,
                    CASE
                        WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0 AND pcs.vencimiento < CURDATE()) THEN 'vencida'
                        WHEN EXISTS (SELECT 1 FROM pagos_cuotas pcs WHERE pcs.pago = p.id AND pcs.pagado = 0) THEN 'pendiente'
                        ELSE 'pagada'
                    END AS estado,
                    DATE_FORMAT(COALESCE(
                        (SELECT MIN(pcv.vencimiento) FROM pagos_cuotas pcv WHERE pcv.pago = p.id AND pcv.pagado = 0),
                        (SELECT MAX(pcv.vencimiento) FROM pagos_cuotas pcv WHERE pcv.pago = p.id)
                    ), '%%Y-%%m-%%d') AS vencimiento,
                    DATE_FORMAT((SELECT MAX(pcp.fechapago) FROM pagos_cuotas pcp WHERE pcp.pago = p.id), '%%Y-%%m-%%d') AS fecha_pago,
                    (SELECT GROUP_CONCAT(DISTINCT pmm.metodo ORDER BY pmm.metodo SEPARATOR ', ')
                     FROM pagos_cuotas pcm
                     LEFT JOIN pagos_metodos pmm ON pmm.id = pcm.metodo
                     WHERE pcm.pago = p.id AND pmm.metodo IS NOT NULL) AS metodo_nombre
                FROM pagos p
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.pago_id = p.id
                LEFT JOIN cobros_recurrentes cr ON cr.id = frg.cobro_recurrente_id
                WHERE p.cliente = %s
                ORDER BY p.id DESC
            """, (id_cliente,))
            facturas = cursor.fetchall()

            cursor.execute("""
                SELECT
                    cr.id, cr.cliente_id, cr.cita_id, cr.concepto, cr.monto,
                    cr.dia_vencimiento, cr.frecuencia_meses,
                    DATE_FORMAT(cr.fecha_inicio, '%%Y-%%m-%%d') AS fecha_inicio,
                    DATE_FORMAT(cr.fecha_fin, '%%Y-%%m-%%d') AS fecha_fin,
                    DATE_FORMAT(cr.proxima_generacion, '%%Y-%%m-%%d') AS proxima_generacion,
                    cr.metodo_id, pm.metodo AS metodo_nombre, cr.activa,
                    COUNT(frg.id) AS facturas_generadas,
                    MAX(DATE_FORMAT(frg.periodo, '%%Y-%%m')) AS ultimo_periodo,
                    MAX(frg.pago_id) AS ultima_factura_id,
                    CASE
                        WHEN MAX(frg.pago_id) IS NOT NULL
                        THEN CONCAT('FAC-', LPAD(MAX(frg.pago_id), 6, '0'))
                        ELSE NULL
                    END AS ultimo_numero_factura
                FROM cobros_recurrentes cr
                LEFT JOIN pagos_metodos pm ON pm.id = cr.metodo_id
                LEFT JOIN facturas_recurrentes_generadas frg ON frg.cobro_recurrente_id = cr.id
                WHERE cr.cliente_id = %s
                GROUP BY cr.id, cr.cliente_id, cr.cita_id, cr.concepto, cr.monto,
                         cr.dia_vencimiento, cr.frecuencia_meses, cr.fecha_inicio,
                         cr.fecha_fin, cr.proxima_generacion, cr.metodo_id, pm.metodo, cr.activa
                ORDER BY cr.activa DESC, cr.id DESC
            """, (id_cliente,))
            recurrentes = cursor.fetchall()

            total_facturado = sum(float(f["total"] or 0) for f in facturas)
            total_saldo = sum(float(f["saldo"] or 0) for f in facturas)
            total_pagado = total_facturado - total_saldo

            return jsonify({
                "facturas": facturas,
                "recurrentes": recurrentes,
                "resumen": {
                    "total_facturas": len(facturas),
                    "total_facturado": total_facturado,
                    "total_saldo": total_saldo,
                    "total_pagado": total_pagado,
                    "pendientes": sum(1 for f in facturas if f["estado"] == "pendiente"),
                    "vencidas": sum(1 for f in facturas if f["estado"] == "vencida"),
                    "pagadas": sum(1 for f in facturas if f["estado"] == "pagada"),
                }
            }), 200
        except Exception as error:
            return jsonify({"error": str(error)}), 500
        finally:
            cursor.close()


def _dinero(valor):
    try:
        return f"${float(valor or 0):,.2f}"
    except (TypeError, ValueError):
        return "$0.00"


def _fecha_legible(valor):
    if not valor:
        return "—"
    try:
        anio, mes, dia = str(valor)[:10].split("-")
        meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                 "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        return f"{int(dia)} {meses[int(mes) - 1]} {anio}"
    except Exception:
        return str(valor)


def _generar_pdf_factura(factura, cuotas):
    """Genera un PDF en memoria con el diseño idéntico al perfil del cliente."""
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )

    ancho_util = A4[0] - 32 * mm
    estilos = getSampleStyleSheet()

    # Estilos tipográficos
    estilo_titulo_der = ParagraphStyle(
        "titulo_der",
        parent=estilos["Normal"],
        fontSize=22,
        textColor=colors.HexColor("#18181b"),
        fontName="Helvetica-Bold",
        alignment=TA_RIGHT,
        spaceAfter=3,
        leading=24,
    )
    estilo_meta_der = ParagraphStyle(
        "meta_der",
        parent=estilos["Normal"],
        fontSize=9.5,
        textColor=colors.HexColor("#52525b"),
        fontName="Helvetica",
        alignment=TA_RIGHT,
        leading=13,
    )
    estilo_seccion_titulo = ParagraphStyle(
        "seccion_titulo",
        parent=estilos["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#71717a"),
        fontName="Helvetica-Bold",
        spaceAfter=0,
    )
    estilo_client_grid = ParagraphStyle(
        "client_grid",
        parent=estilos["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#18181b"),
        leading=14,
    )
    estilo_box_label = ParagraphStyle(
        "box_label",
        parent=estilos["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#71717a"),
        fontName="Helvetica-Bold",
        spaceAfter=4,
    )
    estilo_box_total = ParagraphStyle(
        "box_total",
        parent=estilos["Normal"],
        fontSize=15,
        textColor=colors.HexColor("#18181b"),
        fontName="Helvetica-Bold",
    )
    estilo_box_pagado = ParagraphStyle(
        "box_pagado",
        parent=estilos["Normal"],
        fontSize=15,
        textColor=colors.HexColor("#15803d"),
        fontName="Helvetica-Bold",
    )
    estilo_box_pendiente = ParagraphStyle(
        "box_pendiente",
        parent=estilos["Normal"],
        fontSize=15,
        textColor=colors.HexColor("#ea580c"),
        fontName="Helvetica-Bold",
    )
    estilo_th = ParagraphStyle(
        "th",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=TA_LEFT,
    )
    estilo_th_right = ParagraphStyle(
        "th_right",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.white,
        fontName="Helvetica-Bold",
        alignment=TA_RIGHT,
    )
    estilo_td = ParagraphStyle(
        "td",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#18181b"),
        leading=11,
    )
    estilo_td_center = ParagraphStyle(
        "td_center",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#18181b"),
        alignment=TA_CENTER,
    )
    estilo_td_right = ParagraphStyle(
        "td_right",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#18181b"),
        fontName="Helvetica-Bold",
        alignment=TA_RIGHT,
    )
    estilo_pie = ParagraphStyle(
        "pie",
        parent=estilos["Normal"],
        fontSize=8.5,
        textColor=colors.HexColor("#71717a"),
        alignment=TA_CENTER,
    )

    contenido = []

    # ── 1. HEADER (Logo izquierda + Info derecha) ─────────────────────────
    directorio_actual = os.path.dirname(os.path.abspath(__file__))
    ruta_logo = os.path.abspath(os.path.join(directorio_actual, "..", "frontend", "public", "logo_tsnetwork.png"))
    
    if os.path.isfile(ruta_logo):
        col_logo = Image(ruta_logo, width=52 * mm, height=20 * mm)
    else:
        col_logo = Paragraph("<font color='#f97316' size='18'><b>TS NETWORK</b></font>", estilos["Normal"])

    numero_fac = factura.get("numero_factura") or f"FAC-{str(factura.get('id', 0)).zfill(6)}"
    fecha_emision = _fecha_legible(factura.get("fecha_emision"))

    info_der = [
        Paragraph("<b>PLAN DE PAGOS</b>", estilo_titulo_der),
        Paragraph(f"Plan N.º {numero_fac}", estilo_meta_der),
        Paragraph(f"Emisión: {fecha_emision}", estilo_meta_der),
    ]

    tabla_header = Table([[col_logo, info_der]], colWidths=[108 * mm, 70 * mm])
    tabla_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 2.5, colors.HexColor("#f97316")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    contenido.append(tabla_header)
    contenido.append(Spacer(1, 6 * mm))

    # ── 2. DATOS DEL CLIENTE Y CITA (Card con borde naranja izquierdo) ─────
    cliente_nombre = html.escape(str(factura.get("cliente_nombre") or "-"))
    telefono = html.escape(str(factura.get("telefono") or "-"))
    email = html.escape(str(factura.get("email") or "-"))
    fecha_cita = str(factura.get("fecha_cita") or "").strip()
    hora_cita = str(factura.get("hora_cita") or "").strip()
    fecha_cita_txt = f"{fecha_cita} {hora_cita}".strip() or fecha_emision
    concepto = html.escape(str(factura.get("concepto") or "Plan de pagos"))
    domicilio = html.escape(str(factura.get("domicilio") or "-"))

    col_izq = [
        Paragraph(f"<b>Cliente:</b> {cliente_nombre}", estilo_client_grid),
        Paragraph(f"<b>Teléfono:</b> {telefono}", estilo_client_grid),
        Paragraph(f"<b>Email:</b> {email}", estilo_client_grid),
    ]
    col_der = [
        Paragraph(f"<b>Fecha:</b> {fecha_cita_txt}", estilo_client_grid),
        Paragraph(f"<b>Concepto:</b> {concepto}", estilo_client_grid),
        Paragraph(f"<b>Domicilio:</b> {domicilio}", estilo_client_grid),
    ]

    datos_cliente = [
        [Paragraph("<b>CLIENTE Y CITA</b>", estilo_seccion_titulo), ""],
        [col_izq, col_der],
    ]
    tabla_cliente = Table(datos_cliente, colWidths=[89 * mm, 89 * mm])
    tabla_cliente.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#d4d4d8")),
        ("LINEBEFORE", (0, 0), (0, -1), 4.5, colors.HexColor("#f97316")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fafafa")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    contenido.append(tabla_cliente)
    contenido.append(Spacer(1, 6 * mm))

    # ── 3. RESUMEN FINANCIERO (3 Cards: Total / Total Pagado / Falta Pagar) 
    total_factura = float(factura.get("total") or 0)
    enganche = float(factura.get("enganche") or 0)
    cuotas_pagadas_monto = sum(float(c.get("monto") or 0) for c in cuotas if c.get("pagado"))
    total_pagado = cuotas_pagadas_monto
    if enganche > 0 and len(cuotas) == 0:
        total_pagado += enganche
    falta_pagar = max(total_factura - total_pagado, 0.0)

    card_total = [
        Paragraph("TOTAL", estilo_box_label),
        Paragraph(f"<b>{_dinero(total_factura)}</b>", estilo_box_total),
    ]
    card_pagado = [
        Paragraph("TOTAL PAGADO", estilo_box_label),
        Paragraph(f"<b>{_dinero(total_pagado)}</b>", estilo_box_pagado),
    ]
    card_pendiente = [
        Paragraph("FALTA PAGAR", estilo_box_label),
        Paragraph(f"<b>{_dinero(falta_pagar)}</b>", estilo_box_pendiente),
    ]

    tabla_summary = Table(
        [[card_total, card_pagado, card_pendiente]],
        colWidths=[58 * mm, 58 * mm, 58 * mm],
    )
    tabla_summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#d4d4d8")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d4d4d8")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    contenido.append(tabla_summary)
    contenido.append(Spacer(1, 6 * mm))

    # ── 4. TABLA DE CUOTAS / MOVIMIENTOS ──────────────────────────────────
    filas_tabla = [[
        Paragraph("<b>#</b>", estilo_th),
        Paragraph("<b>VENCIMIENTO</b>", estilo_th),
        Paragraph("<b>MÉTODO</b>", estilo_th),
        Paragraph("<b>ESTADO</b>", estilo_th),
        Paragraph("<b>MONTO</b>", estilo_th_right),
    ]]

    hoy_iso = date.today().isoformat()

    if cuotas:
        for idx, cuota in enumerate(cuotas, 1):
            monto = float(cuota.get("monto") or 0)
            pagado = bool(cuota.get("pagado"))
            venc_raw = str(cuota.get("vencimiento") or "")
            venc_txt = _fecha_legible(venc_raw)
            metodo_txt = cuota.get("metodo_nombre") or "—"
            fecha_pago_raw = cuota.get("fecha_pago")

            if pagado:
                if fecha_pago_raw:
                    estado_txt = f"Pagada - {_fecha_legible(fecha_pago_raw)}"
                else:
                    estado_txt = "Pagada"
            else:
                if venc_raw and venc_raw < hoy_iso:
                    estado_txt = "Vencida"
                else:
                    estado_txt = "Pendiente"

            filas_tabla.append([
                Paragraph(str(idx), estilo_td_center),
                Paragraph(venc_txt, estilo_td),
                Paragraph(html.escape(metodo_txt), estilo_td),
                Paragraph(estado_txt, estilo_td),
                Paragraph(f"<b>{_dinero(monto)}</b>", estilo_td_right),
            ])
    else:
        filas_tabla.append([
            Paragraph("1", estilo_td_center),
            Paragraph(fecha_emision, estilo_td),
            Paragraph("—", estilo_td),
            Paragraph("Cubierto con enganche / Total", estilo_td),
            Paragraph(f"<b>{_dinero(total_factura)}</b>", estilo_td_right),
        ])

    tabla_cuotas = Table(
        filas_tabla,
        colWidths=[12 * mm, 38 * mm, 46 * mm, 44 * mm, 38 * mm],
        repeatRows=1,
    )
    tabla_cuotas.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#27272a")),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e4e4e7")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    contenido.append(tabla_cuotas)
    contenido.append(Spacer(1, 14 * mm))

    # ── 5. FOOTER ─────────────────────────────────────────────────────────
    contenido.append(HRFlowable(
        width=ancho_util,
        thickness=0.75,
        color=colors.HexColor("#d4d4d8"),
        spaceAfter=6,
        spaceBefore=0,
    ))
    contenido.append(Paragraph(
        "Resumen del plan de pagos emitido por TS Network.",
        estilo_pie,
    ))

    doc.build(contenido)
    return buffer.getvalue()
