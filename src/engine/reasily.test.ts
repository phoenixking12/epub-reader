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
    const title = document.querySelector('h1') as HTMLElement
    const scene = document.querySelector('h2') as HTMLElement
    expect(title.style.getPropertyValue('text-align')).toBe('center')
    expect(title.style.getPropertyPriority('text-align')).toBe('important')
    expect(title.style.getPropertyValue('margin')).toBe('0px')
    expect(title.style.getPropertyValue('font-weight')).toBe('700')
    expect(scene.style.getPropertyValue('font-weight')).toBe('700')
    expect(scene.style.getPropertyValue('margin')).toBe('0px')
    expect(scene.style.getPropertyValue('text-align')).toBe('center')
    const prose = document.querySelector('p') as HTMLElement
    expect(prose.style.getPropertyValue('margin')).toBe('0px')
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

  it('keeps a font-color mark when formatting runs again', () => {
    document.body.innerHTML =
      '<p>The <span data-lg-ann="a" data-lg-kind="textColor" style="color: rgb(250, 204, 21)">fleet</span> sailed.</p>'
    applyReasilyDocument(document, true)
    applyReasilyDocument(document, true)
    const span = document.querySelector('[data-lg-ann]') as HTMLElement
    expect(span.textContent).toBe('fleet')
    expect(span.style.color).toBe('rgb(250, 204, 21)')
  })

  it('removes the novel tags when Reasily is turned off', () => {
    document.body.innerHTML = '<h1 style="text-align: left">Two</h1><p>It had all started with Nikaea.</p>'
    applyReasilyDocument(document, true)
    applyReasilyDocument(document, false)
    expect(document.querySelector('.lg-reasily-chapter, .lg-reasily-body')).toBeNull()
    expect((document.querySelector('h1') as HTMLElement).getAttribute('style')).toBe('text-align: left')
  })

  it('recognizes lowercase tags from an XHTML chapter', () => {
    const xml = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null)
    const body = xml.createElementNS('http://www.w3.org/1999/xhtml', 'body')
    const h1 = xml.createElementNS('http://www.w3.org/1999/xhtml', 'h1')
    h1.textContent = 'Two'
    const p = xml.createElementNS('http://www.w3.org/1999/xhtml', 'p')
    p.textContent = 'It had all started with Nikaea.'
    body.append(h1, p)
    xml.documentElement.append(body)
    applyReasilyDocument(xml, true)
    expect(h1.classList.contains('lg-reasily-chapter')).toBe(true)
    expect(h1.style.getPropertyValue('text-align')).toBe('center')
    expect(p.classList.contains('lg-reasily-first')).toBe(true)
  })
})