import React, { useState, useEffect } from 'react';
import { UserMode, SolarReportData, Lead, InstallerProfile } from './types';
import { generateSolarReportWithData } from './services/geminiService';
import { getCoordinates, getSolarInsights, getApiKey } from './services/googleMapsService';
import SolarReport from './components/SolarReport';
import LeadMarketplace from './components/LeadMarketplace';
import ChatAssistant from './components/ChatAssistant';
import AddressAutocomplete from './components/AddressAutocomplete';
import ApiTester from './components/ApiTester';
import { LayoutDashboard, Home, Sun, Lock, LogIn, X, Settings, Key, FlaskConical } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<UserMode>(UserMode.HOMEOWNER);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SolarReportData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  
  // Feature 8: Installer Profile / Login
  const [installerProfile, setInstallerProfile] = useState<InstallerProfile | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });

  // Feature: API Key Management
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Mock Installer Location (São Paulo center)
  const installerLocation = { lat: -23.5505, lng: -46.6333 };

  useEffect(() => {
      // Load API key from storage on mount
      const stored = localStorage.getItem('solar_api_key');
      if (stored) setApiKeyInput(stored);
      else setApiKeyInput(getApiKey());
  }, []);

  const handleSaveApiKey = () => {
      if(apiKeyInput.trim()) {
          localStorage.setItem('solar_api_key', apiKeyInput.trim());
          alert("Chave salva! A página será recarregada para aplicar as mudanças.");
          window.location.reload();
      }
  };

  // Load leads from local storage simulation
  useEffect(() => {
    if (leads.length === 0) {
        setLeads([
            {
                id: '1',
                homeownerName: 'Ana Silva',
                address: 'Av. Paulista, 1000, São Paulo, SP',
                lat: -23.5657,
                lng: -46.6514,
                phoneNumber: '(11) 99876-5432',
                email: 'ana.silva@exemplo.com.br',
                estimatedSystemSize: 8.5,
                generatedAt: new Date().toISOString(),
                status: 'available',
                price: 45,
                distanceKm: 3.2
            },
            {
                id: '2',
                homeownerName: 'Carlos Oliveira',
                address: 'Rua das Flores, 123, Curitiba, PR',
                lat: -25.4284,
                lng: -49.2733,
                phoneNumber: '(41) 98765-4321',
                email: 'carlos.o@exemplo.com.br',
                estimatedSystemSize: 5.2,
                generatedAt: new Date(Date.now() - 86400000).toISOString(),
                status: 'sold',
                price: 40,
                distanceKm: 350
            }
        ])
    }
  }, []);

  const handleSearch = async (address: string) => {
    setLoading(true);
    setReport(null);
    try {
      const coords = await getCoordinates(address);
      const solarData = await getSolarInsights(coords.lat, coords.lng);
      const data = await generateSolarReportWithData(coords.formattedAddress, coords.lat, coords.lng, solarData, 300);
      setReport(data);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async (newBill: number) => {
    if (!report) return;
    try {
        const solarData = await getSolarInsights(report.lat, report.lng); 
        const newData = await generateSolarReportWithData(report.address, report.lat, report.lng, solarData, newBill);
        setReport(newData);
    } catch (error) {
        console.error("Recalc error", error);
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9),
      homeownerName: formData.name,
      email: formData.email,
      phoneNumber: formData.phone,
      address: report.address,
      lat: report.lat,
      lng: report.lng,
      estimatedSystemSize: report.systemSizeKw,
      generatedAt: new Date().toISOString(),
      status: 'available',
      price: 50,
      distanceKm: 0 // In real app, calculate actual distance
    };

    setLeads(prev => [newLead, ...prev]);
    setShowForm(false);
    setFormData({ name: '', email: '', phone: '' });
    alert("Sua solicitação de orçamento foi enviada para instaladores avaliados!");
    setReport(null);
  };

  const buyLead = (id: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status: 'sold' } : lead
    ));
    alert("Lead adquirido com sucesso! Dados de contato desbloqueados.");
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // Mock Login
      if(loginForm.user) {
          setInstallerProfile({
              id: 'inst-1',
              name: 'Solar Tech Solutions',
              company: 'Solar Tech',
              credits: 450,
              rating: 4.8,
              location: installerLocation
          });
          setMode(UserMode.INSTALLER);
      }
  };

  if (mode === UserMode.TEST_MODE) {
    return (
      <div className="min-h-screen bg-slate-900">
        <nav className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50">
           <div className="max-w-7xl mx-auto flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                 <FlaskConical className="w-6 h-6 text-green-400" />
                 <span className="font-bold text-lg">Área de Testes (Debug)</span>
              </div>
              <button onClick={() => setMode(UserMode.HOMEOWNER)} className="text-sm hover:text-green-400 transition-colors">
                 Voltar para App
              </button>
           </div>
        </nav>
        <ApiTester />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setMode(UserMode.HOMEOWNER); setReport(null); }}>
              <div className="bg-gradient-to-br from-yellow-400 to-orange-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                <Sun className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                SolarSavian
              </span>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              <button 
                onClick={() => setMode(UserMode.HOMEOWNER)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === UserMode.HOMEOWNER ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden md:inline">Proprietários</span>
              </button>
              <button 
                onClick={() => setMode(installerProfile ? UserMode.INSTALLER : UserMode.LOGIN)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === UserMode.INSTALLER || mode === UserMode.LOGIN ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Instaladores</span>
              </button>
              
              {/* Test Button */}
              <button 
                onClick={() => setMode(UserMode.TEST_MODE)}
                className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Testar APIs"
              >
                  <FlaskConical className="w-5 h-5" />
              </button>

              {/* Settings Button */}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                title="Configurar API Key"
              >
                  <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {mode === UserMode.HOMEOWNER && (
          <div className="flex flex-col items-center">
            
            {!report && (
              <div className="w-full max-w-3xl text-center space-y-8 mt-10">
                <div className="space-y-4 animate-fade-in-up">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                    Dados Reais do <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600">Google Solar API</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                    Relatórios precisos usando imagens de satélite 3D e dados de irradiação reais para o seu telhado.
                    </p>
                </div>

                {/* Feature 1: Autocomplete Component */}
                <AddressAutocomplete onSelect={handleSearch} isLoading={loading} />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-16 opacity-80 animate-fade-in delay-150">
                    <FeatureItem title="Visão Cinemática" desc="Vídeo aéreo do seu imóvel em alta definição." icon={<Sun className="w-5 h-5 text-yellow-500"/>} />
                    <FeatureItem title="Heatmap Solar" desc="Veja exatamente onde o sol bate no seu telhado." icon={<Sun className="w-5 h-5 text-orange-500"/>} />
                    <FeatureItem title="Cálculo de Tarifas" desc="IA verifica o custo do kWh na sua cidade." icon={<Lock className="w-5 h-5 text-blue-500"/>} />
                </div>
              </div>
            )}

            {report && (
              <div className="w-full">
                <button 
                    onClick={() => setReport(null)}
                    className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <Home className="w-4 h-4 mr-1" /> Voltar à Busca
                </button>
                <SolarReport 
                    data={report} 
                    onUnlock={() => setShowForm(true)} 
                    onRecalculate={handleRecalculate}
                />
              </div>
            )}
          </div>
        )}

        {/* Feature 8: Login Screen */}
        {mode === UserMode.LOGIN && (
             <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center animate-scale-in">
                 <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Lock className="w-8 h-8 text-blue-600" />
                 </div>
                 <h2 className="text-2xl font-bold mb-2">Portal do Instalador</h2>
                 <p className="text-slate-500 mb-6">Acesse leads qualificados na sua região.</p>
                 <form onSubmit={handleLogin} className="space-y-4">
                     <input 
                        type="email" 
                        placeholder="E-mail corporativo" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={loginForm.user}
                        onChange={e => setLoginForm({...loginForm, user: e.target.value})}
                     />
                     <input 
                        type="password" 
                        placeholder="Senha" 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={loginForm.pass}
                        onChange={e => setLoginForm({...loginForm, pass: e.target.value})}
                     />
                     <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">
                         Entrar
                     </button>
                 </form>
             </div>
        )}

        {mode === UserMode.INSTALLER && installerProfile && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6 bg-slate-900 text-white p-4 rounded-xl">
                 <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                         {installerProfile.company.charAt(0)}
                     </div>
                     <div>
                         <p className="font-bold">{installerProfile.company}</p>
                         <p className="text-xs text-slate-300">Créditos: {installerProfile.credits}</p>
                     </div>
                 </div>
                 <button onClick={() => setMode(UserMode.LOGIN)} className="text-sm text-slate-300 hover:text-white flex items-center gap-1">
                     <LogIn className="w-4 h-4" /> Sair
                 </button>
            </div>
            <LeadMarketplace leads={leads} onBuyLead={buyLead} installerLocation={installerProfile.location} />
          </div>
        )}
      </main>

      {/* Feature 7: Chat Assistant with Grounding */}
      <ChatAssistant />

      {/* Lead Capture Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in relative">
            <button 
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            
            <div className="bg-slate-900 p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-2">Garanta sua Economia</h3>
                <p className="text-slate-300 text-sm">Receba propostas personalizadas para sua conta de R$ {report?.monthlyBill}.</p>
            </div>

            <form onSubmit={handleLeadSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                  placeholder="Seu Nome"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  required
                  type="tel"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                  placeholder="(DDD) 99999-9999"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-95 mt-4"
              >
                Solicitar 3 Orçamentos Grátis
              </button>
            </form>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative animate-scale-in">
                 <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
                     <X className="w-5 h-5" />
                 </button>
                 <div className="flex items-center gap-3 mb-4">
                     <div className="bg-blue-100 p-2 rounded-lg">
                         <Key className="w-6 h-6 text-blue-600" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800">Configuração de API</h3>
                 </div>
                 <p className="text-sm text-slate-500 mb-4">
                     Insira sua chave da Google Cloud Platform. Ela deve ter as APIs: <strong>Solar, Maps JavaScript, Maps 3D Tiles, Geocoding</strong> e <strong>Gemini</strong> ativadas.
                 </p>
                 <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Cole sua API Key aqui (AIza...)"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                 />
                 <div className="flex justify-end gap-2">
                     <button 
                        onClick={() => setShowSettings(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                     >
                         Cancelar
                     </button>
                     <button 
                        onClick={handleSaveApiKey}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                     >
                         Salvar e Recarregar
                     </button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};

const FeatureItem = ({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) => (
    <div className="flex gap-4 items-start p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all">
        <div className="mt-1 bg-white p-2 rounded-lg shadow-sm border border-slate-100">{icon}</div>
        <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export default App;
