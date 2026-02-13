
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qlgfibhcjlqjjosjosgx.supabase.co';
const supabaseKey = 'sb_publishable_7gmvAY1hneGz_CBArjMPwQ_bcpCU-iJ';

export const supabase = createClient(supabaseUrl, supabaseKey);
