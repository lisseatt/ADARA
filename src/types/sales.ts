/**
 * Tipos de datos para el Registro de Ventas de Cosmética Artesanal
 * y sincronización con Google Sheets.
 */

export type ProductSizePreset = '250 ml' | '500 ml' | '120 ml' | '60 ml' | '8 oz' | '4 oz' | '125 gr' | 'Otro';

export interface CartItem {
  id: string;
  producto: string;
  tamano: string; // '250 ml' | '500 ml' | '120 ml' | '60 ml' | '8 oz' | '4 onz' | '125 gr' | 'Otro'
  tamanoTipo: ProductSizePreset;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface SaleOrder {
  numeroPedido: number;
  fecha: string; // Formato YYYY-MM-DD
  cliente: string;
  direccion: string;
  items: CartItem[];
  granTotal: number;
  createdAt: string;
  syncedToSheets?: boolean;
}

/**
 * Representa una fila exacta en Google Sheets con las columnas requeridas:
 * Numero_Pedido | Fecha | Cliente | Direccion | Producto | Tamaño | Cantidad | Precio_Unitario | Subtotal
 */
export interface SheetRow {
  Numero_Pedido: number;
  Fecha: string;
  Cliente: string;
  Direccion: string;
  Producto: string;
  Tamaño: string;
  Cantidad: number;
  Precio_Unitario: number;
  Subtotal: number;
}

export interface SyncStatus {
  isConnected: boolean;
  scriptUrl: string;
  sheetName: string;
  lastSyncTime: string | null;
  pendingSyncCount: number;
}
