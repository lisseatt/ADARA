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
import { getStoredOrders, saveOrdersLocally, getScriptUrl, saveScriptUrl, deleteOrderFromStorageAndSheets } from './services/sheetsService';
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

  // Cargar pedidos y URL almacenada al iniciar
  useEffect(() => {
    const loadedOrders = getStoredOrders();
    setOrders(loadedOrders);
    const loadedUrl = getScriptUrl();
    setScriptUrl(loadedUrl);
  }, []);

  // Calcular el próximo número de pedido secuencial incremental (1, 2, 3...)
  const nextOrderNumber = React.useMemo(() => {
    if (orders.length === 0) return 1;
    const maxNum = Math.max(...orders.map(o => o.numeroPedido || 0));
    return Math.max(1, maxNum + 1);
  }, [orders]);

  const handleOrderSaved = (newOrder: SaleOrder) => {
    const updated = [newOrder, ...orders];
    setOrders(updated);
    saveOrdersLocally(updated);
    showToast(`✓ Pedido #${newOrder.numeroPedido} registrado correctamente`);
  };

  const handleDeleteOrder = async (orderNumber: number) => {
    const res = await deleteOrderFromStorageAndSheets(orderNumber, scriptUrl);
    setOrders(res.updatedOrders);
    showToast(`✓ ${res.message}`);
  };

  const handleUrlUpdated = (newUrl: string) => {
    setScriptUrl(newUrl);
    saveScriptUrl(newUrl);
    showToast(newUrl ? '✓ URL de Google Apps Script actualizada' : 'Modo local activado');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#24201C] flex flex-col antialiased selection:bg-[#D49A2A]/25 selection:text-[#1F1C18]">
      {/* =========================================================================
          TOP BAR CONTRACT (Cumplimiento de la Constitución Frontend)
          Zone 1: Logo Oficial Adara (Ilustración lineal + Dorado cálido)
          Zone 2: Navegación de pestañas limpias
          Zone 3: Acción primaria / Estado de Google Sheets
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFC8] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Zone 1: Logo oficial Adara */}
          <a 
            href="#home" 
            onClick={(e) => { e.preventDefault(); setActiveTab('nueva_venta'); }}
            className="hover:opacity-90 transition-opacity cursor-pointer py-1"
            title="Adara Cosmética Natural"
          >
            <AdaraLogo variant="horizontal" size={36} />
          </a>

          {/* Zone 2: Navigation Links / Segmented Control */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#F0EBE1] rounded-xl border border-[#E2D9CC]">
            <button
              onClick={() => setActiveTab('nueva_venta')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'nueva_venta'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nueva Venta
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'historial'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historial & Filtros ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('google_sheets')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'google_sheets'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Conectar Google Sheets
            </button>
          </nav>

          {/* Zone 3: Primary Action & Sheets Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('google_sheets')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                scriptUrl
                  ? 'bg-[#FDF6E9] border-[#EED7B0] text-[#9E6C12]'
                  : 'bg-amber-50/80 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
              title={scriptUrl ? 'Sincronizado con Google Sheets' : 'Configura tu script de Google Sheets'}
            >
              <span className={`w-2 h-2 rounded-full ${scriptUrl ? 'bg-[#D49A2A]' : 'bg-amber-500 animate-pulse'}`}></span>
              <span>{scriptUrl ? 'Google Sheets Conectado' : 'Conectar Sheets'}</span>
            </button>

            <button
              onClick={() => setActiveTab('nueva_venta')}
              className="px-3.5 py-1.5 bg-[#D49A2A] hover:bg-[#BD851D] text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Venta</span>
            </button>
          </div>
        </div>

        {/* Barra de navegación inferior móvil */}
        <div className="md:hidden flex items-center justify-around border-t border-[#E8DFC8] bg-[#FAF5EB] px-2 py-1.5 text-[11px] font-medium">
          <button
            onClick={() => setActiveTab('nueva_venta')}
            className={`py-1 px-2.5 rounded-md ${activeTab === 'nueva_venta' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'}`}
          >
            Registrar Venta
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`py-1 px-2.5 rounded-md ${activeTab === 'historial' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'}`}
          >
            Historial ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('google_sheets')}
            className={`py-1 px-2.5 rounded-md ${activeTab === 'google_sheets' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'}`}
          >
            Google Sheets
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E1B18] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 border border-[#D49A2A]/40">
          <CheckCircle className="w-4 h-4 text-[#E5A825] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          CONTENIDO PRINCIPAL
         ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
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

      {/* Footer Minimalista (Cumplimiento de la Constitución de Diseño) */}
      <footer className="mt-auto border-t border-[#E8DFC8] py-6 text-xs text-slate-500 bg-[#FAF7F2] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AdaraLogo variant="symbol" size={22} />
            <span className="font-semibold text-slate-800">Adara Cosmética Natural</span>
            <span>·</span>
            <span>Registro de Ventas & Control de Pedidos</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Columnas Fila 1: Numero_Pedido | Fecha | Cliente | Direccion | Producto | Tamaño | Cantidad | Precio_Unitario | Subtotal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
