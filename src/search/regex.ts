export interface RegexHit {
  cfi?: string
  excerpt: { pre: string; match: string; post: string }
  index: number
}

export function compileSearchPattern(query: string, regex: boolean, flags = 'gi'): RegExp {
  if (!regex) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escaped, flags)
  }
  return new RegExp(query, flags.includes('g') ? flags : `${flags}g`)
}

export function excerptAround(text: string, start: number, end: number, pad = 48) {
  const pre = text.slice(Math.max(0, start - pad), start)
  const match = text.slice(start, end)
  const post = text.slice(end, Math.min(text.length, end + pad))
  return {
    pre: (start > pad ? '…' : '') + pre.replace(/\s+/g, ' '),
    match,
    post: post.replace(/\s+/g, ' ') + (end + pad < text.length ? '…' : ''),
  }
}

export function findRegexInText(text: string, re: RegExp): Array<{ start: number; end: number; match: string }> {
  const hits: Array<{ start: number; end: number; match: string }> = []
  const clone = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
  let m: RegExpExecArray | null
  while ((m = clone.exec(text))) {
    if (m[0].length === 0) {
      clone.lastIndex += 1
      continue
    }
    hits.push({ start: m.index, end: m.index + m[0].length, match: m[0] })
    if (hits.length > 400) break
  }
  return hits
}

export { compileSearchPattern as compilePattern }
