import React, { useState, useEffect } from 'react';
import { getApiKey, getCoordinates, getSolarInsights } from '../services/googleMapsService';
import { GoogleGenAI } from "@google/genai";
import { Terminal, Play, CheckCircle, XCircle, Map as MapIcon, Sun, Brain, Box } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'json';
  message: string;
  data?: any;
}

const ApiTester: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'preview'>('console');
  const [isLoading, setIsLoading] = useState(false);
  const [testCoords, setTestCoords] = useState<{lat: number, lng: number} | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'json' = 'info', data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type, data }, ...prev]);
  };

  const clearLogs = () => setLogs([]);

  // 1. Test API Key Availability
  const testApiKey = () => {
    const key = getApiKey();
    if (key && key.startsWith('AIza')) {
      addLog(`API Key encontrada: ${key.substring(0, 10)}...`, 'success');
      return true;
    } else {
      addLog('API Key inválida ou não encontrada.', 'error');
      return false;
    }
  };

  // 2. Test Geocoding API
  const testGeocoding = async () => {
    setIsLoading(true);
    addLog('Iniciando teste de Geocoding...', 'info');
    try {
      const address = "Av. Paulista, 1578, São Paulo";
      addLog(`Buscando coordenadas para: ${address}`);
      
      const result = await getCoordinates(address);
      
      if (result.formattedAddress.includes("Simulado") || result.formattedAddress.includes("Offline")) {
          addLog('Geocoding retornou dados de FALLBACK (Simulado). A API pode estar falhando ou cota excedida.', 'error', result);
      } else {
          addLog('Geocoding Sucesso!', 'success', result);
          setTestCoords({ lat: result.lat, lng: result.lng });
      }
    } catch (e: any) {
      addLog(`Erro no Geocoding: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Test Solar API
  const testSolar = async () => {
    setIsLoading(true);
    addLog('Iniciando teste da Solar API...', 'info');
    
    if (!testCoords) {
        addLog('Execute o teste de Geocoding primeiro para obter coordenadas.', 'error');
        setIsLoading(false);
        return;
    }

    try {
      addLog(`Consultando BuildingInsights para Lat: ${testCoords.lat}, Lng: ${testCoords.lng}`);
      const data = await getSolarInsights(testCoords.lat, testCoords.lng);
      
      if (!data) {
        addLog('Solar API falhou ou local sem cobertura solar.', 'error');
      } else {
        addLog('Solar API Sucesso! Dados recebidos.', 'success', data); // Logs raw JSON
        addLog(`Painéis Máximos: ${data.solarPotential?.maxArrayPanelsCount}`, 'info');
      }
    } catch (e: any) {
      addLog(`Erro na Solar API: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Test Gemini API
  const testGemini = async () => {
    setIsLoading(true);
    addLog('Iniciando teste do Gemini Flash 2.5...', 'info');
    try {
        const apiKey = getApiKey();
        const ai = new GoogleGenAI({ apiKey });
        
        addLog('Enviando prompt: "Explique o que é energia fotovoltaica em 1 frase."');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Explique o que é energia fotovoltaica em uma frase curta.',
        });
        
        const text = response.text;
        addLog('Gemini Resposta:', 'success', { text });
    } catch (e: any) {
        addLog(`Erro no Gemini: ${e.message}`, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // 5. Test Maps Libraries
  const testMapsLibs = () => {
    addLog('Verificando bibliotecas do Google Maps...', 'info');
    if (window.google && window.google.maps) {
        addLog('Google Maps Core: Carregado', 'success');
        
        if (window.google.maps.importLibrary) {
             addLog('Dynamic Import: Suportado', 'success');
        }

        // Check 3D Element
        const map3d = customElements.get('gmp-map-3d');
        if (map3d) {
             addLog('<gmp-map-3d>: Registrado (API 3D Tiles Ativa)', 'success');
             setActiveTab('preview');
        } else {
             addLog('<gmp-map-3d>: Não registrado. Verifique se v=beta e libraries=maps3d estão na URL.', 'error');
        }

    } else {
        addLog('Objeto window.google não encontrado.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[85vh]">
        
        {/* Control Panel */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-orange-400">
                <Terminal className="w-6 h-6" /> Diagnóstico de API
            </h2>
            
            <div className="space-y-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">API Key em uso:</p>
                    <code className="text-green-400 text-xs break-all">{getApiKey()}</code>
                </div>

                <button onClick={testApiKey} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>1. Validar Chave</span>
                </button>

                <button onClick={testGeocoding} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <MapIcon className="w-5 h-5 text-blue-400" />
                    <span>2. Testar Geocoding</span>
                </button>

                <button onClick={testSolar} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <Sun className="w-5 h-5 text-yellow-400" />
                    <span>3. Testar Solar API (JSON)</span>
                </button>

                <button onClick={testGemini} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span>4. Testar Gemini 2.5</span>
                </button>
                
                <button onClick={testMapsLibs} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <Box className="w-5 h-5 text-red-400" />
                    <span>5. Verificar 3D Tiles</span>
                </button>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-700">
                <button onClick={clearLogs} className="text-xs text-slate-400 hover:text-white">Limpar Console</button>
            </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2 bg-black rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900">
                <button 
                    onClick={() => setActiveTab('console')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'console' ? 'bg-black text-white border-t-2 border-orange-500' : 'text-slate-400 hover:text-white'}`}
                >
                    Console Output
                </button>
                <button 
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'preview' ? 'bg-black text-white border-t-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
                >
                    Visual Preview (3D)
                </button>
            </div>

            {/* Console Content */}
            {activeTab === 'console' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm custom-scrollbar">
                    {logs.length === 0 && <p className="text-slate-600 italic">Aguardando execução de testes...</p>}
                    {logs.map((log, index) => (
                        <div key={index} className="border-b border-white/5 pb-2 mb-2 animate-fade-in">
                            <div className="flex items-start gap-2">
                                <span className="text-slate-500 text-xs mt-0.5">[{log.timestamp}]</span>
                                {log.type === 'info' && <span className="text-blue-400">INFO:</span>}
                                {log.type === 'success' && <span className="text-green-400">OK:</span>}
                                {log.type === 'error' && <span className="text-red-500">ERR:</span>}
                                <span className="text-slate-200">{log.message}</span>
                            </div>
                            {log.data && (
                                <pre className="mt-2 bg-slate-900/50 p-2 rounded text-xs text-yellow-100 overflow-x-auto">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Content */}
            {activeTab === 'preview' && (
                <div className="flex-1 relative bg-slate-800">
                    <div className="absolute inset-0">
                         {/* @ts-ignore */}
                         <gmp-map-3d 
                            center={testCoords ? `${testCoords.lat},${testCoords.lng}` : "-23.5505,-46.6333"} 
                            range="1000" 
                            tilt="60" 
                            heading="45"
                            style={{width: '100%', height: '100%'}}
                         />
                    </div>
                    <div className="absolute top-4 left-4 bg-black/70 p-2 rounded pointer-events-none">
                        <p className="text-xs text-white">Renderizando Photorealistic 3D Tiles</p>
                        <p className="text-xs text-slate-400">{testCoords ? `Lat: ${testCoords.lat}` : 'Default Location'}</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ApiTester;
