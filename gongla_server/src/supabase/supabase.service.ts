import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { Database } from './database.types';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient<Database>;

  constructor(config: ConfigService) {
    if (!globalThis.WebSocket) {
      Object.defineProperty(globalThis, 'WebSocket', { value: WebSocket });
    }
    const url =
      config.get<string>('SUPABASE_URL') ||
      config.getOrThrow<string>('NEXT_PUBLIC_SUPABASE_URL');
    const key =
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      config.get<string>('SUPABASE_PUBLISHABLE_KEY') ||
      config.getOrThrow<string>('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

    this.client = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}
