# 🚀 Guía Rápida de Inicio

## Paso 1: Instalar Dependencias

Abre la terminal en VS Code y ejecuta:

```bash
npm install
```

Espera a que termine (puede tomar 2-3 minutos).

## Paso 2: Configurar Supabase

### Crear Cuenta y Proyecto

1. Ve a: https://supabase.com
2. Click en "Start your project"
3. Crea cuenta con tu email
4. Click en "New Project"
5. Nombre: `sanatorio-app`
6. Contraseña: (guárdala bien)
7. Region: South America
8. Click "Create new project"

### Configurar Base de Datos

1. En Supabase, ve a "SQL Editor"
2. Click "New query"
3. Abre el archivo `supabase-setup.sql` de este proyecto
4. Copia TODO el contenido
5. Pégalo en Supabase
6. Click "Run" (botón verde)
7. Debe decir "Success"

### Obtener Credenciales

1. Ve a "Settings" (abajo a la izquierda)
2. Click en "API"
3. Copia el "Project URL"
4. Copia la "anon public key"

## Paso 3: Configurar Variables de Entorno

1. En VS Code, crea un archivo llamado `.env` en la raíz del proyecto
2. Copia esto y reemplaza con tus datos:

```env
VITE_SUPABASE_URL=pega-aqui-tu-project-url
VITE_SUPABASE_ANON_KEY=pega-aqui-tu-anon-key
```

3. Guarda el archivo (Ctrl+S)

## Paso 4: Probar en Local

En la terminal ejecuta:

```bash
npm run dev
```

Abre tu navegador en: http://localhost:3000

## Paso 5: Probar la Aplicación

1. Click en "Nuevo"
2. Llena los datos del paciente:
   - Nombre: Juan Pérez
   - Edad: 35
   - Teléfono: 12345678
   - Departamento: Guatemala
   - Municipio: Guatemala
3. En médico:
   - Selecciona "Referente"
   - Elige "Dr. Juan Pérez" de la lista
4. Click "Guardar"
5. Selecciona tipo de cobro: "Normal"
6. En Estudios:
   - Estudio: Laboratorio Clínico
   - Sub-Estudio: Hemograma Completo
   - Click "Agregar a Descripción"
7. En Facturación:
   - Factura: No
   - Forma de Pago: Efectivo
8. Click "Imprimir"

¡Si funciona, estás listo!

## Paso 6: Subir a GitHub

```bash
git init
git add .
git commit -m "Sistema de sanatorio inicial"
git branch -M main
```

Luego en GitHub:
1. Crea un nuevo repositorio
2. Copia los comandos que te da GitHub
3. Pégalos en la terminal

## Paso 7: Deployar en Vercel

1. Ve a: https://vercel.com
2. Click "Sign Up" con GitHub
3. Click "Add New..." > "Project"
4. Importa tu repositorio
5. En "Environment Variables":
   - Name: `VITE_SUPABASE_URL` Value: tu-url
   - Name: `VITE_SUPABASE_ANON_KEY` Value: tu-key
6. Click "Deploy"
7. Espera 2 minutos

¡Listo! Tu app está en línea.

## ❓ ¿Problemas?

### No instala dependencias
```bash
npm cache clean --force
npm install
```

### No encuentra Supabase
- Verifica que el archivo `.env` exista
- Verifica que las credenciales sean correctas
- Reinicia el servidor (Ctrl+C y `npm run dev`)

### Error en la página
- Presiona F12 en el navegador
- Mira la consola para ver el error
- Revisa que Supabase esté configurado

## 📞 Necesitas ayuda?

1. Revisa el archivo `README.md` completo
2. Revisa la consola del navegador (F12)
3. Revisa los logs de Supabase

---

¡Éxito con tu proyecto! 🎉
