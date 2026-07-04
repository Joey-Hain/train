// Cloudflare Pages Function — lives at /api/videos once deployed.
// No build step needed: Cloudflare auto-detects anything in /functions.

const CHANNEL_ID = "UCtqkp1LCp0gQH44Kyj2kDYw"; // <-- replace with your channel ID
const MAX_VIDEOS = 5;
const CACHE_SECONDS = 1800; // 30 min — avoids hammering YouTube on every page load

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function onRequestGet(context) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const cache = caches.default;
  const cacheKey = new Request(feedUrl);

  let response = await cache.match(cacheKey);
  if (response) return response;

  const feedRes = await fetch(feedUrl);
  if (!feedRes.ok) {
    return new Response(JSON.stringify({ error: "Could not fetch feed" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const xml = await feedRes.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, MAX_VIDEOS);

  const videos = entries.map(([, entry]) => {
    const id = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? "";
    const title = decodeEntities(entry.match(/<title>(.*?)<\/title>/)?.[1] ?? "");
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] ?? "";
    return {
      id,
      title,
      published,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  });

  response = new Response(JSON.stringify(videos), {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${CACHE_SECONDS}`,
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
