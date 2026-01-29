import { create } from 'zustand';

interface VisitadorasState {
  adminUsuario: string | null;
  setAdminUsuario: (nombre: string) => void;
  clearAdmin: () => void;
}

export const useVisitadorasStore = create<VisitadorasState>((set) => ({
  adminUsuario: localStorage.getItem('adminVisitadorasNombre'),
  
  setAdminUsuario: (nombre: string) => {
    localStorage.setItem('adminVisitadorasNombre', nombre);
    set({ adminUsuario: nombre });
  },
  
  clearAdmin: () => {
    localStorage.removeItem('adminVisitadorasNombre');
    set({ adminUsuario: null });
  },
}));
