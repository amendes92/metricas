import React from 'react';
import { SolarReportData } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sun, DollarSign, Leaf, BatteryCharging } from 'lucide-react';

interface SolarReportProps {
  data: SolarReportData;
  onUnlock: () => void;
}

const SolarReport: React.FC<SolarReportProps> = ({ data, onUnlock }) => {
  const chartData = data.monthlySavings.map((val, idx) => ({
    name: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][idx],
    savings: val,
  }));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Potencial Solar Encontrado!</h2>
          <p className="opacity-90 text-lg flex items-center gap-2">
            <Sun className="w-5 h-5" />
            {data.address}
          </p>
        </div>

        <div className="p-8">
          <p className="text-slate-600 text-lg mb-8 italic border-l-4 border-yellow-400 pl-4 bg-yellow-50 py-2 rounded-r-lg">
            "{data.summary}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center text-green-600 mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Economia Anual</p>
              <p className="text-2xl font-bold text-slate-900">R$ {data.annualSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center text-yellow-600 mb-4">
                <Sun className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Horas de Sol/Ano</p>
              <p className="text-2xl font-bold text-slate-900">{data.sunlightHours.toLocaleString('pt-BR')} h</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <BatteryCharging className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Tamanho do Sistema</p>
              <p className="text-2xl font-bold text-slate-900">{data.systemSizeKw} kW</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                <Leaf className="w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Compensação CO₂</p>
              <p className="text-2xl font-bold text-slate-900">{data.co2OffsetTons} Tons</p>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Economia Mensal Estimada</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Economia']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="savings" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#colorGradient)" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
            <h3 className="text-2xl font-bold mb-4 relative z-10">Pronto para começar a economizar?</h3>
            <p className="text-slate-300 mb-8 max-w-lg mx-auto relative z-10">
              Conecte-se com instaladores locais bem avaliados para garantir essas estimativas e verificar a elegibilidade para incentivos fiscais.
            </p>
            <button 
              onClick={onUnlock}
              className="relative z-10 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/25"
            >
              Receber Orçamento Grátis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolarReport;