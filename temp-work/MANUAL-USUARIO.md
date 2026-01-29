# 👥 Manual de Usuario - Sistema de Sanatorio

## Introducción

Bienvenido al Sistema de Sanatorio. Este manual te ayudará a usar el sistema de forma eficiente para registrar pacientes y consultas.

## 🏥 Pantalla Principal

Al abrir el sistema verás:

### Barra Superior (Botones Azules)
- **Nuevo**: Crear un nuevo paciente
- **Productos**: Ver catálogo de estudios
- **Referentes**: Ver médicos referentes
- **Cuadre Diario**: Resumen del día
- **Estadísticas**: Reportes generales

---

## 👤 Registrar Nuevo Paciente

### Paso 1: Click en "Nuevo"

Se abrirá una ventana con dos secciones:

### Paso 2: Llenar Datos del Paciente (Izquierda)

**Todos los campos son obligatorios:**

1. **Nombre**: Escribe el nombre completo
   - Ejemplo: "María José García López"

2. **Edad**: Solo números
   - Ejemplo: 35
   - No se permite: texto ni decimales

3. **Número de Teléfono**: 8 dígitos
   - Ejemplo: 12345678
   - No se permite: letras

4. **Departamento**: 
   - Empieza a escribir: "Gua..."
   - Selecciona de la lista: "Guatemala"
   - **Importante**: Debes seleccionar de la lista

5. **Municipio**:
   - Primero debes seleccionar el departamento
   - Luego escribe: "Guate..."
   - Selecciona de la lista: "Guatemala"

### Paso 3: Llenar Datos del Médico (Derecha)

**Opción 1: Médico Referente**

1. Click en "Referente"
2. En "Nombre del Médico" escribe para buscar
3. Selecciona de la lista
4. Los demás campos se llenarán automáticamente

**Opción 2: Médico No Referente**

1. Click en "No Referente"
2. Llena todos los campos manualmente:
   - Nombre
   - Teléfono
   - Departamento
   - Municipio
   - Dirección

**Opción 3: Sin Información**

1. Marca el checkbox "Sin información"
2. Todos los campos del médico se bloquearán
3. Usa esto cuando el paciente venga sin referencia

### Paso 4: Guardar

- Click en "Guardar" (botón verde)
- Verás un mensaje de confirmación
- La información del paciente aparecerá en pantalla

### Botón Cancelar

- Click en "Cancelar" si cometiste un error
- Toda la información se borrará
- No se guardará nada

---

## 📋 Registrar Consulta

Una vez guardado el paciente:

### Paso 1: Seleccionar Tipo de Cobro

**3 opciones disponibles:**

1. **Social**: Para instituciones públicas
   - Siempre disponible
   - Precios reducidos

2. **Normal**: Horario regular
   - Lunes-Viernes: 7am - 4pm
   - Sábado: 7am - 11am
   - Se bloquea fuera de horario

3. **Especial**: Fuera de horario
   - Resto del tiempo
   - Precios más altos
   - Se bloquea en horario normal

**El sistema bloqueará automáticamente las opciones según el horario.**

### Paso 2: Seleccionar Estudios

1. **Estudio**: Click y selecciona
   - Ejemplo: "Laboratorio Clínico"

2. **Sub-Estudio**: Aparecerán las opciones
   - Ejemplo: "Hemograma Completo"
   - Verás el precio según el tipo de cobro

3. **Click en "Agregar a Descripción"**
   - El estudio se agregará a la lista
   - Los campos se limpiarán
   - Puedes agregar más estudios

### Paso 3: Revisar Descripción

En la sección "Descripción" verás:
- Todos los estudios agregados
- El precio de cada uno
- Botón 🗑️ para eliminar si te equivocaste

### Paso 4: Configurar Facturación

**¿Requiere Factura?**

- **SÍ**:
  - Ingresa el NIT
  - Forma de pago:
    - "Efectivo Facturado (Depósito)"
    - "Tarjeta Facturado"

- **NO**:
  - No ingreses NIT
  - Forma de pago:
    - "Efectivo"
    - "Estado de Cuenta"

**Número de Factura** (Opcional):
- Ingresa el número si ya tienes uno

### Paso 5: Verificar Totales

En el cuadro azul verás:
- Sub-Total
- Descuento
- Monto Gravable
- Impuesto
- **Total Ventas** (en azul y grande)

### Paso 6: Imprimir

- Click en "Imprimir"
- Se guardará la consulta
- Se imprimirá el recibo
- Todo se limpiará automáticamente

---

## 🧹 Limpiar Información

Si cometiste un error o quieres empezar de nuevo:

1. Click en "Limpiar"
2. Confirma la acción
3. Se borrará todo (no se guarda nada)

---

## ⚠️ Errores Comunes

### "Por favor complete todos los campos"

**Causa**: Dejaste campos vacíos

**Solución**: Verifica que llenaste:
- Todos los campos del paciente
- Todos los campos del médico (si no marcaste "Sin información")

### "No se encontraron resultados"

**Causa**: Escribiste mal el nombre o no existe

**Solución**:
- Verifica la ortografía
- Si no existe, usa "No Referente" para médicos
- O reporta al administrador para agregar

### El botón "Imprimir" no funciona

**Causa**: Faltan datos

**Solución**: Verifica que:
- Hayas agregado al menos un estudio
- Hayas configurado la facturación
- El paciente esté guardado

### No puedo seleccionar "Normal" o "Especial"

**Causa**: Restricción de horario

**Solución**: Esto es normal
- "Normal" solo en horario de atención
- "Especial" solo fuera de horario
- El sistema lo controla automáticamente

---

## 💡 Consejos y Buenas Prácticas

### Al Registrar Pacientes

✅ **Hacer:**
- Verifica la ortografía antes de guardar
- Confirma el número de teléfono
- Usa mayúsculas al inicio de nombres
- Selecciona el municipio correcto

❌ **No Hacer:**
- No uses abreviaturas
- No dejes campos vacíos
- No inventes datos
- No uses caracteres especiales raros

### Al Registrar Consultas

✅ **Hacer:**
- Verifica el tipo de cobro es correcto
- Confirma los estudios con el paciente
- Revisa el total antes de imprimir
- Guarda el número de factura

❌ **No Hacer:**
- No agregues estudios incorrectos
- No olvides configurar la facturación
- No imprimas sin verificar
- No uses el botón "Limpiar" si ya guardaste

### Productividad

- Usa la búsqueda rápida (escribe y selecciona)
- Ten los NITs de pacientes frecuentes a mano
- Revisa el cuadre diario al final del turno
- Reporta errores al administrador

---

## 🔍 Atajos Útiles

- **Buscar en selectores**: Empieza a escribir
- **Borrar estudio**: Click en 🗑️
- **Ver información completa**: Revisa las secciones expandidas

---

## 📞 ¿Necesitas Ayuda?

### Problemas Técnicos

Si el sistema no responde:
1. Recarga la página (F5)
2. Si persiste, contacta al administrador
3. No cierres sin guardar si trabajaste

### Dudas sobre Procesos

- Consulta con tu supervisor
- Revisa este manual
- Pide capacitación adicional

### Reportar Errores

Al reportar un error, indica:
- ¿Qué estabas haciendo?
- ¿Qué botón presionaste?
- ¿Qué mensaje apareció?
- ¿A qué hora ocurrió?

---

## 📊 Ver Reportes

### Cuadre Diario

1. Click en "Cuadre Diario"
2. Verás el resumen del día:
   - Total de consultas
   - Sub-total
   - Descuentos
   - Total de ventas

### Estadísticas

1. Click en "Estadísticas"
2. Verás reportes generales
3. Puedes filtrar por fecha

---

## 🎓 Capacitación

### Para Nuevos Usuarios

1. Lee este manual completo
2. Practica con datos de prueba
3. Observa a un usuario experimentado
4. Realiza registros supervisados
5. Obtén autorización para uso independiente

### Mejora Continua

- Revisa este manual periódicamente
- Aprende los atajos
- Comparte tips con compañeros
- Sugiere mejoras al sistema

---

## ✅ Checklist Diario

Al iniciar tu turno:
- [ ] Verifica que el sistema cargue
- [ ] Revisa que puedes crear pacientes
- [ ] Confirma que los médicos referentes aparecen
- [ ] Verifica que los estudios se cargan

Al terminar tu turno:
- [ ] Revisa el cuadre diario
- [ ] Verifica que todas las consultas se guardaron
- [ ] Reporta cualquier problema
- [ ] Cierra sesión correctamente

---

## 📝 Preguntas Frecuentes

**P: ¿Puedo editar un paciente después de guardarlo?**
R: No, debes crear uno nuevo o contactar al administrador.

**P: ¿Qué hago si me equivoqué al agregar un estudio?**
R: Click en el ícono 🗑️ al lado del estudio para eliminarlo.

**P: ¿Puedo agregar varios estudios a la vez?**
R: Sí, agrega uno, luego otro, luego otro. No hay límite.

**P: ¿Qué es "Sin información" en médico?**
R: Úsalo cuando el paciente viene sin referencia médica.

**P: ¿Por qué no puedo seleccionar "Normal"?**
R: Estás fuera del horario de atención normal.

**P: ¿Se guardan los datos automáticamente?**
R: No, debes hacer click en "Guardar" o "Imprimir".

**P: ¿Puedo recuperar algo que borré con "Limpiar"?**
R: No, por eso aparece una confirmación. Sé cuidadoso.

---

**Versión del Manual**: 1.0
**Última actualización**: Enero 2026

¡Gracias por usar el Sistema de Sanatorio! 🏥
