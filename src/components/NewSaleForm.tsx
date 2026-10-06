import React, { useState, useId } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  Hash, 
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Search
} from 'lucide-react';
import { CartItem, ProductSizePreset, SaleOrder } from '../types/sales';
import { ARTISAN_CATALOG_PRESETS, ProductPreset } from '../data/artisanProducts';
import { sendOrderToGoogleSheets } from '../services/sheetsService';

interface NewSaleFormProps {
  nextOrderNumber: number;
  onOrderSaved: (savedOrder: SaleOrder) => void;
  onOpenReceipt: (order: SaleOrder) => void;
  scriptUrl: string;
}

export const NewSaleForm: React.FC<NewSaleFormProps> = ({
  nextOrderNumber,
  onOrderSaved,
  onOpenReceipt,
  scriptUrl
}) => {
  // Fecha actual en formato YYYY-MM-DD (solo fecha, sin hora)
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [fecha, setFecha] = useState<string>(getTodayDateString());
  const [cliente, setCliente] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('');
  const [orderNumberOverride, setOrderNumberOverride] = useState<number>(nextOrderNumber);

  // Inicializar con un producto vacío
  const [items, setItems] = useState<CartItem[]>([
    {
      id: 'item-1',
      producto: '',
      tamano: '250 ml',
      tamanoTipo: '250 ml',
      cantidad: 1,
      precioUnitario: 0,
      subtotal: 0
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState<string>('all');
  const [suggestionQuery, setSuggestionQuery] = useState<string>('');

  // Actualizar el número de pedido cuando cambia desde las props si no se ha modificado manualmente
  React.useEffect(() => {
    setOrderNumberOverride(nextOrderNumber);
  }, [nextOrderNumber]);

  // Cálculos en tiempo real
  const granTotal = items.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const totalUnidades = items.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);

  // Filtrado de sugerencias de catálogo
  const filteredPresets = React.useMemo(() => {
    return ARTISAN_CATALOG_PRESETS.filter(p => {
      if (suggestionCategory !== 'all' && p.category !== suggestionCategory) return false;
      if (suggestionQuery.trim()) {
        const q = suggestionQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSize = p.customSizeText ? p.customSizeText.toLowerCase().includes(q) : p.defaultSize.toLowerCase().includes(q);
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        if (!matchName && !matchSize && !matchDesc) return false;
      }
      return true;
    });
  }, [suggestionCategory, suggestionQuery]);

  // Manejo de filas del carrito
  const handleAddItem = (preset?: ProductPreset) => {
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    if (preset) {
      const isPresetSizeStandard = ['250 ml', '500 ml', '120 ml', '60 ml', '8 oz', '4 oz', '125 gr'].includes(preset.defaultSize);
      const resolvedSize = isPresetSizeStandard ? (preset.defaultSize === '4 oz' ? '4 onz' : preset.defaultSize) : (preset.customSizeText || 'Personalizado');
      const sub = preset.defaultPrice * 1;

      // Si sólo hay una fila y está sin rellenar, sustituirla directamente
      if (items.length === 1 && items[0].producto.trim() === '' && items[0].precioUnitario === 0) {
        setItems([
          {
            id: items[0].id,
            producto: preset.name,
            tamano: resolvedSize,
            tamanoTipo: preset.defaultSize,
            cantidad: 1,
            precioUnitario: preset.defaultPrice,
            subtotal: sub
          }
        ]);
        return;
      }

      setItems(prev => [
        ...prev,
        {
          id: newItemId,
          producto: preset.name,
          tamano: resolvedSize,
          tamanoTipo: preset.defaultSize,
          cantidad: 1,
          precioUnitario: preset.defaultPrice,
          subtotal: sub
        }
      ]);
    } else {
      setItems(prev => [
        ...prev,
        {
          id: newItemId,
          producto: '',
          tamano: '250 ml',
          tamanoTipo: '250 ml',
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0
        }
      ]);
    }
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      // Si sólo queda un producto, vaciar sus datos para quitarlo por completo
      setItems([
        {
          id: `item-${Date.now()}`,
          producto: '',
          tamano: '250 ml',
          tamanoTipo: '250 ml',
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0
        }
      ]);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleClearAllItems = () => {
    setItems([
      {
        id: `item-${Date.now()}`,
        producto: '',
        tamano: '250 ml',
        tamanoTipo: '250 ml',
        cantidad: 1,
        precioUnitario: 0,
        subtotal: 0
      }
    ]);
  };

  const handleUpdateItem = (id: string, updates: Partial<CartItem>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };
        
        // Recalcular subtotal si cambian cantidad o precioUnitario
        if (updates.cantidad !== undefined || updates.precioUnitario !== undefined) {
          const qty = Number(updated.cantidad) || 0;
          const price = Number(updated.precioUnitario) || 0;
          updated.subtotal = Math.round(qty * price * 100) / 100;
        }

        return updated;
      })
    );
  };

  const handleSizePresetChange = (id: string, preset: ProductSizePreset) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          tamanoTipo: preset,
          tamano: preset === 'Otro' ? '' : (preset === '4 oz' ? '4 onz' : preset)
        };
      })
    );
  };

  const handleApplyPresetToItem = (id: string, preset: ProductPreset) => {
    handleUpdateItem(id, {
      producto: preset.name,
      tamanoTipo: preset.defaultSize,
      tamano: preset.defaultSize === 'Otro' ? (preset.customSizeText || '30 ml') : preset.defaultSize,
      precioUnitario: preset.defaultPrice,
      cantidad: 1,
      subtotal: preset.defaultPrice
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validaciones
    if (!cliente.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa el nombre del cliente.' });
      return;
    }

    const validItems = items.filter(i => i.producto.trim().length > 0 && i.cantidad > 0);
    if (validItems.length === 0) {
      setStatusMessage({ type: 'error', text: 'Agrega al menos un producto válido al pedido.' });
      return;
    }

    setIsSubmitting(true);

    const orderToSave: SaleOrder = {
      numeroPedido: orderNumberOverride,
      fecha,
      cliente: cliente.trim(),
      direccion: direccion.trim() || 'Mostrador / Retiro en taller',
      items: validItems.map(i => ({
        ...i,
        tamano: i.tamanoTipo === 'Otro' ? (i.tamano || 'Personalizado') : i.tamanoTipo
      })),
      granTotal,
      createdAt: new Date().toISOString(),
      syncedToSheets: !!scriptUrl
    };

    try {
      // 1. Guardar y sincronizar con Google Sheets
      const syncResult = await sendOrderToGoogleSheets(orderToSave, scriptUrl);

      // 2. Notificar al componente padre para actualizar estado local y tabla de historial
      onOrderSaved(orderToSave);

      // 3. Limpiar formulario para la siguiente venta
      setCliente('');
      setDireccion('');
      setFecha(getTodayDateString());
      setItems([
        {
          id: `item-${Date.now()}`,
          producto: '',
          tamano: '250 ml',
          tamanoTipo: '250 ml',
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0
        }
      ]);

      setStatusMessage({
        type: 'success',
        text: syncResult.message || `¡Pedido #${orderToSave.numeroPedido} registrado con éxito!`
      });

      // Abrir recibo/comprobante automático
      onOpenReceipt(orderToSave);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error al registrar: ${err.message || 'Intenta nuevamente'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de encabezado con foto botánica y el color característico de ADARA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#82550A] via-[#B5801B] to-[#D49A2A] text-white shadow-lg border border-[#D49A2A]/40">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-20 pointer-events-none hidden md:block">
          <img 
            src="/src/assets/images/botanical_soap_serum_1791302326320.jpg" 
            alt="Cosmética Botánica" 
            className="w-full h-full object-cover mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-200 text-xs tracking-wider uppercase font-semibold">
                <span>Adara Cosmética Natural</span>
                <span>·</span>
                <span>Módulo de Facturación</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-serif-title font-semibold tracking-tight text-white mt-1">
                Registrar Nueva Venta
              </h1>
              <p className="text-amber-100/95 text-sm mt-1 max-w-xl">
                Crea pedidos con productos múltiples. Todos los renglones se guardan con el mismo <span className="font-semibold text-white">Numero_Pedido</span> en Google Sheets.
              </p>
            </div>

            {/* Insignia del Número de Pedido Automático */}
            <div className="bg-black/15 backdrop-blur-md border border-white/25 rounded-xl p-4 flex items-center gap-4 shrink-0 shadow-inner">
              <div className="w-12 h-12 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-amber-100">
                <Hash className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-100 font-medium">
                  Próximo Pedido Secuencial
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono tracking-tight text-white">
                    #{orderNumberOverride}
                  </span>
                  <span className="text-xs text-amber-100/90">automático</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Mensaje de Estado */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-[#FAF5EC] border border-[#ECD9BA] text-[#7A5007]'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-900'
              : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-[#D49A2A] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{statusMessage.text}</div>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: DATOS DE LA VENTA */}
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#F0EBE1]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EC] text-[#D49A2A] border border-[#ECD9BA] flex items-center justify-center font-bold text-sm shadow-2xs">
              1
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#2D2721]">
                Datos Generales de la Venta
              </h2>
              <p className="text-xs text-slate-500">
                Información del cliente y fecha registrada automáticamente
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Campo Fecha (Carga automática, solo fecha) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#D49A2A]" />
                Fecha de la Venta
              </label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] focus:border-transparent transition-all"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Cargada automáticamente con la fecha de hoy
              </span>
            </div>

            {/* Campo Nombre del Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D49A2A]" />
                Nombre del Cliente <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] focus:border-transparent transition-all"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Nombre de la persona o negocio que compra
              </span>
            </div>

            {/* Campo Dirección */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D49A2A]" />
                Dirección / Destino
              </label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] focus:border-transparent transition-all"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Dirección de entrega, colonia o retiro en tienda
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CARRITO DINÁMICO DE PRODUCTOS */}
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#F0EBE1] gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FAF5EC] text-[#D49A2A] border border-[#ECD9BA] flex items-center justify-center font-bold text-sm shadow-2xs">
                2
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#2D2721] flex items-center gap-2">
                  Sección de Productos
                  <span className="text-xs font-normal text-slate-500">
                    ({items.length} {items.length === 1 ? 'artículo' : 'artículos'})
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Agrega uno o varios productos. Todos compartirán el Pedido #{orderNumberOverride}.
                </p>
              </div>
            </div>

            {/* Acceso a catálogo rápido */}
            <button
              type="button"
              onClick={() => setShowCatalogSuggestions(!showCatalogSuggestions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9E6C12] bg-[#FAF5EC] hover:bg-[#F3E5CF] border border-[#ECD9BA] rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D49A2A]" />
              <span>{showCatalogSuggestions ? 'Ocultar Catálogo Rápido' : 'Sugerencias de Catálogo'}</span>
            </button>
          </div>

          {/* Bandeja desplegable de catálogo rápido */}
          {showCatalogSuggestions && (
            <div className="mb-6 p-4 bg-[#FAF7F2] rounded-2xl border border-[#E3DBD0] animate-in fade-in duration-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Catálogo de Productos Adara ({filteredPresets.length} disponibles)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Haz clic en cualquier producto para añadirlo de inmediato con su tamaño y precio al pedido.
                  </p>
                </div>

                {/* Buscador de catálogo rápido */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={suggestionQuery}
                    onChange={e => setSuggestionQuery(e.target.value)}
                    placeholder="Buscar en catálogo..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#D8CFC4] rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D49A2A]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  {suggestionQuery && (
                    <button
                      type="button"
                      onClick={() => setSuggestionQuery('')}
                      className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Categorías como filtros rápidos */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'Shampoo', label: 'Shampoos' },
                  { id: 'Acondicionador', label: 'Acondicionadores' },
                  { id: 'Crema', label: 'Cremas' },
                  { id: 'Tratamientos Capilares', label: 'Tónicos & Mascarillas' },
                  { id: 'Jabonería', label: 'Jabones 125g ($2.99)' },
                  { id: 'Aceites', label: 'Aceites' },
                  { id: 'Facial', label: 'Cuidado Facial' },
                  { id: 'Corporal', label: 'Corporal & Exfoliantes' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSuggestionCategory(cat.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                      suggestionCategory === cat.id
                        ? 'bg-[#D49A2A] text-white shadow-2xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-[#D8CFC4]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de productos sugeridos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {filteredPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddItem(preset)}
                    className="flex items-center justify-between p-2.5 bg-white hover:bg-[#D49A2A] hover:text-white border border-[#D8CFC4] rounded-xl text-left shadow-2xs transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-500 group-hover:text-amber-100 flex items-center gap-1.5 mt-0.5">
                        <span className="bg-slate-100 group-hover:bg-white/20 px-1.5 py-0.2 rounded font-medium">
                          {preset.defaultSize === 'Otro' ? preset.customSizeText : preset.defaultSize}
                        </span>
                        <span>·</span>
                        <span>{preset.category}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-[#9E6C12] group-hover:text-white">
                        ${preset.defaultPrice.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-slate-400 group-hover:text-white/80 font-medium">
                        + Añadir
                      </span>
                    </div>
                  </button>
                ))}

                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filas del Carrito Dinámico */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-[#E8E2D8] bg-[#FDFAF6] hover:border-[#D5C9B8] transition-all"
              >
                <div className="flex items-center justify-between mb-3 text-xs text-slate-500 font-medium pb-2 border-b border-[#F0EBE1]">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-[#D49A2A] text-white flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    Producto #{index + 1}
                    {item.producto && (
                      <span className="text-slate-500 font-normal text-xs truncate max-w-[200px] hidden sm:inline">
                        — {item.producto}
                      </span>
                    )}
                  </span>

                  {/* Botón para quitar el producto (siempre disponible para corregir errores) */}
                  {(items.length > 1 || item.producto.trim() !== '' || item.precioUnitario > 0) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      title={items.length > 1 ? "Eliminar este producto de la lista" : "Quitar producto y limpiar fila"}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{items.length > 1 ? "Quitar producto" : "Quitar / Limpiar"}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  {/* Nombre del Producto (Columna 1) */}
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Producto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.producto}
                      onChange={e => handleUpdateItem(item.id, { producto: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-white border border-[#D8CFC4] rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] transition-all"
                    />
                  </div>

                  {/* Tamaño (Columna 2): 250 ml, 500 ml, 120 ml, 60 ml, 8 oz, 4 onz, 125 gr, Otro */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Tamaño / Presentación
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={item.tamanoTipo}
                        onChange={e => handleSizePresetChange(item.id, e.target.value as ProductSizePreset)}
                        className="w-full px-3 py-2 bg-white border border-[#D8CFC4] rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] transition-all"
                      >
                        <option value="250 ml">250 ml</option>
                        <option value="500 ml">500 ml</option>
                        <option value="120 ml">120 ml</option>
                        <option value="60 ml">60 ml</option>
                        <option value="8 oz">8 oz</option>
                        <option value="4 oz">4 onz</option>
                        <option value="125 gr">125 gr</option>
                        <option value="Otro">Otro</option>
                      </select>

                      {/* Si selecciona "Otro", mostrar campo de texto libre */}
                      {item.tamanoTipo === 'Otro' && (
                        <input
                          type="text"
                          value={item.tamano}
                          onChange={e => handleUpdateItem(item.id, { tamano: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Cantidad (Columna 3) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Cantidad
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { cantidad: Math.max(1, item.cantidad - 1) })}
                        className="w-8 h-9 rounded-l-lg bg-slate-100 hover:bg-slate-200 border border-r-0 border-[#D8CFC4] flex items-center justify-center text-slate-700 font-bold text-sm cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={e => handleUpdateItem(item.id, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                        required
                        className="w-full h-9 text-center bg-white border-y border-[#D8CFC4] text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#D49A2A]"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { cantidad: item.cantidad + 1 })}
                        className="w-8 h-9 rounded-r-lg bg-slate-100 hover:bg-slate-200 border border-l-0 border-[#D8CFC4] flex items-center justify-center text-slate-700 font-bold text-sm cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Precio Unitario (Columna 4) */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Precio Unitario
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-sm font-semibold">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.precioUnitario === 0 ? '' : item.precioUnitario}
                        onChange={e => handleUpdateItem(item.id, { precioUnitario: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        required
                        className="w-full pl-7 pr-3 py-2 bg-white border border-[#D8CFC4] rounded-lg text-sm font-mono tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A] transition-all"
                      />
                    </div>
                  </div>

                  {/* Subtotal Calculado (Columna 5) */}
                  <div className="sm:col-span-1 flex flex-col justify-end">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Subtotal
                    </label>
                    <div className="h-9 px-2 bg-slate-100/80 border border-[#E2D9CC] rounded-lg flex items-center justify-end font-mono tabular-nums text-sm font-bold text-slate-800">
                      ${item.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón de '➕ Agregar otro producto' */}
          <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#F0EBE1]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAF5EC] hover:bg-[#F3E5CF] text-[#9E6C12] font-semibold text-sm rounded-xl border border-[#ECD9BA] transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4 text-[#D49A2A]" />
                <span>➕ Agregar otro producto</span>
              </button>

              {(items.length > 1 || items[0].producto.trim() !== '') && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/60 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  title="Vaciar todos los productos y empezar de nuevo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar todo el pedido</span>
                </button>
              )}
            </div>

            <span className="text-xs text-slate-500">
              Total de renglones en este pedido: <strong className="text-slate-800">{items.length}</strong>
            </span>
          </div>
        </div>

        {/* SECCIÓN 3: GRAN TOTAL EN TIEMPO REAL Y BOTÓN GUARDAR */}
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Desglose visual */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Resumen de Venta
              </span>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-slate-400">Pedido: </span>
                  <span className="font-mono font-bold text-slate-900">#{orderNumberOverride}</span>
                </div>
                <span>·</span>
                <div>
                  <span className="text-slate-400">Productos: </span>
                  <span className="font-semibold text-slate-900">{items.length} renglones</span>
                </div>
                <span>·</span>
                <div>
                  <span className="text-slate-400">Unidades: </span>
                  <span className="font-semibold text-slate-900">{totalUnidades} piezas</span>
                </div>
              </div>
            </div>

            {/* Gran Total y Botón de Acción */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="bg-[#FAF7F2] border border-[#ECD9BA] rounded-xl px-5 py-3 text-right">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                  Gran Total del Pedido
                </span>
                <span className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-[#9E6C12]">
                  ${granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3.5 bg-[#D49A2A] hover:bg-[#BD851D] active:bg-[#A57416] disabled:bg-slate-300 text-white font-semibold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Guardando en Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Guardar Venta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
