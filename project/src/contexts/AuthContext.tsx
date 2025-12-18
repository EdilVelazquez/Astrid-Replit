import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';
import { getUserProfileOrCreate, validateRegistrationEmail } from '../services/permissionsService';

interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email!);
        } else {
          setLoading(false);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted || !isInitialized) return;

        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email!);
        } else {
          setUser(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  const loadUserProfile = async (userId: string, email: string) => {
    try {
      if (!email) {
        setUser(null);
        setLoading(false);
        return;
      }

      const profile = await getUserProfileOrCreate(userId, email);

      if (!profile) {
        console.error('Failed to load or create user profile for:', email);
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(profile);
      setLoading(false);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const reloadUserProfile = async () => {
    if (session?.user) {
      await loadUserProfile(session.user.id, session.user.email!);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut, reloadUserProfile }}>
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
