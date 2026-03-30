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
  // Try microlink API first (returns JSON with screenshot URL)
  try {
    console.log('Trying microlink API...');
    const mlResp = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (mlResp.ok) {
      const json = await mlResp.json();
      const imgUrl = json?.data?.screenshot?.url;
      if (imgUrl) {
        console.log('Got microlink screenshot URL:', imgUrl);
        const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          if (buf.byteLength > 1000) {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const contentType = imgResp.headers.get('content-type') || 'image/png';
            return `data:${contentType};base64,${base64}`;
          }
        }
      }
    }
  } catch (e) {
    console.error('Microlink failed:', e);
  }

  // Fallback: thum.io
  try {
    console.log('Trying thum.io...');
    const apiUrl = `https://image.thum.io/get/width/1280/crop/800/noanimate/${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl, {
      signal: AbortSignal.timeout(25000),
      headers: { 'Accept': 'image/*' },
    });
    if (resp.ok) {
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const buf = await resp.arrayBuffer();
        if (buf.byteLength > 1000) {
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          return `data:${contentType};base64,${base64}`;
        }
      }
    }
  } catch (e) {
    console.error('Thum.io failed:', e);
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

    // Fetch HTML - try with browser-like UA first, fallback to bot UA
    let html = '';
    let fetchSuccess = false;
    for (const ua of [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (compatible; VibeDir/1.0; +https://vibedir.com)',
    ]) {
      try {
        const resp = await fetch(formattedUrl, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        html = await resp.text();
        // Consider it successful if we got any HTML content, even on non-200
        if (html.length > 100) {
          fetchSuccess = true;
          console.log(`Fetched with status ${resp.status}, HTML length: ${html.length}`);
          break;
        }
      } catch (e) {
        console.warn(`Fetch attempt failed with UA "${ua.slice(0, 30)}...":`, e);
      }
    }

    if (!fetchSuccess || html.length < 100) {
      // Still try to return partial data with screenshot
      console.log('HTML fetch failed, attempting screenshot-only mode');
      const screenshotBase64 = await fetchScreenshotBase64(formattedUrl);
      const hostname = new URL(formattedUrl).hostname;
      return new Response(JSON.stringify({
        success: true,
        data: {
          title: hostname,
          description: '',
          tags: [],
          ogImage: null,
          favicon: null,
          screenshotBase64,
          platform: 'web',
          url: formattedUrl,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // html is already populated from the fetch loop above
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
