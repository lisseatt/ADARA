/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  History, 
  FileSpreadsheet, 
  Package, 
  Plus, 
  CheckCircle,
  ExternalLink,
  Sparkles,
  Leaf
} from 'lucide-react';
import { SaleOrder } from './types/sales';
import { 
  getStoredOrders, 
  saveOrdersLocally, 
  getScriptUrl, 
  saveScriptUrl, 
  deleteOrderFromStorageAndSheets,
  fetchGlobalNextOrderNumber,
  fetchLiveSheetData
} from './services/sheetsService';
import { NewSaleForm } from './components/NewSaleForm';
import { SalesHistory } from './components/SalesHistory';
import { GoogleSheetsGuide } from './components/GoogleSheetsGuide';
import { OrderReceiptModal } from './components/OrderReceiptModal';
import { AdaraLogo } from './components/AdaraLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<'nueva_venta' | 'historial' | 'google_sheets'>('nueva_venta');
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [receiptOrder, setReceiptOrder] = useState<SaleOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [globalNextOrderNumber, setGlobalNextOrderNumber] = useState<number>(1);
  const [isSyncingGlobalNumber, setIsSyncingGlobalNumber] = useState<boolean>(false);

  // Cargar pedidos y URL almacenada al iniciar, y sincronizar con Google Sheets
  useEffect(() => {
    const loadedOrders = getStoredOrders();
    setOrders(loadedOrders);
    const loadedUrl = getScriptUrl();
    setScriptUrl(loadedUrl);

    // Calcular inicialmente con datos locales
    const localMax = loadedOrders.length > 0 
      ? Math.max(...loadedOrders.map(o => Number(o.numeroPedido) || 0)) 
      : 0;
    setGlobalNextOrderNumber(Math.max(1, localMax + 1));

    // Si hay URL de Google Sheets, consultar datos existentes en la nube
    // para detectar el número más alto registrado y garantizar sincronización global
    if (loadedUrl) {
      syncWithGoogleSheets(loadedUrl, loadedOrders);
    }
  }, []);

  const syncWithGoogleSheets = async (url: string, currentLocalOrders: SaleOrder[]) => {
    setIsSyncingGlobalNumber(true);
    try {
      const res = await fetchLiveSheetData(url);
      if (res.success && res.rows) {
        let maxSheets = 0;
        const rowsByOrder: Record<number, any[]> = {};

        res.rows.forEach(r => {
          const num = Number(r.Numero_Pedido) || 0;
          if (num > maxSheets) maxSheets = num;

          if (num > 0) {
            if (!rowsByOrder[num]) rowsByOrder[num] = [];
            rowsByOrder[num].push(r);
          }
        });

        // Reconstruir lista consolidada de pedidos si Sheets tiene registros
        const mergedOrdersMap = new Map<number, SaleOrder>();
        
        // Agregar pedidos locales existentes
        currentLocalOrders.forEach(o => {
          mergedOrdersMap.set(o.numeroPedido, o);
        });

        // Complementar con los pedidos descargados de Sheets
        Object.entries(rowsByOrder).forEach(([numStr, rList]) => {
          const num = Number(numStr);
          if (!mergedOrdersMap.has(num)) {
            const first = rList[0];
            const items = rList.map((itemRow, idx) => ({
              id: `sheet-${num}-${idx}`,
              producto: String(itemRow.Producto || ''),
              tamano: String(itemRow.Tamaño || '250 ml'),
              tamanoTipo: '250 ml' as any,
              cantidad: Number(itemRow.Cantidad) || 1,
              precioUnitario: Number(itemRow.Precio_Unitario) || 0,
              subtotal: Number(itemRow.Subtotal) || 0
            }));
            const gTotal = Math.round(items.reduce((acc, it) => acc + it.subtotal, 0) * 100) / 100;
            mergedOrdersMap.set(num, {
              numeroPedido: num,
              fecha: String(first.Fecha || ''),
              cliente: String(first.Cliente || ''),
              direccion: String(first.Direccion || ''),
              items,
              granTotal: gTotal,
              createdAt: new Date().toISOString(),
              syncedToSheets: true
            });
          }
        });

        const mergedOrders = Array.from(mergedOrdersMap.values()).sort((a, b) => b.numeroPedido - a.numeroPedido);
        setOrders(mergedOrders);
        saveOrdersLocally(mergedOrders);

        const absoluteMax = Math.max(
          ...mergedOrders.map(o => Number(o.numeroPedido) || 0),
          maxSheets
        );
        const consecutiveNext = Math.max(1, absoluteMax + 1);
        setGlobalNextOrderNumber(consecutiveNext);
      }
    } catch (err) {
      console.warn('Error al sincronizar número global desde Google Sheets al iniciar:', err);
    } finally {
      setIsSyncingGlobalNumber(false);
    }
  };

  // Número consecutivo global calculado
  const nextOrderNumber = React.useMemo(() => {
    const localMax = orders.length > 0 
      ? Math.max(...orders.map(o => Number(o.numeroPedido) || 0)) 
      : 0;
    return Math.max(globalNextOrderNumber, localMax + 1);
  }, [orders, globalNextOrderNumber]);

  const handleOrderSaved = (newOrder: SaleOrder) => {
    const updated = [newOrder, ...orders.filter(o => o.numeroPedido !== newOrder.numeroPedido)];
    setOrders(updated);
    saveOrdersLocally(updated);

    // Incrementar de forma consecutiva
    const nextVal = Math.max(newOrder.numeroPedido + 1, nextOrderNumber + 1);
    setGlobalNextOrderNumber(nextVal);

    showToast(`✓ ¡Venta del pedido #${newOrder.numeroPedido} guardada con éxito!`);
  };

  const handleDeleteOrder = async (orderNumber: number) => {
    const res = await deleteOrderFromStorageAndSheets(orderNumber, scriptUrl);
    setOrders(res.updatedOrders);
    showToast(`✓ El pedido #${orderNumber} fue eliminado de tu lista.`);
  };

  const handleUrlUpdated = (newUrl: string) => {
    setScriptUrl(newUrl);
    saveScriptUrl(newUrl);
    showToast(newUrl ? '✓ Enlace de Google Sheets guardado correctamente' : 'Modo sin conexión activado');
    if (newUrl) {
      syncWithGoogleSheets(newUrl, orders);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1612] flex flex-col antialiased selection:bg-[#D49A2A]/30 selection:text-[#1A1612] min-w-[320px]">
      {/* =========================================================================
          ENCABEZADO PRINCIPAL (Optimizado para sol y navegación con una mano)
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2] border-b-2 border-[#D8CFC4] shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Logo oficial Adara */}
          <a 
            href="#home" 
            onClick={(e) => { e.preventDefault(); setActiveTab('nueva_venta'); }}
            className="hover:opacity-90 transition-opacity cursor-pointer py-1"
            title="Adara Cosmética Natural"
          >
            <AdaraLogo variant="horizontal" size={38} />
          </a>

          {/* Estado de conexión con Google Sheets (Texto de 16px, alto contraste) */}
          <button
            onClick={() => setActiveTab('google_sheets')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-base font-bold border-2 transition-colors cursor-pointer ${
              scriptUrl
                ? 'bg-[#FAF5EC] border-[#B8801A] text-[#1A1612]'
                : 'bg-amber-100/70 border-amber-500 text-[#1A1612] hover:bg-amber-200'
            }`}
            title={scriptUrl ? 'Sincronizado con Google Sheets' : 'Configura tu hoja de cálculo'}
          >
            <span className={`w-3 h-3 rounded-full ${scriptUrl ? 'bg-[#15803D]' : 'bg-amber-600 animate-pulse'}`}></span>
            <span>{scriptUrl ? 'Hoja Conectada' : 'Conectar Hoja'}</span>
          </button>
        </div>

        {/* Barra de pestañas táctil: Botones amplios para el pulgar, texto de 16px */}
        <nav className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-1.5 overflow-x-auto border-t border-[#E8DFC8] bg-[#F4EFE6]">
          <button
            onClick={() => setActiveTab('nueva_venta')}
            className={`flex-1 min-h-[48px] px-3 py-2.5 text-base font-bold rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'nueva_venta'
                ? 'bg-[#1A1612] text-white shadow-sm'
                : 'text-[#1A1612] hover:bg-[#EAE2D5] border border-transparent'
            }`}
          >
            Registrar Venta
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex-1 min-h-[48px] px-3 py-2.5 text-base font-bold rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-[#1A1612] text-white shadow-sm'
                : 'text-[#1A1612] hover:bg-[#EAE2D5] border border-transparent'
            }`}
          >
            Historial ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('google_sheets')}
            className={`flex-1 min-h-[48px] px-3 py-2.5 text-base font-bold rounded-xl transition-all text-center cursor-pointer ${
              activeTab === 'google_sheets'
                ? 'bg-[#1A1612] text-white shadow-sm'
                : 'text-[#1A1612] hover:bg-[#EAE2D5] border border-transparent'
            }`}
          >
            Google Sheets
          </button>
        </nav>
      </header>

      {/* Mensaje flotante de confirmación (Toast): 16px, alto contraste */}
      {toastMessage && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 bg-[#1A1612] text-white text-base font-bold p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200 border-2 border-[#D49A2A]">
          <CheckCircle className="w-6 h-6 text-[#F5C242] shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          CONTENIDO PRINCIPAL
         ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 md:py-8">
        {activeTab === 'nueva_venta' && (
          <NewSaleForm
            nextOrderNumber={nextOrderNumber}
            onOrderSaved={handleOrderSaved}
            onOpenReceipt={order => setReceiptOrder(order)}
            scriptUrl={scriptUrl}
          />
        )}

        {activeTab === 'historial' && (
          <SalesHistory
            orders={orders}
            scriptUrl={scriptUrl}
            onRefreshData={() => setOrders(getStoredOrders())}
            onViewReceipt={order => setReceiptOrder(order)}
            onDeleteOrder={handleDeleteOrder}
            onGoToNewSale={() => setActiveTab('nueva_venta')}
          />
        )}

        {activeTab === 'google_sheets' && (
          <GoogleSheetsGuide
            currentUrl={scriptUrl}
            onUrlUpdated={handleUrlUpdated}
          />
        )}
      </main>

      {/* Modal de Comprobante / Recibo para cliente */}
      <OrderReceiptModal
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />

      {/* Pie de página con alto contraste y texto de 16px */}
      <footer className="mt-auto border-t-2 border-[#D8CFC4] py-6 text-base font-medium text-[#1A1612] bg-[#FAF7F2] no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <AdaraLogo variant="symbol" size={26} />
            <span className="font-bold text-[#1A1612]">Adara Cosmética Natural</span>
            <span className="text-[#5C4A3A]">·</span>
            <span>Control de Ventas y Pedidos</span>
          </div>

          <div className="text-base font-medium text-[#4A3D30]">
            Columnas en Sheets: Pedido · Fecha · Cliente · Dirección · Producto · Tamaño · Cantidad · Precio · Subtotal
          </div>
        </div>
      </footer>
    </div>
  );
}
