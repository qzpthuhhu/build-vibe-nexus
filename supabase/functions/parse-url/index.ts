const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractTitle(html: string): string {
  return extractMeta(html, 'og:title')
    || extractMeta(html, 'twitter:title')
    || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    || '';
}

function extractDescription(html: string): string {
  return extractMeta(html, 'og:description')
    || extractMeta(html, 'twitter:description')
    || extractMeta(html, 'description')
    || '';
}

function extractTags(html: string): string[] {
  const keywords = extractMeta(html, 'keywords');
  if (keywords) {
    return keywords.split(/[,，、]/).map(k => k.trim()).filter(Boolean).slice(0, 10);
  }
  return [];
}

function extractOgImage(html: string): string | null {
  return extractMeta(html, 'og:image')
    || extractMeta(html, 'twitter:image')
    || extractMeta(html, 'twitter:image:src');
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const m = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
  if (m) {
    const href = m[1];
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    try {
      return new URL(href, baseUrl).href;
    } catch { return null; }
  }
  return null;
}

async function fetchScreenshotBase64(url: string): Promise<string | null> {
  const screenshotApis = [
    `https://image.thum.io/get/width/1280/crop/800/noanimate/${encodeURIComponent(url)}`,
    `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
  ];

  for (const apiUrl of screenshotApis) {
    try {
      console.log('Trying screenshot API:', apiUrl);

      // For microlink, the response is JSON with the screenshot URL
      if (apiUrl.includes('microlink.io')) {
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) continue;
        const json = await resp.json();
        const imgUrl = json?.data?.screenshot?.url;
        if (!imgUrl) continue;
        const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
        if (!imgResp.ok) continue;
        const buf = await imgResp.arrayBuffer();
        if (buf.byteLength < 1000) continue;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const contentType = imgResp.headers.get('content-type') || 'image/png';
        return `data:${contentType};base64,${base64}`;
      }

      // For thum.io, the response is the image directly
      const resp = await fetch(apiUrl, {
        signal: AbortSignal.timeout(20000),
        headers: { 'Accept': 'image/*' },
      });
      if (!resp.ok) continue;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) continue;
      const buf = await resp.arrayBuffer();
      if (buf.byteLength < 1000) continue; // too small, likely an error
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return `data:${contentType};base64,${base64}`;
    } catch (e) {
      console.error('Screenshot API failed:', e);
      continue;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Parsing URL:', formattedUrl);

    // Fetch HTML
    const resp = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VibeDir/1.0; +https://vibedir.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ success: false, error: `Failed to fetch: ${resp.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();
    const title = extractTitle(html);
    const description = extractDescription(html);
    const tags = extractTags(html);
    const ogImage = extractOgImage(html);
    const favicon = extractFavicon(html, formattedUrl);

    // Try to detect platform
    let platform: string | null = null;
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('apple-itunes-app') || lowerHtml.includes('apps.apple.com')) {
      platform = 'ios';
    } else if (lowerHtml.includes('play.google.com')) {
      platform = 'android';
    } else if (lowerHtml.includes('viewport') && lowerHtml.includes('width=device-width')) {
      platform = 'web';
    }

    // Fetch screenshot as base64 (server-side to avoid CORS)
    console.log('Fetching screenshot...');
    const screenshotBase64 = await fetchScreenshotBase64(formattedUrl);
    console.log('Screenshot fetched:', screenshotBase64 ? `${Math.round(screenshotBase64.length / 1024)}KB` : 'null');

    const result = {
      success: true,
      data: {
        title,
        description,
        tags,
        ogImage,
        favicon,
        screenshotBase64,
        platform,
        url: formattedUrl,
      },
    };

    console.log('Parse successful:', { title, tagsCount: tags.length, hasOgImage: !!ogImage, hasScreenshot: !!screenshotBase64 });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error parsing URL:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse URL',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
