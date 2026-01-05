import React, { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, Play, Cpu, Globe, Layout, ShieldCheck, Database, Terminal } from 'lucide-react';
import { getApiKey, getCoordinates, getSolarInsights } from '../services/googleMapsService';
import { generateSolarReportWithData } from '../services/geminiService';

type TestStatus = 'pending' | 'running' | 'success' | 'error' | 'warning';

interface TestResult {
  id: string;
  name: string;
  category: 'Environment' | 'API' | 'Logic' | 'Layout';
  status: TestStatus;
  message: string;
  details?: any;
}

const SystemDiagnostics: React.FC = () => {
  const [logs, setLogs] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (id: string, name: string, category: any, status: TestStatus, message: string, details?: any) => {
    setLogs(prev => {
      // If log exists, update it, otherwise add new
      const existing = prev.findIndex(l => l.id === id);
      if (existing !== -1) {
        const newLogs = [...prev];
        newLogs[existing] = { id, name, category, status, message, details };
        return newLogs;
      }
      return [...prev, { id, name, category, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    
    // --- 1. ENVIRONMENT CHECKS ---
    addLog('env-browser', 'Browser Capabilities', 'Environment', 'running', 'Verificando APIs do navegador...');
    await new Promise(r => setTimeout(r, 500));
    
    try {
        const isSecure = window.isSecureContext;
        const hasGeo = 'geolocation' in navigator;
        const hasWebGL = !!document.createElement('canvas').getContext('webgl');
        
        if (!hasWebGL) throw new Error("WebGL não suportado (Mapas 3D falharão)");
        
        addLog('env-browser', 'Browser Capabilities', 'Environment', 'success', 
            `Ambiente Seguro: ${isSecure}, WebGL: OK, Geo: ${hasGeo ? 'OK' : 'N/A'}`);
    } catch (e: any) {
        addLog('env-browser', 'Browser Capabilities', 'Environment', 'error', e.message);
    }
    setProgress(10);

    // --- 2. LAYOUT & DOM CHECKS ---
    addLog('layout-dom', 'DOM Integrity', 'Layout', 'running', 'Verificando montagem do React...');
    await new Promise(r => setTimeout(r, 500));
    
    try {
        const root = document.getElementById('root');
        if (!root || root.clientHeight === 0) throw new Error("Root element com altura 0 ou inexistente");
        
        const computedStyle = window.getComputedStyle(document.body);
        if (computedStyle.fontFamily.includes('Inter') || computedStyle.fontFamily.includes('sans-serif')) {
             addLog('layout-dom', 'DOM Integrity', 'Layout', 'success', 'DOM Renderizado e CSS carregado.');
        } else {
             addLog('layout-dom', 'DOM Integrity', 'Layout', 'warning', 'Fontes ou CSS podem não estar carregando corretamente.');
        }
    } catch (e: any) {
        addLog('layout-dom', 'DOM Integrity', 'Layout', 'error', e.message);
    }
    setProgress(25);

    // --- 3. API KEY VALIDATION ---
    addLog('api-key', 'API Key Config', 'API', 'running', 'Validando formato da chave...');
    let apiKey = '';
    try {
        apiKey = getApiKey();
        if (!apiKey || apiKey.length < 10) throw new Error("API Key vazia ou inválida");
        addLog('api-key', 'API Key Config', 'API', 'success', `Key encontrada: ${apiKey.substring(0, 8)}...`);
    } catch (e: any) {
        addLog('api-key', 'API Key Config', 'API', 'error', e.message);
        setIsRunning(false);
        return; // Stop if no key
    }
    setProgress(40);

    // --- 4. GEOCODING API CHECK ---
    addLog('api-geo', 'Google Geocoding', 'API', 'running', 'Testando conversão de endereço...');
    let coords = { lat: 0, lng: 0 };
    try {
        const res = await getCoordinates('Av. Paulista, 1000, SP');
        if (res.formattedAddress.includes('Simulado') || res.formattedAddress.includes('Offline')) {
            addLog('api-geo', 'Google Geocoding', 'API', 'warning', 'API offline ou bloqueada (Usando Fallback Mock).');
            coords = { lat: -23.5505, lng: -46.6333 };
        } else {
            addLog('api-geo', 'Google Geocoding', 'API', 'success', `OK: ${res.lat.toFixed(4)}, ${res.lng.toFixed(4)}`);
            coords = { lat: res.lat, lng: res.lng };
        }
    } catch (e: any) {
        addLog('api-geo', 'Google Geocoding', 'API', 'error', e.message);
    }
    setProgress(60);

    // --- 5. SOLAR API CHECK ---
    addLog('api-solar', 'Google Solar API', 'API', 'running', 'Buscando BuildingInsights...');
    let solarData = null;
    try {
        solarData = await getSolarInsights(coords.lat, coords.lng);
        if (!solarData) {
            addLog('api-solar', 'Google Solar API', 'API', 'warning', 'Nenhum dado solar para este local (ou erro 404/403).');
        } else {
            addLog('api-solar', 'Google Solar API', 'API', 'success', `Dados recebidos. Painéis possíveis: ${solarData.solarPotential?.maxArrayPanelsCount}`);
        }
    } catch (e: any) {
        addLog('api-solar', 'Google Solar API', 'API', 'error', e.message);
    }
    setProgress(80);

    // --- 6. LOGIC & GENAI CHECK ---
    addLog('logic-gemini', 'Core Logic & AI', 'Logic', 'running', 'Simulando geração de relatório...');
    try {
        // Mock data logic test
        const mockSolar = solarData || { solarPotential: { maxArrayPanelsCount: 20, wholeRoofStats: { areaMeters2: 50 }, roofSegmentStats: [] } };
        
        // We try to run the main service function. 
        // Note: This consumes AI quota.
        const report = await generateSolarReportWithData('Teste Diagnóstico', coords.lat, coords.lng, mockSolar, 500);
        
        if (report && report.annualSavings > 0) {
            addLog('logic-gemini', 'Core Logic & AI', 'Logic', 'success', `Relatório gerado com sucesso. Economia: R$ ${report.annualSavings}`);
        } else {
            throw new Error("Relatório gerado com dados inválidos (Zero economia).");
        }
    } catch (e: any) {
        addLog('logic-gemini', 'Core Logic & AI', 'Logic', 'error', `Falha na lógica/IA: ${e.message}`);
    }
    setProgress(100);
    setIsRunning(false);
  };

  const getIcon = (status: TestStatus) => {
    switch (status) {
      case 'running': return <Activity className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-slate-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-200 font-mono p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-orange-500" />
              Diagnóstico do Sistema
            </h1>
            <p className="text-slate-400 mt-1">Verificação completa de integridade: Código, Layout e APIs.</p>
          </div>
          <button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isRunning ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20'}`}
          >
            <Play className={`w-5 h-5 ${isRunning ? 'hidden' : 'block'}`} />
            {isRunning ? 'Executando...' : 'Iniciar Teste'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800">
          <div 
            className="bg-gradient-to-r from-orange-600 to-yellow-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Status Cards */}
          <div className="space-y-4">
             <StatusCard 
                title="Ambiente" 
                icon={<Cpu className="w-5 h-5 text-blue-400" />}
                status={getCategoryStatus(logs, 'Environment')} 
             />
             <StatusCard 
                title="APIs & Nuvem" 
                icon={<Globe className="w-5 h-5 text-purple-400" />}
                status={getCategoryStatus(logs, 'API')} 
             />
             <StatusCard 
                title="Lógica Core" 
                icon={<Database className="w-5 h-5 text-green-400" />}
                status={getCategoryStatus(logs, 'Logic')} 
             />
             <StatusCard 
                title="Layout & UI" 
                icon={<Layout className="w-5 h-5 text-pink-400" />}
                status={getCategoryStatus(logs, 'Layout')} 
             />
          </div>

          {/* Console Log */}
          <div className="md:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-[500px] shadow-2xl overflow-hidden relative">
            <div className="bg-slate-950 p-3 border-b border-slate-800 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Console de Saída</span>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {logs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Activity className="w-16 h-16 mb-4 animate-pulse" />
                        <p>Aguardando inicialização...</p>
                    </div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="group animate-fade-in">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">{getIcon(log.status)}</div>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-bold text-sm text-slate-200">{log.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase border border-slate-800 px-1 rounded">{log.category}</span>
                                </div>
                                <p className={`text-xs mt-1 font-mono ${log.status === 'error' ? 'text-red-400' : log.status === 'warning' ? 'text-yellow-400' : 'text-slate-400'}`}>
                                    {log.message}
                                </p>
                            </div>
                        </div>
                        <div className="h-px bg-slate-800/50 w-full mt-3 group-last:hidden"></div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusCard = ({ title, icon, status }: { title: string, icon: any, status: TestStatus }) => {
    let borderColor = 'border-slate-800';
    let bgColor = 'bg-slate-900';
    
    if (status === 'error') { borderColor = 'border-red-900'; bgColor = 'bg-red-950/20'; }
    if (status === 'success') { borderColor = 'border-green-900'; bgColor = 'bg-green-950/20'; }

    return (
        <div className={`${bgColor} border ${borderColor} p-4 rounded-xl flex items-center justify-between transition-colors`}>
            <div className="flex items-center gap-3">
                <div className="bg-slate-950 p-2 rounded-lg">{icon}</div>
                <span className="font-medium text-slate-200">{title}</span>
            </div>
            {status === 'pending' && <span className="text-xs text-slate-600">Pendente</span>}
            {status === 'running' && <Activity className="w-4 h-4 text-blue-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
            {status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
        </div>
    );
};

const getCategoryStatus = (logs: TestResult[], category: string): TestStatus => {
    const catLogs = logs.filter(l => l.category === category);
    if (catLogs.length === 0) return 'pending';
    if (catLogs.some(l => l.status === 'running')) return 'running';
    if (catLogs.some(l => l.status === 'error')) return 'error';
    if (catLogs.some(l => l.status === 'warning')) return 'warning';
    return 'success';
};

export default SystemDiagnostics;