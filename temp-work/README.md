# Sistema de Sanatorio

Sistema web para gestión de consultas médicas, pacientes y estudios clínicos.

## 🚀 Características

- ✅ Gestión de pacientes y médicos referentes
- ✅ Catálogo de estudios y sub-estudios médicos
- ✅ Tres tipos de cobro: Normal, Social y Especial
- ✅ Control de horarios para tipo de cobro
- ✅ Facturación con NIT
- ✅ Múltiples formas de pago
- ✅ Reportes y estadísticas
- ✅ Base de datos en Supabase
- ✅ Diseño responsivo con Tailwind CSS

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta en Supabase (gratis)
- Git instalado
- Visual Studio Code (recomendado)

## 🛠️ Configuración Inicial

### 1. Clonar o Descargar el Proyecto

Si tienes el proyecto en una carpeta, ábrelo en Visual Studio Code.

### 2. Instalar Dependencias

Abre una terminal en VS Code (Terminal > Nueva Terminal) y ejecuta:

```bash
npm install
```

### 3. Configurar Supabase

#### 3.1 Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Llena los datos:
   - Name: sanatorio-app
   - Database Password: (guarda esta contraseña)
   - Region: South America (más cercano a Guatemala)
5. Click en "Create new project" y espera 2-3 minutos

#### 3.2 Configurar la Base de Datos

1. En tu proyecto de Supabase, ve a "SQL Editor" en el menú lateral
2. Click en "New query"
3. Copia TODO el contenido del archivo `supabase-setup.sql`
4. Pégalo en el editor
5. Click en "Run" para ejecutar el script
6. Verifica que aparezca "Success. No rows returned"

#### 3.3 Obtener las Credenciales

1. Ve a "Settings" > "API" en el menú lateral de Supabase
2. Copia el "Project URL"
3. Copia el "anon public" key (en Project API keys)

### 4. Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo llamado `.env`
2. Copia el contenido de `.env.example` y pégalo en `.env`
3. Reemplaza los valores con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

## 🏃‍♂️ Ejecutar en Local

### Modo Desarrollo

En la terminal de VS Code, ejecuta:

```bash
npm run dev
```

La aplicación estará disponible en: `http://localhost:3000`

### Probar la Aplicación

1. Abre tu navegador en `http://localhost:3000`
2. Click en "Nuevo" para agregar un paciente
3. Llena el formulario y guarda
4. Selecciona estudios y agrega a la descripción
5. Completa la facturación y presiona "Imprimir"

## 📦 Preparar para Vercel

### 1. Crear Repositorio en GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/sanatorio-app.git
git push -u origin main
```

### 2. Deployar en Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con GitHub
3. Click en "Add New..." > "Project"
4. Importa tu repositorio
5. En "Environment Variables" agrega:
   - `VITE_SUPABASE_URL`: tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY`: tu clave anon de Supabase
6. Click en "Deploy"
7. Espera 2-3 minutos

¡Listo! Tu aplicación estará en: `https://tu-proyecto.vercel.app`

## 🗂️ Estructura del Proyecto

```
sanatorio-app/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Autocomplete.tsx
│   │   └── NuevoPacienteModal.tsx
│   ├── pages/              # Páginas de la aplicación
│   │   └── HomePage.tsx
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts
│   ├── lib/                # Configuraciones
│   │   └── supabase.ts
│   ├── data/               # Datos estáticos
│   │   └── guatemala.ts
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── public/                 # Archivos públicos
├── supabase-setup.sql      # Script de base de datos
├── .env                    # Variables de entorno (NO SUBIR A GIT)
├── .env.example            # Ejemplo de variables
├── package.json            # Dependencias
├── vite.config.ts          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind
└── tsconfig.json           # Configuración de TypeScript
```

## 🔧 Comandos Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Construir para producción
npm run preview  # Vista previa de la build
npm run lint     # Verificar código
```

## 📝 Notas Importantes

### Horarios de Cobro

- **Normal**: Lunes-Viernes 7am-4pm, Sábado 7am-11am
- **Social**: Disponible siempre (pacientes de instituciones públicas)
- **Especial**: Fuera del horario normal

### Departamentos y Municipios

El sistema incluye todos los departamentos y municipios principales de Guatemala. Puedes agregar más en `src/data/guatemala.ts`.

### Agregar Estudios y Sub-Estudios

1. Ve a Supabase > Table Editor
2. Selecciona `estudios` o `sub_estudios`
3. Click en "Insert row"
4. Llena los campos y guarda

### Agregar Médicos Referentes

1. Ve a Supabase > Table Editor
2. Selecciona `medicos`
3. Click en "Insert row"
4. Llena los campos, marca `es_referente` como `true`
5. Guarda

## 🐛 Solución de Problemas

### Error: "Cannot find module"

```bash
npm install
```

### Error de Supabase

- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de haber ejecutado el script SQL
- Revisa que las políticas RLS estén configuradas

### La aplicación no carga

- Verifica que el servidor esté corriendo (`npm run dev`)
- Revisa la consola del navegador (F12) para ver errores
- Asegúrate de estar en `http://localhost:3000`

### Error al hacer deploy en Vercel

- Verifica que las variables de entorno estén configuradas
- Asegúrate de que el build funcione localmente (`npm run build`)
- Revisa los logs de Vercel para más detalles

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola del navegador (F12)
2. Revisa los logs de Supabase
3. Verifica que todas las dependencias estén instaladas
4. Asegúrate de tener la última versión de Node.js

## 🔒 Seguridad

- **NUNCA** subas el archivo `.env` a Git
- Las credenciales de Supabase son sensibles
- En producción, configura políticas RLS más restrictivas
- Considera agregar autenticación de usuarios

## 📄 Licencia

Este proyecto es de uso interno del sanatorio.

---

Desarrollado con ❤️ para mejorar la gestión del sanatorio
