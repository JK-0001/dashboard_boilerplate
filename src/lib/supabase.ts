/**
 * Supabase client — env-gated.
 *
 * With NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY set (see
 * .env.example), auth turns on: unauthenticated users are redirected to
 * /login. Without them, AUTH_ENABLED is false and the app runs open —
 * so the boilerplate works out of the box with zero setup.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const AUTH_ENABLED = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = AUTH_ENABLED
  ? createClient(url as string, anonKey as string)
  : null;
