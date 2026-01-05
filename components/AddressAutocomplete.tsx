import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { autocompleteAddress } from '../services/googleMapsService';

interface AddressAutocompleteProps {
  onSelect: (address: string) => void;
  isLoading: boolean;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onSelect, isLoading }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (value.length > 3) {
      // In a real implementation with Maps JS SDK, you would call the AutocompleteService here
      // For this demo, we use a mock or raw fetch if implemented
      const results = await autocompleteAddress(value);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (address: string) => {
    setInput(address);
    setSuggestions([]);
    setShowSuggestions(false);
    onSelect(address); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length > 3) {
        onSelect(input);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl mx-auto z-50">
      <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 flex items-center transform transition-transform focus-within:scale-105">
        <div className="pl-4 text-slate-400">
          <MapPin className="w-6 h-6" />
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex">
          <input
            type="text"
            placeholder="Digite seu endereço completo..."
            className="w-full px-4 py-4 text-lg bg-transparent border-none focus:ring-0 placeholder:text-slate-300 text-slate-800 outline-none"
            value={input}
            onChange={handleInputChange}
          />
          <button 
            type="submit" 
            disabled={isLoading || input.length < 3}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed m-1"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analisar'}
          </button>
        </form>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-6 py-3 hover:bg-slate-50 text-slate-700 border-b border-slate-50 last:border-0 flex items-center gap-2 transition-colors"
            >
              <MapPin className="w-4 h-4 text-slate-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
