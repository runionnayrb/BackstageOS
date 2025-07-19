import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminViewContextType {
  selectedBetaAccess: string;
  selectedProfileType: string;
  setSelectedBetaAccess: (value: string) => void;
  setSelectedProfileType: (value: string) => void;
}

const AdminViewContext = createContext<AdminViewContextType | undefined>(undefined);

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const [selectedBetaAccess, setSelectedBetaAccess] = useState('admin');
  const [selectedProfileType, setSelectedProfileType] = useState('freelance');

  return (
    <AdminViewContext.Provider value={{
      selectedBetaAccess,
      selectedProfileType,
      setSelectedBetaAccess,
      setSelectedProfileType,
    }}>
      {children}
    </AdminViewContext.Provider>
  );
}

export function useAdminView() {
  const context = useContext(AdminViewContext);
  if (context === undefined) {
    throw new Error('useAdminView must be used within an AdminViewProvider');
  }
  return context;
}