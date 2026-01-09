import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  Layers,
  Package,
  Box,
  Folder,
  File,
  Tag,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink
} from "lucide-react";

export default function ArbolProducto() {
  // Datos de ejemplo basados en tu archivo ProteinasDesglosadas.xlsx
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para vista de árbol
  const [expandedNodes, setExpandedNodes] = useState(new Set(['1', '100', '10000']));
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedNivel, setSelectedNivel] = useState("todos");
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [busquedaRapida, setBusquedaRapida] = useState("");
  
  // Estados para modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Función para formatear el código con puntos
  const formatearCodigo = (codigo, nivel) => {
    // Eliminar puntos existentes si los hay
    const codigoLimpio = codigo.replace(/\./g, '');
    
    switch(nivel) {
      case 1:
        return codigoLimpio;
      case 2:
        return `${codigoLimpio.slice(0, 1)}.${codigoLimpio.slice(1).padStart(2, '0')}`;
      case 3:
        return `${codigoLimpio.slice(0, 1)}.${codigoLimpio.slice(1, 3).padStart(2, '0')}.${codigoLimpio.slice(3).padStart(2, '0')}`;
      case 4:
        return `${codigoLimpio.slice(0, 1)}.${codigoLimpio.slice(1, 3).padStart(2, '0')}.${codigoLimpio.slice(3, 5).padStart(2, '0')}.${codigoLimpio.slice(5).padStart(3, '0')}`;
      case 5:
        return `${codigoLimpio.slice(0, 1)}.${codigoLimpio.slice(1, 3).padStart(2, '0')}.${codigoLimpio.slice(3, 5).padStart(2, '0')}.${codigoLimpio.slice(5, 8).padStart(3, '0')}.${codigoLimpio.slice(8).padStart(2, '0')}`;
      default:
        return codigoLimpio;
    }
  };

  // Datos de ejemplo - Estructura jerárquica actualizada con nivel 5 para presentaciones
  const datosEjemplo = {
    categorias: [
      // Nivel 1
      { id: '1', codigo: '1', nombre: 'MATERIA PRIMA', nivel: 1, padre_id: null, tipo: 'categoria', activo: true, productos_count: 245 },
      { id: '2', codigo: '2', nombre: 'DESECHABLES / PRODUCTOS DE ASEO', nivel: 1, padre_id: null, tipo: 'categoria', activo: true, productos_count: 87 },
      
      // Nivel 2 - Hijos de MATERIA PRIMA (1)
      { id: '100', codigo: '100', nombre: 'PROTEINAS', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 42 },
      { id: '101', codigo: '101', nombre: 'LACTEOS', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 18 },
      { id: '102', codigo: '102', nombre: 'FRUTAS Y VERDURAS', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 56 },
      { id: '103', codigo: '103', nombre: 'ABARROTES', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 89 },
      { id: '104', codigo: '104', nombre: 'PANADERIA', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 23 },
      { id: '105', codigo: '105', nombre: 'BEBIDAS', nivel: 2, padre_id: '1', tipo: 'categoria', activo: true, productos_count: 17 },
      
      // Nivel 3 - Hijos de PROTEINAS (100)
      { id: '10000', codigo: '10000', nombre: 'CARNES DE RES', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 25 },
      { id: '10001', codigo: '10001', nombre: 'CARNES DE PESCADO', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 8 },
      { id: '10002', codigo: '10002', nombre: 'CARNE DE CERDO', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 12 },
      { id: '10003', codigo: '10003', nombre: 'CARNE DE POLLO', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 15 },
      { id: '10004', codigo: '10004', nombre: 'OTRAS CARNES', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 5 },
      { id: '10005', codigo: '10005', nombre: 'MARISCOS', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 10 },
      { id: '10006', codigo: '10006', nombre: 'HUEVOS', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 3 },
      { id: '10007', codigo: '10007', nombre: 'EMBUTIDOS', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 20 },
      { id: '10008', codigo: '10008', nombre: 'VISCERAS', nivel: 3, padre_id: '100', tipo: 'categoria', activo: true, productos_count: 7 },
      
      // Nivel 4 - Productos finales (algunos ejemplos de CARNES DE RES)
      { id: '10000000', codigo: '10000000', nombre: 'STEAK DE RES', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000001', codigo: '10000001', nombre: 'CARNE MOLIDA', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000002', codigo: '10000002', nombre: 'COSTILLA DE RES', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000003', codigo: '10000003', nombre: 'GOULASH DE RES', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000004', codigo: '10000004', nombre: 'CARNE DE HAMBURGUESA', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000005', codigo: '10000005', nombre: 'JULIANA DE RES', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000006', codigo: '10000006', nombre: 'SOBREBARRIGA', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000007', codigo: '10000007', nombre: 'LOMO FINO DE RES', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      { id: '10000008', codigo: '10000008', nombre: 'MUCHACHO', nivel: 4, padre_id: '10000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'kg', stock_actual: 0, stock_minimo: 0 },
      
      // Nivel 5 - Presentaciones específicas para stock (diferentes tamaños/presentaciones)
      // Para STEAK DE RES (10000000)
      { id: '1000000000', codigo: '1000000000', nombre: 'STEAK DE RES - PAQUETE 5KG', nivel: 5, padre_id: '10000000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'paquete', stock_actual: 15, stock_minimo: 5, precio_unitario: 85000, peso_neto: 5 },
      { id: '1000000001', codigo: '1000000001', nombre: 'STEAK DE RES - PAQUETE 2KG', nivel: 5, padre_id: '10000000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'paquete', stock_actual: 28, stock_minimo: 10, precio_unitario: 35000, peso_neto: 2 },
      { id: '1000000002', codigo: '1000000002', nombre: 'STEAK DE RES - PAQUETE 500G', nivel: 5, padre_id: '10000000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'paquete', stock_actual: 45, stock_minimo: 20, precio_unitario: 9000, peso_neto: 0.5 },
      { id: '1000000003', codigo: '1000000003', nombre: 'STEAK DE RES - CAJA 10KG', nivel: 5, padre_id: '10000000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'caja', stock_actual: 8, stock_minimo: 3, precio_unitario: 165000, peso_neto: 10 },
      
      // Para CARNE MOLIDA (10000001)
      { id: '1000000100', codigo: '1000000100', nombre: 'CARNE MOLIDA - BANDEJA 1KG', nivel: 5, padre_id: '10000001', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'bandeja', stock_actual: 32, stock_minimo: 15, precio_unitario: 16500, peso_neto: 1 },
      { id: '1000000101', codigo: '1000000101', nombre: 'CARNE MOLIDA - BANDEJA 500G', nivel: 5, padre_id: '10000001', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'bandeja', stock_actual: 50, stock_minimo: 25, precio_unitario: 8500, peso_neto: 0.5 },
      { id: '1000000102', codigo: '1000000102', nombre: 'CARNE MOLIDA - BOLSA 5KG', nivel: 5, padre_id: '10000001', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'bolsa', stock_actual: 12, stock_minimo: 5, precio_unitario: 75000, peso_neto: 5 },
      { id: '1000000103', codigo: '1000000103', nombre: 'CARNE MOLIDA - BOLSA 2KG', nivel: 5, padre_id: '10000001', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'bolsa', stock_actual: 18, stock_minimo: 8, precio_unitario: 31000, peso_neto: 2 },
      
      // Para COSTILLA DE RES (10000002)
      { id: '1000000200', codigo: '1000000200', nombre: 'COSTILLA DE RES - PACK 3KG', nivel: 5, padre_id: '10000002', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'pack', stock_actual: 14, stock_minimo: 6, precio_unitario: 43500, peso_neto: 3 },
      { id: '1000000201', codigo: '1000000201', nombre: 'COSTILLA DE RES - PACK 1.5KG', nivel: 5, padre_id: '10000002', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'pack', stock_actual: 22, stock_minimo: 10, precio_unitario: 22000, peso_neto: 1.5 },
      { id: '1000000202', codigo: '1000000202', nombre: 'COSTILLA DE RES - PACK 500G', nivel: 5, padre_id: '10000002', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'pack', stock_actual: 30, stock_minimo: 15, precio_unitario: 7500, peso_neto: 0.5 },
      
      // Para GOULASH DE RES (10000003)
      { id: '1000000300', codigo: '1000000300', nombre: 'GOULASH DE RES - PAQUETE 2KG', nivel: 5, padre_id: '10000003', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'paquete', stock_actual: 20, stock_minimo: 8, precio_unitario: 31000, peso_neto: 2 },
      { id: '1000000301', codigo: '1000000301', nombre: 'GOULASH DE RES - PAQUETE 1KG', nivel: 5, padre_id: '10000003', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'paquete', stock_actual: 35, stock_minimo: 15, precio_unitario: 15500, peso_neto: 1 },
      
      // Para LOMO FINO DE RES (10000007)
      { id: '1000000700', codigo: '1000000700', nombre: 'LOMO FINO - PIEZA 2.5KG', nivel: 5, padre_id: '10000007', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'pieza', stock_actual: 10, stock_minimo: 4, precio_unitario: 62500, peso_neto: 2.5 },
      { id: '1000000701', codigo: '1000000701', nombre: 'LOMO FINO - PIEZA 1KG', nivel: 5, padre_id: '10000007', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'pieza', stock_actual: 18, stock_minimo: 8, precio_unitario: 25000, peso_neto: 1 },
      
      // Para otros productos (ejemplo de LACTEOS)
      { id: '10100000', codigo: '10100000', nombre: 'LECHE ENTERA', nivel: 4, padre_id: '101', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'litro', stock_actual: 0, stock_minimo: 0 },
      { id: '1010000000', codigo: '1010000000', nombre: 'LECHE ENTERA - CAJA 1L', nivel: 5, padre_id: '10100000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'caja', stock_actual: 40, stock_minimo: 20, precio_unitario: 3500, volumen: 1 },
      { id: '1010000001', codigo: '1010000001', nombre: 'LECHE ENTERA - CAJA 500ML', nivel: 5, padre_id: '10100000', tipo: 'producto', activo: true, maneja_stock: true, unidad: 'caja', stock_actual: 60, stock_minimo: 30, precio_unitario: 1900, volumen: 0.5 },
    ],
    
    productosDetalle: [
      // Estos son detalles adicionales para los productos nivel 4
      { id: '10000000', codigo_arbol: '10000000', nombre: 'STEAK DE RES', categoria_id: '10000', unidad_medida: 'kg', maneja_stock: true, activo: true, precio_referencia: 18500, proveedor_principal: 'Carnes Premium SA' },
      { id: '10000001', codigo_arbol: '10000001', nombre: 'CARNE MOLIDA', categoria_id: '10000', unidad_medida: 'kg', maneja_stock: true, activo: true, precio_referencia: 16500, proveedor_principal: 'Distribuciones Cárnicas' },
      { id: '10000002', codigo_arbol: '10000002', nombre: 'COSTILLA DE RES', categoria_id: '10000', unidad_medida: 'kg', maneja_stock: true, activo: true, precio_referencia: 14500, proveedor_principal: 'Carnes del Valle' },
      { id: '10000003', codigo_arbol: '10000003', nombre: 'GOULASH DE RES', categoria_id: '10000', unidad_medida: 'kg', maneja_stock: true, activo: true, precio_referencia: 15500, proveedor_principal: 'Procesados Cárnicos' },
      // Detalles para nivel 5
      { id: '1000000000', codigo_arbol: '1000000000', nombre: 'STEAK DE RES - PAQUETE 5KG', categoria_id: '10000', unidad_medida: 'paquete', maneja_stock: true, activo: true, precio_referencia: 85000, proveedor_principal: 'Carnes Premium SA' },
      { id: '1000000100', codigo_arbol: '1000000100', nombre: 'CARNE MOLIDA - BANDEJA 1KG', categoria_id: '10000', unidad_medida: 'bandeja', maneja_stock: true, activo: true, precio_referencia: 16500, proveedor_principal: 'Distribuciones Cárnicas' },
    ]
  };

  useEffect(() => {
    // Simular carga de datos
    setLoading(true);
    setTimeout(() => {
      setCategorias(datosEjemplo.categorias);
      setProductos(datosEjemplo.productosDetalle);
      setLoading(false);
    }, 500);
  }, []);

  // Función para construir el árbol
  const buildTree = () => {
    const itemMap = new Map();
    const roots = [];
    
    // Agregar todos los items al mapa
    datosEjemplo.categorias.forEach(item => {
      itemMap.set(item.id, {
        ...item,
        children: [],
        type: item.tipo,
        productos: datosEjemplo.categorias.filter(p => p.padre_id === item.id && (p.nivel === 4 || p.nivel === 5))
      });
    });
    
    // Construir jerarquía
    datosEjemplo.categorias.forEach(item => {
      if (item.padre_id) {
        const parent = itemMap.get(item.padre_id);
        if (parent) {
          parent.children.push(itemMap.get(item.id));
        } else {
          roots.push(itemMap.get(item.id));
        }
      } else {
        roots.push(itemMap.get(item.id));
      }
    });
    
    return roots;
  };

  // Manejar expandir/colapsar
  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expandir todo
  const expandAll = () => {
    const allIds = datosEjemplo.categorias.map(cat => cat.id);
    setExpandedNodes(new Set(allIds));
  };

  // Colapsar todo
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Calcular stock total del nivel 4 basado en sus presentaciones nivel 5
  const calcularStockNivel4 = (nivel4Id) => {
    const presentaciones = datosEjemplo.categorias.filter(
      item => item.padre_id === nivel4Id && item.nivel === 5
    );
    
    // Sumar el stock de todas las presentaciones
    let stockTotal = 0;
    let pesoTotal = 0;
    
    presentaciones.forEach(presentacion => {
      stockTotal += presentacion.stock_actual || 0;
      
      // Si tiene peso neto, calcular el peso total
      if (presentacion.peso_neto) {
        pesoTotal += (presentacion.stock_actual || 0) * presentacion.peso_neto;
      }
    });
    
    return { stockTotal, pesoTotal, presentacionesCount: presentaciones.length };
  };

  // Renderizar árbol recursivo
  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedItem?.id === node.id;
    const isProductoFinal = node.nivel === 5; // Solo el nivel 5 es producto final
    const isCategoria = node.nivel < 4; // Niveles 1-3 son categorías
    const isProductoNivel4 = node.nivel === 4; // Nivel 4 es producto con hijos (nivel 5)
    
    const indent = depth * 24;
    const nivelColor = getNivelColor(node.nivel);
    const nivelIcon = getNivelIcon(node.nivel);
    const codigoFormateado = formatearCodigo(node.codigo, node.nivel);

    // Calcular stock para nivel 4
    let stockInfo = null;
    if (node.nivel === 4) {
      stockInfo = calcularStockNivel4(node.id);
    }

    return (
      <React.Fragment key={node.id}>
        {/* Fila del nodo */}
        <div 
          className={`flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
          onClick={() => setSelectedItem(node)}
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          {/* Botón expandir/colapsar para categorías y productos nivel 4 con hijos */}
          {(isCategoria || isProductoNivel4) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="mr-2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              ) : (
                <div className="w-4 h-4"></div>
              )}
            </button>
          )}
          
          {/* Espaciador para productos nivel 5 (sin botón de expandir) */}
          {isProductoFinal && <div className="w-8 mr-2"></div>}
          
          {/* Ícono según nivel */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${nivelColor.bg}`}>
            <span className={nivelColor.text}>{nivelIcon}</span>
          </div>
          
          {/* Información del nodo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium truncate ${isProductoFinal || isProductoNivel4 ? 'text-gray-800' : 'text-gray-900'}`}>
                {node.nombre}
              </h4>
              <span className={`text-xs px-2 py-1 rounded-full ${nivelColor.badge}`}>
                N{node.nivel}
              </span>
              {(isProductoFinal || isProductoNivel4) && node.maneja_stock && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  Stock
                </span>
              )}
              {isProductoNivel4 && hasChildren && (
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded">
                  {node.children.length} presentaciones
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {codigoFormateado}
              </span>
              
              {isCategoria && node.productos_count > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Package size={12} />
                  {node.productos_count} productos
                </span>
              )}
              
              {isProductoNivel4 && stockInfo && stockInfo.presentacionesCount > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Tag size={12} />
                  {stockInfo.presentacionesCount} presentaciones
                </span>
              )}
              
              {(isProductoFinal || isProductoNivel4) && node.unidad && (
                <span className="text-xs text-gray-500">
                  {node.unidad}
                </span>
              )}
            </div>
          </div>
          
          {/* Información adicional para productos nivel 5 */}
          {isProductoFinal && node.maneja_stock && (
            <div className="mr-4 text-right">
              <div className="text-sm font-semibold text-gray-800">
                {node.stock_actual} {node.unidad}
              </div>
              <div className="text-xs text-gray-500">
                Mín: {node.stock_minimo}
              </div>
            </div>
          )}
          
          {/* Información de stock para nivel 4 */}
          {isProductoNivel4 && stockInfo && (
            <div className="mr-4 text-right">
              <div className="text-sm font-semibold text-gray-800">
                {stockInfo.stockTotal} unid.
              </div>
              <div className="text-xs text-gray-500">
                {stockInfo.pesoTotal > 0 && `${stockInfo.pesoTotal.toFixed(1)} kg`}
              </div>
            </div>
          )}
          
          {/* Precio para nivel 5 */}
          {isProductoFinal && node.precio_unitario && (
            <div className="mr-4 text-right">
              <div className="text-sm font-semibold text-green-700">
                ${node.precio_unitario.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                por {node.unidad}
              </div>
            </div>
          )}
          
          {/* Estado activo/inactivo */}
          <div className="mr-4">
            {node.activo ? (
              <CheckCircle size={16} className="text-green-500" />
            ) : (
              <XCircle size={16} className="text-red-500" />
            )}
          </div>
          
          {/* Acciones rápidas */}
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingItem(node);
                setShowEditModal(true);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Editar"
            >
              <Edit size={16} />
            </button>
            {(isProductoFinal || isProductoNivel4) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Aquí iría la acción de copiar
                }}
                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                title="Duplicar"
              >
                <Copy size={16} />
              </button>
            )}
            {isProductoNivel4 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Crear nueva presentación (nivel 5) para este producto
                  setEditingItem({
                    nivel: 5,
                    padre_id: node.id,
                    nombre: `${node.nombre} - NUEVA PRESENTACIÓN`,
                    codigo: `${node.codigo}${node.children.length + 1}`.padEnd(10, '0'),
                    unidad: 'unidad',
                    maneja_stock: true,
                    activo: true,
                    stock_minimo: 0,
                    precio_unitario: 0,
                    peso_neto: 0
                  });
                  setShowEditModal(true);
                }}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="Agregar Presentación"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Hijos recursivos */}
        {isExpanded && hasChildren && node.children.map(child => 
          renderTreeNode(child, depth + 1)
        )}
      </React.Fragment>
    );
  };

  // Helper functions
  const getNivelColor = (nivel) => {
    switch(nivel) {
      case 1: return { 
        bg: 'bg-red-100', 
        text: 'text-red-600',
        badge: 'bg-red-100 text-red-800'
      };
      case 2: return { 
        bg: 'bg-blue-100', 
        text: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      };
      case 3: return { 
        bg: 'bg-green-100', 
        text: 'text-green-600',
        badge: 'bg-green-100 text-green-800'
      };
      case 4: return { 
        bg: 'bg-purple-100', 
        text: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-800'
      };
      case 5: return { 
        bg: 'bg-amber-100', 
        text: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-800'
      };
      default: return { 
        bg: 'bg-gray-100', 
        text: 'text-gray-600',
        badge: 'bg-gray-100 text-gray-800'
      };
    }
  };

  const getNivelIcon = (nivel) => {
    switch(nivel) {
      case 1: return <Layers size={18} />;
      case 2: return <Folder size={18} />;
      case 3: return <Box size={18} />;
      case 4: return <Package size={18} />;
      case 5: return <Tag size={18} />;
      default: return <File size={18} />;
    }
  };

  // Calcular estadísticas
  const stats = {
    totalCategorias: datosEjemplo.categorias.filter(c => c.nivel < 4).length,
    totalProductos: datosEjemplo.categorias.filter(c => c.nivel === 4 || c.nivel === 5).length,
    nivel1: datosEjemplo.categorias.filter(c => c.nivel === 1).length,
    nivel2: datosEjemplo.categorias.filter(c => c.nivel === 2).length,
    nivel3: datosEjemplo.categorias.filter(c => c.nivel === 3).length,
    nivel4: datosEjemplo.categorias.filter(c => c.nivel === 4).length,
    nivel5: datosEjemplo.categorias.filter(c => c.nivel === 5).length,
  };

  const treeData = buildTree();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                🌳 Árbol de Productos
              </h1>
              <p className="text-gray-600">
                Gestión jerárquica de materias primas, productos y servicios
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-outline flex items-center gap-2 px-4 py-2"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Cargando..." : "Actualizar"}
              </button>
              <button className="btn-outline flex items-center gap-2 px-4 py-2">
                <Download size={16} />
                Exportar
              </button>
              <button 
                className="btn-primary flex items-center gap-2 px-4 py-2"
                onClick={() => {
                  setEditingItem(null);
                  setShowEditModal(true);
                }}
              >
                <Plus size={16} />
                Nuevo Elemento
              </button>
            </div>
          </div>

          {/* Barra de herramientas */}
          <div className="card mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Búsqueda rápida */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar producto o categoría..."
                    className="form-input pl-10 w-full"
                    value={busquedaRapida}
                    onChange={(e) => setBusquedaRapida(e.target.value)}
                  />
                </div>
                
                {/* Búsqueda avanzada */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Búsqueda por código..."
                    className="form-input pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Botones expandir/colapsar */}
                <div className="flex gap-2">
                  <button 
                    onClick={expandAll}
                    className="btn-outline flex-1 flex items-center justify-center gap-2"
                  >
                    <ChevronDown size={16} />
                    Expandir todo
                  </button>
                  <button 
                    onClick={collapseAll}
                    className="btn-outline flex-1 flex items-center justify-center gap-2"
                  >
                    <ChevronRight size={16} />
                    Colapsar todo
                  </button>
                </div>
              </div>
              
              {/* Navegación por niveles */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSelectedNivel("todos")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedNivel === "todos" ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Todos los niveles
                </button>
                {[1, 2, 3, 4, 5].map(nivel => (
                  <button 
                    key={nivel}
                    onClick={() => setSelectedNivel(nivel.toString())}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selectedNivel === nivel.toString() ? getNivelColor(nivel).badge : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    Nivel {nivel} ({stats[`nivel${nivel}`]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Vista de árbol */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Estructura Jerárquica
                  </h2>
                  <span className="text-sm text-gray-500">
                    {treeData.length} categorías raíz
                  </span>
                </div>
              </div>
              
              {/* Vista de árbol */}
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="spinner mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando estructura...</p>
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No se encontraron elementos
                    </h3>
                    <button 
                      className="btn-primary"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Plus size={16} className="mr-2" />
                      Crear primera categoría
                    </button>
                  </div>
                ) : (
                  treeData.map(node => renderTreeNode(node))
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Mostrando <span className="font-medium">
                      {datosEjemplo.categorias.length}
                    </span> elementos
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 rounded"></div>
                      Nivel 1
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-100 rounded"></div>
                      Nivel 2
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-100 rounded"></div>
                      Nivel 3
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-100 rounded"></div>
                      Nivel 4
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-amber-100 rounded"></div>
                      Nivel 5 (Presentaciones)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Columna derecha: Panel de detalles */}
          <div className="lg:col-span-1">
            <div className="card-glass sticky top-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">
                  {selectedItem ? "Detalles" : "Seleccione un elemento"}
                </h3>
                
                {selectedItem ? (
                  <div className="space-y-6">
                    {/* Header del item */}
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getNivelColor(selectedItem.nivel).bg}`}>
                        <span className={getNivelColor(selectedItem.nivel).text}>
                          {getNivelIcon(selectedItem.nivel)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {selectedItem.nombre}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedItem.tipo === 'producto' ? 'Producto' : 'Categoría'} • Nivel {selectedItem.nivel}
                        </p>
                      </div>
                    </div>
                    
                    {/* Información detallada */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Código</p>
                        <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {formatearCodigo(selectedItem.codigo, selectedItem.nivel)}
                        </p>
                      </div>
                      
                      {selectedItem.nivel === 4 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Presentaciones</p>
                          <p className="font-medium">
                            {calcularStockNivel4(selectedItem.id).presentacionesCount} presentaciones
                          </p>
                        </div>
                      )}
                      
                      {selectedItem.tipo === 'categoria' && selectedItem.nivel < 4 ? (
                        <>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Productos asociados</p>
                            <p className="font-medium">
                              {selectedItem.productos_count || 0} productos
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Unidad de medida</p>
                            <p className="font-medium">
                              {selectedItem.unidad || 'No especificada'}
                            </p>
                          </div>
                          
                          {selectedItem.nivel === 5 && selectedItem.maneja_stock && (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Stock actual</p>
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-bold text-gray-800">
                                    {selectedItem.stock_actual} {selectedItem.unidad}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Mín: {selectedItem.stock_minimo}
                                  </span>
                                </div>
                              </div>
                              
                              {selectedItem.peso_neto && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Peso neto por unidad</p>
                                  <p className="font-medium">
                                    {selectedItem.peso_neto} kg
                                  </p>
                                </div>
                              )}
                              
                              {selectedItem.precio_unitario && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Precio por unidad</p>
                                  <p className="font-medium text-green-700">
                                    ${selectedItem.precio_unitario.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Maneja stock</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedItem.maneja_stock ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {selectedItem.maneja_stock ? 'Sí' : 'No'}
                                </span>
                              </div>
                            </>
                          )}
                          
                          {selectedItem.nivel === 4 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Stock total (suma de presentaciones)</p>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-800">
                                  {calcularStockNivel4(selectedItem.id).stockTotal} unidades
                                </span>
                                {calcularStockNivel4(selectedItem.id).pesoTotal > 0 && (
                                  <span className="text-sm text-gray-500">
                                    {calcularStockNivel4(selectedItem.id).pesoTotal.toFixed(1)} kg
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedItem.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {selectedItem.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            setEditingItem(selectedItem);
                            setShowEditModal(true);
                          }}
                          className="btn-outline flex items-center justify-center gap-2"
                        >
                          <Edit size={16} />
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            // Acción adicional según tipo
                            if (selectedItem.nivel === 5) {
                              // Registrar entrada de stock
                            } else if (selectedItem.nivel === 4) {
                              // Agregar nueva presentación
                              setEditingItem({
                                nivel: 5,
                                padre_id: selectedItem.id,
                                nombre: `${selectedItem.nombre} - NUEVA PRESENTACIÓN`,
                                codigo: `${selectedItem.codigo}${selectedItem.children?.length || 0 + 1}`.padEnd(10, '0'),
                                unidad: 'unidad',
                                maneja_stock: true,
                                activo: true,
                                stock_minimo: 0,
                                precio_unitario: 0,
                                peso_neto: 0
                              });
                              setShowEditModal(true);
                            } else if (selectedItem.tipo === 'producto') {
                              // Ver en recetas que lo usan
                            } else {
                              // Ver productos de esta categoría
                            }
                          }}
                          className="btn-outline flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} />
                          {selectedItem.nivel === 5 ? 'Registrar Stock' : 
                           selectedItem.nivel === 4 ? 'Agregar Presentación' :
                           selectedItem.tipo === 'producto' ? 'Ver en recetas' : 'Ver productos'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Eye size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500">
                      Seleccione una categoría o producto para ver sus detalles
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Panel de ayuda */}
            <div className="card mt-6">
              <div className="p-4">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Guía rápida
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-medium">•</span>
                    <span><strong>Nivel 1:</strong> Categorías principales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">•</span>
                    <span><strong>Nivel 2:</strong> Subcategorías específicas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">•</span>
                    <span><strong>Nivel 3:</strong> Grupos de productos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-medium">•</span>
                    <span><strong>Nivel 4:</strong> Productos finales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-medium">•</span>
                    <span><strong>Nivel 5:</strong> Presentaciones de stock (ej: paquetes, cajas, bandejas)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && (
        <EditItemModal
          item={editingItem}
          categorias={datosEjemplo.categorias.filter(c => c.nivel < 5)}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingItem(null);
            // En una implementación real, aquí se guardaría a la base de datos
          }}
          formatearCodigo={formatearCodigo}
        />
      )}
    </div>
  );
}

// Modal de edición
function EditItemModal({ item, categorias, onClose, onSave, formatearCodigo }) {
  const isEditing = !!item;
  const isProducto = item?.nivel === 4 || item?.nivel === 5;
  
  const [form, setForm] = useState({
    codigo: item?.codigo || '',
    nombre: item?.nombre || '',
    nivel: item?.nivel || 1,
    padre_id: item?.padre_id || '',
    unidad: item?.unidad || 'kg',
    maneja_stock: item?.maneja_stock ?? true,
    activo: item?.activo ?? true,
    stock_minimo: item?.stock_minimo || 0,
    precio_unitario: item?.precio_unitario || 0,
    peso_neto: item?.peso_neto || 0,
  });

  // Generar vista previa del código formateado
  const codigoPreview = form.codigo ? formatearCodigo(form.codigo, form.nivel) : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Editar Elemento' : 'Nuevo Elemento'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nombre}
                  onChange={(e) => setForm({...form, nombre: e.target.value})}
                  required
                  placeholder={form.nivel === 5 ? "Ej: STEAK DE RES - PAQUETE 5KG" : "Ej: STEAK DE RES"}
                />
              </div>
              
              <div>
                <label className="form-label">Código *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.codigo}
                  onChange={(e) => setForm({...form, codigo: e.target.value})}
                  required
                  placeholder={form.nivel === 5 ? "Ej: 1000000000" : "Ej: 10000000"}
                />
                {codigoPreview && (
                  <p className="text-xs text-gray-500 mt-1">
                    Vista previa: <span className="font-mono">{codigoPreview}</span>
                  </p>
                )}
              </div>
              
              <div>
                <label className="form-label">Nivel *</label>
                <select
                  className="form-select"
                  value={form.nivel}
                  onChange={(e) => setForm({...form, nivel: parseInt(e.target.value)})}
                >
                  <option value="1">Nivel 1 - Categoría Principal</option>
                  <option value="2">Nivel 2 - Subcategoría</option>
                  <option value="3">Nivel 3 - Grupo</option>
                  <option value="4">Nivel 4 - Producto Final</option>
                  <option value="5">Nivel 5 - Presentación de Stock</option>
                </select>
              </div>
              
              {form.nivel > 1 && (
                <div>
                  <label className="form-label">Categoría Padre *</label>
                  <select
                    className="form-select"
                    value={form.padre_id}
                    onChange={(e) => setForm({...form, padre_id: e.target.value})}
                    required={form.nivel > 1}
                  >
                    <option value="">Seleccionar categoría padre</option>
                    {categorias
                      .filter(cat => cat.nivel === form.nivel - 1)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {formatearCodigo(cat.codigo, cat.nivel)} - {cat.nombre}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
              
              {(form.nivel === 4 || form.nivel === 5) && (
                <>
                  <div>
                    <label className="form-label">Unidad de medida *</label>
                    <select
                      className="form-select"
                      value={form.unidad}
                      onChange={(e) => setForm({...form, unidad: e.target.value})}
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="lb">Libras (lb)</option>
                      <option value="unidad">Unidad</option>
                      <option value="litro">Litro (L)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="caja">Caja</option>
                      <option value="paquete">Paquete</option>
                      <option value="pack">Pack</option>
                      <option value="bandeja">Bandeja</option>
                      <option value="bolsa">Bolsa</option>
                      <option value="pieza">Pieza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="form-label">Precio unitario</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        className="form-input pl-8"
                        value={form.precio_unitario}
                        onChange={(e) => setForm({...form, precio_unitario: parseFloat(e.target.value)})}
                        min="0"
                        step="100"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {form.nivel === 5 && (
                <div>
                  <label className="form-label">Peso neto por unidad (kg)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.peso_neto}
                    onChange={(e) => setForm({...form, peso_neto: parseFloat(e.target.value)})}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Peso real del contenido (ej: 5 para paquete de 5kg)
                  </p>
                </div>
              )}
              
              <div>
                <label className="form-label">Maneja Stock</label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={form.maneja_stock}
                      onChange={(e) => setForm({...form, maneja_stock: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-700">Este elemento requiere control de inventario</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="form-label">Estado</label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={form.activo}
                      onChange={(e) => setForm({...form, activo: e.target.checked})}
                    />
                    <span className="ml-2 text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
            </div>
            
            {(form.nivel === 4 || form.nivel === 5) && form.maneja_stock && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-700 mb-3">Configuración de Stock</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Stock mínimo</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.stock_minimo}
                      onChange={(e) => setForm({...form, stock_minimo: parseFloat(e.target.value)})}
                      min="0"
                      step="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cantidad mínima antes de generar alerta
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={onClose} className="btn-outline flex-1">
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1">
                {isEditing ? '💾 Guardar Cambios' : '➕ Crear Elemento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}