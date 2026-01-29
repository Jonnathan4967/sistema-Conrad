import { createClient } from '@supabase/supabase-js';

// Credenciales de la base de datos de Visitadoras
const supabaseUrl = 'https://ezfuqwcxrheuzpmkqjfd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnVxd2N4cmhldXpwbWtxamZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTIzMTEsImV4cCI6MjA4NDAyODMxMX0.rnLmTPoS-cEW9m99w1znSNUK6zpjmFZ4fP-rVKcWmuY';

export const supabaseVisitadoras = createClient(supabaseUrl, supabaseAnonKey);
