// Auto-generated from Supabase schema — regenerate with: npm run db:types
// Manually maintained until Supabase CLI auth is configured.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ---- Standalone row types ----

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  subscription_tier: 'free' | 'pro' | 'team'
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export type ProjectRow = {
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

export type ManuscriptRow = {
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

export type ChunkRow = {
  id: string
  manuscript_id: string
  chapter_number: number
  chapter_title: string | null
  text: string
  word_count: number | null
  character_mentions: string[]
  draft_translation: Json | null
  translated_at: string | null
  created_at: string
}

export type ProjectMemoryRow = {
  id: string
  project_id: string
  characters: Json
  glossary: Json
  resolved_culture_flags: Json
  open_culture_flags: Json
  last_updated: string | null
}

export type CharacterRow = {
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

export type GlossaryTermRow = {
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

export type FlagRow = {
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

export type AuthorQuestionRow = {
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

export type AiCallLogRow = {
  id: string
  project_id: string | null
  user_id: string | null
  job_type:
    | 'ingestion'
    | 'character_profile'
    | 'culture_flags'
    | 'consistency_check'
    | 'untranslatable'
    | 'translate'
  model_used: string | null
  tokens_input: number | null
  tokens_output: number | null
  cost_usd: number | null
  cached: boolean
  created_at: string
}

export type TranslationRequestRow = {
  id: string
  project_id: string
  user_id: string
  selected_text: string
  result: string | null
  status: 'pending' | 'done' | 'error'
  created_at: string
}

export type StripeEventRow = {
  id: string
  stripe_event_id: string
  event_type: string
  user_id: string | null
  data: Json
  processed: boolean
  created_at: string
}

// ---- Insert types (all nullable/defaulted fields are optional) ----

type ProjectInsert = {
  id?: string
  user_id: string
  title: string
  author_name?: string | null
  source_language: string
  target_language: string
  genre?: string | null
  status?: 'in_progress' | 'review' | 'delivered' | 'archived'
  word_count_total?: number
  word_count_translated?: number
  deadline?: string | null
  style_guide?: string | null
}

type ManuscriptInsert = {
  id?: string
  project_id: string
  raw_text: string
  word_count?: number | null
  chapter_count?: number | null
  file_name?: string | null
  file_format?: 'docx' | 'pdf' | 'txt' | 'epub' | null
  storage_url?: string | null
  parsed_at?: string | null
}

type ChunkInsert = {
  id?: string
  manuscript_id: string
  chapter_number: number
  chapter_title?: string | null
  text: string
  word_count?: number | null
  character_mentions?: string[]
  draft_translation?: Json | null
  translated_at?: string | null
}

type CharacterInsert = {
  id?: string
  project_id: string
  name: string
  name_variants?: string[]
  role?: 'protagonist' | 'secondary' | 'minor' | 'narrator'
  tone_tags?: string[]
  translator_note?: string | null
  confirmed_target_name?: string | null
  confirmed?: boolean
}

type GlossaryTermInsert = {
  id?: string
  project_id: string
  source_term: string
  term_type?: string | null
  ai_suggestion?: string | null
  approved_translation?: string | null
  status?: 'pending' | 'approved' | 'flagged'
  notes?: string | null
  frequency?: number
}

type FlagInsert = {
  id?: string
  project_id: string
  chunk_id?: string | null
  flag_type: 'consistency' | 'culture' | 'untranslatable' | 'glossary'
  severity?: 'high' | 'medium' | 'low' | null
  passage?: string | null
  source_text?: string | null
  explanation?: string | null
  suggestions?: Json
  status?: 'open' | 'resolved' | 'dismissed'
  translator_decision?: string | null
  resolved_at?: string | null
}

type AuthorQuestionInsert = {
  id?: string
  project_id: string
  chunk_id?: string | null
  question_text: string
  status?: 'sent' | 'pending' | 'answered' | 'resolved'
  author_response?: string | null
  translator_note?: string | null
  answered_at?: string | null
  resolved_at?: string | null
}

// ---- Database type (satisfies Supabase GenericSchema + GenericTable constraints) ----

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: Omit<UserRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      projects: {
        Row: ProjectRow
        Insert: ProjectInsert
        Update: Partial<ProjectInsert> & { updated_at?: string }
        Relationships: []
      }
      manuscripts: {
        Row: ManuscriptRow
        Insert: ManuscriptInsert
        Update: Partial<ManuscriptInsert> & { updated_at?: string }
        Relationships: []
      }
      chunks: {
        Row: ChunkRow
        Insert: ChunkInsert
        Update: Partial<ChunkInsert>
        Relationships: []
      }
      project_memory: {
        Row: ProjectMemoryRow
        Insert: Omit<ProjectMemoryRow, 'id'> & { id?: string }
        Update: Partial<Omit<ProjectMemoryRow, 'id'>>
        Relationships: []
      }
      characters: {
        Row: CharacterRow
        Insert: CharacterInsert
        Update: Partial<CharacterInsert> & { updated_at?: string }
        Relationships: []
      }
      glossary_terms: {
        Row: GlossaryTermRow
        Insert: GlossaryTermInsert
        Update: Partial<GlossaryTermInsert> & { updated_at?: string }
        Relationships: []
      }
      flags: {
        Row: FlagRow
        Insert: FlagInsert
        Update: Partial<FlagInsert>
        Relationships: []
      }
      author_questions: {
        Row: AuthorQuestionRow
        Insert: AuthorQuestionInsert
        Update: Partial<AuthorQuestionInsert>
        Relationships: []
      }
      ai_call_log: {
        Row: AiCallLogRow
        Insert: Omit<AiCallLogRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<AiCallLogRow, 'id' | 'created_at'>>
        Relationships: []
      }
      stripe_events: {
        Row: StripeEventRow
        Insert: Omit<StripeEventRow, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<StripeEventRow, 'id' | 'created_at'>>
        Relationships: []
      }
      translation_requests: {
        Row: TranslationRequestRow
        Insert: Omit<TranslationRequestRow, 'id' | 'created_at' | 'result' | 'status'> & {
          id?: string
          result?: string | null
          status?: 'pending' | 'done' | 'error'
        }
        Update: Partial<Omit<TranslationRequestRow, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
