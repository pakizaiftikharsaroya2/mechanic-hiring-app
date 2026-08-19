import { supabase } from '../lib/supabaseClient';

/**
 * Registers a new user. `role` and `name` are stashed in auth metadata;
 * the `handle_new_user` DB trigger (see supabase/schema.sql) copies them
 * into public.profiles automatically on signup.
 */
export async function registerUser({ name, email, phone, password, role }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone, role }, // role: 'CLIENT' | 'MECHANIC'
    },
  });
  if (error) throw error;

  // Mechanics also need a row in mechanic_profiles. Safe to attempt even
  // if the auth trigger hasn't committed yet — RLS just requires
  // auth.uid() = user_id, and the session is already active post-signUp.
  if (role === 'MECHANIC' && data.user) {
    const { error: mechErr } = await supabase
      .from('mechanic_profiles')
      .insert({ user_id: data.user.id });
    if (mechErr && mechErr.code !== '23505') throw mechErr; // ignore duplicate
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
