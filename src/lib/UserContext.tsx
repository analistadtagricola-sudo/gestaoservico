import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../components/UsuariosView'; // Or wherever User type is defined

interface UserContextType {
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    const active = localStorage.getItem("gst_current_active_user");
    if (active) setCurrentUser(JSON.parse(active));
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
