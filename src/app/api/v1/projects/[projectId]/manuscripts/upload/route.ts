import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

type Params = { params: { projectId: string } }

type FileFormat = 'docx' | 'pdf' | 'txt' | 'epub'

function detectFormat(filename: string, mimeType: string): FileFormat | null {
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.endsWith('.docx')
  )
    return 'docx'
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf'
  if (mimeType === 'text/plain' || filename.endsWith('.txt')) return 'txt'
  if (mimeType === 'application/epub+zip' || filename.endsWith('.epub')) return 'epub'
  return null
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import('mammoth')).default
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}

async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text
}

async function parseEpub(buffer: ArrayBuffer): Promise<string> {
  const fs = await import('fs')
  const path = await import('path')
  const os = await import('os')
  const EPub = (await import('epub2')).default

  const tempPath = path.join(os.tmpdir(), `haydee-epub-${Date.now()}.epub`)
  fs.writeFileSync(tempPath, Buffer.from(buffer))

  try {
    const epub = await EPub.createAsync(tempPath)
    const chapters: string[] = []

    for (const item of epub.flow) {
      try {
        const [html] = await epub.getChapterAsync(item.id)
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text) chapters.push(text)
      } catch {
        // skip unreadable chapters
      }
    }

    return chapters.join('\n\n')
  } finally {
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.projectId)
    .eq('user_id', auth.user.id)
    .single()

  if (!project) return apiError('Project not found', 404)

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('Invalid form data', 400)
  }

  const file = formData.get('file') as File | null
  if (!file) return apiError('No file provided', 400)

  const format = detectFormat(file.name, file.type)
  if (!format) return apiError('Unsupported file format. Use DOCX, PDF, TXT, or EPUB.', 400)

  const buffer = await file.arrayBuffer()
  let rawText: string

  try {
    if (format === 'docx') rawText = await parseDocx(buffer)
    else if (format === 'pdf') rawText = await parsePdf(buffer)
    else if (format === 'epub') rawText = await parseEpub(buffer)
    else rawText = await file.text()
  } catch (err) {
    return apiError(
      `Failed to parse ${format.toUpperCase()} file`,
      422,
      err instanceof Error ? err.message : String(err)
    )
  }

  const wordCount = countWords(rawText)

  const { data: manuscript, error: insertError } = await supabase
    .from('manuscripts')
    .insert({
      project_id: params.projectId,
      raw_text: rawText,
      word_count: wordCount,
      file_name: file.name,
      file_format: format,
    })
    .select()
    .single()

  if (insertError) return apiError(insertError.message, 500)

  await supabase
    .from('projects')
    .update({ word_count_total: wordCount, updated_at: new Date().toISOString() })
    .eq('id', params.projectId)

  try {
    await inngest.send({
      name: 'manuscript/uploaded',
      data: { manuscriptId: manuscript.id, projectId: params.projectId, userId: auth.user.id },
    })
  } catch {
    // Inngest not configured — manuscript saved, analysis won't run automatically
  }

  return apiSuccess(
    {
      manuscript,
      message: 'Manuscript uploaded. Analysis will begin shortly.',
    },
    201
  )
}
