import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  ShoppingBag, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Layers,
  List,
  Trash2,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import { SaleOrder, SheetRow } from '../types/sales';
import { convertOrdersToSheetRows, exportRowsToCSV, fetchLiveSheetData } from '../services/sheetsService';

interface SalesHistoryProps {
  orders: SaleOrder[];
  scriptUrl: string;
  onRefreshData?: () => void;
  onViewReceipt: (order: SaleOrder) => void;
  onDeleteOrder?: (numeroPedido: number) => Promise<void> | void;
  onGoToNewSale?: () => void;
}

const MESES = [
  { value: 'all', label: 'Todos los meses' },
  { value: '01', label: '01 - Enero' },
  { value: '02', label: '02 - Febrero' },
  { value: '03', label: '03 - Marzo' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Mayo' },
  { value: '06', label: '06 - Junio' },
  { value: '07', label: '07 - Julio' },
  { value: '08', label: '08 - Agosto' },
  { value: '09', label: '09 - Septiembre' },
  { value: '10', label: '10 - Octubre' },
  { value: '11', label: '11 - Noviembre' },
  { value: '12', label: '12 - Diciembre' }
];

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  orders,
  scriptUrl,
  onRefreshData,
  onViewReceipt,
  onDeleteOrder,
  onGoToNewSale
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchClient, setSearchClient] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rows' | 'orders'>('rows');
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // Lista dinámica de años disponibles en los pedidos registrados
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear);

    orders.forEach(o => {
      if (o.fecha) {
        const y = o.fecha.split('-')[0];
        if (y && y.length === 4) {
          yearsSet.add(y);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  // Estado para confirmación de eliminación
  const [orderToDelete, setOrderToDelete] = useState<SaleOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteOrder) {
        await onDeleteOrder(orderToDelete.numeroPedido);
      }
      setRefreshNotice(`✓ El pedido #${orderToDelete.numeroPedido} fue eliminado correctamente de tu lista.`);
      setTimeout(() => setRefreshNotice(null), 4000);
      setOrderToDelete(null);
    } catch (err: any) {
      setRefreshNotice('No se pudo eliminar el pedido. Por favor intenta de nuevo.');
      setTimeout(() => setRefreshNotice(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrado preciso de pedidos combinando selector de Año, selector de Mes y buscador de Cliente
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.fecha || '';
      const parts = orderDate.split('-');
      const orderYear = parts[0] || '';
      const orderMonth = parts[1] || '';

      // Filtro por Año
      if (selectedYear !== 'all' && orderYear !== selectedYear) {
        return false;
      }

      // Filtro por Mes
      if (selectedMonth !== 'all' && orderMonth !== selectedMonth) {
        return false;
      }

      // Filtro por Nombre de Cliente
      if (searchClient.trim()) {
        const clientLower = order.cliente.toLowerCase();
        const searchLower = searchClient.toLowerCase().trim();
        if (!clientLower.includes(searchLower)) return false;
      }

      return true;
    });
  }, [orders, selectedYear, selectedMonth, searchClient]);

  const filteredRows: SheetRow[] = useMemo(() => {
    return convertOrdersToSheetRows(filteredOrders);
  }, [filteredOrders]);

  // Cálculos de métricas para el período filtrado con soporte decimal
  const metrics = useMemo(() => {
    const totalVendido = Math.round(filteredRows.reduce((acc, row) => acc + (row.Subtotal || 0), 0) * 100) / 100;
    const totalPedidos = filteredOrders.length;
    const totalProductos = Math.round(filteredRows.reduce((acc, row) => acc + (row.Cantidad || 0), 0) * 100) / 100;
    const ticketPromedio = totalPedidos > 0 ? totalVendido / totalPedidos : 0;

    return {
      totalVendido,
      totalPedidos,
      totalProductos,
      ticketPromedio
    };
  }, [filteredRows, filteredOrders]);

  const toggleOrderExpand = (orderNum: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderNum]: !prev[orderNum]
    }));
  };

  const handleExportCSV = () => {
    const monthLabel = MESES.find(m => m.value === selectedMonth)?.label || 'Todos_Los_Meses';
    const yearLabel = selectedYear === 'all' ? 'Todos_Los_Anos' : selectedYear;
    const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Ventas_Adara_${yearLabel}_${cleanMonth}.csv`;
    exportRowsToCSV(filteredRows, filename);
  };

  const handleSyncFromSheets = async () => {
    if (!scriptUrl) {
      setRefreshNotice('Aún no has conectado una hoja de cálculo. Ve a la pestaña "Google Sheets" para conectar tu hoja.');
      setTimeout(() => setRefreshNotice(null), 4000);
      return;
    }

    setIsRefreshing(true);
    setRefreshNotice(null);
    try {
      const res = await fetchLiveSheetData(scriptUrl);
      if (res.success && res.rows) {
        setRefreshNotice(`¡Datos actualizados con éxito! Se sincronizaron ${res.rows.length} ventas desde tu hoja de cálculo.`);
        if (onRefreshData) onRefreshData();
      } else {
        setRefreshNotice('No pudimos leer los datos de tu hoja de cálculo en este momento.');
      }
    } catch {
      setRefreshNotice('No se pudo conectar con la hoja de cálculo. Revisa tu conexión a internet.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 min-w-[300px]">
      {/* TARJETAS DE MÉTRICAS (Texto >= 16px, alto contraste al sol) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#C4B5A5] shadow-xs">
          <div className="flex items-center justify-between text-[#1A1612] mb-2">
            <span className="text-base font-bold uppercase tracking-wider">Total Ventas</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#B8801A] border-2 border-[#D49A2A] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#1A1612]">
            ${metrics.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-base font-medium text-[#4A3D30] mt-1">
            {selectedMonth === 'all' ? 'Historial acumulado' : `Ventas de ${MESES.find(m => m.value === selectedMonth)?.label}`}
          </div>
        </div>

        {/* Cantidad de Pedidos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#C4B5A5] shadow-xs">
          <div className="flex items-center justify-between text-[#1A1612] mb-2">
            <span className="text-base font-bold uppercase tracking-wider">Pedidos</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#B8801A] border-2 border-[#D49A2A] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#1A1612]">
            {metrics.totalPedidos}
          </div>
          <div className="text-base font-medium text-[#4A3D30] mt-1">
            {metrics.totalPedidos === 1 ? '1 pedido completado' : `${metrics.totalPedidos} pedidos en lista`}
          </div>
        </div>

        {/* Artículos Vendidos */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#C4B5A5] shadow-xs">
          <div className="flex items-center justify-between text-[#1A1612] mb-2">
            <span className="text-base font-bold uppercase tracking-wider">Piezas Vendidas</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#B8801A] border-2 border-[#D49A2A] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#1A1612]">
            {metrics.totalProductos}
          </div>
          <div className="text-base font-medium text-[#4A3D30] mt-1">
            En {filteredRows.length} renglones de producto
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-5 rounded-2xl border-2 border-[#C4B5A5] shadow-xs">
          <div className="flex items-center justify-between text-[#1A1612] mb-2">
            <span className="text-base font-bold uppercase tracking-wider">Promedio / Venta</span>
            <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#B8801A] border-2 border-[#D49A2A] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#1A1612]">
            ${metrics.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-base font-medium text-[#4A3D30] mt-1">
            Por orden de compra
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROL Y ACCIONES (Con un solo botón principal: Descargar Excel) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-[#C4B5A5] shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1612]">
              Historial y Filtros de Ventas
            </h2>
            <p className="text-base font-medium text-[#4A3D30] mt-0.5">
              Filtra por mes o por nombre de cliente para consultar pedidos
            </p>
          </div>

          {/* Botones de acción: 1 PRINCIPAL (Excel) y secundario (Recargar Hoja) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ÚNICO BOTÓN PRINCIPAL DE ESTA PANTALLA (Requisito 4) */}
            <button
              onClick={handleExportCSV}
              className="min-h-[48px] px-4 py-2.5 bg-[#B8801A] hover:bg-[#9E6C12] active:bg-[#855B0F] text-white font-bold text-base rounded-xl transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
              title="Descargar archivo en Excel / CSV limpio y compatible"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Descargar en Excel / CSV</span>
            </button>

            {/* Botón secundario: Recargar de Sheets */}
            <button
              onClick={handleSyncFromSheets}
              disabled={isRefreshing}
              className="min-h-[48px] px-4 py-2.5 bg-white hover:bg-[#FAF7F2] border-2 border-[#6B5A4B] disabled:bg-slate-200 text-[#1A1612] font-bold text-base rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
              title="Actualizar datos con la hoja de cálculo"
            >
              <RefreshCw className={`w-5 h-5 text-[#B8801A] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : 'Recargar Hoja'}</span>
            </button>
          </div>
        </div>

        {/* Mensaje de estado visible en español */}
        {refreshNotice && (
          <div 
            role="status"
            className="p-4 bg-[#FAF5EC] border-2 border-[#B8801A] text-[#1A1612] text-base font-bold rounded-xl animate-in fade-in"
          >
            {refreshNotice}
          </div>
        )}

        {/* FILTROS CON ETIQUETAS VISIBLES OBLIGATORIAS: Selectores separados de Año y Mes */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-3 border-t-2 border-[#E8DFC8]">
          {/* Selector 1: Año con etiqueta visible */}
          <div className="sm:col-span-3">
            <label 
              htmlFor="filtro-ano"
              className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-1.5"
            >
              <Calendar className="w-5 h-5 text-[#B8801A]" />
              <span>Año:</span>
            </label>
            <select
              id="filtro-ano"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
            >
              <option value="all">Todos los años</option>
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Selector 2: Mes con etiqueta visible */}
          <div className="sm:col-span-3">
            <label 
              htmlFor="filtro-mes"
              className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-1.5"
            >
              <Calendar className="w-5 h-5 text-[#B8801A]" />
              <span>Mes:</span>
            </label>
            <select
              id="filtro-mes"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
            >
              {MESES.map(mes => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador de Cliente con etiqueta visible */}
          <div className="sm:col-span-4">
            <label 
              htmlFor="filtro-cliente"
              className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-1.5"
            >
              <Search className="w-5 h-5 text-[#B8801A]" />
              <span>Cliente:</span>
            </label>
            <div className="relative">
              <input
                id="filtro-cliente"
                type="text"
                placeholder="Nombre del cliente..."
                value={searchClient}
                onChange={e => setSearchClient(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-10 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
              />
              <Search className="w-5 h-5 text-[#6B5A4B] absolute left-3 top-3.5" />
              {searchClient && (
                <button
                  type="button"
                  onClick={() => setSearchClient('')}
                  className="absolute right-3 top-2.5 text-base font-bold text-[#6B5A4B] hover:text-[#1A1612] px-2 py-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Selector de Modo de Vista con etiqueta visible */}
          <div className="sm:col-span-2">
            <label 
              className="block text-base font-bold text-[#1A1612] mb-1.5 truncate"
            >
              Vista:
            </label>
            <div className="flex bg-[#F4EFE6] p-1 rounded-xl border-2 border-[#C4B5A5] min-h-[48px]">
              <button
                type="button"
                onClick={() => setViewMode('rows')}
                className={`flex-1 min-h-[42px] px-2 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'rows'
                    ? 'bg-[#1A1612] text-white shadow-xs'
                    : 'text-[#1A1612] hover:bg-[#EAE2D5]'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Renglones</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('orders')}
                className={`flex-1 min-h-[42px] px-2 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'orders'
                    ? 'bg-[#1A1612] text-white shadow-xs'
                    : 'text-[#1A1612] hover:bg-[#EAE2D5]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Por Pedido</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ESTADO VACÍO (Requisito 5: Frase de bienvenida e invitación clara)
         ========================================================================= */}
      {orders.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border-2 border-dashed border-[#B8A898] space-y-4 shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#FAF5EC] border-2 border-[#B8801A] flex items-center justify-center text-[#B8801A]">
            <Receipt className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-[#1A1612]">
              Todavía no tienes ventas registradas
            </h3>
            <p className="text-lg font-medium text-[#4A3D30] max-w-lg mx-auto leading-relaxed">
              ¡Empieza registrando tu primera venta para ver aquí tus estadísticas, recibos y pedidos sincronizados con Google Sheets!
            </p>
          </div>
          {onGoToNewSale && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onGoToNewSale}
                className="min-h-[50px] px-6 py-3 bg-[#B8801A] hover:bg-[#9E6C12] text-white font-bold text-lg rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-6 h-6" />
                <span>Registrar Mi Primera Venta</span>
              </button>
            </div>
          )}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border-2 border-[#C4B5A5] space-y-3 shadow-sm">
          <h3 className="text-xl font-bold text-[#1A1612]">
            No encontramos ninguna venta con esos filtros
          </h3>
          <p className="text-base font-medium text-[#4A3D30]">
            Prueba cambiando el mes o borrando el nombre del cliente para ver tus ventas registradas.
          </p>
          <button
            type="button"
            onClick={() => { setSelectedMonth('all'); setSearchClient(''); }}
            className="min-h-[48px] px-5 py-2.5 bg-white hover:bg-[#FAF7F2] border-2 border-[#6B5A4B] text-[#1A1612] font-bold text-base rounded-xl transition-all cursor-pointer"
          >
            Mostrar todas las ventas
          </button>
        </div>
      ) : viewMode === 'rows' ? (
        /* VISTA 1: TABLA DE RENGLONES (Texto >= 16px, alto contraste) */
        <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] shadow-sm overflow-hidden">
          <div className="p-4 bg-[#FAF7F2] border-b-2 border-[#E8DFC8] flex flex-wrap items-center justify-between gap-2">
            <span className="text-base font-bold text-[#1A1612] uppercase tracking-wider flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#B8801A]"></span>
              Estructura de Google Sheets ({filteredRows.length} renglones)
            </span>
            <span className="text-base font-medium text-[#4A3D30]">
              Columnas exactas de la fila 1
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-base">
              <thead>
                <tr className="bg-[#1A1612] text-white text-base font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center font-mono">Pedido</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Dirección</th>
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4 text-center">Tamaño</th>
                  <th className="py-3.5 px-4 text-center font-mono">Cant.</th>
                  <th className="py-3.5 px-4 text-right font-mono">Precio ($)</th>
                  <th className="py-3.5 px-4 text-right font-mono">Subtotal ($)</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#E8DFC8] text-[#1A1612]">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-[#B8801A]">
                      #{row.Numero_Pedido}
                    </td>
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                      {row.Fecha}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1612]">
                      {row.Cliente}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#4A3D30] max-w-xs truncate" title={row.Direccion}>
                      {row.Direccion}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A1612]">
                      {row.Producto}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF5EC] border border-[#B8801A] text-[#1A1612]">
                        {row.Tamaño}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-[#1A1612]">
                      {row.Cantidad}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium">
                      ${row.Precio_Unitario.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#1A1612]">
                      ${row.Subtotal.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          const found = orders.find(o => o.numeroPedido === row.Numero_Pedido);
                          if (found) setOrderToDelete(found);
                        }}
                        className="min-h-[44px] px-3.5 py-2 text-base font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        title={`Eliminar Pedido #${row.Numero_Pedido}`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-700" />
                        <span>Borrar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA 2: AGRUPADA POR PEDIDO (Tarjetas táctiles de 16px) */
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isExpanded = !!expandedOrders[order.numeroPedido];
            return (
              <div
                key={order.numeroPedido}
                className="bg-white rounded-2xl border-2 border-[#C4B5A5] shadow-xs overflow-hidden"
              >
                <div
                  onClick={() => toggleOrderExpand(order.numeroPedido)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF7F2] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-[#1A1612] p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-6 h-6" />
                      ) : (
                        <ChevronRight className="w-6 h-6" />
                      )}
                    </button>

                    <div className="w-12 h-12 rounded-xl bg-[#FAF5EC] text-[#B8801A] border-2 border-[#B8801A] flex items-center justify-center font-mono font-extrabold text-base">
                      #{order.numeroPedido}
                    </div>

                    <div>
                      <h3 className="font-bold text-[#1A1612] text-xl">
                        {order.cliente}
                      </h3>
                      <p className="text-base font-medium text-[#4A3D30] mt-0.5">
                        {order.fecha} · {order.direccion} · {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0">
                    <div className="text-right">
                      <span className="text-base uppercase tracking-wider text-[#5C4A3A] font-bold block">
                        Gran Total
                      </span>
                      <span className="text-2xl font-extrabold font-mono text-[#1A1612]">
                        ${order.granTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReceipt(order);
                        }}
                        className="min-h-[46px] px-4 py-2 text-base font-bold text-[#1A1612] bg-[#FAF5EC] hover:bg-[#F0E4D0] border-2 border-[#B8801A] rounded-xl transition-colors cursor-pointer"
                        title="Ver recibo del cliente"
                      >
                        Ver Recibo
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(order);
                        }}
                        className="min-h-[46px] px-3.5 py-2 text-base font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        title={`Eliminar Pedido #${order.numeroPedido}`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-700" />
                        <span>Borrar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="p-5 bg-[#FAF7F2] border-t-2 border-[#E8DFC8] space-y-3">
                    <div className="text-base font-bold text-[#1A1612] uppercase tracking-wider">
                      Productos incluidos en el Pedido #{order.numeroPedido}:
                    </div>
                    <div className="space-y-2">
                      {order.items.map((item, iIndex) => (
                        <div 
                          key={item.id || iIndex}
                          className="p-3 bg-white rounded-xl border border-[#D8CFC4] flex flex-wrap items-center justify-between gap-2 text-base"
                        >
                          <div>
                            <span className="font-bold text-[#1A1612]">{item.producto}</span>
                            <span className="text-[#5C4A3A] ml-2 font-medium">({item.tamano})</span>
                          </div>
                          <div className="font-mono font-bold text-[#1A1612]">
                            {item.cantidad} {item.cantidad === 1 ? 'pieza' : 'piezas'} × ${item.precioUnitario.toFixed(2)}
                            {item.descuento && item.descuento > 0 ? (
                              <span className="text-emerald-700 font-semibold ml-1.5 text-sm">
                                (-${item.descuento.toFixed(2)} desc)
                              </span>
                            ) : null}{' '}
                            = <span className="text-[#B8801A]">${item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}

                      {order.descuentoGeneral && order.descuentoGeneral > 0 ? (
                        <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-900 font-bold text-sm">
                          <span>🏷️ Descuento general de la venta:</span>
                          <span className="font-mono font-extrabold">-${order.descuentoGeneral.toFixed(2)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMACIÓN PARA ELIMINAR PEDIDO (Sin palabras técnicas)
         ========================================================================= */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => !isDeleting && setOrderToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl border-2 border-[#C4B5A5] shadow-2xl max-w-md w-full p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#1A1612] leading-tight">
                  ¿Deseas eliminar este pedido?
                </h3>
                <p className="text-base font-medium text-[#4A3D30] mt-1">
                  Esta acción quitará el pedido #{orderToDelete.numeroPedido} de tu historial de ventas.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="text-[#6B5A4B] hover:text-[#1A1612] p-1 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Ficha resumen */}
            <div className="p-4 bg-[#FAF7F2] rounded-2xl border-2 border-[#E8DFC8] space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-[#5C4A3A] font-medium">Cliente:</span>
                <span className="font-bold text-[#1A1612]">{orderToDelete.cliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C4A3A] font-medium">Fecha:</span>
                <span className="font-bold text-[#1A1612]">{orderToDelete.fecha}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E8DFC8]">
                <span className="text-[#5C4A3A] font-medium">Total a eliminar:</span>
                <span className="font-mono font-extrabold text-xl text-[#B8801A]">
                  ${orderToDelete.granTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Botones de acción del modal */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 text-base font-bold text-[#1A1612] bg-white border-2 border-[#6B5A4B] rounded-xl hover:bg-[#FAF7F2] cursor-pointer"
              >
                Cancelar y volver
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 text-base font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:bg-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Sí, eliminar definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
