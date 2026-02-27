// Supabase client for AI RFP Builder
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZWNtZWJzenlxZ29tenZleHh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzI5NjksImV4cCI6MjA4NzIwODk2OX0.g1SVeJsq8OKcFa0lL4mnffobSGpo0hgcbbheFYLR7GQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
