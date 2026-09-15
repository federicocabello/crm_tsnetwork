"""Comando para ejecutar desde cron: python generar_facturas_recurrentes.py."""

import json

from app import app, mysql
from facturacion_recurrente import generar_facturas_pendientes


if __name__ == "__main__":
    with app.app_context():
        resultado = generar_facturas_pendientes(mysql)
        print(json.dumps(resultado, ensure_ascii=False, default=str))
