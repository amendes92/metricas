import React, { useState, useEffect } from 'react';
import { UserMode, SolarReportData, Lead } from './types';
import { generateSolarReport } from './services/geminiService';
import SolarReport from './components/SolarReport';
import LeadMarketplace from './components/LeadMarketplace';
import { LayoutDashboard, Home, Loader2, Sun, Search, X } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<UserMode>(UserMode.HOMEOWNER);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SolarReportData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  // Load leads from local storage simulation
  useEffect(() => {
    // Initial mock data if empty
    if (leads.length === 0) {
        setLeads([
            {
                id: '1',
                homeownerName: 'Ana Silva',
                address: 'Av. Paulista, 1000, São Paulo, SP',
                phoneNumber: '(11) 99876-5432',
                email: 'ana.silva@exemplo.com.br',
                estimatedSystemSize: 8.5,
                generatedAt: new Date().toISOString(),
                status: 'available',
                price: 45
            }
        ])
    }
  }, []); // Run once on mount

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setReport(null);
    try {
      const data = await generateSolarReport(address);
      setReport(data);
    } catch (error) {
      alert("Falha ao gerar o relatório. Verifique sua chave API e tente novamente.");
    } finally {
      setLoading(false);
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
      estimatedSystemSize: report.systemSizeKw,
      generatedAt: new Date().toISOString(),
      status: 'available',
      price: 50 // Flat rate for leads
    };

    setLeads(prev => [newLead, ...prev]);
    setShowForm(false);
    setFormData({ name: '', email: '', phone: '' });
    alert("Sua solicitação de orçamento foi enviada para instaladores avaliados!");
    setReport(null);
    setAddress('');
  };

  const buyLead = (id: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status: 'sold' } : lead
    ));
  };

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
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setMode(UserMode.HOMEOWNER)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === UserMode.HOMEOWNER ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Home className="w-4 h-4" />
                Proprietários
              </button>
              <button 
                onClick={() => setMode(UserMode.INSTALLER)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === UserMode.INSTALLER ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Instaladores
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
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                    Energize sua casa com <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600">Luz Solar</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                    Obtenha um relatório instantâneo de economia solar via IA para seu endereço e conecte-se com instaladores locais verificados.
                    </p>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 flex items-center max-w-xl mx-auto transform transition-transform focus-within:scale-105">
                    <div className="pl-4 text-slate-400">
                        <MapPinIcon className="w-6 h-6" />
                    </div>
                    <form onSubmit={handleSearch} className="flex-1 flex">
                        <input
                        type="text"
                        placeholder="Digite o endereço da sua casa..."
                        className="w-full px-4 py-4 text-lg bg-transparent border-none focus:ring-0 placeholder:text-slate-300 text-slate-800"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        />
                        <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed m-1"
                        >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        {loading ? 'Analisando...' : 'Analisar'}
                        </button>
                    </form>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-16 opacity-80">
                    <FeatureItem title="Análise Instantânea" desc="IA estima economia baseada no seu telhado." icon={<Sun className="w-5 h-5 text-yellow-500"/>} />
                    <FeatureItem title="Instaladores Verificados" desc="Receba orçamentos de profissionais locais." icon={<CheckShieldIcon className="w-5 h-5 text-blue-500"/>} />
                    <FeatureItem title="Relatório Grátis" desc="Sem custo, sem compromisso de verificar economia." icon={<ZapIcon className="w-5 h-5 text-orange-500"/>} />
                </div>
              </div>
            )}

            {report && (
              <div className="w-full">
                <button 
                    onClick={() => setReport(null)}
                    className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-1" /> Voltar à Busca
                </button>
                <SolarReport data={report} onUnlock={() => setShowForm(true)} />
              </div>
            )}
          </div>
        )}

        {mode === UserMode.INSTALLER && (
          <div className="animate-fade-in">
            <LeadMarketplace leads={leads} onBuyLead={buyLead} />
          </div>
        )}
      </main>

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
                <h3 className="text-2xl font-bold mb-2">Receba Seu Orçamento Grátis</h3>
                <p className="text-slate-300 text-sm">Conecte-se com instaladores para verificar sua economia de {report?.annualSavings ? `R$ ${report.annualSavings.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : ''}.</p>
            </div>

            <form onSubmit={handleLeadSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço de E-mail</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none"
                  placeholder="joao@exemplo.com.br"
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
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform active:scale-95 mt-4"
              >
                Enviar Solicitação de Orçamento
              </button>
              <p className="text-xs text-center text-slate-400 mt-4">
                Ao enviar, você concorda em receber contatos sobre energia solar de nossos parceiros.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Icons Components for UI
const MapPinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

const CheckShieldIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);

const ZapIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

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