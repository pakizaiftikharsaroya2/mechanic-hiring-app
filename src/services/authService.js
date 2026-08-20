import { supabase } from '../lib/supabaseClient';

/**
 * Registers a new user. `role` and `name` are stashed in auth metadata;
 * the `handle_new_user` DB trigger (see supabase/schema.sql) copies them
 * into public.profiles automatically on signup.
 */
export async function registerUser({ name, email, phone, password, role, cnicNumber, cnicFront, cnicBack, selfie, specialty }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, role, cnicNumber, cnicFront, cnicBack, selfie, specialty }, // Include verification fields
    },
  });
  if (error) throw error;

  if (role === 'MECHANIC' && data.user) {
    const { error: mechErr } = await supabase
      .from('mechanic_profiles')
      .insert({ 
        user_id: data.user.id,
        cnic_number: cnicNumber,
        cnic_front: cnicFront,
        cnic_back: cnicBack,
        selfie: selfie,
        specialty: specialty || 'General Mechanic',
        is_verified: false
      });
    if (mechErr && mechErr.code !== '23505') throw mechErr;
  }

  return data;
}

export async function loginUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function loginWithPhone(phone) {
  const { data, error } = await supabase.auth.signUpWithPhone(phone);
  if (error) throw error;
  return data;
}
