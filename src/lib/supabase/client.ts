import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iywpzfbossgjemvspnll.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d3B6ZmJvc3NnamVtdnNwbmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjY5NTIsImV4cCI6MjEwMDQwMjk1Mn0.3gZIqprIyocwbVvw7kwMvfNmvRPU6BGSwztXhczisqg'

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
