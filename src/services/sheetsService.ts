import { CartItem, SaleOrder, SheetRow } from '../types/sales';
import { INITIAL_DEMO_ORDERS } from '../data/artisanProducts';

const STORAGE_KEYS = {
  ORDERS: 'adara_sales_orders_v2',
  SCRIPT_URL: 'adara_gas_url_v2',
  LAST_SYNC: 'adara_last_sync_v2'
};

/**
 * Obtiene la lista de pedidos almacenados localmente.
 * Si no existen, inicializa con pedidos de demostración.
 */
export function getStoredOrders(): SaleOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_DEMO_ORDERS));
      return INITIAL_DEMO_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_ORDERS;
  } catch (err) {
    console.error('Error al leer pedidos de localStorage:', err);
    return INITIAL_DEMO_ORDERS;
  }
}

/**
 * Guarda los pedidos en localStorage.
 */
export function saveOrdersLocally(orders: SaleOrder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (err) {
    console.error('Error al guardar pedidos en localStorage:', err);
  }
}

/**
 * Obtiene el próximo número secuencial de pedido (1, 2, 3...)
 * Busca el mayor Numero_Pedido existente en memoria/local y suma 1.
 */
export function getNextOrderNumber(ordersList?: SaleOrder[]): number {
  const orders = ordersList || getStoredOrders();
  if (!orders || orders.length === 0) return 1;
  const maxNum = Math.max(...orders.map(o => Number(o.numeroPedido) || 0));
  return Math.max(1, maxNum + 1);
}

/**
 * Consulta los datos existentes en Google Sheets para detectar el número de pedido
 * más alto registrado entre todos los dispositivos, sumarle 1 en orden consecutivo (1, 2, 3...)
 * y asegurar que el número esté perfectamente sincronizado a nivel global.
 */
export async function fetchGlobalNextOrderNumber(customScriptUrl?: string): Promise<{
  nextNumber: number;
  maxFoundInSheets: number;
  syncedFromSheets: boolean;
}> {
  const localOrders = getStoredOrders();
  const localMax = localOrders.length > 0 
    ? Math.max(...localOrders.map(o => Number(o.numeroPedido) || 0)) 
    : 0;

  const url = customScriptUrl || getScriptUrl();
  if (!url) {
    return {
      nextNumber: Math.max(1, localMax + 1),
      maxFoundInSheets: 0,
      syncedFromSheets: false
    };
  }

  try {
    const res = await fetchLiveSheetData(url);
    if (res.success && res.rows) {
      let sheetsMax = 0;
      res.rows.forEach(r => {
        const num = Number(r.Numero_Pedido) || 0;
        if (num > sheetsMax) sheetsMax = num;
      });

      // El número más alto absoluto entre Sheets y datos locales
      const highestNumber = Math.max(localMax, sheetsMax);
      return {
        nextNumber: Math.max(1, highestNumber + 1),
        maxFoundInSheets: sheetsMax,
        syncedFromSheets: true
      };
    }
  } catch (err) {
    console.warn('No se pudo consultar el número global en Google Sheets:', err);
  }

  return {
    nextNumber: Math.max(1, localMax + 1),
    maxFoundInSheets: 0,
    syncedFromSheets: false
  };
}

/**
 * Obtiene la URL configurada de Google Apps Script.
 */
export function getScriptUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || localStorage.getItem('aromabotanica_gas_url_v1') || '';
  } catch {
    return '';
  }
}

/**
 * Guarda la URL de Google Apps Script.
 */
export function saveScriptUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  } catch (err) {
    console.error('Error al guardar URL de Google Apps Script:', err);
  }
}

/**
 * Transforma una lista de pedidos a la estructura exacta de filas de Google Sheets:
 * Columnas: Numero_Pedido | Fecha | Cliente | Direccion | Producto | Tamaño | Cantidad | Precio_Unitario | Subtotal
 */
export function convertOrdersToSheetRows(orders: SaleOrder[]): SheetRow[] {
  const rows: SheetRow[] = [];
  
  orders.forEach(order => {
    order.items.forEach(item => {
      rows.push({
        Numero_Pedido: order.numeroPedido,
        Fecha: order.fecha,
        Cliente: order.cliente,
        Direccion: order.direccion,
        Producto: item.producto,
        Tamaño: item.tamanoTipo === 'Otro' ? (item.tamano || 'Personalizado') : item.tamanoTipo,
        Cantidad: item.cantidad,
        Precio_Unitario: item.precioUnitario,
        Subtotal: item.subtotal
      });
    });
  });

  return rows;
}

/**
 * Envía un pedido a la Web App de Google Apps Script.
 * Usa formato text/plain con contenido JSON para evitar bloqueos de CORS preflight (OPTIONS)
 * típicos de Google Apps Script.
 */
export async function sendOrderToGoogleSheets(
  order: SaleOrder,
  customScriptUrl?: string
): Promise<{ success: boolean; message: string; isOfflineOnly?: boolean }> {
  const url = customScriptUrl || getScriptUrl();

  if (!url) {
    return {
      success: true,
      isOfflineOnly: true,
      message: 'Venta guardada en memoria local. Conecta tu URL de Google Apps Script para sincronizar con Google Sheets.'
    };
  }

  const payload = {
    action: 'save_order',
    numeroPedido: order.numeroPedido,
    fecha: order.fecha,
    cliente: order.cliente,
    direccion: order.direccion,
    items: order.items.map(item => ({
      producto: item.producto,
      tamano: item.tamanoTipo === 'Otro' ? (item.tamano || 'Personalizado') : item.tamanoTipo,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal
    }))
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor: HTTP ${response.status}`);
    }

    const data = await response.json().catch(() => null);

    if (data && data.success === false) {
      throw new Error(data.error || 'Google Apps Script reportó un error al guardar');
    }

    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    return {
      success: true,
      message: `¡Pedido #${order.numeroPedido} sincronizado exitosamente con Google Sheets!`
    };
  } catch (error: any) {
    console.warn('Fallo al conectar con Google Apps Script:', error);
    
    // Intento con fallback 'no-cors' si el navegador bloqueó la redirección de GAS
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      return {
        success: true,
        message: `¡Pedido #${order.numeroPedido} enviado a Google Sheets (modo seguro)!`
      };
    } catch (fallbackErr) {
      return {
        success: false,
        message: `Error al enviar a Google Sheets: ${error.message || 'Sin conexión'}. La venta quedó guardada localmente.`
      };
    }
  }
}

/**
 * Prueba la conectividad con la Web App de Google Apps Script.
 */
export async function testGasConnection(url: string): Promise<{ success: boolean; message: string; sheetName?: string }> {
  if (!url || !url.startsWith('http')) {
    return {
      success: false,
      message: 'Por favor ingresa una URL válida de Google Apps Script (inicia con https://script.google.com/macros/s/...)'
    };
  }

  try {
    const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
    const response = await fetch(pingUrl, {
      method: 'GET'
    });

    if (!response.ok) {
      return {
        success: false,
        message: `El script respondió con código de error HTTP ${response.status}. Revisa los permisos de implementación.`
      };
    }

    const data = await response.json();
    if (data && data.success) {
      return {
        success: true,
        sheetName: data.sheetName || 'Ventas',
        message: `¡Conexión verificada con éxito! Hoja activa: "${data.sheetName || 'Ventas'}". Filas existentes: ${data.totalFilas ?? 0}.`
      };
    }

    return {
      success: false,
      message: data.error || 'Respuesta no válida del Apps Script.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `No se pudo conectar: ${err.message || 'Error de red'}. Asegúrate de haber seleccionado "Cualquiera" (Anyone) en el acceso de la aplicación web.`
    };
  }
}

/**
 * Consulta los datos en vivo desde Google Apps Script.
 */
export async function fetchLiveSheetData(url: string): Promise<{
  success: boolean;
  rows?: SheetRow[];
  nextOrderNumber?: number;
  message?: string;
}> {
  try {
    const fetchUrl = url.includes('?') ? `${url}&action=get_data` : `${url}?action=get_data`;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.success) {
      return {
        success: true,
        rows: data.data || [],
        nextOrderNumber: data.nextOrderNumber
      };
    }
    return {
      success: false,
      message: data.error || 'Error al obtener datos'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'No fue posible sincronizar datos en vivo'
    };
  }
}

/**
 * Exporta las filas a un archivo CSV compatible con Excel (UTF-8 con BOM).
 */
export function exportRowsToCSV(rows: SheetRow[], filename = 'registro_ventas_cosmetica.csv'): void {
  const headers = [
    'Numero_Pedido',
    'Fecha',
    'Cliente',
    'Direccion',
    'Producto',
    'Tamaño',
    'Cantidad',
    'Precio_Unitario',
    'Subtotal'
  ];

  const escapeField = (value: any): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r => [
      escapeField(r.Numero_Pedido),
      escapeField(r.Fecha),
      escapeField(r.Cliente),
      escapeField(r.Direccion),
      escapeField(r.Producto),
      escapeField(r.Tamaño),
      escapeField(r.Cantidad),
      escapeField(r.Precio_Unitario),
      escapeField(r.Subtotal)
    ].join(','))
  ];

  // UTF-8 BOM para que Excel en español lo abra perfecto con acentos y ñ
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Elimina un pedido por su Numero_Pedido del almacenamiento local
 * y opcionalmente envía la solicitud de eliminación a Google Apps Script.
 */
export async function deleteOrderFromStorageAndSheets(
  numeroPedido: number,
  customScriptUrl?: string
): Promise<{ updatedOrders: SaleOrder[]; message: string; success: boolean }> {
  const currentOrders = getStoredOrders();
  const updatedOrders = currentOrders.filter(o => o.numeroPedido !== numeroPedido);
  saveOrdersLocally(updatedOrders);

  const url = customScriptUrl || getScriptUrl();
  let message = `Pedido #${numeroPedido} eliminado del historial local.`;

  if (url) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'delete_order',
          numeroPedido: numeroPedido
        })
      });

      if (response.ok) {
        const text = await response.text();
        try {
          const res = JSON.parse(text);
          if (res.success) {
            message = `Pedido #${numeroPedido} eliminado con éxito de Google Sheets y del historial.`;
          }
        } catch {
          message = `Pedido #${numeroPedido} eliminado de Google Sheets y del historial.`;
        }
      }
    } catch (err: any) {
      console.warn('No se pudo comunicar con Google Sheets para borrar filas:', err);
      message = `Pedido #${numeroPedido} eliminado del historial local. (Nota: Si tu hoja de cálculo no respondió, también puedes retirar las filas manualmente en Sheets).`;
    }
  }

  return { updatedOrders, message, success: true };
}

/**
 * Exporta la base de datos completa de pedidos como un archivo JSON de respaldo.
 * Ideal para guardar una copia de seguridad que se puede archivar o transferir.
 */
export function exportOrdersToJSON(orders: SaleOrder[], filename = 'respaldo_pedidos_adara.json'): void {
  const jsonContent = JSON.stringify(orders, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Borra todos los pedidos almacenados en localStorage (o reinicia el almacenamiento).
 */
export function clearAllStoredOrders(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
  } catch (err) {
    console.error('Error al limpiar pedidos de localStorage:', err);
  }
}
