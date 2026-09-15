import calendar
from datetime import date, datetime
from decimal import Decimal, InvalidOperation


def fecha_desde_iso(valor, campo="fecha"):
    try:
        return date.fromisoformat(str(valor or "").strip())
    except ValueError as error:
        raise ValueError(f"{campo} debe usar el formato YYYY-MM-DD") from error


def sumar_meses(fecha, cantidad=1, dia_original=None):
    indice = fecha.year * 12 + fecha.month - 1 + cantidad
    anio, mes_cero = divmod(indice, 12)
    mes = mes_cero + 1
    dia = min(dia_original or fecha.day, calendar.monthrange(anio, mes)[1])
    return date(anio, mes, dia)


def fecha_vencimiento(fecha_periodo, dia_vencimiento):
    ultimo_dia = calendar.monthrange(fecha_periodo.year, fecha_periodo.month)[1]
    return date(
        fecha_periodo.year,
        fecha_periodo.month,
        min(int(dia_vencimiento), ultimo_dia),
    )


def monto_decimal(valor):
    try:
        monto = Decimal(str(valor))
    except (InvalidOperation, TypeError) as error:
        raise ValueError("El monto no es valido") from error
    if monto <= 0:
        raise ValueError("El monto debe ser mayor que cero")
    return monto.quantize(Decimal("0.01"))


def asegurar_tablas(mysql):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cobros_recurrentes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cliente_id INT NOT NULL,
                cita_id INT NOT NULL,
                concepto VARCHAR(255) NOT NULL,
                monto DECIMAL(12, 2) NOT NULL,
                dia_vencimiento TINYINT UNSIGNED NOT NULL,
                frecuencia_meses TINYINT UNSIGNED NOT NULL DEFAULT 1,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NULL,
                proxima_generacion DATE NOT NULL,
                metodo_id TINYINT(4) NULL,
                activa TINYINT(1) NOT NULL DEFAULT 1,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_cobros_recurrentes_generacion (activa, proxima_generacion),
                INDEX idx_cobros_recurrentes_cliente (cliente_id),
                CONSTRAINT fk_cobros_recurrentes_cliente
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                CONSTRAINT fk_cobros_recurrentes_cita
                    FOREIGN KEY (cita_id) REFERENCES citas(id),
                CONSTRAINT fk_cobros_recurrentes_metodo
                    FOREIGN KEY (metodo_id) REFERENCES pagos_metodos(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS facturas_recurrentes_generadas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cobro_recurrente_id INT NOT NULL,
                periodo DATE NOT NULL,
                pago_id INT NOT NULL,
                generado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_factura_recurrente_periodo (cobro_recurrente_id, periodo),
                UNIQUE KEY uq_factura_recurrente_pago (pago_id),
                CONSTRAINT fk_facturas_recurrentes_cobro
                    FOREIGN KEY (cobro_recurrente_id) REFERENCES cobros_recurrentes(id),
                CONSTRAINT fk_facturas_recurrentes_pago
                    FOREIGN KEY (pago_id) REFERENCES pagos(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        mysql.connection.commit()
    finally:
        cursor.close()


def generar_facturas_pendientes(mysql, hasta=None, cobro_id=None):
    asegurar_tablas(mysql)
    fecha_limite = hasta or date.today()
    cursor = mysql.connection.cursor()
    generadas = []
    omitidas = 0

    try:
        condiciones = ["cr.activa = 1", "cr.proxima_generacion <= %s"]
        parametros = [fecha_limite.isoformat()]
        if cobro_id is not None:
            condiciones.append("cr.id = %s")
            parametros.append(int(cobro_id))

        cursor.execute(f"""
            SELECT cr.*
            FROM cobros_recurrentes cr
            WHERE {' AND '.join(condiciones)}
            ORDER BY cr.proxima_generacion, cr.id
            FOR UPDATE
        """, tuple(parametros))
        cobros = cursor.fetchall()

        cursor.execute("SELECT MIN(id) AS id FROM pagos_metodos")
        metodo_predeterminado = (cursor.fetchone() or {}).get("id")
        if cobros and not metodo_predeterminado:
            raise ValueError("Configura al menos un metodo de pago antes de generar facturas")

        for cobro in cobros:
            proxima = fecha_desde_iso(cobro["proxima_generacion"], "proxima_generacion")
            fecha_inicio = fecha_desde_iso(cobro["fecha_inicio"], "fecha_inicio")
            dia_generacion = fecha_inicio.day
            fecha_fin = (
                fecha_desde_iso(cobro["fecha_fin"], "fecha_fin")
                if cobro.get("fecha_fin")
                else None
            )
            iteraciones = 0

            while proxima <= fecha_limite and (not fecha_fin or proxima <= fecha_fin):
                iteraciones += 1
                if iteraciones > 120:
                    raise ValueError("La recurrencia supera el limite de 120 periodos pendientes")

                periodo = proxima.replace(day=1)
                cursor.execute("""
                    SELECT pago_id
                    FROM facturas_recurrentes_generadas
                    WHERE cobro_recurrente_id = %s AND periodo = %s
                    LIMIT 1
                """, (cobro["id"], periodo.isoformat()))
                existente = cursor.fetchone()

                if existente:
                    omitidas += 1
                else:
                    vencimiento = fecha_vencimiento(proxima, cobro["dia_vencimiento"])
                    metodo_id = cobro.get("metodo_id") or metodo_predeterminado
                    cursor.execute("""
                        INSERT INTO pagos (cliente, cita, enganche, total, fecha)
                        VALUES (%s, %s, 0, %s, %s)
                    """, (
                        cobro["cliente_id"],
                        cobro["cita_id"],
                        cobro["monto"],
                        proxima.isoformat(),
                    ))
                    pago_id = cursor.lastrowid
                    cursor.execute("""
                        INSERT INTO pagos_cuotas
                            (pago, monto, interes, pagado, vencimiento, metodo, nota, comprobante)
                        VALUES (%s, %s, 0, 0, %s, %s, %s, '')
                    """, (
                        pago_id,
                        cobro["monto"],
                        vencimiento.isoformat(),
                        metodo_id,
                        f"FACTURA RECURRENTE: {cobro['concepto']}",
                    ))
                    cursor.execute("""
                        INSERT INTO facturas_recurrentes_generadas
                            (cobro_recurrente_id, periodo, pago_id)
                        VALUES (%s, %s, %s)
                    """, (cobro["id"], periodo.isoformat(), pago_id))
                    generadas.append({
                        "pago_id": pago_id,
                        "cobro_recurrente_id": cobro["id"],
                        "periodo": periodo.isoformat(),
                        "vencimiento": vencimiento.isoformat(),
                    })

                proxima = sumar_meses(
                    proxima,
                    int(cobro.get("frecuencia_meses") or 1),
                    dia_generacion,
                )

            activa = int(not fecha_fin or proxima <= fecha_fin)
            cursor.execute("""
                UPDATE cobros_recurrentes
                SET proxima_generacion = %s, activa = %s
                WHERE id = %s
            """, (proxima.isoformat(), activa, cobro["id"]))

        mysql.connection.commit()
        return {"generadas": generadas, "cantidad": len(generadas), "omitidas": omitidas}
    except Exception:
        mysql.connection.rollback()
        raise
    finally:
        cursor.close()
