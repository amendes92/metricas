import React from 'react';
import { Lead } from '../types';
import { MapPin, Calendar, Zap, DollarSign, CheckCircle, User, Phone, Mail } from 'lucide-react';

interface LeadMarketplaceProps {
  leads: Lead[];
  onBuyLead: (id: string) => void;
}

const LeadMarketplace: React.FC<LeadMarketplaceProps> = ({ leads, onBuyLead }) => {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mercado de Leads Qualificados</h2>
          <p className="text-slate-500">Consultas solares em tempo real de endereços verificados.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500">Saldo: </span>
          <span className="font-bold text-green-600">R$ 450,00</span>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Nenhum lead ativo</h3>
          <p className="text-slate-500">Aguardando novos proprietários enviarem solicitações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${lead.status === 'sold' ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                    {lead.status === 'sold' ? 'Vendido' : 'Novo Lead'}
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(lead.generatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                    <p className="text-slate-800 font-medium line-clamp-2">{lead.address}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <p className="text-slate-600">Sistema Est.: <span className="font-semibold">{lead.estimatedSystemSize} kW</span></p>
                  </div>

                  {lead.status === 'sold' ? (
                     <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>{lead.homeownerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{lead.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span>{lead.email}</span>
                        </div>
                     </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100 filter blur-[2px] select-none opacity-50">
                        <p>João Silva</p>
                        <p>(11) 99999-9999</p>
                        <p>joao@exemplo.com.br</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                {lead.status === 'available' ? (
                  <button 
                    onClick={() => onBuyLead(lead.id)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    <span>Desbloquear por R$ {lead.price},00</span>
                  </button>
                ) : (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 px-4 rounded-xl cursor-default">
                    <CheckCircle className="w-5 h-5" />
                    <span>Comprado</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadMarketplace;