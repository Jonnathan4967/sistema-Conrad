# 📦 MÓDULOS INVENTARIO Y CONTABILIDAD - GUÍA DE IMPLEMENTACIÓN

## ✅ LO QUE YA ESTÁ LISTO

### 1. **Base de Datos**
- ✅ `inventario-setup.sql` - Todas las tablas de inventario
- ✅ `contabilidad-setup.sql` - Todas las tablas de contabilidad
- ✅ Tipos TypeScript actualizados en `/src/types/index.ts`
- ✅ Dashboard habilitado con los 2 nuevos módulos

### 2. **Estructura de Tablas**

**INVENTARIO:**
- `categorias_inventario` - Categorías de productos
- `proveedores` - Proveedores de insumos
- `productos_inventario` - Catálogo de productos
- `movimientos_inventario` - Entradas/salidas/ajustes

**CONTABILIDAD:**
- `cuentas_contables` - Catálogo de cuentas
- `gastos_operativos` - Registro de gastos
- `cuentas_por_cobrar` - Control de créditos
- `abonos_cuentas` - Pagos parciales
- `asientos_contables` - Contabilidad formal

---

## 🚀 PASOS PARA COMPLETAR

### PASO 1: Ejecutar SQL en Supabase

```bash
1. Ve a tu proyecto Supabase
2. SQL Editor > New query
3. Copia el contenido de inventario-setup.sql
4. Click en RUN
5. Repite con contabilidad-setup.sql
```

### PASO 2: Crear Páginas del Módulo Inventario

Necesitas crear estos archivos en `/src/pages/`:

**InventarioHomePage.tsx**
- Dashboard del módulo
- Cards con: Stock bajo, Movimientos recientes, Valor total inventario
- Botones de navegación a otras páginas

**ProductosInventarioPage.tsx**
- Lista de todos los productos
- Filtrar por categoría
- Búsqueda por nombre/código
- Botones: Agregar, Editar, Ver detalles
- Indicador visual de stock bajo (badge rojo)

**MovimientosPage.tsx**
- Registrar entrada de mercancía
- Registrar salida (consumo)
- Ajustes de inventario
- Registro de mermas
- Historial de movimientos

**ProveedoresPage.tsx**
- Lista de proveedores
- CRUD completo (Crear, Leer, Actualizar, Eliminar)

**ReportesInventarioPage.tsx**
- Stock actual valorizado
- Productos con stock bajo
- Movimientos por fecha
- Exportar a Excel

---

### PASO 3: Crear Páginas del Módulo Contabilidad

**ContabilidadHomePage.tsx**
- Dashboard financiero
- Cards: Ingresos del mes, Gastos del mes, Utilidad neta
- Gráfico de ingresos vs gastos
- Cuentas por cobrar vencidas

**GastosPage.tsx**
- Registrar nuevo gasto
- Lista de gastos por fecha
- Filtrar por categoría
- Exportar para SAT

**CuentasPorCobrarPage.tsx**
- Lista de cuentas pendientes
- Registrar abonos
- Ver historial de pagos
- Alertas de cuentas vencidas

**EstadoResultadosPage.tsx**
- Reporte mensual/anual
- Ingresos, Gastos, Utilidad
- Gráficos comparativos
- Exportar a PDF

**LibroVentasPage.tsx**
- Todas las consultas facturadas
- Filtrar por fecha
- Calcular IVA
- Exportar para SAT

---

## 📝 PLANTILLA DE PÁGINA (Ejemplo)

```tsx
// ProductosInventarioPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductoInventario } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks';

interface ProductosInventarioPageProps {
  onBack: () => void;
}

export const ProductosInventarioPage: React.FC<ProductosInventarioPageProps> = ({ onBack }) => {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos_inventario')
        .select(`
          *,
          categorias_inventario(nombre)
        `)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error:', error);
      showToast('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullScreen text="Cargando productos..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <button onClick={onBack} className="text-blue-600 hover:text-blue-700 mb-2">
                ← Volver
              </button>
              <h1 className="text-2xl font-bold">Productos de Inventario</h1>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productosFiltrados.map((producto) => (
                <tr key={producto.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {producto.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {producto.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {producto.categorias_inventario?.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded ${
                      producto.stock_actual <= producto.stock_minimo
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {producto.stock_actual} {producto.unidad_medida}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Editar
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  );
};
```

---

## 🔗 ACTUALIZAR App.tsx

Agrega las rutas de los nuevos módulos:

```tsx
// En App.tsx

// Importar las nuevas páginas
import { InventarioHomePage } from './pages/InventarioHomePage';
import { ProductosInventarioPage } from './pages/ProductosInventarioPage';
import { ContabilidadHomePage } from './pages/ContabilidadHomePage';
// ... etc

// En el render, agregar casos:
if (currentModule === 'inventario') {
  switch (currentPage) {
    case 'home':
      return <InventarioHomePage onNavigate={setCurrentPage} />;
    case 'productos':
      return <ProductosInventarioPage onBack={() => setCurrentPage('home')} />;
    case 'movimientos':
      return <MovimientosPage onBack={() => setCurrentPage('home')} />;
    // ... más páginas
    default:
      return <InventarioHomePage onNavigate={setCurrentPage} />;
  }
}

if (currentModule === 'contabilidad') {
  switch (currentPage) {
    case 'home':
      return <ContabilidadHomePage onNavigate={setCurrentPage} />;
    case 'gastos':
      return <GastosPage onBack={() => setCurrentPage('home')} />;
    // ... más páginas
    default:
      return <ContabilidadHomePage onNavigate={setCurrentPage} />;
  }
}
```

---

## 📊 FUNCIONALIDADES CLAVE

### Inventario:
1. ✅ Alertas automáticas de stock bajo
2. ✅ Trigger que actualiza stock al registrar movimiento
3. ✅ Valorización de inventario en tiempo real
4. ✅ Historial completo de movimientos
5. ✅ Control de lotes y vencimientos

### Contabilidad:
1. ✅ Integración automática con consultas (ingresos)
2. ✅ Estado de resultados automático
3. ✅ Control de cuentas por cobrar con alertas
4. ✅ Catálogo de cuentas guatemalteco
5. ✅ Reportes para SAT

---

## 🎯 PRÓXIMOS PASOS

1. Ejecuta los 2 archivos SQL en Supabase
2. Crea las páginas usando la plantilla de ejemplo
3. Prueba cada funcionalidad
4. Mañana me dices qué ajustar

**El ZIP incluye:**
- ✅ SQL completo
- ✅ Tipos actualizados
- ✅ Dashboard habilitado
- ✅ Todas las mejoras anteriores (Toast, validaciones, etc)

¿Alguna duda antes de que te vayas a dormir? 😴
