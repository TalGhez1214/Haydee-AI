import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CharacterRegistry } from '@/components/characters/character-registry'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

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
      .select('id, target_language')
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
    <div className="flex flex-col h-full p-6">
      <CharacterRegistry
        projectId={params.projectId}
        targetLanguage={project.target_language}
        initialCharacters={characters}
        initialSelectedId={searchParams.char}
      />
      <AssistantContextSetter
        projectId={params.projectId}
        currentPage="characters"
        unconfirmedCharactersCount={characters.filter((c) => !c.confirmed).length}
      />
    </div>
  )
}
