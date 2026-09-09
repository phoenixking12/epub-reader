import { zipSync, strToU8 } from 'fflate'

export function buildMinimalEpub(opts?: {
  title?: string
  author?: string
  chapter?: string
}): Uint8Array {
  const title = opts?.title ?? 'A Short Sample'
  const author = opts?.author ?? 'Public Domain'
  const chapter =
    opts?.chapter ??
    `<p>This is a sample EPUB so you can try the reader without finding a file first.</p>
     <p>Pinch with two fingers to change the type size. Tap the sides to turn the page, or the center for the toolbar.</p>
     <p>Long-press to select a word, then highlight, underline, recolor, bookmark, or look it up.</p>
     <p>In Display, choose Scroll if you want to move through a chapter by sliding up and down instead of paging.</p>
     <p>Bookmark dots sit at the start of a paragraph. They are small on purpose so they do not cover the text.</p>
     <p>Chapter two has a scene heading and a smaller subheading so you can check type size and weight.</p>`

  const files: Record<string, Uint8Array> = {
    mimetype: strToU8('application/epub+zip'),
    'META-INF/container.xml': strToU8(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`),
    'OEBPS/content.opf': strToU8(`<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bid">urn:epub-reader:sample</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>en</dc:language>
    <dc:description>Bundled sample for the offline EPUB reader.</dc:description>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`),
    'OEBPS/nav.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Nav</title></head>
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="ch1.xhtml">Welcome</a></li>
        <li><a href="ch2.xhtml">Chapter two</a></li>
      </ol>
    </nav>
  </body>
</html>`),
    'OEBPS/ch1.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head><title>Welcome</title></head>
  <body>
    <h1>Welcome</h1>
    ${chapter}
  </body>
</html>`),
    'OEBPS/ch2.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head><title>Chapter two</title></head>
  <body>
    <h1>Chapter two</h1>
    <h2>A scene heading</h2>
    <p>Swipe or tap the right edge to get here. Progress is saved as an EPUB CFI, so it survives font and screen changes.</p>
    <h3>A smaller subheading</h3>
    <p>Open Display to try sepia, night, custom colors, brightness, margins, and line length.</p>
  </body>
</html>`),
  }
  return zipSync(files, { level: 0 })
}
