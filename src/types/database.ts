// Auto-generated from Supabase schema — regenerate with: npm run db:types
// This is a placeholder until Supabase project is configured.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          subscription_tier: 'free' | 'pro' | 'team'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          author_name: string | null
          source_language: string
          target_language: string
          genre: string | null
          status: 'in_progress' | 'review' | 'delivered' | 'archived'
          word_count_total: number
          word_count_translated: number
          deadline: string | null
          style_guide: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['projects']['Row'],
          'id' | 'created_at' | 'updated_at' | 'word_count_total' | 'word_count_translated'
        > & { id?: string; word_count_total?: number; word_count_translated?: number }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      manuscripts: {
        Row: {
          id: string
          project_id: string
          raw_text: string
          word_count: number | null
          chapter_count: number | null
          file_name: string | null
          file_format: 'docx' | 'pdf' | 'txt' | 'epub' | null
          storage_url: string | null
          parsed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['manuscripts']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['manuscripts']['Insert']>
      }
      chunks: {
        Row: {
          id: string
          manuscript_id: string
          chapter_number: number
          chapter_title: string | null
          text: string
          word_count: number | null
          character_mentions: string[]
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chunks']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['chunks']['Insert']>
      }
      project_memory: {
        Row: {
          id: string
          project_id: string
          characters: Json
          glossary: Json
          resolved_culture_flags: Json
          open_culture_flags: Json
          last_updated: string | null
        }
        Insert: Omit<Database['public']['Tables']['project_memory']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['project_memory']['Insert']>
      }
      characters: {
        Row: {
          id: string
          project_id: string
          name: string
          name_variants: string[]
          role: 'protagonist' | 'secondary' | 'minor' | 'narrator'
          tone_tags: string[]
          translator_note: string | null
          confirmed_target_name: string | null
          confirmed: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['characters']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string }
        Update: Partial<Database['public']['Tables']['characters']['Insert']>
      }
      glossary_terms: {
        Row: {
          id: string
          project_id: string
          source_term: string
          term_type: string | null
          ai_suggestion: string | null
          approved_translation: string | null
          status: 'pending' | 'approved' | 'flagged'
          notes: string | null
          frequency: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['glossary_terms']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string }
        Update: Partial<Database['public']['Tables']['glossary_terms']['Insert']>
      }
      flags: {
        Row: {
          id: string
          project_id: string
          chunk_id: string | null
          flag_type: 'consistency' | 'culture' | 'untranslatable' | 'glossary'
          severity: 'high' | 'medium' | 'low' | null
          passage: string | null
          source_text: string | null
          explanation: string | null
          suggestions: Json
          status: 'open' | 'resolved' | 'dismissed'
          translator_decision: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['flags']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['flags']['Insert']>
      }
      author_questions: {
        Row: {
          id: string
          project_id: string
          chunk_id: string | null
          question_text: string
          status: 'sent' | 'pending' | 'answered' | 'resolved'
          author_response: string | null
          translator_note: string | null
          created_at: string
          answered_at: string | null
          resolved_at: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['author_questions']['Row'],
          'id' | 'created_at'
        > & { id?: string }
        Update: Partial<Database['public']['Tables']['author_questions']['Insert']>
      }
      ai_call_log: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
          job_type:
            | 'ingestion'
            | 'character_profile'
            | 'culture_flags'
            | 'consistency_check'
            | 'untranslatable'
          model_used: string | null
          tokens_input: number | null
          tokens_output: number | null
          cost_usd: number | null
          cached: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_call_log']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['ai_call_log']['Insert']>
      }
      stripe_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          user_id: string | null
          data: Json
          processed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stripe_events']['Row'], 'id' | 'created_at'> & {
          id?: string
        }
        Update: Partial<Database['public']['Tables']['stripe_events']['Insert']>
      }
    }
  }
}

// Convenience row types
export type UserRow = Database['public']['Tables']['users']['Row']
export type ProjectRow = Database['public']['Tables']['projects']['Row']
export type ManuscriptRow = Database['public']['Tables']['manuscripts']['Row']
export type ChunkRow = Database['public']['Tables']['chunks']['Row']
export type CharacterRow = Database['public']['Tables']['characters']['Row']
export type GlossaryTermRow = Database['public']['Tables']['glossary_terms']['Row']
export type FlagRow = Database['public']['Tables']['flags']['Row']
export type AuthorQuestionRow = Database['public']['Tables']['author_questions']['Row']
export type AiCallLogRow = Database['public']['Tables']['ai_call_log']['Row']
