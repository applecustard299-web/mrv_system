import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  demoUsers: User[];
  switchRole: (newRole: UserRole) => Promise<void>;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('blue_carbon_role') as UserRole) || 'Administrator';
  });
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      try {
        const users = await api.getDemoUsers();
        if (cancelled) return;
        setDemoUsers(users);

        const savedRole = (localStorage.getItem('blue_carbon_role') as UserRole) || 'Administrator';
        const matched = users.find(u => u.role === savedRole) || users[0];
        if (matched) {
          setUser(matched);
          setRole(matched.role);
          localStorage.setItem('blue_carbon_role', matched.role);
          localStorage.setItem('blue_carbon_email', matched.email);
        }
      } catch (err) {
        console.error('Failed to initialize demo auth (using default):', err);
        // Provide a default user so the app is never stuck on a blank screen
        if (!cancelled) {
          const defaultUser: User = {
            id: 1,
            full_name: 'Admin User',
            email: 'admin@bluecarbon.gov',
            role: 'Administrator',
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setUser(defaultUser);
          setRole('Administrator');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    // Add a 5s timeout so we never hang forever
    const timer = setTimeout(() => {
      cancelled = true;
      setIsLoading(false);
    }, 5000);
    initAuth().then(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const switchRole = async (newRole: UserRole) => {
    setIsLoading(true);
    try {
      const switched = await api.switchRole(newRole);
      setUser(switched);
      setRole(newRole);
      localStorage.setItem('blue_carbon_role', newRole);
      localStorage.setItem('blue_carbon_email', switched.email);
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (email: string, customRole?: UserRole) => {
    const matched = demoUsers.find(u => u.email === email);
    if (matched) {
      setUser(matched);
      setRole(matched.role);
      localStorage.setItem('blue_carbon_role', matched.role);
      localStorage.setItem('blue_carbon_email', matched.email);
    } else if (customRole) {
      setRole(customRole);
      localStorage.setItem('blue_carbon_role', customRole);
      localStorage.setItem('blue_carbon_email', email);
    }
  };

  const logout = () => {
    switchRole('Public User');
  };

  return (
    <AuthContext.Provider value={{ user, role, demoUsers, switchRole, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
