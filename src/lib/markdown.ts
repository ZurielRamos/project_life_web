/**
 * Convierte el texto con formato simple de las páginas del sitio a HTML.
 *
 * Soporta: # / ## / ### (títulos), listas con "- " o "1. ", **negrita**,
 * *cursiva*, [texto](url) y saltos de línea. TODO el texto se escapa antes de
 * aplicar el formato, por lo que no se puede inyectar HTML ni scripts. Los
 * enlaces solo admiten http(s), mailto, tel, rutas internas (/…) y anclas (#…).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
      if (!SAFE_URL.test(url)) return text;
      const external = /^https?:\/\//i.test(url);
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${paragraph.map((l) => inline(escapeHtml(l))).join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      html.push(
        `<${list.tag}>${list.items.map((i) => `<li>${inline(escapeHtml(i))}</li>`).join('')}</${list.tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    // La página ya tiene un h1 (su título): "#" se muestra como h2.
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return html.join('\n');
}
