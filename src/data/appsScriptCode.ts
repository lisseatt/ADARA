/**
 * Código de Google Apps Script para Google Sheets
 * Este código debe pegarse en el editor de Apps Script de tu Hoja de Cálculo
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * ADARA COSMÉTICA NATURAL - REGISTRO DE VENTAS
 * Conexión Web App con Google Sheets
 * ============================================================================
 * Columnas exactas en la Fila 1:
 * Numero_Pedido | Fecha | Cliente | Direccion | Producto | Tamaño | Cantidad | Precio_Unitario | Subtotal
 */

// Nombre de la pestaña de la hoja (puedes cambiarlo si deseas)
const NOMBRE_HOJA = "Ventas";

// Encabezados estrictos requeridos en la Fila 1
const ENCABEZADOS = [
  "Numero_Pedido",
  "Fecha",
  "Cliente",
  "Direccion",
  "Producto",
  "Tamaño",
  "Cantidad",
  "Precio_Unitario",
  "Subtotal"
];

/**
 * Obtiene o crea la hoja de cálculo con los encabezados correspondientes
 */
function obtenerHojaVentas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOMBRE_HOJA);
  
  if (!sheet) {
    sheet = ss.insertSheet(NOMBRE_HOJA);
  }
  
  // Si la fila 1 está vacía o no tiene los encabezados, crearlos
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ENCABEZADOS);
    
    // Dar formato estético a los encabezados
    const headerRange = sheet.getRange(1, 1, 1, ENCABEZADOS.length);
    headerRange.setBackground("#D49A2A"); // Dorado cálido oficial Adara
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // Auto-ajustar columnas
    for (let i = 1; i <= ENCABEZADOS.length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
  
  return sheet;
}

/**
 * Endpoint POST: Recibe una nueva venta desde la aplicación web
 * y agrega todas las filas de productos correspondientes al mismo Numero_Pedido.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Esperar hasta 30 segundos por concurrencia
  lock.tryLock(30000);
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJSON({
        success: false,
        error: "No se recibieron datos en la solicitud POST"
      });
    }
    
    const sheet = obtenerHojaVentas();
    const data = JSON.parse(e.postData.contents);

    // Acción para ELIMINAR un pedido existente de la hoja de cálculo
    if (data.action === "delete_order" && data.numeroPedido) {
      const targetNum = Number(data.numeroPedido);
      const lastRow = sheet.getLastRow();
      let deletedCount = 0;
      if (lastRow > 1) {
        const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        // Recorrer de abajo hacia arriba para eliminar renglones sin alterar índices
        for (let i = values.length - 1; i >= 0; i--) {
          if (Number(values[i][0]) === targetNum) {
            sheet.deleteRow(i + 2);
            deletedCount++;
          }
        }
      }
      return respuestaJSON({
        success: true,
        deletedCount: deletedCount,
        message: "Pedido #" + targetNum + " eliminado correctamente de Google Sheets (" + deletedCount + " renglones)."
      });
    }
    
    // Preparar filas para insertar
    const filasParaInsertar = [];
    
    // Caso 1: Se envía un objeto de pedido con array de items
    if (data.numeroPedido && Array.isArray(data.items)) {
      const numPedido = Number(data.numeroPedido);
      const fecha = String(data.fecha || "");
      const cliente = String(data.cliente || "");
      const direccion = String(data.direccion || "");
      
      data.items.forEach(function(item) {
        filasParaInsertar.push([
          numPedido,
          fecha,
          cliente,
          direccion,
          String(item.producto || ""),
          String(item.tamano || ""),
          Number(item.cantidad || 1),
          Number(item.precioUnitario || 0),
          Number(item.subtotal || 0)
        ]);
      });
    } 
    // Caso 2: Se envía directamente una lista de filas preformateadas
    else if (Array.isArray(data.rows)) {
      data.rows.forEach(function(row) {
        filasParaInsertar.push([
          Number(row.Numero_Pedido),
          String(row.Fecha || ""),
          String(row.Cliente || ""),
          String(row.Direccion || ""),
          String(row.Producto || ""),
          String(row.Tamaño || ""),
          Number(row.Cantidad || 1),
          Number(row.Precio_Unitario || 0),
          Number(row.Subtotal || 0)
        ]);
      });
    } else {
      return respuestaJSON({
        success: false,
        error: "Formato de datos no reconocido. Se esperaba { numeroPedido, items: [...] } o { rows: [...] }"
      });
    }
    
    if (filasParaInsertar.length === 0) {
      return respuestaJSON({
        success: false,
        error: "El pedido no contiene ningún producto"
      });
    }
    
    // Insertar en lote (batch) para máxima velocidad
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, filasParaInsertar.length, ENCABEZADOS.length)
         .setValues(filasParaInsertar);
    
    // Formato de moneda para columnas Precio_Unitario y Subtotal
    sheet.getRange(startRow, 8, filasParaInsertar.length, 2)
         .setNumberFormat("$#,##0.00");
         
    // Formato de fecha para columna Fecha
    sheet.getRange(startRow, 2, filasParaInsertar.length, 1)
         .setNumberFormat("@"); // Texto o YYYY-MM-DD
    
    return respuestaJSON({
      success: true,
      message: "Venta guardada exitosamente en Google Sheets",
      numeroPedido: data.numeroPedido,
      filasGuardadas: filasParaInsertar.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    return respuestaJSON({
      success: false,
      error: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Endpoint GET: Consulta los datos guardados o prueba la conexión
 * Permite a la app web consultar el historial y el próximo Numero_Pedido.
 */
function doGet(e) {
  try {
    const sheet = obtenerHojaVentas();
    const action = (e && e.parameter && e.parameter.action) || "get_data";
    
    // Acción 1: Ping / Prueba de conexión
    if (action === "ping") {
      return respuestaJSON({
        success: true,
        status: "online",
        message: "Conexión exitosa con Google Apps Script",
        sheetName: sheet.getName(),
        totalFilas: Math.max(0, sheet.getLastRow() - 1)
      });
    }
    
    const lastRow = sheet.getLastRow();
    
    // Si sólo hay encabezados o está vacía
    if (lastRow <= 1) {
      return respuestaJSON({
        success: true,
        data: [],
        nextOrderNumber: 1,
        totalVentas: 0
      });
    }
    
    // Leer todos los registros
    const valores = sheet.getRange(2, 1, lastRow - 1, ENCABEZADOS.length).getValues();
    
    let maxOrder = 0;
    const registros = [];
    
    for (let i = 0; i < valores.length; i++) {
      const fila = valores[i];
      const numPedido = Number(fila[0]) || 0;
      if (numPedido > maxOrder) {
        maxOrder = numPedido;
      }
      
      // Formatear fecha de manera consistente
      let fechaStr = fila[1];
      if (fechaStr instanceof Date) {
        const y = fechaStr.getFullYear();
        const m = String(fechaStr.getMonth() + 1).padStart(2, '0');
        const d = String(fechaStr.getDate()).padStart(2, '0');
        fechaStr = y + "-" + m + "-" + d;
      } else {
        fechaStr = String(fechaStr || "");
      }
      
      registros.push({
        Numero_Pedido: numPedido,
        Fecha: fechaStr,
        Cliente: String(fila[2] || ""),
        Direccion: String(fila[3] || ""),
        Producto: String(fila[4] || ""),
        Tamaño: String(fila[5] || ""),
        Cantidad: Number(fila[6]) || 0,
        Precio_Unitario: Number(fila[7]) || 0,
        Subtotal: Number(fila[8]) || 0
      });
    }
    
    return respuestaJSON({
      success: true,
      data: registros,
      nextOrderNumber: maxOrder + 1,
      totalVentas: registros.length
    });
    
  } catch (err) {
    return respuestaJSON({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Función auxiliar para retornar respuestas en formato JSON
 */
function respuestaJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
