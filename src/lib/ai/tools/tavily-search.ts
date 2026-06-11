export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyApiResponse {
  results: Array<{
    title: string
    url: string
    content: string
    score: number
  }>
}

export async function tavilySearch(
  query: string,
  maxResults = 5
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY is not configured')

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
    }),
  })

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as TavilyApiResponse
  return (json.results ?? []).slice(0, maxResults).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }))
}
