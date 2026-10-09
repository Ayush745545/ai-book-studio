import type { SerializedBook } from "@/types";
const xml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
// EPUB requires mimetype to be the first ZIP entry and stored without compression.
export function storedZip(
  files: { name: string; content: string | Buffer }[],
): Buffer {
  const local: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name),
      data = Buffer.isBuffer(file.content)
        ? file.content
        : Buffer.from(file.content),
      crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, data);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(33, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(data.length, 20);
    directory.writeUInt32LE(data.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += header.length + name.length + data.length;
  }
  const directories = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directories.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directories, end]);
}
export function createEpub(book: SerializedBook): Buffer {
  const chapters = book.chapters ?? [],
    languages: Record<string, string> = {
      English: "en",
      Hindi: "hi",
      Spanish: "es",
      French: "fr",
      German: "de",
      Portuguese: "pt",
      Chinese: "zh",
      Japanese: "ja",
    },
    language = languages[book.language] || "en";
  const page = (title: string, content: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}" lang="${language}"><head><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${content}</body></html>`;
  const manifest = chapters
    .map(
      (_, i) =>
        `<item id="chapter-${i}" href="chapter-${i}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join("");
  const toc = chapters
    .map((c, i) => `<li><a href="chapter-${i}.xhtml">${xml(c.title)}</a></li>`)
    .join("");
  return storedZip([
    { name: "mimetype", content: "application/epub+zip" },
    {
      name: "META-INF/container.xml",
      content:
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    },
    {
      name: "OEBPS/content.opf",
      content: `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${xml(book.id)}</dc:identifier><dc:title>${xml(book.title)}</dc:title><dc:creator>${xml(book.authorName || "Author")}</dc:creator><dc:language>${language}</dc:language><dc:description>${xml(book.description || "")}</dc:description><meta property="dcterms:modified">${new Date(book.updatedAt).toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/><item id="style" href="style.css" media-type="text/css"/>${manifest}</manifest><spine><itemref idref="title"/><itemref idref="nav"/>${chapters.map((_, i) => `<itemref idref="chapter-${i}"/>`).join("")}</spine></package>`,
    },
    {
      name: "OEBPS/style.css",
      content:
        "body{font-family:serif;line-height:1.7;margin:5%;color:#263b35}h1,h2{line-height:1.2}p{margin:0 0 1em;white-space:pre-wrap}nav li{margin-bottom:1em}a{color:#17664d}.title{text-align:center;padding-top:25%}.title h1{font-size:2.5em}",
    },
    {
      name: "OEBPS/title.xhtml",
      content: page(
        book.title,
        `<section class="title"><h1>${xml(book.title)}</h1><p>${xml(book.authorName || "Author")}</p><p>${xml(book.description || "")}</p></section>`,
      ),
    },
    {
      name: "OEBPS/nav.xhtml",
      content: page(
        "Contents",
        `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${toc}</ol></nav>`,
      ),
    },
    ...chapters.map((c, i) => ({
      name: `OEBPS/chapter-${i}.xhtml`,
      content: page(
        c.title,
        `<section epub:type="chapter"><h1>${xml(c.title)}</h1>${c.content
          .split(/\n\s*\n/)
          .map((p) => `<p>${xml(p)}</p>`)
          .join("")}</section>`,
      ),
    })),
  ]);
}
