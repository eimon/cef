from datetime import date

d = date(2026, 6, 9)
print(f"Fecha: {d}")
print(f"Día: {d.strftime('%A')}")
print(f"Weekday: {d.weekday()}")  # 0=Lunes, 6=Domingo
