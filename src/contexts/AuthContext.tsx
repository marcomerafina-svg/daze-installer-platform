import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthUser, UserRole, Installer, InstallationCompany } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  installer: Installer | null;
  company: InstallationCompany | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isCompanyOwner: boolean;
  isCompanyAdmin: boolean;
  isCompanyMember: boolean;
  isIndependentInstaller: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [installer, setInstaller] = useState<Installer | null>(null);
  const [company, setCompany] = useState<InstallationCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserData(session.user);
      } else {
        setUser(null);
        setInstaller(null);
        setCompany(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (authUser: User) => {
    try {
      const role = (authUser.app_metadata?.role || authUser.user_metadata?.role) as UserRole;

      setUser({
        id: authUser.id,
        email: authUser.email!,
        role: role || 'installer',
      });

      if (role === 'installer' || role === 'company_owner' || role === 'company_admin') {
        const { data: installerData } = await supabase
          .from('installers')
          .select('*, company:installation_companies(*)')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (installerData) {
          setInstaller(installerData);

          // Load company if installer is part of one
          if (installerData.company_id) {
            setCompany(installerData.company || null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.user) {
      await loadUserData(data.user);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setInstaller(null);
    setCompany(null);
  };

  // Helper computed values
  const isCompanyOwner = installer?.role_in_company === 'owner';
  const isCompanyAdmin = installer?.role_in_company === 'admin';
  const isCompanyMember = !!installer?.company_id;
  const isIndependentInstaller = !installer?.company_id;

  return (
    <AuthContext.Provider value={{
      user,
      installer,
      company,
      loading,
      signIn,
      signOut,
      isCompanyOwner,
      isCompanyAdmin,
      isCompanyMember,
      isIndependentInstaller
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
