const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMeta(html: string, property: string): string | null {
  // Try og:property, then name, then property
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

    // Generate screenshot URL using free screenshot API
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/800/noanimate/${encodeURIComponent(formattedUrl)}`;

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

    const result = {
      success: true,
      data: {
        title,
        description,
        tags,
        ogImage,
        favicon,
        screenshotUrl,
        platform,
        url: formattedUrl,
      },
    };

    console.log('Parse successful:', { title, tagsCount: tags.length, hasOgImage: !!ogImage });

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
