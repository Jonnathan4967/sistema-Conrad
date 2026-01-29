import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutocompleteProps {
  options: { id: string; nombre: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label: string;
  required?: boolean;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Escriba para buscar...',
  disabled = false,
  label,
  required = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const wrapperRef = useRef<HTMLDivElement>(null);

  console.log(`Autocomplete ${label}:`, { options: options.length, value, filteredOptions: filteredOptions.length });

  useEffect(() => {
    const selected = options.find(opt => opt.id === value);
    if (selected) {
      setInputValue(selected.nombre);
    } else if (value === '') {
      setInputValue('');
    }
  }, [value, options]);

  useEffect(() => {
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    if (newValue === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.nombre.toLowerCase().includes(newValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  };

  const handleSelectOption = (option: { id: string; nombre: string }) => {
    setInputValue(option.nombre);
    onChange(option.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          className="input-field pr-10"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (inputValue === '') {
              setFilteredOptions(options);
            }
          }}
          onClick={() => {
            setIsOpen(true);
            if (inputValue === '') {
              setFilteredOptions(options);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
        <ChevronDown
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
          size={20}
        />
      </div>
      
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option) => (
            <div
              key={option.id}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
              onClick={() => handleSelectOption(option)}
            >
              {option.nombre}
            </div>
          ))}
        </div>
      )}
      
      {isOpen && !disabled && filteredOptions.length === 0 && inputValue && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-3 py-2 text-gray-500">No se encontraron resultados</div>
        </div>
      )}
    </div>
  );
};
