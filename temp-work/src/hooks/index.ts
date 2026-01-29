import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CACHE_DURATION, DEBOUNCE_DELAY } from '../constants';

// Hook para debouncing
export const useDebounce = <T,>(value: T, delay: number = DEBOUNCE_DELAY): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Hook para cargar estudios con caché
export const useEstudios = () => {
  const [estudios, setEstudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: any[]; timestamp: number } | null>(null);

  const cargar = useCallback(async (force = false) => {
    // Verificar caché
    if (!force && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setEstudios(cacheRef.current.data);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('estudios')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      
      const estudiosData = data || [];
      cacheRef.current = { data: estudiosData, timestamp: Date.now() };
      setEstudios(estudiosData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error al cargar estudios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { estudios, loading, error, refetch: cargar };
};

// Hook para cargar sub-estudios con caché
export const useSubEstudios = () => {
  const [subEstudios, setSubEstudios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: any[]; timestamp: number } | null>(null);

  const cargar = useCallback(async (force = false) => {
    if (!force && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setSubEstudios(cacheRef.current.data);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('sub_estudios')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      
      const subEstudiosData = data || [];
      cacheRef.current = { data: subEstudiosData, timestamp: Date.now() };
      setSubEstudios(subEstudiosData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error al cargar sub-estudios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { subEstudios, loading, error, refetch: cargar };
};

// Hook para timeout de inactividad
export const useInactivityTimeout = (onTimeout: () => void, timeout: number) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(onTimeout, timeout);
    };
    
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();
    
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [onTimeout, timeout]);
};

// Hook para manejar toasts
export const useToast = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
};
