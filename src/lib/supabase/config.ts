export function getSupabaseConfig() {
  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  // Eliminar comillas accidentales (simples o dobles) y espacios
  url = url.replace(/^["']|["']$/g, '').trim()

  // Si no empieza con http:// ni https://
  if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
    if (url.includes('.supabase.co')) {
      url = 'https://' + url
    } else {
      url = 'https://iywpzfbossgjemvspnll.supabase.co'
    }
  }

  let anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '').trim()
  if (!anonKey) {
    anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5d3B6ZmJvc3NnamVtdnNwbmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MjY5NTIsImV4cCI6MjEwMDQwMjk1Mn0.3gZIqprIyocwbVvw7kwMvfNmvRPU6BGSwztXhczisqg'
  }

  return { url, anonKey }
}
