import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

const ALLOWED_DOMAINS = [
  'numaris.com',
  'easytrack.mx',
  'tcvsat.com',
  'traffilogla.com',
  'sfleet.mx'
];

export function isAllowedEmailDomain(email: string): boolean {
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith(`@${domain}`));
}

export async function isEmailTecnicoValido(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('expedientes_servicio')
    .select('email_tecnico')
    .eq('email_tecnico', email.toLowerCase())
    .limit(1);

  if (error) {
    console.error('Error checking email_tecnico:', error);
    return false;
  }

  return data && data.length > 0;
}

export async function validateRegistrationEmail(email: string): Promise<{ allowed: boolean; reason: string }> {
  if (isAllowedEmailDomain(email)) {
    return { allowed: true, reason: 'Company email domain' };
  }

  const hasServices = await isEmailTecnicoValido(email);
  if (hasServices) {
    return { allowed: true, reason: 'Has assigned services' };
  }

  return {
    allowed: false,
    reason: 'Email domain not allowed and no assigned services found'
  };
}

export async function getUserRole(userId: string): Promise<'owner' | 'admin' | 'user'> {
  const { data, error } = await supabase.rpc('get_user_role', {
    user_id: userId
  });

  if (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }

  return (data as 'owner' | 'admin' | 'user') || 'user';
}

export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'owner' || role === 'admin';
}

export async function isOwner(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'owner';
}

export async function canAccessAdminPanel(userId: string): Promise<boolean> {
  return await isAdmin(userId);
}

export async function getUserProfileOrCreate(userId: string, email: string): Promise<UserProfile | null> {
  let { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting user profile:', error);
    return null;
  }

  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        role: 'user',
        active: true,
        full_name: '',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      return null;
    }

    profile = newProfile;
  }

  return profile as UserProfile | null;
}

export async function updateUserRole(
  targetUserId: string,
  newRole: 'admin' | 'user',
  currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('update_user_role_by_admin', {
    target_user_id: targetUserId,
    new_role: newRole
  });

  if (error) {
    console.error('Error calling update_user_role_by_admin:', error);
    return { success: false, error: error.message };
  }

  if (!data.success) {
    return { success: false, error: data.error };
  }

  return { success: true };
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.rpc('get_all_users_for_admin');

  if (error) {
    console.error('Error getting all users:', error);
    return [];
  }

  return (data || []) as UserProfile[];
}
