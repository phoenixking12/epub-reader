import { describe, expect, it } from 'vitest'
import { applyReasilyDocument } from './reasily'

function chapter(html: string) {
  document.body.innerHTML = html
  applyReasilyDocument(document, true)
  const cls = (selector: string) =>
    Array.from(document.querySelectorAll(selector)).map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
  return {
    chapter: cls('.lg-reasily-chapter'),
    scene: cls('.lg-reasily-scene'),
    first: cls('.lg-reasily-first'),
    body: cls('.lg-reasily-body'),
  }
}

describe('applyReasilyDocument', () => {
  it('centers a chapter title and the scene lines, and leaves the first paragraph flush', () => {
    const marked = chapter(`
      <h1>Two</h1>
      <h2>Home world</h2>
      <h2>Licking wounds</h2>
      <h2>Outriders</h2>
      <p>It had all started with Nikaea.</p>
      <p>Targutai Yesugei had known it even at the time.</p>
    `)
    expect(marked.chapter).toEqual(['Two'])
    expect(marked.scene).toEqual(['Home world', 'Licking wounds', 'Outriders'])
    expect(marked.first).toEqual(['It had all started with Nikaea.'])
    expect(marked.body[1]).toMatch(/Targutai/)
  })

  it('treats an opening run of short lines as titles when the book does not use headings', () => {
    const marked = chapter(`
      <div>
        <p>Two</p>
        <p>Home world</p>
        <p>Licking wounds</p>
        <p>Outriders</p>
        <p>It had all started with Nikaea.</p>
        <p>Targutai Yesugei had known it even at the time.</p>
      </div>
    `)
    expect(marked.chapter).toEqual(['Two'])
    expect(marked.scene).toEqual(['Home world', 'Licking wounds', 'Outriders'])
    expect(marked.first).toEqual(['It had all started with Nikaea.'])
  })

  it('does not turn a normal opening sentence into a title', () => {
    const marked = chapter(`<p>It had all started with Nikaea. The hall was full.</p>`)
    expect(marked.chapter).toEqual([])
    expect(marked.scene).toEqual([])
    expect(marked.first).toEqual(['It had all started with Nikaea. The hall was full.'])
  })

  it('starts a new paragraph after a scene break', () => {
    const marked = chapter(`
      <h1>Two</h1>
      <p>It had all started with Nikaea.</p>
      <p>* * *</p>
      <p>But after the Master of Mankind had spoken.</p>
    `)
    expect(marked.scene).toEqual(['* * *'])
    expect(marked.first).toEqual(['It had all started with Nikaea.', 'But after the Master of Mankind had spoken.'])
  })

  it('removes the novel tags when Reasily is turned off', () => {
    document.body.innerHTML = '<h1>Two</h1><p>It had all started with Nikaea.</p>'
    applyReasilyDocument(document, true)
    applyReasilyDocument(document, false)
    expect(document.querySelector('.lg-reasily-chapter, .lg-reasily-body')).toBeNull()
  })
})