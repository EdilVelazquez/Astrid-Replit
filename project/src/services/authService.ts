import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    }
  });

  if (error) {
    console.error('Error signing in with Google:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        full_name: fullName || '',
      }
    }
  });

  if (error) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message };
  }

  if (data.session) {
    await supabase.auth.signOut();
  }

  return { success: true, data };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting user profile:', error);
    return null;
  }

  return data as UserProfile | null;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const session = await getCurrentSession();

  if (!session?.user) {
    return null;
  }

  return getUserProfile(session.user.id);
}
