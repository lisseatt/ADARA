import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Download, 
  RefreshCw, 
  Filter, 
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
  X
} from 'lucide-react';
import { SaleOrder, SheetRow } from '../types/sales';
import { convertOrdersToSheetRows, exportRowsToCSV, fetchLiveSheetData } from '../services/sheetsService';

interface SalesHistoryProps {
  orders: SaleOrder[];
  scriptUrl: string;
  onRefreshData?: () => void;
  onViewReceipt: (order: SaleOrder) => void;
  onDeleteOrder?: (numeroPedido: number) => Promise<void> | void;
}

const MESES = [
  { value: 'all', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  orders,
  scriptUrl,
  onRefreshData,
  onViewReceipt,
  onDeleteOrder
}) => {
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchClient, setSearchClient] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rows' | 'orders'>('rows');
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  // Estado para confirmación de eliminación de registro
  const [orderToDelete, setOrderToDelete] = useState<SaleOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteOrder) {
        await onDeleteOrder(orderToDelete.numeroPedido);
      }
      setRefreshNotice(`✓ Pedido #${orderToDelete.numeroPedido} eliminado correctamente`);
      setTimeout(() => setRefreshNotice(null), 4000);
      setOrderToDelete(null);
    } catch (err: any) {
      console.error(err);
      setRefreshNotice(`Error al eliminar pedido: ${err.message || 'Intenta nuevamente'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Convertir todos los pedidos a formato plano de filas de Google Sheets
  const allRows: SheetRow[] = useMemo(() => {
    return convertOrdersToSheetRows(orders);
  }, [orders]);

  // Filtrado de pedidos según mes y búsqueda de cliente
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Filtro por mes (asumiendo formato YYYY-MM-DD o parseable)
      if (selectedMonth !== 'all') {
        const orderDate = order.fecha || '';
        // Extraer mes de formato YYYY-MM-DD
        const parts = orderDate.split('-');
        const month = parts.length >= 2 ? parts[1] : '';
        if (month !== selectedMonth) return false;
      }

      // Filtro por nombre de cliente
      if (searchClient.trim()) {
        const clientLower = order.cliente.toLowerCase();
        const searchLower = searchClient.toLowerCase().trim();
        if (!clientLower.includes(searchLower)) return false;
      }

      return true;
    });
  }, [orders, selectedMonth, searchClient]);

  // Filas planas filtradas (para la tabla exacta de Google Sheets)
  const filteredRows: SheetRow[] = useMemo(() => {
    return convertOrdersToSheetRows(filteredOrders);
  }, [filteredOrders]);

  // Cálculos de métricas para el período filtrado
  const metrics = useMemo(() => {
    const totalVendido = filteredRows.reduce((acc, row) => acc + (row.Subtotal || 0), 0);
    const totalPedidos = filteredOrders.length;
    const totalProductos = filteredRows.reduce((acc, row) => acc + (row.Cantidad || 0), 0);
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
    const monthLabel = MESES.find(m => m.value === selectedMonth)?.label || 'Ventas';
    const filename = `Ventas_Adara_${monthLabel.replace(/\s+/g, '_')}_${new Date().getFullYear()}.csv`;
    exportRowsToCSV(filteredRows, filename);
  };

  const handleSyncFromSheets = async () => {
    if (!scriptUrl) {
      setRefreshNotice('No hay URL de Google Apps Script configurada aún. Conéctala en la pestaña "Conectar Google Sheets".');
      setTimeout(() => setRefreshNotice(null), 4000);
      return;
    }

    setIsRefreshing(true);
    setRefreshNotice(null);
    try {
      const res = await fetchLiveSheetData(scriptUrl);
      if (res.success && res.rows) {
        setRefreshNotice(`¡Datos sincronizados! Se consultaron ${res.rows.length} filas desde Google Sheets.`);
        if (onRefreshData) onRefreshData();
      } else {
        setRefreshNotice(res.message || 'Error al consultar Google Sheets.');
      }
    } catch (err: any) {
      setRefreshNotice('Error al conectar con Google Sheets.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS DE RESUMEN Y MÉTRICAS CLAVE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Ventas</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EC] text-[#D49A2A] border border-[#ECD9BA] flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${metrics.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {selectedMonth === 'all' ? 'Acumulado histórico' : `Mes de ${MESES.find(m => m.value === selectedMonth)?.label}`}
          </div>
        </div>

        {/* Cantidad de Pedidos */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Pedidos Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.totalPedidos}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics.totalPedidos === 1 ? '1 pedido completado' : `${metrics.totalPedidos} pedidos en total`}
          </div>
        </div>

        {/* Artículos Vendidos */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Piezas Vendidas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics.totalProductos}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            En {filteredRows.length} renglones de producto
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Ticket Promedio</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${metrics.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Promedio por orden de compra
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROL: FILTRO POR MES, BÚSQUEDA Y ACCIONES */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8E2D8] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif-title font-semibold text-[#2D2721]">
              Historial de Ventas
            </h2>
            <p className="text-xs text-slate-500">
              Consulta registros filtrados por mes o por nombre de cliente
            </p>
          </div>

          {/* Botones de acción (Exportar y Sincronizar) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-[#FAF7F2] hover:bg-[#F0EBE1] border border-[#D8CFC4] rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Descargar archivo CSV compatible con Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#D49A2A]" />
              <span>Descargar CSV / Excel</span>
            </button>

            <button
              onClick={handleSyncFromSheets}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#D49A2A] hover:bg-[#BD851D] active:bg-[#A57416] rounded-xl transition-all cursor-pointer shadow-2xs disabled:bg-slate-300"
              title="Consultar datos de Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Sincronizando...' : 'Recargar Hoja'}</span>
            </button>
          </div>
        </div>

        {refreshNotice && (
          <div className="p-3 bg-[#FAF5EC] border border-[#ECD9BA] text-[#7A5007] text-xs rounded-xl font-medium animate-in fade-in">
            {refreshNotice}
          </div>
        )}

        {/* FILTROS: SELECTOR DE MES Y BUSCADOR POR CLIENTE */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#F0EBE1]">
          {/* Filtro por Mes */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#D49A2A]" />
              Filtro por Mes
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D49A2A]"
            >
              {MESES.map(mes => (
                <option key={mes.value} value={mes.value}>
                  {mes.label}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador Rápido por Nombre de Cliente */}
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#D49A2A]" />
              Buscador por Nombre de Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchClient}
                onChange={e => setSearchClient(e.target.value)}
                placeholder="Buscar cliente por nombre..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {searchClient && (
                <button
                  onClick={() => setSearchClient('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Selector de Modo de Vista */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Modo de Vista
            </label>
            <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#D8CFC4]">
              <button
                type="button"
                onClick={() => setViewMode('rows')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  viewMode === 'rows'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Exacto a Google Sheets (Fila por fila)"
              >
                <List className="w-3.5 h-3.5" />
                <span>Renglones</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('orders')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  viewMode === 'orders'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Agrupado por pedido y cliente"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Pedido</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE TABLA DE REGISTROS */}
      {viewMode === 'rows' ? (
        /* VISTA 1: RENGLÓN POR RENGLÓN (ESTRICTO GOOGLE SHEETS) */
        <div className="bg-white rounded-2xl border border-[#E8E2D8] shadow-sm overflow-hidden">
          <div className="p-4 bg-[#FAF7F2] border-b border-[#E8E2D8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D49A2A]"></span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Estructura Exacta de Fila 1 en Google Sheets ({filteredRows.length} renglones)
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Numero_Pedido · Fecha · Cliente · Direccion · Producto · Tamaño · Cantidad · Precio_Unitario · Subtotal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#D49A2A] text-white text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5 text-center font-mono">Numero_Pedido</th>
                  <th className="py-3 px-3.5">Fecha</th>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3.5">Direccion</th>
                  <th className="py-3 px-3.5">Producto</th>
                  <th className="py-3 px-3.5 text-center">Tamaño</th>
                  <th className="py-3 px-3.5 text-center font-mono">Cantidad</th>
                  <th className="py-3 px-3.5 text-right font-mono">Precio_Unitario</th>
                  <th className="py-3 px-3.5 text-right font-mono">Subtotal</th>
                  <th className="py-3 px-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1] text-slate-700">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                      No se encontraron ventas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#FAF7F2] transition-colors"
                    >
                      {/* Numero_Pedido */}
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-[#9E6C12]">
                        #{row.Numero_Pedido}
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {row.Fecha}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3.5 font-medium text-slate-900">
                        {row.Cliente}
                      </td>

                      {/* Direccion */}
                      <td className="py-3 px-3.5 text-slate-500 max-w-xs truncate" title={row.Direccion}>
                        {row.Direccion}
                      </td>

                      {/* Producto */}
                      <td className="py-3 px-3.5 font-medium text-slate-800">
                        {row.Producto}
                      </td>

                      {/* Tamaño */}
                      <td className="py-3 px-3.5 text-center">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {row.Tamaño}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-800">
                        {row.Cantidad}
                      </td>

                      {/* Precio_Unitario */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-600">
                        ${row.Precio_Unitario.toFixed(2)}
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                        ${row.Subtotal.toFixed(2)}
                      </td>

                      {/* Acción para eliminar registro */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const found = orders.find(o => o.numeroPedido === row.Numero_Pedido);
                            if (found) setOrderToDelete(found);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title={`Eliminar Pedido #${row.Numero_Pedido}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Borrar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISTA 2: AGRUPADA POR PEDIDO CON DESGLOSE */
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E2D8] text-slate-400">
              No hay pedidos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredOrders.map(order => {
              const isExpanded = !!expandedOrders[order.numeroPedido];
              return (
                <div
                  key={order.numeroPedido}
                  className="bg-white rounded-2xl border border-[#E8E2D8] shadow-sm overflow-hidden transition-all"
                >
                  <div
                    onClick={() => toggleOrderExpand(order.numeroPedido)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF7F2] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-[#FAF5EC] text-[#D49A2A] border border-[#ECD9BA] flex items-center justify-center font-mono font-bold text-sm shadow-2xs">
                        #{order.numeroPedido}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-base">
                            {order.cliente}
                          </h3>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {order.fecha}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.direccion} · {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-12 sm:pl-0">
                      <div className="text-right">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                          Gran Total
                        </span>
                        <span className="text-lg font-bold font-mono tabular-nums text-[#9E6C12]">
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
                          className="px-3 py-1.5 text-xs font-semibold text-[#9E6C12] bg-[#FAF5EC] hover:bg-[#F3E5CF] border border-[#ECD9BA] rounded-lg transition-colors cursor-pointer"
                          title="Ver comprobante para imprimir o enviar"
                        >
                          Ver Recibo
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderToDelete(order);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          title={`Eliminar Pedido #${order.numeroPedido}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detalle expandido con los renglones del pedido */}
                  {isExpanded && (
                    <div className="p-4 bg-[#FDFAF6] border-t border-[#F0EBE1] animate-in fade-in duration-150">
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Desglose de productos que comparten el Numero_Pedido #{order.numeroPedido}:
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 uppercase tracking-wider border-b border-[#E8E2D8]">
                              <th className="py-2 px-3">Producto</th>
                              <th className="py-2 px-3 text-center">Tamaño</th>
                              <th className="py-2 px-3 text-center">Cantidad</th>
                              <th className="py-2 px-3 text-right">Precio Unitario</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F0EBE1] text-slate-700">
                            {order.items.map((item, iIndex) => (
                              <tr key={item.id || iIndex}>
                                <td className="py-2 px-3 font-medium text-slate-900">{item.producto}</td>
                                <td className="py-2 px-3 text-center">{item.tamano}</td>
                                <td className="py-2 px-3 text-center font-mono font-semibold">{item.cantidad}</td>
                                <td className="py-2 px-3 text-right font-mono">${item.precioUnitario.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  ${item.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL DE CONFIRMACIÓN PARA ELIMINAR REGISTRO GUARDADO
         ========================================================================= */}
      {orderToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setOrderToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl border border-[#E2D9CC] shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabecera del diálogo */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  ¿Eliminar Pedido #{orderToDelete.numeroPedido}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta acción solicitará confirmación antes de borrar el registro.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                title="Cerrar sin borrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ficha resumen del registro a eliminar */}
            <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-900">{orderToDelete.cliente}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Fecha:</span>
                <span className="font-medium text-slate-800">{orderToDelete.fecha}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500">Dirección:</span>
                <span className="font-medium text-slate-800 max-w-[210px] text-right truncate">
                  {orderToDelete.direccion}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 pt-2 border-t border-[#E8E2D8]">
                <span className="text-slate-500 font-medium">Gran Total del pedido:</span>
                <span className="font-mono font-bold text-sm text-[#9E6C12]">
                  ${orderToDelete.granTotal.toFixed(2)}
                </span>
              </div>

              {/* Lista de renglones/productos incluidos */}
              <div className="pt-2 border-t border-[#E8E2D8]">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Productos incluidos ({orderToDelete.items.length} {orderToDelete.items.length === 1 ? 'renglón' : 'renglones'}):
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {orderToDelete.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-600 bg-white/60 p-1.5 rounded-lg border border-[#E8E2D8]/60">
                      <span className="truncate pr-2 font-medium">• {it.producto} ({it.tamano})</span>
                      <span className="font-mono shrink-0 text-slate-800 font-semibold">
                        {it.cantidad}x (${it.subtotal.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso de advertencia */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                ¿Estás seguro de que deseas borrar este registro? Se quitarán todos los renglones correspondientes al <strong>Pedido #{orderToDelete.numeroPedido}</strong> del historial y de Google Sheets.
              </p>
            </div>

            {/* Botones de acción (Cancelar vs Confirmar eliminación) */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando pedido...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
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
