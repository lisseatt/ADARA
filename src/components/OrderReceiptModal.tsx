import React, { useState, useRef } from 'react';
import { 
  X, 
  Share2, 
  Check, 
  Receipt,
  Download,
  Loader2
} from 'lucide-react';
import { toPng } from 'html-to-image';
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
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handleDownloadImage = async () => {
    if (!receiptCardRef.current || isDownloadingImage) return;

    try {
      setIsDownloadingImage(true);
      setDownloadError(null);

      // Pequeña pausa para asegurar renderizado perfecto de fuentes y layout
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(receiptCardRef.current, {
        quality: 0.98,
        pixelRatio: 2.5, // Alta resolución para que se vea ultra nítido en WhatsApp
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });

      // Crear enlace de descarga y disparar descarga de imagen PNG
      const link = document.createElement('a');
      link.download = `Recibo_ADARA_Pedido_${order.numeroPedido}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Error generando imagen del recibo:', err);
      setDownloadError('No se pudo generar la imagen. Intenta de nuevo.');
      setTimeout(() => setDownloadError(null), 4000);
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleCopyWhatsApp = async () => {
    const lines = [
      `🌿 *ADARA COSMÉTICA NATURAL*`,
      `📦 *Comprobante de Venta - Pedido #${order.numeroPedido}*`,
      `📅 Fecha: ${order.fecha}`,
      `👤 Cliente: ${order.cliente}`,
      `📍 Dirección: ${order.direccion}`,
      `━━━━━━━━━━━━━━━━━━`,
      `*Detalle de Productos:*`
    ];

    order.items.forEach((item, index) => {
      const discountText = item.descuento && item.descuento > 0 ? ` (Desc: -$${item.descuento.toFixed(2)})` : '';
      lines.push(`${index + 1}. ${item.producto} (${item.tamano}) x${item.cantidad} - $${item.subtotal.toFixed(2)}${discountText}`);
    });

    if (order.descuentoGeneral && order.descuentoGeneral > 0) {
      lines.push(`🏷️ Descuento general: -$${order.descuentoGeneral.toFixed(2)}`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`*GRAN TOTAL: $${order.granTotal.toFixed(2)}*`);
    lines.push(`¡Gracias por elegir la cosmética limpia y natural! 🌸`);

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    } catch {
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl border-2 border-[#C4B5A5] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[94vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del modal */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b-2 border-[#E8DFC8] flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-[#B8801A]" />
            <h3 className="font-bold text-[#1A1612] text-xl">
              Recibo del Pedido #{order.numeroPedido}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6B5A4B] hover:text-[#1A1612] rounded-xl cursor-pointer"
            title="Cerrar recibo"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENEDOR DESCARGABLE COMO IMAGEN PNG */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div 
            ref={receiptCardRef}
            className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-[#D8CFC4] space-y-4 shadow-xs"
          >
            {/* Logo y Encabezado Oficial Adara Cosmética Natural sin dibujos */}
            <div className="text-center pb-4 border-b-2 border-dashed border-[#C4B5A5] flex flex-col items-center">
              <AdaraLogo variant="full" className="mb-2" />
              <div className="mt-2 inline-flex items-center px-4 py-1.5 rounded-full bg-[#FAF5EC] border-2 border-[#B8801A] text-[#1A1612] font-mono font-extrabold text-base">
                COMPROBANTE DE COMPRA · PEDIDO #{order.numeroPedido}
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="text-base space-y-2 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DFC8]">
              <div className="flex justify-between">
                <span className="text-[#5C4A3A] font-medium">Fecha:</span>
                <span className="font-bold text-[#1A1612]">{order.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C4A3A] font-medium">Cliente:</span>
                <span className="font-bold text-[#1A1612]">{order.cliente}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[#5C4A3A] font-medium shrink-0">Dirección:</span>
                <span className="font-bold text-[#1A1612] max-w-[240px] text-right">
                  {order.direccion}
                </span>
              </div>
            </div>

            {/* Lista de Productos Comprados */}
            <div className="space-y-2.5">
              <div className="text-base font-bold uppercase tracking-wider text-[#1A1612]">
                Detalle del Pedido:
              </div>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8DFC8] flex flex-wrap items-center justify-between gap-2 text-base"
                  >
                    <div>
                      <span className="font-extrabold text-[#1A1612] font-mono mr-1.5">{item.cantidad}x</span>
                      <span className="font-bold text-[#1A1612]">{item.producto}</span>
                      <span className="text-[#5C4A3A] ml-1.5 font-medium">({item.tamano})</span>
                      {item.descuento && item.descuento > 0 ? (
                        <span className="ml-2 inline-block text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                          Desc: -${item.descuento.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                    <div className="font-mono font-extrabold text-[#1A1612]">
                      ${item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Descuento general si aplica */}
            {order.descuentoGeneral && order.descuentoGeneral > 0 ? (
              <div className="flex justify-between items-center px-1 text-base text-emerald-900 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-300">
                <span>🏷️ Descuento general aplicado:</span>
                <span className="font-mono">-${order.descuentoGeneral.toFixed(2)}</span>
              </div>
            ) : null}

            {/* Gran Total */}
            <div className="pt-3 border-t-2 border-[#1A1612] flex justify-between items-baseline">
              <span className="text-xl font-bold uppercase text-[#1A1612]">
                Total Pagado:
              </span>
              <span className="text-3xl font-extrabold font-mono text-[#B8801A]">
                ${order.granTotal.toFixed(2)}
              </span>
            </div>

            <div className="text-center pt-2 text-base text-[#5C4A3A] font-medium italic border-t border-dashed border-[#E8DFC8]">
              Cosmética natural y artesanal · ¡Gracias por tu compra!
            </div>
          </div>

          {downloadError && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-800 text-sm font-bold rounded-xl text-center">
              {downloadError}
            </div>
          )}
        </div>

        {/* ACCIONES DEL MODAL:
            1 botón principal (Descargar Recibo en imagen PNG)
            + botón secundario de Copiar WhatsApp y Cerrar
        */}
        <div className="p-4 bg-[#FAF7F2] border-t-2 border-[#E8DFC8] flex flex-col sm:flex-row gap-2.5 no-print">
          {/* BOTÓN PRINCIPAL: Descargar Recibo como Imagen (PNG) */}
          <button
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="flex-1 min-h-[50px] py-3 px-5 bg-[#B8801A] hover:bg-[#9E6C12] active:bg-[#855B0F] disabled:bg-[#D8CFC4] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            title="Descargar recibo como imagen PNG lista para enviar por WhatsApp"
          >
            {isDownloadingImage ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generando recibo...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Descargar Recibo</span>
              </>
            )}
          </button>

          {/* BOTÓN SECUNDARIO: Copiar texto para WhatsApp */}
          <button
            onClick={handleCopyWhatsApp}
            className="min-h-[50px] py-3 px-4 bg-white hover:bg-[#FAF7F2] border-2 border-[#15803D] text-[#15803D] rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Copiar texto resumen para WhatsApp"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-5 h-5 text-[#15803D]" />
                <span>¡Texto Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 text-[#15803D]" />
                <span>Copiar para WhatsApp</span>
              </>
            )}
          </button>

          {/* BOTÓN SECUNDARIO: Cerrar */}
          <button
            onClick={onClose}
            className="min-h-[50px] py-3 px-4 bg-white hover:bg-[#FAF7F2] border-2 border-[#6B5A4B] text-[#1A1612] rounded-xl text-base font-bold flex items-center justify-center cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

