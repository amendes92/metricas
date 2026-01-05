import React from 'react';
import { Sun, Moon, Play, Pause, Clock, Calendar } from 'lucide-react';

interface ShadowClockWidgetProps {
  timeOfDay: number; // 6 to 18
  monthOfYear: number; // 0 to 11
  isPlaying: boolean;
  onTimeChange: (val: number) => void;
  onMonthChange: (val: number) => void;
  onTogglePlay: () => void;
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const ShadowClockWidget: React.FC<ShadowClockWidgetProps> = ({
  timeOfDay,
  monthOfYear,
  isPlaying,
  onTimeChange,
  onMonthChange,
  onTogglePlay
}) => {
  
  // Calculate sun position on the visual arc (0 to 100%)
  // 6am = 0%, 12pm = 50%, 18pm = 100%
  const sunProgress = ((timeOfDay - 6) / 12) * 100;

  // Calculate rotation for sun icon: -90deg (left) to 90deg (right)
  const sunRotation = (sunProgress / 100) * 180 - 90;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-slate-200 z-30 animate-fade-in-up">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-1.5 rounded-lg">
                <Sun className="w-4 h-4 text-orange-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Relógio de Sombra 4D</h4>
        </div>
        <button 
          onClick={onTogglePlay}
          className={`p-2 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 ${isPlaying ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>
      </div>

      {/* Visual Sun Arc */}
      <div className="relative h-20 mb-2 w-full overflow-hidden">
         {/* The Arc Line */}
         <div className="absolute bottom-0 left-4 right-4 h-32 border-t-2 border-dashed border-slate-300 rounded-full"></div>
         
         {/* The Moving Sun */}
         <div 
            className="absolute bottom-0 left-1/2 w-8 h-8 -ml-4 origin-bottom transition-transform duration-300 ease-out"
            style={{ 
                transform: `rotate(${sunRotation}deg) translateY(-60px) rotate(${-sunRotation}deg)`
            }}
         >
             <Sun className={`w-8 h-8 ${timeOfDay > 17 || timeOfDay < 7 ? 'text-orange-400' : 'text-yellow-400'} drop-shadow-lg fill-current`} />
         </div>
         
         {/* Labels */}
         <div className="absolute bottom-0 left-2 text-[10px] text-slate-400 font-bold">Leste (6h)</div>
         <div className="absolute bottom-0 right-2 text-[10px] text-slate-400 font-bold">Oeste (18h)</div>
      </div>

      <div className="space-y-4">
          {/* Time Slider */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Clock className="w-3 h-3" /> Hora do Dia
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {Math.floor(timeOfDay).toString().padStart(2, '0')}:{timeOfDay % 1 === 0 ? '00' : '30'}
                  </span>
              </div>
              <input 
                  type="range" 
                  min="6" max="18" step="0.5" 
                  value={timeOfDay} 
                  onChange={(e) => { if(isPlaying) onTogglePlay(); onTimeChange(Number(e.target.value)); }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all"
              />
          </div>

          {/* Month Slider */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <Calendar className="w-3 h-3" /> Mês (Estação)
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {monthNames[monthOfYear]}
                  </span>
              </div>
              <input 
                  type="range" 
                  min="0" max="11" step="1" 
                  value={monthOfYear} 
                  onChange={(e) => onMonthChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              />
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-1">
                  <span>Verão</span>
                  <span>Inverno</span>
                  <span>Verão</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ShadowClockWidget;