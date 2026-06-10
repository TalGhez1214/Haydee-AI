interface VoyageEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>
  usage: { total_tokens: number }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: 'voyage-3-lite' }),
  })

  if (!res.ok) {
    throw new Error(`Voyage AI embedding failed: ${res.status} ${await res.text()}`)
  }

  const json = (await res.json()) as VoyageEmbeddingResponse
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding)
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text])
  return results[0]
}
