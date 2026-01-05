import React, { useState } from 'react';
import { getApiKey, getCoordinates, getSolarInsights } from '../services/googleMapsService';
import { Terminal, CheckCircle, Map as MapIcon, Sun, Brain, Server } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'json';
  message: string;
  data?: any;
}

const ApiTester: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testCoords, setTestCoords] = useState<{lat: number, lng: number} | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'json' = 'info', data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type, data }, ...prev]);
  };

  const clearLogs = () => setLogs([]);

  // 0. Test Backend Connectivity
  const testBackend = async () => {
      setIsLoading(true);
      addLog('Pingando servidor backend (http://localhost:3001/api/health)...', 'info');
      try {
          const res = await fetch('http://localhost:3001/api/health');
          if (!res.ok) throw new Error(`Status: ${res.status}`);
          const data = await res.json();
          addLog('Backend Online!', 'success', data);
          return true;
      } catch (e: any) {
          addLog('Backend OFF ou Inacessível. O app usará Fallback (API Direta).', 'error', { error: e.message });
          return false;
      } finally {
          setIsLoading(false);
      }
  };

  // 1. Test API Key Availability
  const testApiKey = () => {
    const key = getApiKey();
    if (key && key.startsWith('AIza')) {
      addLog(`API Key (Frontend) encontrada: ${key.substring(0, 10)}...`, 'success');
      return true;
    } else {
      addLog('API Key inválida ou não encontrada no Frontend.', 'error');
      return false;
    }
  };

  // 2. Test Geocoding API
  const testGeocoding = async () => {
    setIsLoading(true);
    addLog('Iniciando teste de Geocoding (Backend -> Fallback Direct)...', 'info');
    try {
      const address = "Av. Paulista, 1578, São Paulo";
      addLog(`Buscando coordenadas para: ${address}`);
      
      const result = await getCoordinates(address);
      
      if (result.formattedAddress.includes("Offline")) {
          addLog('Geocoding falhou totalmente (Backend e Direct). Verifique a conexão e a API Key.', 'error', result);
      } else {
          addLog('Geocoding Sucesso!', 'success', result);
          setTestCoords({ lat: result.lat, lng: result.lng });
      }
    } catch (e: any) {
      addLog(`Erro Crítico no Geocoding: ${e.message}`, 'error');
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
        addLog('Solar API retornou null. Pode ser falta de cobertura, erro de CORS (no fallback) ou erro 404.', 'error');
      } else {
        addLog('Solar API Sucesso!', 'success', data); 
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
    addLog('Iniciando teste do Gemini (Backend -> Fallback SDK)...', 'info');
    
    // Using the service function directly to test the fallback logic
    const { generateSolarReportWithData } = await import('../services/geminiService');
    
    try {
        // Mock data to avoid Solar API dependency for this specific test
        const mockSolar = { solarPotential: { maxArrayPanelsCount: 20, wholeRoofStats: { areaMeters2: 50 }, roofSegmentStats: [] } };
        
        // We use a dummy address to trigger the generation
        const report = await generateSolarReportWithData(
            'Teste de API', 
            -23.55, 
            -46.63, 
            mockSolar, 
            300
        );

        addLog('Gemini Resposta Sucesso:', 'success', { summary: report.summary, savings: report.annualSavings });
    } catch (e: any) {
        addLog(`Erro no Gemini: ${e.message}`, 'error');
    } finally {
        setIsLoading(false);
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
                    <p className="text-xs text-slate-400 mb-1">API Key Ativa:</p>
                    <code className="text-green-400 text-xs break-all">{getApiKey()}</code>
                </div>

                <button onClick={testBackend} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left border border-slate-600">
                    <Server className="w-5 h-5 text-pink-400" />
                    <span>0. Checar Backend</span>
                </button>

                <button onClick={testApiKey} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>1. Validar Key (Front)</span>
                </button>

                <button onClick={testGeocoding} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <MapIcon className="w-5 h-5 text-blue-400" />
                    <span>2. Testar Geocoding</span>
                </button>

                <button onClick={testSolar} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <Sun className="w-5 h-5 text-yellow-400" />
                    <span>3. Testar Solar API</span>
                </button>

                <button onClick={testGemini} disabled={isLoading} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-left">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span>4. Testar Gemini</span>
                </button>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-700">
                <button onClick={clearLogs} className="text-xs text-slate-400 hover:text-white">Limpar Console</button>
            </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2 bg-black rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-300">Console Output</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm custom-scrollbar">
                {logs.length === 0 && <p className="text-slate-600 italic">Aguardando execução de testes...</p>}
                {logs.map((log, index) => (
                    <div key={index} className="border-b border-white/5 pb-2 mb-2 animate-fade-in">
                        <div className="flex items-start gap-2">
                            <span className="text-slate-500 text-xs mt-0.5">[{log.timestamp}]</span>
                            {log.type === 'info' && <span className="text-blue-400">INFO:</span>}
                            {log.type === 'success' && <span className="text-green-400">OK:</span>}
                            {log.type === 'error' && <span className="text-red-500 font-bold">ERR:</span>}
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
        </div>
      </div>
    </div>
  );
};

export default ApiTester;