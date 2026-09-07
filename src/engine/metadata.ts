export function formatLanguageMap(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(formatLanguageMap).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>
    if (typeof rec.name === 'string') return rec.name
    if (rec.name) return formatLanguageMap(rec.name)
    const first = Object.values(rec).find((v) => typeof v === 'string')
    return typeof first === 'string' ? first : ''
  }
  return String(value)
}

export function formatAuthors(author: unknown): string[] {
  if (!author) return []
  if (Array.isArray(author)) return author.map(formatLanguageMap).filter(Boolean)
  const one = formatLanguageMap(author)
  return one ? [one] : []
}

export function formatTitle(title: unknown): string {
  return formatLanguageMap(title) || 'Untitled book'
}
