import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting users:', error);
    return [];
  }

  return (data as UserProfile[]) || [];
}

export async function createUser(email: string, password: string, fullName: string, role: 'owner' | 'admin' | 'user') {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        role: role,
        active: true,
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return { success: false, error: profileError.message };
    }
  }

  return { success: true, data };
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function toggleUserActive(userId: string, active: boolean) {
  return updateUserProfile(userId, { active });
}
