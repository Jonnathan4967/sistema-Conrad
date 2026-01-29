# 🔧 Solución de Problemas

Guía completa para resolver los problemas más comunes.

## 🚨 Problemas de Instalación

### Error: "npm no se reconoce como comando"

**Síntomas**:
```
'npm' no se reconoce como un comando interno o externo
```

**Solución**:
1. Cierra todas las ventanas de CMD y VS Code
2. Reinicia tu computadora
3. Abre CMD y verifica: `node --version`
4. Si aún no funciona, reinstala Node.js

**Causa**: Node.js no está en el PATH del sistema

---

### Error: "Cannot find module"

**Síntomas**:
```
Error: Cannot find module 'react'
```

**Solución**:
```bash
# Limpia la caché de npm
npm cache clean --force

# Elimina node_modules
rmdir /s node_modules

# Reinstala
npm install
```

---

### Error: "EACCES: permission denied"

**Síntomas**:
```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solución en Windows**:
1. Cierra VS Code
2. Click derecho en VS Code
3. "Ejecutar como administrador"
4. Abre el proyecto
5. Intenta `npm install` de nuevo

---

### Error: "npm ERR! network"

**Síntomas**:
```
npm ERR! network request failed
```

**Solución**:
1. Verifica tu conexión a internet
2. Desactiva VPN temporalmente
3. Intenta con:
```bash
npm install --registry=https://registry.npmjs.org/
```

---

## 💾 Problemas de Supabase

### Error: "Failed to fetch"

**Síntomas**:
```
Failed to fetch
TypeError: Failed to fetch
```

**Solución**:
1. Verifica que el archivo `.env` exista
2. Verifica que las credenciales sean correctas:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```
3. Reinicia el servidor (Ctrl+C, luego `npm run dev`)
4. Limpia la caché del navegador

---

### Error: "Table does not exist"

**Síntomas**:
```
relation "public.pacientes" does not exist
```

**Solución**:
1. Ve a Supabase > SQL Editor
2. Ejecuta el script `supabase-setup.sql` completo
3. Verifica que las tablas existan en Table Editor
4. Si ya existen, elimínalas y vuelve a crear

---

### Error: "JWT expired"

**Síntomas**:
```
JWT expired
```

**Solución**:
1. Ve a Supabase > Settings > API
2. Genera una nueva anon key
3. Actualiza tu archivo `.env`
4. Reinicia el servidor

---

### Error: "Row Level Security"

**Síntomas**:
```
new row violates row-level security policy
```

**Solución**:
1. Ve a Supabase > Authentication > Policies
2. Verifica que las políticas estén configuradas
3. O ejecuta:
```sql
DROP POLICY IF EXISTS "Permitir todo en pacientes" ON pacientes;
CREATE POLICY "Permitir todo en pacientes" ON pacientes FOR ALL USING (true);
```

---

## 🌐 Problemas del Servidor Local

### Error: "Port 3000 already in use"

**Síntomas**:
```
Port 3000 is already in use
```

**Solución 1** - Usar otro puerto:
```bash
npm run dev -- --port 3001
```

**Solución 2** - Cerrar el proceso:
```bash
# En Windows CMD:
netstat -ano | findstr :3000
# Anota el PID (último número)
taskkill /PID [número] /F
```

---

### Error: "Module not found: Can't resolve"

**Síntomas**:
```
Module not found: Can't resolve 'react'
```

**Solución**:
```bash
npm install react react-dom
npm run dev
```

---

### La página no carga / pantalla blanca

**Solución**:
1. Presiona F12 en el navegador
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Si dice "MIME type error":
   - Limpia caché del navegador (Ctrl+Shift+Delete)
   - Recarga con Ctrl+F5

---

## 🎨 Problemas de Interfaz

### Los estilos no se aplican

**Síntomas**:
- La página se ve sin estilos
- Todo aparece sin colores

**Solución**:
1. Verifica que `tailwind.config.js` existe
2. Verifica que `postcss.config.js` existe
3. Limpia y reconstruye:
```bash
npm run build
npm run dev
```

---

### Los componentes no aparecen

**Síntomas**:
- Los botones no se ven
- El modal no se abre

**Solución**:
1. Presiona F12
2. Ve a Console
3. Busca errores de JavaScript
4. Verifica que todos los archivos existan

---

### Los datos no se guardan

**Síntomas**:
- Click en "Guardar" no hace nada
- No aparece mensaje de éxito

**Solución**:
1. Presiona F12
2. Ve a Console
3. Busca errores de Supabase
4. Verifica las credenciales en `.env`
5. Verifica que las tablas existan

---

## 🔍 Problemas de Datos

### No aparecen los departamentos/municipios

**Síntomas**:
- Los selectores están vacíos
- No hay opciones para seleccionar

**Solución**:
1. Verifica que el archivo `src/data/guatemala.ts` exista
2. Verifica que esté importado correctamente
3. Reinicia el servidor

---

### No aparecen los médicos referentes

**Síntomas**:
- La lista de médicos está vacía

**Solución**:
1. Ve a Supabase > Table Editor
2. Abre la tabla "medicos"
3. Verifica que haya médicos con `es_referente = true`
4. Si no hay, inserta algunos:
```sql
INSERT INTO medicos (nombre, telefono, departamento, municipio, direccion, es_referente)
VALUES ('Dr. Juan Pérez', '12345678', '1', '1-1', 'Zona 10', true);
```

---

### Los precios no cambian con el tipo de cobro

**Síntomas**:
- El precio es siempre el mismo

**Solución**:
1. Verifica que los sub-estudios tengan los 3 precios configurados
2. Ve a Supabase > sub_estudios
3. Verifica que `precio_normal`, `precio_social` y `precio_especial` tengan valores

---

## 📱 Problemas de Deployment

### Error en Vercel: "Build failed"

**Síntomas**:
```
Error: Build failed
```

**Solución**:
1. Verifica que el build funcione localmente:
```bash
npm run build
```
2. Si hay errores, corrígelos
3. Verifica las variables de entorno en Vercel
4. Asegúrate de tener `vercel.json` configurado

---

### Error: "Environment variables not set"

**Síntomas**:
- La app desplegada no funciona
- Errores de Supabase en producción

**Solución**:
1. Ve a Vercel > Settings > Environment Variables
2. Agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy desde Vercel

---

### La app funciona en local pero no en Vercel

**Solución**:
1. Verifica la consola del navegador en la URL de Vercel
2. Ve a Vercel > Deployments > (tu deployment) > Logs
3. Busca errores específicos
4. Común: Variables de entorno faltantes

---

## 🔐 Problemas de Seguridad

### Error: "API key is invalid"

**Solución**:
1. Ve a Supabase > Settings > API
2. Copia la `anon public key` correcta
3. Actualiza tu `.env`
4. NO uses la `service_role` key (es peligrosa)

---

### Error: "CORS policy"

**Síntomas**:
```
Access blocked by CORS policy
```

**Solución**:
1. Ve a Supabase > Authentication > URL Configuration
2. Agrega tu dominio de Vercel
3. Agrega `localhost:3000` para desarrollo

---

## 🐛 Debugging Avanzado

### Ver requests HTTP

1. Presiona F12
2. Ve a "Network"
3. Recarga la página
4. Ve todos los requests
5. Click en uno para ver detalles

### Ver errores de JavaScript

1. Presiona F12
2. Ve a "Console"
3. Busca mensajes en rojo
4. Click en el error para ver más detalles

### Ver errores de Supabase

1. Ve a Supabase > Logs
2. Selecciona "API" o "Database"
3. Busca errores recientes
4. Filtra por tipo de error

---

## 📞 Obtener Ayuda

### Antes de pedir ayuda, recopila:

1. **Screenshot del error** completo
2. **Mensaje de error** exacto (copia y pega)
3. **Qué estabas haciendo** cuando falló
4. **Logs de la consola** (F12)
5. **Versión de Node.js**: `node --version`
6. **Sistema operativo**: Windows 10/11

### Lugares para buscar ayuda:

1. **Este documento** - La mayoría de problemas están aquí
2. **README.md** - Documentación completa
3. **Supabase Docs** - https://supabase.com/docs
4. **Stack Overflow** - Busca tu error exacto
5. **GitHub Issues** - Busca problemas similares

---

## ✅ Verificación del Sistema

Ejecuta estos comandos para verificar tu instalación:

```bash
# Versión de Node.js
node --version

# Versión de npm
npm --version

# Versión de Git
git --version

# Listar dependencias instaladas
npm list --depth=0

# Verificar build
npm run build
```

### Salida esperada:

```
node --version
v18.19.0

npm --version
10.2.3

npm run build
vite v5.0.12 building for production...
✓ built in 2.34s
```

---

## 🎯 Checklist de Solución

Cuando tengas un problema, sigue estos pasos en orden:

- [ ] 1. Lee el mensaje de error completo
- [ ] 2. Busca el error en este documento
- [ ] 3. Verifica F12 Console en el navegador
- [ ] 4. Verifica la terminal de VS Code
- [ ] 5. Verifica el archivo `.env`
- [ ] 6. Reinicia el servidor (Ctrl+C, `npm run dev`)
- [ ] 7. Limpia caché (`npm cache clean --force`)
- [ ] 8. Reinstala dependencias (`npm install`)
- [ ] 9. Verifica Supabase (tablas, datos, logs)
- [ ] 10. Busca en Google el error exacto

---

**Última actualización**: Enero 2026

**Mantenido por**: Equipo de Desarrollo

Si encuentras un nuevo problema no listado aquí, por favor documéntalo para ayudar a futuros usuarios.
