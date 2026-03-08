export function renderMarkdown(source: string) {
  const lines = source.split("\n");
  const html = lines
    .map((line) => {
      const escaped = escapeHtml(line);
      if (escaped.startsWith("### ")) return `<h3>${escaped.slice(4)}</h3>`;
      if (escaped.startsWith("## ")) return `<h2>${escaped.slice(3)}</h2>`;
      if (escaped.startsWith("# ")) return `<h1>${escaped.slice(2)}</h1>`;
      if (escaped.startsWith("- ")) return `<li>${escaped.slice(2)}</li>`;
      if (escaped.startsWith("> ")) return `<blockquote>${escaped.slice(2)}</blockquote>`;
      return `<p>${escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</p>`;
    })
    .join("");

  return html.replace(/(<li>.*?<\/li>)+/g, (segment) => `<ul>${segment}</ul>`);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
