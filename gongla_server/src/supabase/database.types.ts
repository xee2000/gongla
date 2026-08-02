import { ProductSource, ProductStatus } from '../products/product.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          external_id: string;
          name: string;
          original_price: number | null;
          sale_price: number | null;
          source: ProductSource;
          source_name: string | null;
          image_url: string | null;
          sale_start_at: string;
          sale_end_at: string;
          purchase_url: string;
          source_url: string | null;
          status: ProductStatus;
          raw_data: Json;
          last_crawled_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          name: string;
          original_price?: number | null;
          sale_price?: number | null;
          source: ProductSource;
          source_name?: string | null;
          image_url?: string | null;
          sale_start_at: string;
          sale_end_at: string;
          purchase_url: string;
          source_url?: string | null;
          status?: ProductStatus;
          raw_data?: Json;
          last_crawled_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
