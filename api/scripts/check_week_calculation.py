"""
Script para verificar qué fecha esperaría el endpoint /clases/semana
"""

from datetime import date, timedelta
from core.enums import DiaSemana

# Simular lo que hace get_semana
fecha_consulta = date(2026, 6, 9)  # Martes 9/6

week_start = fecha_consulta - timedelta(days=(fecha_consulta.weekday() + 1) % 7)
print(f"Fecha consultada: {fecha_consulta} ({fecha_consulta.strftime('%A')})")
print(f"Week start: {week_start} ({week_start.strftime('%A')})")

# Para Funcional (miércoles, offset 3)
_DIA_OFFSET = {
    DiaSemana.DOMINGO: 0,
    DiaSemana.LUNES: 1,
    DiaSemana.MARTES: 2,
    DiaSemana.MIERCOLES: 3,
    DiaSemana.JUEVES: 4,
    DiaSemana.VIERNES: 5,
    DiaSemana.SABADO: 6,
}

offset_miercoles = _DIA_OFFSET[DiaSemana.MIERCOLES]
fecha_clase_esperada = week_start + timedelta(days=offset_miercoles)
print(f"Fecha esperada para Funcional (miércoles): {fecha_clase_esperada} ({fecha_clase_esperada.strftime('%A')})")
