export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. Validate request method
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 2. Fetch the llms.txt from our SaaS backend
  const SAAS_BACKEND_URL = 'https://saas-eta-rose.vercel.app';
  
  // Get the current domain that the bot is visiting from request headers
  const host = request.headers.get('host') || 'circuitjs.vercel.app';
  const currentDomain = 'https://' + host;

  try {
    const response = await fetch(`${SAAS_BACKEND_URL}/api/serve-llms?domain=${encodeURIComponent(currentDomain)}`, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Unknown-Bot'
      }
    });

    if (!response.ok) {
      return new Response(await response.text(), { status: response.status });
    }

    const content = await response.text();

    // 3. Return the text file directly to the bot with proper headers
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
        'Access-Control-Allow-Origin': currentDomain
      }
    });

  } catch (error) {
    console.error('Error fetching llms.txt from SaaS:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
