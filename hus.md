# ID: Ver clientes activos por actividad

Título: Como administrador quiero ver la cantidad de clientes activos por actividad para conocer la distribución de participación en el centro  
Reglas de negocio:  
• Se considera cliente activo de una actividad a quien tenga una mensualidad vigente o una reserva individual confirmada para una clase futura de esa disciplina  
• El reporte muestra todas las disciplinas aunque no tengan clientes activos  
Criterios de aceptación:  
Escenario 1: Visualización exitosa con datos  
Dado que existen clientes activos distribuidos entre Yoga, Pilates y Funcional Cuando el administrador accede a "Reportes" y selecciona "Clientes por actividad" Entonces el sistema muestra cada disciplina con la cantidad de clientes activos, ordenadas de mayor a menor  
Escenario 2: Visualización con disciplina sin clientes activos  
Dado que Pilates no tiene clientes activos en este momento Cuando el administrador accede a "Clientes por actividad" Entonces el sistema muestra Pilates con valor 0 clientes activos junto al resto de las disciplinas
# ID: Ver asistencias de la clase
Título: Como recepcionista quiero ver la lista de asistencias de una clase para una fecha específica para consultar quiénes asistieron, faltaron o cancelaron  
Reglas de negocio:  
• El botón está deshabilitado si la clase no tiene inscripciones activas para esa fecha  
Criterios de aceptación:  
Escenario 1: Visualización de asistencias existentes  
Dado que la clase tiene inscripciones activas para la fecha seleccionada con asistencias registradas Cuando el recepcionista hace click en "Ver asistencias" Entonces el sistema muestra la lista de alumnos con su nombre completo, tipo de inscripción (Abonado o no abonado) y estado (Asistió, Faltó o Canceló)  
Escenario 2: Clase sin inscripciones para la fecha seleccionada  
Dado que la clase no tiene inscripciones activas para la fecha seleccionada Cuando el recepcionista visualiza el detalle de la clase Entonces el botón "Ver asistencias" aparece deshabilitado