// build.js — run by Cloudflare Pages before deploy
// Build command: node build.js
// Output directory: . (root)

const fs = require("fs");
const path = require("path");

const BLOG_DIR = path.join(__dirname, "blog");
const OUT_FILE = path.join(__dirname, "blog.html");
const NAV = `
    <aside class="sidebar">
      <nav>
        <a href="/">Home</a>
        <a href="/blog.html" class="active">Blog</a>
        <a href="https://discord.com/invite/rJhQZHr">Discord</a>
        <a href="https://www.youtube.com/channel/UCtqkp1LCp0gQH44Kyj2kDYw?sub_confirmation=1">Subscribe</a>
        <a href="https://joeyhain.org/">joeyhain.org →</a>
      </nav>
    </aside>`;

// Pull <title> tag contents (minus the " — Haintrain" suffix if present)
function extractTitle(html) {
  const m = html.match(/<title>(.*?)<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s*[—–-]\s*Haintrain\s*$/i, "").trim();
}

// Pull the src of the first <img> in <main>, and make it absolute
// so it resolves correctly from blog.html at the root
function extractFirstImage(html) {
  const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  const searchArea = mainMatch ? mainMatch[1] : html;
  const m = searchArea.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!m) return null;
  const src = m[1];
  // Already absolute (starts with / or http)
  if (src.startsWith("/") || src.startsWith("http")) return src;
  // Relative path — prefix with /blog/
  return "/blog/" + src;
}

// Read all .html files in /blog (not subdirectories)
const files = fs.readdirSync(BLOG_DIR)
  .filter(f => f.endsWith(".html"))
  .map(f => {
    const html = fs.readFileSync(path.join(BLOG_DIR, f), "utf8");
    return {
      file: f,
      title: extractTitle(html) || f.replace(".html", ""),
      image: extractFirstImage(html),
    };
  });

// Build the card grid HTML
const cards = files.map(({ file, title, image }) => {
  const thumb = image
    ? `<img src="${image}" alt="${title.replace(/"/g, "&quot;")}" loading="lazy">`
    : `<div class="post-thumb-placeholder"></div>`;
  return `
        <a class="post-card" href="/blog/${file}">
          <div class="post-thumb">${thumb}</div>
          <span class="post-card-title">${title}</span>
        </a>`;
}).join("\n");

const html = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Blog — Haintrain</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>

  <div class="layout">
    ${NAV}

    <main class="content">
      <h1>Blog</h1>
      <div class="post-grid">
        ${cards}
      </div>
    </main>
  </div>

</body>
</html>
`;

fs.writeFileSync(OUT_FILE, html, "utf8");
console.log(`blog.html written — ${files.length} post(s) found.`);