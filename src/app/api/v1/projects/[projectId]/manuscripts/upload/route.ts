import { requireAuth } from '@/lib/api/auth'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

type Params = { params: { projectId: string } }

type FileFormat = 'docx' | 'txt' | 'epub'

function detectFormat(filename: string, mimeType: string): FileFormat | null {
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filename.endsWith('.docx')
  )
    return 'docx'
  if (mimeType === 'text/plain' || filename.endsWith('.txt')) return 'txt'
  if (mimeType === 'application/epub+zip' || filename.endsWith('.epub')) return 'epub'
  return null
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function splitIntoChapters(
  rawText: string
): { chapter_number: number; chapter_title: string | null; text: string }[] {
  // Match "Chapter N" headings (numbers, roman numerals, or written-out numbers) at line start
  const chapterHeadingRe =
    /^[ \t]*chapter[\s]+(?:\d+|[ivxlcdmIVXLCDM]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:[\s-]\w+)?)[^\n]*/gim

  const matches = Array.from(rawText.matchAll(chapterHeadingRe))

  if (matches.length < 2) {
    return [{ chapter_number: 1, chapter_title: null, text: rawText.trim() }]
  }

  return matches
    .map((m, i) => {
      const bodyStart = m.index! + m[0].length
      const bodyEnd = i + 1 < matches.length ? matches[i + 1].index! : rawText.length
      const body = rawText.slice(bodyStart, bodyEnd).trim()
      const afterChapterN = m[0]
        .replace(/^[ \t]*chapter[\s]+(?:\d+|[ivxlcdmIVXLCDM]+|\w+)\s*/i, '')
        .trim()
      return {
        chapter_number: i + 1,
        chapter_title: afterChapterN || null,
        text: body,
      }
    })
    .filter((s) => s.text.length > 0)
}

async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  const { default: mammoth } = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
  return result.value
}

async function parseEpub(buffer: ArrayBuffer): Promise<string> {
  const mod = await import('jszip')
  const JSZip = (mod.default ?? mod) as typeof mod.default
  const zip = await JSZip.loadAsync(Buffer.from(buffer))

  const containerXml = await zip.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml')

  const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/)
  if (!opfMatch) throw new Error('Invalid EPUB: cannot find OPF path')
  const opfPath = opfMatch[1]
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)

  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error('Invalid EPUB: missing OPF file')

  const manifest: Record<string, string> = {}
  for (const m of Array.from(opfXml.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*>/g))) {
    manifest[m[1]] = m[2]
  }

  const spineIds = Array.from(opfXml.matchAll(/<itemref[^>]+idref="([^"]+)"/g)).map((m) => m[1])

  const chapters: string[] = []
  for (const id of spineIds) {
    const href = manifest[id]
    if (!href) continue
    const html = await zip.file(opfDir + href)?.async('string')
    if (!html) continue
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) chapters.push(text)
  }

  return chapters.join('\n\n')
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = createClient()

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
  if (!format) return apiError('Unsupported file format. Use DOCX, TXT, or EPUB.', 400)

  const buffer = await file.arrayBuffer()
  let rawText: string

  try {
    if (format === 'docx') rawText = await parseDocx(buffer)
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
  const chapterSegments = splitIntoChapters(rawText)

  // Replace any existing manuscript for this project (chunks cascade-delete)
  await supabase.from('manuscripts').delete().eq('project_id', params.projectId)

  const { data: manuscript, error: insertError } = await supabase
    .from('manuscripts')
    .insert({
      project_id: params.projectId,
      raw_text: rawText,
      word_count: wordCount,
      chapter_count: chapterSegments.length,
      file_name: file.name,
      file_format: format,
    })
    .select()
    .single()

  if (insertError) return apiError(insertError.message, 500)

  // Insert chunks (one per detected chapter)
  const { error: chunksError } = await supabase.from('chunks').insert(
    chapterSegments.map((seg) => ({
      manuscript_id: manuscript.id,
      chapter_number: seg.chapter_number,
      chapter_title: seg.chapter_title,
      text: seg.text,
      word_count: countWords(seg.text),
    }))
  )

  if (chunksError) return apiError(chunksError.message, 500)

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
      chapterCount: chapterSegments.length,
      message: 'Manuscript uploaded. Analysis will begin shortly.',
    },
    201
  )
}
