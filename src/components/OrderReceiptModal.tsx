import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Check, 
  Receipt, 
  Sparkles,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { SaleOrder } from '../types/sales';

import { AdaraLogo } from './AdaraLogo';

interface OrderReceiptModalProps {
  order: SaleOrder | null;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  onClose
}) => {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = async () => {
    const lines = [
      `🌿 *Adara Cosmética Natural*`,
      `📦 *Comprobante de Venta - Pedido #${order.numeroPedido}*`,
      `📅 Fecha: ${order.fecha}`,
      `👤 Cliente: ${order.cliente}`,
      `📍 Dirección: ${order.direccion}`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Detalle de Productos:*`
    ];

    order.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.producto} (${item.tamano}) x${item.cantidad} - $${item.subtotal.toFixed(2)}`);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`*GRAN TOTAL: $${order.granTotal.toFixed(2)}*`);
    lines.push(`¡Gracias por apoyar la cosmética limpia y natural! 🌸`);

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      // Fallback
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl border border-[#E2D9CC] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado modal */}
        <div className="p-4 bg-[#FAF7F2] border-b border-[#E8E2D8] flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D49A2A]" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Comprobante de Venta - Pedido #{order.numeroPedido}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL TICKET IMPRIMIBLE */}
        <div className="p-6 overflow-y-auto space-y-5 print:p-0">
          {/* Cabecera del ticket con Logo Adara */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 flex flex-col items-center">
            <AdaraLogo variant="full" size={28} className="mb-1" />
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#ECD9BA] text-[#D49A2A] font-mono font-bold text-xs">
              PEDIDO #{order.numeroPedido}
            </div>
          </div>

          {/* Datos del Cliente y Fecha */}
          <div className="text-xs space-y-1.5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha:</span>
              <span className="font-semibold text-slate-900">{order.fecha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-semibold text-slate-900">{order.cliente}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Dirección:</span>
              <span className="font-medium text-slate-700 max-w-[240px] text-right truncate">
                {order.direccion}
              </span>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Productos Comprados
            </div>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-medium pb-1">
                  <th className="py-1">Cant · Producto</th>
                  <th className="py-1 text-center">Tamaño</th>
                  <th className="py-1 text-right">P. Unit</th>
                  <th className="py-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="py-1.5">
                    <td className="py-1.5 font-medium text-slate-900">
                      <span className="font-mono font-bold">{item.cantidad}x</span> {item.producto}
                    </td>
                    <td className="py-1.5 text-center text-slate-600">
                      {item.tamano}
                    </td>
                    <td className="py-1.5 text-right font-mono text-slate-500">
                      ${item.precioUnitario.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gran Total */}
          <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-baseline">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Gran Total:
            </span>
            <span className="text-2xl font-bold font-mono text-[#9E6C12]">
              ${order.granTotal.toFixed(2)}
            </span>
          </div>

          <div className="text-center pt-2 text-[11px] text-slate-400 italic">
            Elaborado con ingredientes 100% naturales, libre de crueldad animal.
          </div>
        </div>

        {/* Acciones en la parte inferior */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E2D8] flex flex-col sm:flex-row gap-2.5 no-print">
          <button
            onClick={handleCopyWhatsApp}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Copiado para WhatsApp!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-[#D8CFC4] hover:bg-[#F0EBE1] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
