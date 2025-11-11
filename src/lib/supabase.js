import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ulboklgzjriatmaxzpsi.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsYm9rbGd6anJpYXRtYXh6cHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODQxNDAsImV4cCI6MjA3ODM2MDE0MH0.gY6_K4JQoJxPZmdXMIbFZfiJAOdavbg8jDJW1rOUSPk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
