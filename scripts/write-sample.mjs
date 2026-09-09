import { mkdirSync, writeFileSync } from 'node:fs'
import { zipSync, strToU8 } from 'fflate'

const files = {
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
    <dc:title>A Short Sample</dc:title>
    <dc:creator>Public Domain</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="book.css" media-type="text/css"/>
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
  <body><nav epub:type="toc"><ol>
    <li><a href="ch1.xhtml">Welcome</a></li>
    <li><a href="ch2.xhtml">Chapter two</a></li>
  </ol></nav></body>
</html>`),
  'OEBPS/book.css': strToU8(`body { font-family: Georgia, "Times New Roman", serif; }
h1 { font-size: 2.1em; text-align: center; font-weight: 700; margin: 1.4em 0 0.7em; letter-spacing: 0.02em; }
h2 { font-size: 1.45em; text-align: left; font-weight: 700; margin: 1.2em 0 0.5em; }
p { text-align: justify; margin: 0 0 0.85em; }
.center { text-align: center; font-style: italic; }`),
  'OEBPS/ch1.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><link rel="stylesheet" href="book.css"/></head><body>
<h1>Welcome</h1>
<p class="center">A sample chapter with a real heading.</p>
<h2>Getting started</h2>
<p>This is a sample EPUB so you can try the reader without finding a file first. The title above should look like a heading, not like the paragraph you are reading now.</p>
<p>Pinch with two fingers to change the type size. Double-tap the center for the toolbar. Single-tap a word to show a bookmark ribbon on that paragraph.</p>
<p>Long-press to select a word, then highlight, recolor the font, or look it up. Scroll mode should keep going past this first screen.</p>
<p>LoreGuard copies books onto the phone, so reading, notes, and bookmarks work offline.</p>
<p>Turn the page, or switch Display to Scroll and drag vertically through a long chapter.</p>
<p>Another paragraph sits here so paginated mode has more than one screen of text on a phone.</p>
<p>When you change Typeface away from As printed, body copy follows your choice while headings stay larger.</p>
<p>The last lines of this chapter exist so you can confirm the page actually turns.</p>
</body></html>`),
  'OEBPS/ch2.xhtml': strToU8(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><link rel="stylesheet" href="book.css"/></head><body>
<h1>Chapter two</h1>
<h2>A longer stretch</h2>
<p>Swipe or tap the right edge to get here. Progress is saved as an EPUB CFI.</p>
<p>Open Display to try sepia, night, custom colors, brightness, margins, and line length.</p>
<p>This chapter is long on purpose. In Scroll mode you should be able to drag past the first screen and keep reading.</p>
<p>Paragraph four continues the walk down the chapter so the renderer has to expand the iframe to the content height.</p>
<p>Paragraph five is still body copy. The heading at the top should remain bigger and centered.</p>
<p>Paragraph six mentions bookmarks: tap any word, then tap the ribbon that appears beside this block.</p>
<p>Paragraph seven is here for scrolling. If you only ever see the first page, the chapter never expanded.</p>
<p>Paragraph eight. Keep dragging. The corner percent should change as you move.</p>
<p>Paragraph nine. Sideways swipe in Scroll mode still changes chapter; vertical drag moves the lines.</p>
<p>Paragraph ten. Almost at the end of the sample, which is enough to prove the page is not clipped to one screen.</p>
<p>Paragraph eleven. One more block so a tall phone still has overflow in chapter scroll.</p>
<p>Paragraph twelve. Last of the long stretch. You can go back to Welcome from Contents.</p>
</body></html>`),
}

mkdirSync('public', { recursive: true })
writeFileSync('public/sample.epub', zipSync(files, { level: 0 }))
console.log('wrote public/sample.epub')
