import calendar
from datetime import date, datetime, timedelta


def asegurar_tabla(mysql):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tareas_programadas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tarea VARCHAR(255) NOT NULL,
                cliente VARCHAR(255) NULL,
                telefono VARCHAR(50) NULL,
                direccion VARCHAR(255) NULL,
                categoria ENUM('general', 'internet', 'camaras') NOT NULL DEFAULT 'general',
                frecuencia ENUM('semanal', 'mensual') NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NULL,
                hora TIME NOT NULL DEFAULT '09:00:00',
                asignado TINYINT(4) NOT NULL,
                creador TINYINT(4) NULL,
                activa TINYINT(1) NOT NULL DEFAULT 1,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_tareas_programadas_rango (activa, fecha_inicio, fecha_fin),
                INDEX idx_tareas_programadas_asignado (asignado),
                CONSTRAINT fk_tareas_programadas_asignado
                    FOREIGN KEY (asignado) REFERENCES auth(id),
                CONSTRAINT fk_tareas_programadas_creador
                    FOREIGN KEY (creador) REFERENCES auth(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        mysql.connection.commit()
    finally:
        cursor.close()


def normalizar_rango(desde_valor=None, hasta_valor=None):
    hoy = date.today()
    desde_texto = str(desde_valor or (hoy - timedelta(days=30)).isoformat()).strip()
    hasta_texto = str(hasta_valor or (hoy + timedelta(days=180)).isoformat()).strip()

    try:
        desde = date.fromisoformat(desde_texto)
        hasta = date.fromisoformat(hasta_texto)
    except ValueError as error:
        raise ValueError("Las fechas deben usar el formato YYYY-MM-DD") from error

    if hasta < desde:
        raise ValueError("La fecha final debe ser igual o posterior a la fecha inicial")
    if (hasta - desde).days > 370:
        raise ValueError("El rango de tareas no puede superar 370 dias")

    return desde, hasta


def _sumar_mes(fecha, dia_original):
    siguiente_mes = 1 if fecha.month == 12 else fecha.month + 1
    siguiente_anio = fecha.year + 1 if fecha.month == 12 else fecha.year
    ultimo_dia = calendar.monthrange(siguiente_anio, siguiente_mes)[1]
    return date(siguiente_anio, siguiente_mes, min(dia_original, ultimo_dia))


def expandir(filas, desde, hasta):
    ocurrencias = []

    for fila in filas:
        inicio = date.fromisoformat(str(fila["fecha_inicio"]))
        fin_configurado = fila.get("fecha_fin")
        fin = date.fromisoformat(str(fin_configurado)) if fin_configurado else hasta
        limite = min(fin, hasta)
        frecuencia = fila.get("frecuencia")
        dia_original = inicio.day

        if limite < inicio or limite < desde:
            continue

        fecha_ocurrencia = inicio
        while fecha_ocurrencia < desde:
            if frecuencia == "semanal":
                semanas = max(1, (desde - fecha_ocurrencia).days // 7)
                fecha_ocurrencia += timedelta(days=semanas * 7)
                while fecha_ocurrencia < desde:
                    fecha_ocurrencia += timedelta(days=7)
            else:
                fecha_ocurrencia = _sumar_mes(fecha_ocurrencia, dia_original)

        while fecha_ocurrencia <= limite:
            dia = fecha_ocurrencia.isoformat()
            hora = (fila.get("hora") or "09:00")[:5]
            ocurrencias.append({
                "id": f"programada-{fila['id']}-{dia}",
                "origen": "programada",
                "id_tarea_programada": fila["id"],
                "idcita": None,
                "idcliente": None,
                "nombre": fila.get("cliente") or "Tarea interna",
                "telefono": fila.get("telefono") or "",
                "direccion": fila.get("direccion") or "",
                "tarea": fila.get("tarea") or "Tarea programada",
                "categoria": fila.get("categoria") or "general",
                "tipo": fila.get("categoria") or "general",
                "dia": dia,
                "hora": hora,
                "hora_format": datetime.strptime(hora, "%H:%M").strftime("%I:%M %p"),
                "idagente": fila.get("asignado"),
                "fullname": fila.get("fullname") or "Sin asignar",
                "frecuencia": frecuencia,
                "estado": "Programada",
                "color": "#a855f7",
            })
            fecha_ocurrencia = (
                fecha_ocurrencia + timedelta(days=7)
                if frecuencia == "semanal"
                else _sumar_mes(fecha_ocurrencia, dia_original)
            )

    return ocurrencias


def obtener_configuraciones(cursor, solo_activas=True):
    condicion = "WHERE tareas_programadas.activa = 1" if solo_activas else ""
    cursor.execute(f"""
        SELECT
            tareas_programadas.id,
            tareas_programadas.tarea,
            tareas_programadas.cliente,
            tareas_programadas.telefono,
            tareas_programadas.direccion,
            tareas_programadas.categoria,
            tareas_programadas.frecuencia,
            DATE_FORMAT(tareas_programadas.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
            DATE_FORMAT(tareas_programadas.fecha_fin, '%Y-%m-%d') AS fecha_fin,
            DATE_FORMAT(tareas_programadas.hora, '%H:%i') AS hora,
            tareas_programadas.asignado,
            tareas_programadas.activa,
            auth.fullname
        FROM tareas_programadas
        JOIN auth ON auth.id = tareas_programadas.asignado
        {condicion}
        ORDER BY tareas_programadas.fecha_inicio, tareas_programadas.hora, tareas_programadas.id
    """)
    return cursor.fetchall()


def obtener_ocurrencias(cursor, desde, hasta):
    cursor.execute("""
        SELECT
            tareas_programadas.id,
            tareas_programadas.tarea,
            tareas_programadas.cliente,
            tareas_programadas.telefono,
            tareas_programadas.direccion,
            tareas_programadas.categoria,
            tareas_programadas.frecuencia,
            DATE_FORMAT(tareas_programadas.fecha_inicio, '%%Y-%%m-%%d') AS fecha_inicio,
            DATE_FORMAT(tareas_programadas.fecha_fin, '%%Y-%%m-%%d') AS fecha_fin,
            DATE_FORMAT(tareas_programadas.hora, '%%H:%%i') AS hora,
            tareas_programadas.asignado,
            auth.fullname
        FROM tareas_programadas
        JOIN auth ON auth.id = tareas_programadas.asignado
        WHERE tareas_programadas.activa = 1
          AND tareas_programadas.fecha_inicio <= %s
          AND (tareas_programadas.fecha_fin IS NULL OR tareas_programadas.fecha_fin >= %s)
        ORDER BY tareas_programadas.fecha_inicio, tareas_programadas.hora, tareas_programadas.id
    """, (hasta.isoformat(), desde.isoformat()))
    return expandir(cursor.fetchall(), desde, hasta)
