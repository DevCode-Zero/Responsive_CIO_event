import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const REALTIME_CHANNEL = 'cio-summit-questions';
export const MEETINGS_CHANNEL = 'cio-summit-meetings';
export const SPEAKER_CHANNEL = 'cio-summit-speaker';
export const PRESENCE_CHANNEL = 'cio-summit-presence';
