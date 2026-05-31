import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TodoList } from '@/components/projects/todo-list'
import { AssistantContextSetter } from '@/components/assistant/assistant-context-setter'

export default async function TodoListPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient()

  const [projectRes, todosRes] = await Promise.all([
    supabase.from('projects').select('id, title').eq('id', params.projectId).single(),
    supabase
      .from('project_todos')
      .select('*')
      .eq('project_id', params.projectId)
      .order('created_at', { ascending: false }),
  ])

  if (!projectRes.data) notFound()

  const todos = todosRes.data ?? []

  return (
    <div className="max-w-4xl mx-auto p-6">
      <TodoList projectId={params.projectId} initialTodos={todos} />
      <AssistantContextSetter projectId={params.projectId} currentPage="todo-list" />
    </div>
  )
}
