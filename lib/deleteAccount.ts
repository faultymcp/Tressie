// lib/deleteAccount.ts
// Calls the delete-account server function. Returns true when the account is gone.

import { supabase } from '@/lib/supabase';

export async function deleteMyAccount(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}
