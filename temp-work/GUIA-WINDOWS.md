# 💻 Guía para Windows + Visual Studio Code

## Requisitos Previos

### 1. Instalar Node.js

1. Ve a: https://nodejs.org/
2. Descarga la versión LTS (recomendada)
3. Ejecuta el instalador
4. Acepta todo (Next, Next, Install)
5. Espera a que termine
6. Reinicia tu computadora

### 2. Verificar Instalación

1. Presiona `Windows + R`
2. Escribe `cmd` y presiona Enter
3. En la ventana negra, escribe:
```bash
node --version
```
Debe mostrar algo como: `v18.19.0`

4. Luego escribe:
```bash
npm --version
```
Debe mostrar algo como: `10.2.3`

### 3. Instalar Visual Studio Code

1. Ve a: https://code.visualstudio.com/
2. Click en "Download for Windows"
3. Ejecuta el instalador
4. Acepta todo
5. **IMPORTANTE**: Marca "Add to PATH"
6. Instala

## Abrir el Proyecto

### Opción 1: Arrastrar y Soltar

1. Abre Visual Studio Code
2. Arrastra la carpeta `sanatorio-app` a la ventana de VS Code

### Opción 2: Desde VS Code

1. Abre Visual Studio Code
2. Click en "File" > "Open Folder"
3. Busca la carpeta `sanatorio-app`
4. Click "Select Folder"

## Abrir la Terminal en VS Code

1. En VS Code, presiona: `Ctrl + Ñ` (o `Ctrl + '`)
2. O ve a: "Terminal" > "New Terminal"
3. Debe aparecer una terminal en la parte de abajo

**Nota**: Si aparece PowerShell (color azul), está bien. Si aparece CMD, también está bien.

## Instalar Dependencias

En la terminal de VS Code, escribe:

```bash
npm install
```

Presiona Enter y espera. Verás muchas líneas de texto. Es normal.

**Tiempo estimado**: 2-5 minutos dependiendo de tu internet.

## Configurar Supabase

Sigue la "GUIA-RAPIDA.md" desde el Paso 2.

## Ejecutar el Proyecto

En la terminal de VS Code:

```bash
npm run dev
```

Verás algo como:

```
  VITE v5.0.12  ready in 523 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Abrir en el Navegador

**Opción 1**: Presiona `Ctrl` y click en el link `http://localhost:3000/`

**Opción 2**: Abre Chrome/Edge y escribe: `localhost:3000`

## Problemas Comunes en Windows

### Error: "npm no se reconoce como comando"

**Solución**:
1. Cierra VS Code
2. Reinicia tu computadora
3. Abre VS Code de nuevo
4. Intenta otra vez

### Error: "Cannot find module"

**Solución**:
```bash
npm cache clean --force
npm install
```

### Error: "Puerto 3000 en uso"

**Solución**:
```bash
npm run dev -- --port 3001
```
Luego abre: `localhost:3001`

### Error: "Permission denied"

**Solución**:
1. Cierra VS Code
2. Click derecho en VS Code
3. "Ejecutar como administrador"
4. Abre el proyecto
5. Intenta de nuevo

### La terminal muestra errores rojos

**Solución**:
1. Copia el error completo
2. Busca en Google: "npm [tu error]"
3. O revisa que hayas seguido todos los pasos

## Comandos Útiles en Windows

### Limpiar la Terminal
```bash
cls
```

### Ver qué está corriendo en un puerto
```bash
netstat -ano | findstr :3000
```

### Detener el servidor
Presiona: `Ctrl + C` en la terminal

## Atajos de VS Code en Windows

- `Ctrl + Ñ`: Abrir/Cerrar terminal
- `Ctrl + B`: Mostrar/Ocultar barra lateral
- `Ctrl + S`: Guardar archivo
- `Ctrl + P`: Buscar archivo
- `Ctrl + Shift + P`: Paleta de comandos
- `Alt + ↑/↓`: Mover línea arriba/abajo
- `Ctrl + /`: Comentar/Descomentar línea

## Extensiones Recomendadas de VS Code

1. Abre VS Code
2. Click en el ícono de extensiones (cuadrado con 4 partes)
3. Busca e instala:
   - **ES7+ React/Redux**: Snippets de React
   - **Tailwind CSS IntelliSense**: Autocompletado de Tailwind
   - **Error Lens**: Ver errores en línea
   - **Auto Rename Tag**: Renombrar tags HTML
   - **Prettier**: Formatear código

## Configurar Git en Windows

### Instalar Git

1. Ve a: https://git-scm.com/download/win
2. Descarga e instala
3. Acepta todo (opciones por defecto)

### Configurar Git

Abre la terminal de VS Code:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tuemail@ejemplo.com"
```

### Verificar
```bash
git --version
```

## Subir a GitHub desde Windows

### 1. Crear Repositorio en GitHub

1. Ve a: https://github.com
2. Crea cuenta o inicia sesión
3. Click "+" arriba a la derecha > "New repository"
4. Nombre: `sanatorio-app`
5. Click "Create repository"

### 2. Conectar tu Proyecto

En la terminal de VS Code:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/sanatorio-app.git
git push -u origin main
```

**Nota**: Reemplaza `TU-USUARIO` con tu usuario de GitHub.

## Desplegar en Vercel desde Windows

1. Ve a: https://vercel.com
2. Click "Sign Up"
3. Selecciona "Continue with GitHub"
4. Autoriza Vercel
5. Click "Add New..." > "Project"
6. Busca `sanatorio-app`
7. Click "Import"
8. En "Environment Variables":
   - Click "Add"
   - Name: `VITE_SUPABASE_URL`
   - Value: (pega tu URL de Supabase)
   - Click "Add"
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: (pega tu key de Supabase)
9. Click "Deploy"
10. Espera 2-3 minutos

¡Listo! Tu app está en línea.

## Actualizar el Código en Vercel

Cada vez que hagas cambios:

```bash
git add .
git commit -m "Descripción de cambios"
git push
```

Vercel automáticamente detectará los cambios y actualizará tu app.

## Herramientas de Desarrollo en Windows

### Ver la Consola del Navegador

1. Abre tu app en Chrome/Edge
2. Presiona `F12`
3. Ve a la pestaña "Console"
4. Aquí verás errores de JavaScript

### Ver Requests de Red

1. Presiona `F12`
2. Ve a la pestaña "Network"
3. Recarga la página
4. Verás todas las peticiones HTTP

### Inspeccionar Elementos

1. Click derecho en cualquier elemento
2. "Inspeccionar elemento"
3. Puedes ver y modificar el HTML/CSS en vivo

## Consejos para Windows

1. **Usa Chrome o Edge** para desarrollo (mejor soporte)
2. **Desactiva antivirus temporalmente** si npm instala muy lento
3. **Usa Windows Terminal** (más moderno que CMD)
4. **Mantén Windows actualizado**
5. **Ten al menos 8GB de RAM** para desarrollo web
6. **Usa SSD** para que npm instale más rápido

## Recursos Adicionales

- **Node.js**: https://nodejs.org/
- **VS Code**: https://code.visualstudio.com/
- **Git para Windows**: https://git-scm.com/
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/

---

¡Éxito con tu desarrollo en Windows! 💪
