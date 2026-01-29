# ✅ Checklist de Instalación y Configuración

Usa esta lista para verificar que completaste todos los pasos correctamente.

## 📋 Pre-instalación

- [ ] Tengo Windows 10 u 11 instalado
- [ ] Tengo conexión a internet estable
- [ ] Tengo al menos 2GB de espacio libre en disco
- [ ] Tengo permisos de administrador en mi PC

## 🔧 Instalación de Herramientas

### Node.js
- [ ] Descargué Node.js desde https://nodejs.org/
- [ ] Instalé la versión LTS (recomendada)
- [ ] Reinicié mi computadora después de instalar
- [ ] Verifiqué con `node --version` en CMD
- [ ] Verifiqué con `npm --version` en CMD

### Visual Studio Code
- [ ] Descargué VS Code desde https://code.visualstudio.com/
- [ ] Durante la instalación, marqué "Add to PATH"
- [ ] Instalé VS Code completamente
- [ ] Puedo abrir VS Code desde el menú de inicio

### Git (Opcional para GitHub)
- [ ] Descargué Git desde https://git-scm.com/
- [ ] Instalé con opciones por defecto
- [ ] Verifiqué con `git --version` en CMD

## 📂 Configuración del Proyecto

### Abrir Proyecto
- [ ] Abrí Visual Studio Code
- [ ] Abrí la carpeta `sanatorio-app` en VS Code
- [ ] Puedo ver todos los archivos en el explorador de archivos de VS Code

### Instalar Dependencias
- [ ] Abrí la terminal en VS Code (Ctrl + Ñ)
- [ ] Ejecuté `npm install`
- [ ] La instalación terminó sin errores
- [ ] Se creó la carpeta `node_modules`

## 🗄️ Configuración de Supabase

### Crear Cuenta
- [ ] Fui a https://supabase.com
- [ ] Creé una cuenta nueva o inicié sesión
- [ ] Confirmé mi email

### Crear Proyecto
- [ ] Click en "New Project"
- [ ] Nombre: `sanatorio-app`
- [ ] Elegí una contraseña fuerte
- [ ] Seleccioné región: South America
- [ ] Esperé 2-3 minutos a que se creara

### Configurar Base de Datos
- [ ] Fui a "SQL Editor" en Supabase
- [ ] Click en "New query"
- [ ] Abrí el archivo `supabase-setup.sql`
- [ ] Copié TODO el contenido del archivo
- [ ] Lo pegué en el editor de Supabase
- [ ] Click en "Run"
- [ ] Vi el mensaje "Success. No rows returned"

### Obtener Credenciales
- [ ] Fui a "Settings" > "API"
- [ ] Copié el "Project URL"
- [ ] Copié la "anon public key"
- [ ] Guardé ambas en un lugar seguro

## 🔐 Variables de Entorno

- [ ] Creé el archivo `.env` en la raíz del proyecto
- [ ] Copié el contenido de `.env.example`
- [ ] Pegué mi Project URL de Supabase
- [ ] Pegué mi anon key de Supabase
- [ ] Guardé el archivo `.env`
- [ ] NO subí el archivo `.env` a GitHub

## 🚀 Primera Ejecución

### Iniciar Servidor Local
- [ ] Ejecuté `npm run dev` en la terminal
- [ ] Vi el mensaje "ready in XXX ms"
- [ ] Vi la URL: http://localhost:3000/
- [ ] No hubo errores rojos en la terminal

### Abrir en Navegador
- [ ] Abrí Chrome o Edge
- [ ] Fui a `localhost:3000`
- [ ] La página cargó correctamente
- [ ] Veo el header "Sistema de Sanatorio"
- [ ] Los botones son visibles y clickeables

## 🧪 Prueba de Funcionalidad

### Crear Paciente
- [ ] Click en botón "Nuevo"
- [ ] Se abrió el modal
- [ ] Llené el formulario del paciente
- [ ] Seleccioné departamento y municipio
- [ ] Llené el formulario del médico
- [ ] Click en "Guardar"
- [ ] El paciente se guardó correctamente
- [ ] Veo la información del paciente en pantalla

### Agregar Estudio
- [ ] Seleccioné "Tipo de Cobro"
- [ ] Seleccioné un "Estudio"
- [ ] Seleccioné un "Sub-Estudio"
- [ ] Click en "Agregar a Descripción"
- [ ] El estudio aparece en la sección Descripción
- [ ] El precio es correcto según el tipo de cobro

### Completar Consulta
- [ ] Configuré la facturación (Sí/No)
- [ ] Si elegí factura, ingresé NIT
- [ ] Seleccioné forma de pago
- [ ] Los totales se calculan correctamente
- [ ] Click en "Imprimir"
- [ ] La consulta se guardó en Supabase

### Verificar en Supabase
- [ ] Fui a Supabase > Table Editor
- [ ] Abrí la tabla "pacientes"
- [ ] Veo el paciente que creé
- [ ] Abrí la tabla "consultas"
- [ ] Veo la consulta que creé
- [ ] Los datos son correctos

## 🌐 Deployment (Opcional)

### Preparar Git
- [ ] Ejecuté `git init`
- [ ] Ejecuté `git add .`
- [ ] Ejecuté `git commit -m "Initial commit"`
- [ ] No incluí el archivo `.env` en el commit

### GitHub
- [ ] Creé un repositorio en GitHub
- [ ] Conecté mi proyecto local con GitHub
- [ ] Subí mi código con `git push`
- [ ] Puedo ver mi código en GitHub

### Vercel
- [ ] Fui a https://vercel.com
- [ ] Me registré con GitHub
- [ ] Importé mi repositorio
- [ ] Agregué las variables de entorno
- [ ] Click en "Deploy"
- [ ] Esperé a que terminara el deployment
- [ ] Mi app está en línea
- [ ] La URL de Vercel funciona correctamente

## 🎯 Verificación Final

- [ ] La app funciona en local (`localhost:3000`)
- [ ] Puedo crear pacientes
- [ ] Puedo seleccionar médicos referentes
- [ ] Los estudios se cargan correctamente
- [ ] Los precios cambian según tipo de cobro
- [ ] La facturación funciona
- [ ] Las consultas se guardan en Supabase
- [ ] Si hice deploy, la app funciona en Vercel
- [ ] No hay errores en la consola del navegador
- [ ] La app es responsiva (funciona en móvil)

## 📝 Notas

### Si algo NO funciona:

1. **Revisa la consola del navegador** (F12)
2. **Revisa la terminal de VS Code** para errores
3. **Verifica el archivo .env** tiene las credenciales correctas
4. **Verifica Supabase** que las tablas existan
5. **Reinicia todo**: Ctrl+C en terminal, luego `npm run dev`
6. **Reinstala dependencias**: `npm cache clean --force` y luego `npm install`

### Archivos Importantes

- ✅ `.env` - Variables de entorno (NO SUBIR A GIT)
- ✅ `supabase-setup.sql` - Script de base de datos
- ✅ `package.json` - Dependencias del proyecto
- ✅ `README.md` - Documentación completa
- ✅ `GUIA-RAPIDA.md` - Guía de inicio rápido
- ✅ `GUIA-WINDOWS.md` - Guía específica para Windows

## 🎉 ¡Felicidades!

Si marcaste todas las casillas, tu sistema está completamente funcional.

### Próximos Pasos

1. Personaliza los colores en `tailwind.config.js`
2. Agrega más estudios en Supabase
3. Agrega más médicos referentes
4. Prueba todas las funcionalidades
5. Capacita a los usuarios finales

---

**Fecha de instalación**: _______________

**Instalado por**: _______________

**Versión**: 1.0.0

**Notas adicionales**:
_____________________________________________
_____________________________________________
_____________________________________________
