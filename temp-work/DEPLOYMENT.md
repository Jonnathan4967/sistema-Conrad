# 🚀 Guía de Despliegue en Vercel

## Paso 1: Preparar el Proyecto

Asegúrate de tener el proyecto listo localmente y que funcione con `npm run dev`.

## Paso 2: Subir a GitHub (Recomendado)

1. Crea un repositorio en GitHub
2. Sube tu proyecto:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/sanatorio-app.git
git push -u origin main
```

## Paso 3: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Click en **"Add New Project"**
3. **Import** tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Vite + React

## Paso 4: Configurar Variables de Entorno

**MUY IMPORTANTE**: Antes de desplegar, agrega las variables de entorno:

1. En la página de configuración del proyecto en Vercel
2. Ve a **"Environment Variables"**
3. Agrega estas dos variables:

```
VITE_SUPABASE_URL
```
Valor: `https://nxriabmtucfacbtjreuh.supabase.co`

```
VITE_SUPABASE_ANON_KEY
```
Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cmlhYm10dWNmYWNidGpyZXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzg1NzAsImV4cCI6MjA4NDY1NDU3MH0.VFSVmLzTqGd7SAFKk5fL4rilCgiSYLHFmPNNHBqDapQ`

4. Asegúrate de seleccionar **"Production", "Preview" y "Development"** para cada variable

## Paso 5: Configuración de Build

Vercel debería detectar automáticamente:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Si no, configúralos manualmente.

## Paso 6: Deploy

1. Click en **"Deploy"**
2. Espera 1-2 minutos
3. ¡Tu app estará en línea!

## 🔧 Si el Build Falla

### Error: "Build failed"

**Solución 1**: Verifica que agregaste las variables de entorno

**Solución 2**: Ve a Settings → General → Node.js Version y selecciona `18.x` o `20.x`

**Solución 3**: Si hay errores de TypeScript, ve a `tsconfig.json` y cambia:
```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "strict": false
  }
}
```

### Error: "Module not found"

Asegúrate que todas las dependencias están en `package.json`:
```bash
npm install
```

### Error de variables de entorno

Las variables DEBEN empezar con `VITE_` para ser accesibles en el frontend.

## 📱 Acceder a tu App

Después del deploy, Vercel te dará una URL como:
```
https://sanatorio-app-xxx.vercel.app
```

## 🔄 Actualizaciones Automáticas

Cada vez que hagas `git push` a tu repositorio, Vercel automáticamente:
1. Detecta el cambio
2. Construye la nueva versión
3. La despliega

## 🌐 Dominio Personalizado (Opcional)

1. Ve a Settings → Domains
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones de Vercel

## ⚡ Optimizaciones

Tu proyecto ya está configurado con:
- ✅ Compresión automática
- ✅ CDN global
- ✅ HTTPS automático
- ✅ Caché optimizado

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs de build en Vercel
2. Verifica que las variables de entorno estén configuradas
3. Asegúrate que el proyecto funciona localmente con `npm run build && npm run preview`
