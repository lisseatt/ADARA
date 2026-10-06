import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Sparkles, 
  HelpCircle,
  Play,
  Terminal,
  RefreshCw,
  Table
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/appsScriptCode';
import { testGasConnection, saveScriptUrl } from '../services/sheetsService';

interface GoogleSheetsGuideProps {
  currentUrl: string;
  onUrlUpdated: (newUrl: string) => void;
}

export const GoogleSheetsGuide: React.FC<GoogleSheetsGuideProps> = ({
  currentUrl,
  onUrlUpdated
}) => {
  const [copied, setCopied] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; sheetName?: string } | null>(null);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: 'text/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Codigo.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = inputUrl.trim();
    saveScriptUrl(cleanUrl);
    onUrlUpdated(cleanUrl);

    if (!cleanUrl) {
      setTestResult({
        success: false,
        message: 'Has limpiado la URL. La aplicación guardará las ventas en almacenamiento local.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGasConnection(cleanUrl);
    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* TARJETA DE CONEXIÓN RÁPIDA DE LA URL */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#F0EBE1]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D49A2A]">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Conexión con tu Hoja de Cálculo</span>
            </div>
            <h2 className="text-xl font-serif-title font-semibold text-[#2D2721] mt-0.5">
              URL de la Aplicación Web de Google Apps Script
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Pega aquí la URL que obtienes al implementar el script en Google Sheets. Las ventas se sincronizarán en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                currentUrl
                  ? 'bg-[#FAF5EC] text-[#9E6C12] border border-[#ECD9BA]'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentUrl ? 'bg-[#D49A2A]' : 'bg-amber-500'}`}></span>
              <span>{currentUrl ? 'URL Configurada' : 'Modo Almacenamiento Local'}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              URL del Web App (termina en /exec)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#D8CFC4] rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D49A2A]"
              />
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2.5 bg-[#D49A2A] hover:bg-[#BD851D] active:bg-[#A57416] text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 shrink-0"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Guardar y Probar Conexión</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl text-xs font-medium flex items-start gap-3 animate-in fade-in ${
                testResult.success
                  ? 'bg-[#FAF5EC] border border-[#ECD9BA] text-[#7A5007]'
                  : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-[#D49A2A] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.sheetName && (
                  <p className="text-[11px] text-[#9E6C12]">
                    Pestaña vinculada: <strong className="font-mono">{testResult.sheetName}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* GUÍA PASO A PASO EN 4 PASOS */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-serif-title font-semibold text-[#2D2721]">
            Guía de Implementación en Google Sheets (4 Pasos Sencillos)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Solo toma 2 minutos configurar tu hoja para recibir los pedidos de cosmética artesanal automáticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Paso 1 */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D49A2A] text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h4 className="text-sm font-semibold text-slate-900">
                Abre tu Google Sheets existente
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Ingresa a tu hoja de cálculo en <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-[#D49A2A] underline font-medium">sheets.google.com</a>. No necesitas crear los encabezados manualmente, el script los creará automáticamente si la hoja está vacía.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D49A2A] text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="text-sm font-semibold text-slate-900">
                Abre Extensiones &gt; Apps Script
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              En el menú superior de Google Sheets, ve a <strong>Extensiones</strong> y haz clic en <strong>Apps Script</strong>. Se abrirá la ventana del editor de código de Google.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D49A2A] text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="text-sm font-semibold text-slate-900">
                Pega el Código.gs y Guarda
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Borra cualquier texto existente en el editor, copia el código que aparece más abajo con el botón <strong>"Copiar Código"</strong>, pégalo y haz clic en el icono de <strong>Guardar (💾)</strong>.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D49A2A] text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h4 className="text-sm font-semibold text-slate-900">
                Implementar como Aplicación Web
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Haz clic en el botón azul superior <strong>Implementar &gt; Nueva implementación</strong>. Selecciona tipo <strong>"Aplicación web"</strong>, en "¿Quién tiene acceso?" elige <strong>"Cualquiera" (Anyone)</strong>, haz clic en Implementar y copia la URL generada.
            </p>
          </div>
        </div>

        {/* ESTRUCTURA EXACTA DE COLUMNAS EXPLICADA */}
        <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#ECD9BA]">
          <div className="flex items-center gap-2 text-[#7A5007] font-semibold text-xs uppercase tracking-wider mb-2">
            <Table className="w-4 h-4 text-[#D49A2A]" />
            <span>Columnas estrictas creadas en la Fila 1 de Google Sheets:</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 text-center text-xs font-mono">
            {[
              'Numero_Pedido',
              'Fecha',
              'Cliente',
              'Direccion',
              'Producto',
              'Tamaño',
              'Cantidad',
              'Precio_Unitario',
              'Subtotal'
            ].map((col, i) => (
              <div key={i} className="bg-white border border-[#ECD9BA] rounded py-1.5 px-1 font-semibold text-[#7A5007] truncate" title={col}>
                {col}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#8C5D0D] mt-2">
            <strong>Garantía de integridad:</strong> Si un pedido contiene 3 productos diferentes, el script agregará 3 renglones consecutivos en Google Sheets compartiendo exactamente el mismo <strong>Numero_Pedido</strong>, <strong>Fecha</strong>, <strong>Cliente</strong> y <strong>Dirección</strong>.
          </p>
        </div>
      </div>

      {/* BLOQUE DE CÓDIGO GOOGLE APPS SCRIPT COMPLETO */}
      <div className="bg-[#1F1C18] text-slate-100 rounded-2xl border border-[#38312A] shadow-md overflow-hidden">
        <div className="p-4 bg-[#181512] border-b border-[#38312A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#F3CA7E]" />
            <span className="text-xs font-mono font-semibold text-[#F3CA7E]">
              Código.gs (Google Apps Script)
            </span>
            <span className="text-xs text-slate-400">· Listo para copiar</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .gs</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#D49A2A] hover:bg-[#BD851D] active:bg-[#A57416] rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white" />
                  <span>Copiar Código Completo</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto max-h-[500px] text-xs font-mono leading-relaxed bg-[#1F1C18] text-slate-300">
          <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>
    </div>
  );
};
