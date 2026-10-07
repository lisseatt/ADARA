import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  User, 
  MapPin, 
  Calendar, 
  Hash, 
  RefreshCw,
  ShoppingBag,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CartItem, ProductSizePreset, SaleOrder } from '../types/sales';
import { ARTISAN_CATALOG_PRESETS, ProductPreset } from '../data/artisanProducts';
import { sendOrderToGoogleSheets, fetchGlobalNextOrderNumber } from '../services/sheetsService';

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
  // Fecha actual en formato YYYY-MM-DD
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

  // Inicializar con un producto listo para rellenar
  const [items, setItems] = useState<CartItem[]>([
    {
      id: 'item-1',
      producto: '',
      tamano: '250 ml',
      tamanoTipo: '250 ml',
      cantidad: 1,
      cantidadInput: '1',
      precioUnitario: 0,
      precioInput: '',
      descuento: 0,
      descuentoInput: '',
      subtotal: 0
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Descuento General en Dólares ($): caja fija que se resta directamente del total de la venta
  const [descuentoGeneral, setDescuentoGeneral] = useState<number>(0);
  const [descuentoGeneralInput, setDescuentoGeneralInput] = useState<string>('');

  const [showCatalogSuggestions, setShowCatalogSuggestions] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState<string>('all');
  const [suggestionQuery, setSuggestionQuery] = useState<string>('');
  
  // Efecto Visual de Clic en el Catálogo:
  // Al hacer clic en una tarjeta de producto, muestra un cambio de color momentáneo
  // (efecto flash de 500ms) para confirmar el clic, volviendo inmediatamente a su color original.
  const [flashingPresetKey, setFlashingPresetKey] = useState<string | null>(null);

  React.useEffect(() => {
    setOrderNumberOverride(nextOrderNumber);
  }, [nextOrderNumber]);

  // Cálculos en tiempo real con precisión decimal y descuentos
  const subtotalProductos = Math.round(items.reduce((acc, curr) => acc + (curr.subtotal || 0), 0) * 100) / 100;
  const totalDescuentosProductos = Math.round(items.reduce((acc, curr) => acc + (Number(curr.descuento) || 0), 0) * 100) / 100;
  const descuentoGeneralNum = Math.max(0, Number(descuentoGeneral) || 0);
  // Gran Total a Cobrar restando limpiamente el descuento general en dólares ($)
  const granTotal = Math.max(0, Math.round((subtotalProductos - descuentoGeneralNum) * 100) / 100);
  const totalDescuentos = Math.round((totalDescuentosProductos + descuentoGeneralNum) * 100) / 100;
  const totalUnidades = Math.round(items.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0) * 100) / 100;

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

  // Manejador del clic en el catálogo con efecto flash de medio segundo
  const handlePresetClick = (preset: ProductPreset, cardKey: string) => {
    // 1. Activar efecto visual flash
    setFlashingPresetKey(cardKey);
    // 2. Agregar producto a la lista
    handleAddItem(preset);
    // 3. Volver inmediatamente a su color original tras medio segundo (500ms) sin persistir
    setTimeout(() => {
      setFlashingPresetKey(prev => (prev === cardKey ? null : prev));
    }, 500);
  };

  // Manejo de filas del carrito
  const handleAddItem = (preset?: ProductPreset) => {
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    if (preset) {
      const isPresetSizeStandard = ['250 ml', '500 ml', '120 ml', '60 ml', '8 oz', '4 oz', '125 gr'].includes(preset.defaultSize);
      const resolvedSize = isPresetSizeStandard ? (preset.defaultSize === '4 oz' ? '4 onz' : preset.defaultSize) : (preset.customSizeText || 'Personalizado');
      const sub = Math.round(preset.defaultPrice * 1 * 100) / 100;

      // Si sólo hay una fila y está sin rellenar, sustituirla directamente
      if (items.length === 1 && items[0].producto.trim() === '' && items[0].precioUnitario === 0) {
        setItems([
          {
            id: items[0].id,
            producto: preset.name,
            tamano: resolvedSize,
            tamanoTipo: preset.defaultSize,
            cantidad: 1,
            cantidadInput: '1',
            precioUnitario: preset.defaultPrice,
            precioInput: String(preset.defaultPrice),
            descuento: 0,
            descuentoInput: '',
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
          cantidadInput: '1',
          precioUnitario: preset.defaultPrice,
          precioInput: String(preset.defaultPrice),
          descuento: 0,
          descuentoInput: '',
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
          cantidadInput: '1',
          precioUnitario: 0,
          precioInput: '',
          descuento: 0,
          descuentoInput: '',
          subtotal: 0
        }
      ]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleClearAllItems = () => {
    setItems([]);
  };

  const handleUpdateItem = (id: string, updates: Partial<CartItem>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, ...updates };
        
        // Recalcular subtotal restando directamente el descuento al total del producto (cantidad * precioUnitario - descuento)
        if (updates.cantidad !== undefined || updates.precioUnitario !== undefined || updates.descuento !== undefined) {
          const qty = Number(updated.cantidad) || 0;
          const price = Number(updated.precioUnitario) || 0;
          const disc = Number(updated.descuento) || 0;
          const rawSubtotal = (qty * price) - disc;
          // Evitar subtotales negativos
          updated.subtotal = Math.max(0, Math.round(rawSubtotal * 100) / 100);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validaciones amigables en español y sin tecnicismos
    if (!cliente.trim()) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Por favor escribe el nombre de la persona o negocio que compra para continuar.' 
      });
      return;
    }

    // Acepta productos con decimales (por ejemplo cantidad: 0.5 o 1.5, y precios como 2.99 o 0.75)
    const validItems = items.filter(i => {
      const hasName = i.producto.trim().length > 0;
      const qty = Number(i.cantidad);
      return hasName && !isNaN(qty) && qty > 0;
    });

    if (validItems.length === 0) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Tu venta aún no tiene productos válidos. Agrega al menos un producto con su nombre y una cantidad mayor a 0 (puedes usar números enteros o decimales).' 
      });
      return;
    }

    setIsSubmitting(true);

    // Sincronización y Número de Pedido Global:
    // Al registrar una venta, consultar los datos existentes en Google Sheets para detectar
    // el número más alto registrado, sumarle 1 en orden consecutivo (1, 2, 3...)
    // y garantizar que se sincronice perfectamente sin repetirse entre distintos dispositivos.
    let finalOrderNumber = orderNumberOverride;
    if (scriptUrl) {
      try {
        const globalRes = await fetchGlobalNextOrderNumber(scriptUrl);
        if (globalRes && globalRes.nextNumber) {
          // Tomar el mayor entre lo que tenía en pantalla y el detectado en Sheets
          finalOrderNumber = Math.max(orderNumberOverride, globalRes.nextNumber);
        }
      } catch (err) {
        console.warn('Usando número de orden calculado tras fallo de verificación remota:', err);
      }
    }

    const subtotalCalculado = Math.round(
      validItems.reduce((acc, i) => {
        const qty = Number(i.cantidad) || 0;
        const price = Number(i.precioUnitario) || 0;
        const disc = Number(i.descuento) || 0;
        const sub = Math.max(0, Math.round(((qty * price) - disc) * 100) / 100);
        return acc + sub;
      }, 0) * 100
    ) / 100;

    const descGenNum = Math.max(0, Number(descuentoGeneral) || 0);
    // Descuento general en dólares ($) restándose directamente del total de la venta
    const calculatedGranTotal = Math.max(0, Math.round((subtotalCalculado - descGenNum) * 100) / 100);

    const orderToSave: SaleOrder = {
      numeroPedido: finalOrderNumber,
      fecha,
      cliente: cliente.trim(),
      direccion: direccion.trim() || 'Entrega en mostrador o retiro en tienda',
      items: validItems.map(i => {
        const qty = Number(i.cantidad) || 0;
        const price = Number(i.precioUnitario) || 0;
        const disc = Number(i.descuento) || 0;
        const sub = Math.max(0, Math.round(((qty * price) - disc) * 100) / 100);
        return {
          id: i.id,
          producto: i.producto.trim(),
          tamano: i.tamanoTipo === 'Otro' ? (i.tamano || 'Personalizado') : i.tamanoTipo,
          tamanoTipo: i.tamanoTipo,
          cantidad: qty,
          precioUnitario: price,
          descuento: disc,
          subtotal: sub
        };
      }),
      descuentoGeneral: descGenNum > 0 ? descGenNum : undefined,
      granTotal: calculatedGranTotal,
      createdAt: new Date().toISOString(),
      syncedToSheets: !!scriptUrl
    };

    try {
      await sendOrderToGoogleSheets(orderToSave, scriptUrl);
      onOrderSaved(orderToSave);

      // Limpiar formulario para la siguiente venta
      setCliente('');
      setDireccion('');
      setFecha(getTodayDateString());
      setDescuentoGeneral(0);
      setDescuentoGeneralInput('');
      setItems([
        {
          id: `item-${Date.now()}`,
          producto: '',
          tamano: '250 ml',
          tamanoTipo: '250 ml',
          cantidad: 1,
          cantidadInput: '1',
          precioUnitario: 0,
          precioInput: '',
          descuento: 0,
          descuentoInput: '',
          subtotal: 0
        }
      ]);

      setStatusMessage({
        type: 'success',
        text: `¡Venta del pedido #${orderToSave.numeroPedido} guardada con éxito! Ya puedes entregar el recibo al cliente.`
      });

      onOpenReceipt(orderToSave);

    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'No se pudo guardar la venta en la hoja de cálculo. Por favor revisa que tengas conexión a internet e inténtalo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 min-w-[300px]">
      {/* Encabezado con alto contraste y texto >= 16px */}
      <div className="rounded-2xl bg-[#1A1612] text-white p-5 sm:p-7 border-2 border-[#D49A2A] shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[#F5C242] text-base font-bold uppercase tracking-wider">
              Adara Cosmética Natural
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Registrar Nueva Venta
            </h1>
            <p className="text-white text-base mt-1.5 leading-relaxed">
              Llena los datos del cliente y los productos que lleva. Al terminar, podrás entregar su recibo de compra.
            </p>
          </div>

          <div className="bg-[#2D241E] border-2 border-[#D49A2A] rounded-xl p-4 flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-lg bg-[#D49A2A] text-[#1A1612] flex items-center justify-center font-bold">
              <Hash className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base text-white font-medium">
                Número de Pedido
              </p>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F5C242]">
                #{orderNumberOverride}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de éxito y error visibles, en español, sin tecnicismos */}
      {statusMessage && (
        <div
          role="alert"
          className={`p-4 sm:p-5 rounded-2xl flex items-start gap-3 border-2 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-[#FAF5EC] border-[#B8801A] text-[#1A1612]'
              : 'bg-[#FFF1F2] border-rose-600 text-[#1A1612]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-7 h-7 text-[#B8801A] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-base sm:text-lg font-bold leading-snug">
            {statusMessage.text}
          </div>
        </div>
      )}

      {/* Formulario Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: DATOS GENERALES DE LA VENTA */}
        <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] p-4 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-[#E8DFC8]">
            <div className="w-9 h-9 rounded-xl bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
              1
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1612]">
                Datos de la Venta
              </h2>
              <p className="text-base font-medium text-[#4A3D30]">
                Indica la fecha y quién realiza la compra
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Campo Fecha */}
            <div>
              <label 
                htmlFor="campo-fecha"
                className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-2"
              >
                <Calendar className="w-5 h-5 text-[#B8801A]" />
                <span>Fecha de la Venta</span>
              </label>
              <input
                id="campo-fecha"
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A] focus:ring-4 focus:ring-[#D49A2A]/20"
              />
              <span className="text-base font-medium text-[#5C4A3A] mt-1 block">
                Fecha del pedido de compra
              </span>
            </div>

            {/* Campo Nombre del Cliente */}
            <div>
              <label 
                htmlFor="campo-cliente"
                className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-2"
              >
                <User className="w-5 h-5 text-[#B8801A]" />
                <span>Nombre del Cliente <span className="text-rose-600">*</span></span>
              </label>
              <input
                id="campo-cliente"
                type="text"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
                required
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A] focus:ring-4 focus:ring-[#D49A2A]/20"
              />
              <span className="text-base font-medium text-[#5C4A3A] mt-1 block">
                Nombre de la persona o negocio
              </span>
            </div>

            {/* Campo Dirección */}
            <div>
              <label 
                htmlFor="campo-direccion"
                className="block text-base font-bold text-[#1A1612] mb-1.5 flex items-center gap-2"
              >
                <MapPin className="w-5 h-5 text-[#B8801A]" />
                <span>Dirección o Sucursal</span>
              </label>
              <input
                id="campo-direccion"
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A] focus:ring-4 focus:ring-[#D49A2A]/20"
              />
              <span className="text-base font-medium text-[#5C4A3A] mt-1 block">
                Lugar de entrega o mostrador
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: CARRITO DINÁMICO DE PRODUCTOS */}
        <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] p-4 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-[#E8DFC8] gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
                2
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A1612]">
                  Productos de la Venta ({items.length})
                </h2>
                <p className="text-base font-medium text-[#4A3D30]">
                  Agrega los productos que el cliente desea llevar
                </p>
              </div>
            </div>

            {/* Botón secundario para mostrar catálogo */}
            <button
              type="button"
              onClick={() => setShowCatalogSuggestions(!showCatalogSuggestions)}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2 text-base font-bold text-[#1A1612] bg-[#FAF5EC] hover:bg-[#F0E4D0] border-2 border-[#B8801A] rounded-xl transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-[#B8801A]" />
              <span>{showCatalogSuggestions ? 'Ocultar Catálogo Rápido' : 'Ver Catálogo Rápido'}</span>
              {showCatalogSuggestions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Bandeja de Catálogo Rápido (Secundario) */}
          {showCatalogSuggestions && (
            <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border-2 border-[#B8801A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label 
                    htmlFor="buscador-catalogo"
                    className="block text-base font-bold text-[#1A1612] mb-1.5"
                  >
                    Buscar en catálogo de Adara:
                  </label>
                  <div className="relative">
                    <input
                      id="buscador-catalogo"
                      type="text"
                      value={suggestionQuery}
                      onChange={e => setSuggestionQuery(e.target.value)}
                      className="w-full min-h-[48px] pl-10 pr-10 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
                    />
                    <Search className="w-5 h-5 text-[#6B5A4B] absolute left-3 top-3.5" />
                    {suggestionQuery && (
                      <button
                        type="button"
                        onClick={() => setSuggestionQuery('')}
                        className="absolute right-3 top-2.5 text-base font-bold text-[#6B5A4B] hover:text-[#1A1612] px-2 py-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Categorías como botones secundarios */}
              <div>
                <span className="block text-base font-bold text-[#1A1612] mb-2">
                  Filtrar por categoría:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'Todos los productos' },
                    { id: 'Shampoo', label: 'Shampoos' },
                    { id: 'Acondicionador', label: 'Acondicionadores' },
                    { id: 'Crema', label: 'Cremas' },
                    { id: 'Tratamientos Capilares', label: 'Tratamientos' },
                    { id: 'Jabonería', label: 'Jabones' },
                    { id: 'Aceites', label: 'Aceites' },
                    { id: 'Facial', label: 'Facial' },
                    { id: 'Corporal', label: 'Corporal' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSuggestionCategory(cat.id)}
                      className={`min-h-[44px] px-3.5 py-2 text-base font-bold rounded-xl transition-all cursor-pointer ${
                        suggestionCategory === cat.id
                          ? 'bg-[#1A1612] text-white border-2 border-[#1A1612]'
                          : 'bg-white text-[#1A1612] hover:bg-[#F0EBE1] border-2 border-[#C4B5A5]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de sugerencias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pt-2">
                {filteredPresets.map((preset, idx) => {
                  const cardKey = `preset-${idx}-${preset.name}`;
                  const isFlashing = flashingPresetKey === cardKey;

                  return (
                    <button
                      key={cardKey}
                      type="button"
                      onClick={() => handlePresetClick(preset, cardKey)}
                      className={`p-3.5 rounded-2xl text-left cursor-pointer flex flex-col justify-between gap-2 border-2 transition-all duration-500 ease-out select-none active:scale-[0.98] ${
                        isFlashing
                          ? 'bg-[#F5C242] border-[#855B0F] text-[#1A1612] scale-[0.98] shadow-lg ring-4 ring-[#D49A2A]/50'
                          : 'bg-white hover:bg-[#FAF5EC] border-[#C4B5A5] hover:border-[#B8801A] text-[#1A1612]'
                      }`}
                    >
                      <div>
                        <div className="text-base font-bold text-[#1A1612] leading-tight">
                          {preset.name}
                        </div>
                        <div className="text-base font-medium text-[#5C4A3A] mt-1">
                          Presentación: {preset.defaultSize === 'Otro' ? preset.customSizeText : preset.defaultSize}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#E8DFC8]">
                        <span className={`text-lg font-extrabold font-mono ${isFlashing ? 'text-[#1A1612]' : 'text-[#9E6C12]'}`}>
                          ${preset.defaultPrice.toFixed(2)}
                        </span>
                        <span className={`text-base font-bold flex items-center gap-1.5 ${isFlashing ? 'text-[#855B0F]' : 'text-[#1A1612]'}`}>
                          {isFlashing ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-[#855B0F]" />
                              <span>¡Agregado!</span>
                            </>
                          ) : (
                            <span>+ Agregar</span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-6 text-center text-base font-bold text-[#5C4A3A]">
                    No encontramos ningún producto con esa búsqueda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ESTADO VACÍO (Requisito 5: Invitación clara a la primera acción) */}
          {items.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border-2 border-dashed border-[#B8A898] space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF5EC] border-2 border-[#B8801A] flex items-center justify-center text-[#B8801A]">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#1A1612]">
                  Aún no has agregado ningún producto a esta venta
                </h3>
                <p className="text-base font-medium text-[#4A3D30] max-w-md mx-auto">
                  Toca el botón aquí abajo para agregar tu primer producto o abre el catálogo rápido para elegir de la lista.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-white border-2 border-[#1A1612] text-[#1A1612] font-bold text-base rounded-xl hover:bg-[#F0EBE1] cursor-pointer"
                >
                  ➕ Agregar mi primer producto
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalogSuggestions(true)}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-white border-2 border-[#B8801A] text-[#1A1612] font-bold text-base rounded-xl hover:bg-[#FAF5EC] cursor-pointer"
                >
                  ✨ Elegir del catálogo
                </button>
              </div>
            </div>
          ) : (
            /* Filas de Productos con etiquetas visibles y sin texto menor a 16px */
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl border-2 border-[#C4B5A5] bg-[#FAF7F2] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-[#E8DFC8]">
                    <span className="text-lg font-bold text-[#1A1612] flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#1A1612] text-white flex items-center justify-center text-base font-bold">
                        {index + 1}
                      </span>
                      <span>Producto #{index + 1}</span>
                    </span>

                    {/* Botón secundario para quitar producto */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="min-h-[44px] px-3.5 py-2 text-base font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 rounded-xl inline-flex items-center gap-2 cursor-pointer transition-all"
                      title="Eliminar este producto de la lista"
                    >
                      <Trash2 className="w-5 h-5 text-rose-700" />
                      <span>Quitar producto</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                    {/* Nombre del Producto con etiqueta obligatoria */}
                    <div className="sm:col-span-12 lg:col-span-4">
                      <label 
                        htmlFor={`producto-${item.id}`}
                        className="block text-base font-bold text-[#1A1612] mb-1"
                      >
                        Nombre del Producto <span className="text-rose-600">*</span>
                      </label>
                      <input
                        id={`producto-${item.id}`}
                        type="text"
                        value={item.producto}
                        onChange={e => handleUpdateItem(item.id, { producto: e.target.value })}
                        required
                        className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
                      />
                    </div>

                    {/* Tamaño o Presentación */}
                    <div className="sm:col-span-6 lg:col-span-2">
                      <label 
                        htmlFor={`tamano-${item.id}`}
                        className="block text-base font-bold text-[#1A1612] mb-1"
                      >
                        Presentación
                      </label>
                      <div className="space-y-2">
                        <select
                          id={`tamano-${item.id}`}
                          value={item.tamanoTipo}
                          onChange={e => handleSizePresetChange(item.id, e.target.value as ProductSizePreset)}
                          className="w-full min-h-[48px] px-3 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
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

                        {/* Si elige "Otro", campo con etiqueta propia */}
                        {item.tamanoTipo === 'Otro' && (
                          <div>
                            <label 
                              htmlFor={`tamano-personalizado-${item.id}`}
                              className="block text-base font-bold text-[#1A1612] mb-1"
                            >
                              Especifica el tamaño:
                            </label>
                            <input
                              id={`tamano-personalizado-${item.id}`}
                              type="text"
                              value={item.tamano}
                              onChange={e => handleUpdateItem(item.id, { tamano: e.target.value })}
                              className="w-full min-h-[48px] px-3 py-2 bg-white border-2 border-[#B8801A] rounded-xl text-base font-bold text-[#1A1612] focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cantidad con botones cómodos y soporte completo para decimales */}
                    <div className="sm:col-span-6 lg:col-span-2">
                      <label 
                        htmlFor={`cantidad-${item.id}`}
                        className="block text-base font-bold text-[#1A1612] mb-1"
                      >
                        Cantidad
                      </label>
                      <div className="flex items-center min-h-[48px]">
                        <button
                          type="button"
                          onClick={() => {
                            const current = item.cantidad || 0;
                            const nextQty = current > 1 
                              ? Math.round((current - 1) * 100) / 100 
                              : (current > 0.1 ? Math.round((current - 0.1) * 100) / 100 : 0.1);
                            handleUpdateItem(item.id, { 
                              cantidad: nextQty, 
                              cantidadInput: String(nextQty) 
                            });
                          }}
                          className="w-12 h-12 rounded-l-xl bg-white hover:bg-[#EAE2D5] border-2 border-r-0 border-[#6B5A4B] flex items-center justify-center text-xl font-bold text-[#1A1612] cursor-pointer"
                          title="Disminuir cantidad"
                        >
                          -
                        </button>
                        <input
                          id={`cantidad-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          value={item.cantidadInput !== undefined ? item.cantidadInput : item.cantidad}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                              const num = val === '' || val === '.' || val === ',' ? 0 : parseFloat(val.replace(',', '.'));
                              handleUpdateItem(item.id, {
                                cantidadInput: val,
                                cantidad: isNaN(num) ? 0 : num
                              });
                            }
                          }}
                          onBlur={() => {
                            if (!item.cantidad || item.cantidad <= 0) {
                              handleUpdateItem(item.id, { cantidad: 1, cantidadInput: '1' });
                            } else {
                              handleUpdateItem(item.id, { cantidadInput: String(item.cantidad) });
                            }
                          }}
                          required
                          className="w-full h-12 text-center bg-white border-y-2 border-[#6B5A4B] text-base font-extrabold text-[#1A1612] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = item.cantidad || 0;
                            const nextQty = Math.round((current + 1) * 100) / 100;
                            handleUpdateItem(item.id, { 
                              cantidad: nextQty, 
                              cantidadInput: String(nextQty) 
                            });
                          }}
                          className="w-12 h-12 rounded-r-xl bg-white hover:bg-[#EAE2D5] border-2 border-l-0 border-[#6B5A4B] flex items-center justify-center text-xl font-bold text-[#1A1612] cursor-pointer"
                          title="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Precio Unitario con soporte completo para decimales */}
                    <div className="sm:col-span-6 lg:col-span-2">
                      <label 
                        htmlFor={`precio-${item.id}`}
                        className="block text-base font-bold text-[#1A1612] mb-1"
                      >
                        Precio Unit. ($)
                      </label>
                      <input
                        id={`precio-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        value={item.precioInput !== undefined ? item.precioInput : (item.precioUnitario === 0 ? '' : item.precioUnitario)}
                        onChange={e => {
                          const val = e.target.value;
                          if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                            const num = val === '' || val === '.' || val === ',' ? 0 : parseFloat(val.replace(',', '.'));
                            handleUpdateItem(item.id, {
                              precioInput: val,
                              precioUnitario: isNaN(num) ? 0 : num
                            });
                          }
                        }}
                        onBlur={() => {
                          if (item.precioInput !== undefined) {
                            const num = parseFloat(item.precioInput.replace(',', '.')) || 0;
                            handleUpdateItem(item.id, {
                              precioUnitario: num,
                              precioInput: num === 0 ? '' : String(num)
                            });
                          }
                        }}
                        required
                        className="w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-extrabold font-mono text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
                      />
                    </div>

                    {/* Casilla de Descuento: Campo opcional de descuento que resta directamente al subtotal */}
                    <div className="sm:col-span-6 lg:col-span-2">
                      <label 
                        htmlFor={`descuento-${item.id}`}
                        className="block text-base font-bold text-[#1A1612] mb-1 flex items-center justify-between"
                      >
                        <span>Descuento ($)</span>
                        <span className="text-xs font-semibold text-[#855B0F] uppercase bg-[#FAF5EC] px-1.5 py-0.5 rounded border border-[#E8DFC8]">Opcional</span>
                      </label>
                      <div className="relative">
                        <input
                          id={`descuento-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={item.descuentoInput !== undefined ? item.descuentoInput : (item.descuento === 0 ? '' : item.descuento)}
                          onChange={e => {
                            const val = e.target.value;
                            if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                              const num = val === '' || val === '.' || val === ',' ? 0 : parseFloat(val.replace(',', '.'));
                              handleUpdateItem(item.id, {
                                descuentoInput: val,
                                descuento: isNaN(num) ? 0 : Math.max(0, num)
                              });
                            }
                          }}
                          onBlur={() => {
                            if (item.descuentoInput !== undefined) {
                              const num = parseFloat(item.descuentoInput.replace(',', '.')) || 0;
                              handleUpdateItem(item.id, {
                                descuento: Math.max(0, num),
                                descuentoInput: num === 0 ? '' : String(num)
                              });
                            }
                          }}
                          className={`w-full min-h-[48px] px-3.5 py-2.5 bg-white border-2 rounded-xl text-base font-extrabold font-mono text-[#1A1612] focus:outline-none transition-colors ${
                            (item.descuento || 0) > 0 ? 'border-emerald-600 bg-emerald-50/50' : 'border-[#6B5A4B] focus:border-[#D49A2A]'
                          }`}
                        />
                        {(item.descuento || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { descuento: 0, descuentoInput: '' })}
                            className="absolute right-2 top-2.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-1.5 py-1 rounded cursor-pointer"
                            title="Quitar descuento de este producto"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtotal del producto con desglose del descuento aplicado */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8DFC8]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#4A3D30]">
                        Subtotal de este producto:
                      </span>
                      {(item.descuento || 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-400 text-sm font-bold">
                          <span>🏷️ Descuento: -${(item.descuento || 0).toFixed(2)}</span>
                          <span className="text-xs font-semibold text-emerald-800 line-through">
                            (Antes: ${((Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0)).toFixed(2)})
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#1A1612]">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botones secundarios de acción en la lista */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t-2 border-[#E8DFC8]">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="min-h-[48px] px-5 py-2.5 bg-white hover:bg-[#FAF5EC] text-[#1A1612] font-bold text-base rounded-xl border-2 border-[#6B5A4B] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5 text-[#B8801A]" />
                <span>➕ Agregar otro producto</span>
              </button>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="min-h-[48px] px-4 py-2.5 text-base font-bold text-rose-800 hover:bg-rose-50 border-2 border-rose-300 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                  title="Vaciar todos los productos y empezar de nuevo"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Vaciar productos</span>
                </button>
              )}
            </div>

            <span className="text-base font-bold text-[#1A1612]">
              Total de productos: <strong>{items.length}</strong>
            </span>
          </div>
        </div>

        {/* SECCIÓN 3: DESCUENTO GENERAL, GRAN TOTAL Y ÚNICO BOTÓN PRINCIPAL DE LA PANTALLA */}
        <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] p-5 sm:p-7 shadow-md space-y-6">
          {/* Caja de texto del Descuento General: exclusivamente en dólares ($) y fija */}
          <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border-2 border-[#E8DFC8] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label 
                htmlFor="descuento-general-total"
                className="block text-base font-bold text-[#1A1612] flex items-center gap-2"
              >
                <span>🏷️ Descuento General ($)</span>
                <span className="text-xs px-2 py-0.5 bg-[#E8DFC8] text-[#5C4A3A] rounded-md font-semibold">Opcional</span>
              </label>
              <p className="text-sm font-medium text-[#5C4A3A]">
                Monto fijo en dólares que se resta directamente del total a cobrar de la venta.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-lg text-[#1A1612] pointer-events-none">
                  $
                </span>
                <input
                  id="descuento-general-total"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={descuentoGeneralInput !== '' ? descuentoGeneralInput : (descuentoGeneral === 0 ? '' : descuentoGeneral)}
                  onChange={e => {
                    const val = e.target.value;
                    const cleaned = val.replace(',', '.');
                    const num = parseFloat(cleaned);
                    setDescuentoGeneralInput(val);
                    setDescuentoGeneral(isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100));
                  }}
                  onBlur={() => {
                    if (descuentoGeneralInput !== '') {
                      const cleaned = descuentoGeneralInput.replace(',', '.');
                      const num = parseFloat(cleaned) || 0;
                      const validNum = Math.max(0, Math.round(num * 100) / 100);
                      setDescuentoGeneral(validNum);
                      setDescuentoGeneralInput(validNum === 0 ? '' : String(validNum));
                    }
                  }}
                  className={`w-full min-h-[48px] pl-8 pr-3 py-2.5 bg-white border-2 rounded-xl text-base font-bold font-mono text-[#1A1612] focus:outline-none ${
                    descuentoGeneral > 0 ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' : 'border-[#6B5A4B] focus:border-[#D49A2A]'
                  }`}
                />
              </div>

              {descuentoGeneral > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDescuentoGeneral(0);
                    setDescuentoGeneralInput('');
                  }}
                  className="min-h-[48px] px-3.5 py-2.5 text-sm font-bold text-rose-800 bg-white hover:bg-rose-50 border-2 border-rose-300 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  title="Quitar descuento general"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
            {/* Resumen */}
            <div className="space-y-1.5">
              <span className="text-base font-bold text-[#5C4A3A] uppercase tracking-wider block">
                Resumen de la Venta
              </span>
              <div className="text-lg font-bold text-[#1A1612]">
                Pedido #{orderNumberOverride} · {items.length} {items.length === 1 ? 'producto' : 'productos'} · {totalUnidades} piezas en total
              </div>
              <div className="text-sm font-semibold text-[#5C4A3A]">
                Suma de productos: ${subtotalProductos.toFixed(2)}
              </div>
              {descuentoGeneral > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-400 text-emerald-900 font-bold text-base">
                  🏷️ Descuento general aplicado: -${descuentoGeneral.toFixed(2)}
                </div>
              )}
              {totalDescuentosProductos > 0 && (
                <div className="text-xs text-emerald-800 font-medium">
                  (Incluye ${totalDescuentosProductos.toFixed(2)} aplicados en productos específicos)
                </div>
              )}
            </div>

            {/* Gran Total */}
            <div className="bg-[#FAF7F2] border-2 border-[#B8801A] rounded-2xl px-6 py-4 text-center sm:text-right">
              <span className="text-base uppercase tracking-wider text-[#5C4A3A] font-bold block">
                Gran Total a Cobrar
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#1A1612] block">
                ${granTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {descuentoGeneral > 0 && (
                <span className="text-xs font-semibold text-emerald-800 block mt-0.5">
                  Con descuento general de -${descuentoGeneral.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* ÚNICO BOTÓN PRINCIPAL DE ESTA PANTALLA (Requisito 4) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[54px] py-4 px-6 bg-[#B8801A] hover:bg-[#9E6C12] active:bg-[#855B0F] disabled:bg-slate-400 text-white font-extrabold text-xl rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Guardando venta...</span>
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                <span>Guardar Venta y Generar Recibo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
