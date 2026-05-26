import type { ApiResponse } from '@/lib/api/response'

export type { ApiResponse }

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface ProjectFilters {
  status?: 'in_progress' | 'review' | 'delivered' | 'archived'
}

export interface FlagFilters {
  type?: 'consistency' | 'culture' | 'untranslatable' | 'glossary'
  status?: 'open' | 'resolved' | 'dismissed'
  severity?: 'high' | 'medium' | 'low'
}

export interface CreateProjectInput {
  title: string
  author_name?: string
  source_language: string
  target_language: string
  genre?: string
  deadline?: string
  style_guide?: string
}

export interface UpdateProjectInput {
  title?: string
  author_name?: string
  source_language?: string
  target_language?: string
  genre?: string
  status?: 'in_progress' | 'review' | 'delivered' | 'archived'
  deadline?: string
  style_guide?: string
  word_count_translated?: number
}

export interface ConfirmCharacterInput {
  confirmed_target_name?: string
  translator_note?: string
  role?: 'protagonist' | 'secondary' | 'minor' | 'narrator'
  tone_tags?: string[]
  confirmed?: boolean
}

export interface ApproveTermInput {
  approved_translation: string
  notes?: string
  status?: 'approved' | 'flagged'
}

export interface ResolveFlagInput {
  status: 'resolved' | 'dismissed'
  translator_decision?: string
}

export interface CreateAuthorQuestionInput {
  question_text: string
  chunk_id?: string
  translator_note?: string
}

export interface RecordAuthorResponseInput {
  author_response: string
  status?: 'answered' | 'resolved'
}

export interface DashboardData {
  projects: import('./database').ProjectRow[]
  needs_attention: NeedsAttentionItem[]
  recent_activity: ActivityItem[]
  deadline_projects: import('./database').ProjectRow[]
}

export interface NeedsAttentionItem {
  type: 'high_flag' | 'pending_term' | 'unconfirmed_character' | 'pending_question'
  project_id: string
  project_title: string
  item: unknown
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  project_id: string
  created_at: string
}
