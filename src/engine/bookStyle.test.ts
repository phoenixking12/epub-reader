import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { makeBook } from 'foliate-js/view.js'

function epub() {
  const css = `
    @font-face {
      font-family: "Trajan Pro";
      src: url("../Fonts/Trajan.otf") format("opentype");
    }
    h1.chapter-title {
      font-family: "Trajan Pro", serif;
      text-align: center;
    }
    p.sub {
      font-family: "Sabon", serif;
      font-weight: bold;
      text-align: center;
    }
    p { text-align: justify; text-indent: 1em; }
  `
  const files: Record<string, Uint8Array> = {
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bid">urn:test:styles</dc:identifier>
    <dc:title>Styled</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="css" href="styles/book.css" media-type="text/css"/>
    <item id="font" href="Fonts/Trajan.otf" media-type="font/otf"/>
    <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/></spine>
</package>`),
    // Zip path case does not match the manifest href.
    'OEBPS/Styles/book.css': strToU8(css),
    'OEBPS/Fonts/Trajan.otf': new Uint8Array([0, 1, 0, 0, 0]),
    'OEBPS/ch1.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>One</title>
    <link rel="stylesheet" type="text/css" href="styles/book.css"/>
  </head>
  <body>
    <h1 class="chapter-title">ONE</h1>
    <p class="sub">The Mausolytica</p>
    <p>The dead of Dwell were screaming.</p>
  </body>
</html>`),
  }
  return zipSync(files, { level: 0 })
}

describe('book styles', () => {
  it('keeps the publisher stylesheet and embeds its font', async () => {
    const bytes = epub()
    const blob = new Blob([bytes], { type: 'application/epub+zip' })
    const proto = Object.getPrototypeOf(blob.slice(0, 1))
    if (typeof proto.arrayBuffer !== 'function') {
      proto.arrayBuffer = function arrayBuffer(this: Blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = () => reject(reader.error)
          reader.readAsArrayBuffer(this)
        })
      }
    }
    const urls = new Map<string, Blob>()
    URL.createObjectURL = (value: Blob) => {
      const id = `blob:test/${urls.size + 1}`
      urls.set(id, value)
      return id
    }
    URL.revokeObjectURL = () => undefined
    const file = Object.assign(blob, { name: 'styled.epub' })
    const book = await makeBook(file)
    const url = await book.sections[0].load()
    const stored = urls.get(String(url))
    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(stored!)
    })
    expect(html).toContain('font-family: "Trajan Pro"')
    expect(html).toContain('text-align: center')
    expect(html).toContain('text-align: justify')
    expect(html).toMatch(/data:font\/otf;base64,/)
    expect(html).not.toContain('href="styles/book.css"')
  })
})
