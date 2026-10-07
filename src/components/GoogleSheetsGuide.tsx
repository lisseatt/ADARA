import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download, 
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
        message: 'Has borrado el enlace. La app guardará las ventas únicamente en la memoria de este dispositivo.'
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
    <div className="space-y-6 min-w-[300px]">
      {/* TARJETA DE CONEXIÓN */}
      <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#E8DFC8]">
          <div>
            <div className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-[#B8801A]">
              <FileSpreadsheet className="w-5 h-5" />
              <span>Conexión con tu Hoja de Cálculo</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1A1612] mt-1">
              Enlace de Google Sheets
            </h2>
            <p className="text-base font-medium text-[#4A3D30] mt-1 max-w-2xl">
              Pega aquí el enlace que obtuviste al publicar el script en Google Sheets. Tus ventas se guardarán automáticamente.
            </p>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-base font-bold rounded-xl border-2 ${
                currentUrl
                  ? 'bg-[#FAF5EC] text-[#1A1612] border-[#B8801A]'
                  : 'bg-amber-100 text-[#1A1612] border-amber-500'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${currentUrl ? 'bg-[#15803D]' : 'bg-amber-600'}`}></span>
              <span>{currentUrl ? 'Hoja Vinculada' : 'Modo Solo Local'}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div>
            {/* Etiqueta visible obligatoria */}
            <label 
              htmlFor="url-sheets-input"
              className="block text-base font-bold text-[#1A1612] mb-1.5"
            >
              Enlace web de tu hoja de cálculo (debe terminar en /exec):
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="url-sheets-input"
                type="url"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 min-h-[48px] px-4 py-2.5 bg-white border-2 border-[#6B5A4B] rounded-xl text-base font-mono font-bold text-[#1A1612] focus:outline-none focus:border-[#D49A2A]"
              />

              {/* ÚNICO BOTÓN PRINCIPAL DE ESTA PANTALLA (Requisito 4) */}
              <button
                type="submit"
                disabled={isTesting}
                className="min-h-[48px] px-6 py-3 bg-[#B8801A] hover:bg-[#9E6C12] active:bg-[#855B0F] text-white font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 shrink-0 shadow-md"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verificando conexión...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Guardar y Probar Conexión</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resultado de prueba visible y en español claro */}
          {testResult && (
            <div
              role="alert"
              className={`p-4 rounded-xl text-base font-bold flex items-start gap-3 border-2 animate-in fade-in ${
                testResult.success
                  ? 'bg-[#FAF5EC] border-[#B8801A] text-[#1A1612]'
                  : 'bg-amber-100 border-amber-600 text-[#1A1612]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="leading-snug">{testResult.message}</p>
                {testResult.sheetName && (
                  <p className="text-base text-[#4A3D30]">
                    Pestaña vinculada: <strong className="font-mono text-[#1A1612]">{testResult.sheetName}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* GUÍA DE 4 PASOS */}
      <div className="bg-white rounded-2xl border-2 border-[#C4B5A5] p-5 sm:p-7 shadow-sm space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-[#1A1612]">
            Instrucciones para conectar tu hoja (4 Pasos)
          </h3>
          <p className="text-base font-medium text-[#4A3D30] mt-1">
            Solo toma un par de minutos conectar tu hoja para recibir las ventas de Adara.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Paso 1 */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#E8DFC8] space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
                1
              </span>
              <h4 className="text-lg font-bold text-[#1A1612]">
                Abre tu hoja de Google Sheets
              </h4>
            </div>
            <p className="text-base text-[#4A3D30] font-medium leading-relaxed">
              Ingresa a Google Sheets y crea una hoja nueva o usa una existente. No tienes que escribir los títulos de columnas; el sistema los creará automáticamente.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#E8DFC8] space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
                2
              </span>
              <h4 className="text-lg font-bold text-[#1A1612]">
                Entra a Extensiones &gt; Apps Script
              </h4>
            </div>
            <p className="text-base text-[#4A3D30] font-medium leading-relaxed">
              En el menú superior de Google Sheets, haz clic en <strong>Extensiones</strong> y luego en <strong>Apps Script</strong>. Se abrirá la ventana para pegar código.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#E8DFC8] space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
                3
              </span>
              <h4 className="text-lg font-bold text-[#1A1612]">
                Pega el código y dale Guardar
              </h4>
            </div>
            <p className="text-base text-[#4A3D30] font-medium leading-relaxed">
              Borra lo que esté escrito, copia el código con el botón de abajo <strong>"Copiar Código"</strong>, pégalo en la ventana y haz clic en el botón de guardar.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-[#E8DFC8] space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#1A1612] text-white flex items-center justify-center font-bold text-base">
                4
              </span>
              <h4 className="text-lg font-bold text-[#1A1612]">
                Publica tu aplicación web
              </h4>
            </div>
            <p className="text-base text-[#4A3D30] font-medium leading-relaxed">
              Haz clic en <strong>Implementar &gt; Nueva implementación</strong>, selecciona tipo <strong>Aplicación web</strong>, en acceso elige <strong>Cualquiera</strong> y copia el enlace que te entregue.
            </p>
          </div>
        </div>

        {/* Columnas */}
        <div className="p-5 rounded-2xl bg-[#FAF5EC] border-2 border-[#B8801A] space-y-3">
          <div className="flex items-center gap-2 text-[#1A1612] font-bold text-base uppercase">
            <Table className="w-5 h-5 text-[#B8801A]" />
            <span>Columnas que se guardarán en tu hoja de cálculo:</span>
          </div>
          <div className="text-base font-bold text-[#1A1612] leading-relaxed">
            Numero_Pedido · Fecha · Cliente · Direccion · Producto · Tamaño · Cantidad · Precio_Unitario · Subtotal
          </div>
        </div>
      </div>

      {/* BLOQUE DE CÓDIGO (Botones secundarios) */}
      <div className="bg-[#1A1612] text-white rounded-2xl border-2 border-[#6B5A4B] shadow-md overflow-hidden">
        <div className="p-4 bg-[#2D241E] border-b-2 border-[#6B5A4B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#F5C242]" />
            <span className="text-base font-bold text-white">
              Código para tu hoja de cálculo (Codigo.gs)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón secundario */}
            <button
              type="button"
              onClick={handleDownloadFile}
              className="min-h-[44px] px-3.5 py-2 text-base font-bold text-white bg-[#3D332B] hover:bg-[#4D4137] border border-[#6B5A4B] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Descargar archivo</span>
            </button>

            {/* Botón secundario */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[44px] px-4 py-2 text-base font-bold text-[#1A1612] bg-[#FAF5EC] hover:bg-white border-2 border-[#D49A2A] rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#15803D]" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#B8801A]" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-5 overflow-x-auto max-h-[400px] text-base font-mono leading-relaxed bg-[#1A1612] text-[#F5EFE6]">
          <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>
    </div>
  );
};
