import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types' // Import the generated Database type

// Use environment variables to store Supabase credentials securely
// Ensure these are set in your .env file (e.g., VITE_SUPABASE_URL=your-url)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Basic validation
if (!supabaseUrl) {
  throw new Error("Missing environment variable: VITE_SUPABASE_URL")
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: VITE_SUPABASE_ANON_KEY")
}

// Create and export the Supabase client instance using the generated types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey) 