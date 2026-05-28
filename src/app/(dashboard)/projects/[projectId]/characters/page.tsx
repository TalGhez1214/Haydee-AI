import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IconArrowLeft } from '@tabler/icons-react'
import { CharacterRegistry } from '@/components/characters/character-registry'

export default async function CharactersPage({
  params,
  searchParams,
}: {
  params: { projectId: string }
  searchParams: { char?: string }
}) {
  const supabase = createClient()

  const [projectRes, charactersRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, target_language')
      .eq('id', params.projectId)
      .single(),
    supabase
      .from('characters')
      .select('*')
      .eq('project_id', params.projectId)
      .order('name', { ascending: true }),
  ])

  if (!projectRes.data) notFound()

  const project = projectRes.data
  const characters = charactersRes.data ?? []

  return (
    <div className="flex flex-col h-full">
      <Link
        href={`/projects/${params.projectId}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-quick mb-5 flex-shrink-0"
      >
        <IconArrowLeft size={14} />
        {project.title}
      </Link>

      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">
          Character Registry
        </h1>
        <span className="text-[13px] text-[var(--text-tertiary)]">
          {characters.length} {characters.length === 1 ? 'character' : 'characters'}
        </span>
      </div>

      <CharacterRegistry
        projectId={params.projectId}
        targetLanguage={project.target_language}
        initialCharacters={characters}
        initialSelectedId={searchParams.char}
      />
    </div>
  )
}
