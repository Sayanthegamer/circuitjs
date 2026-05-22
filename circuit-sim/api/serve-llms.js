export default async function handler(req, res) {
  // 1. Validate request method
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  // 2. Fetch the llms.txt from our SaaS backend
  // In production, your SaaS backend URL would be environment variable or hardcoded here
  const SAAS_BACKEND_URL = 'https://saas-eta-rose.vercel.app';
  
  // Get the current domain that the bot is visiting
  const currentDomain = 'https://' + (req.headers.host || 'circuitjs.vercel.app');

  try {
    const response = await fetch(`${SAAS_BACKEND_URL}/api/serve-llms?domain=${encodeURIComponent(currentDomain)}`, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Unknown-Bot'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    const content = await response.text();

    // 3. Return the text file directly to the bot with proper headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).send(content);

  } catch (error) {
    console.error('Error fetching llms.txt from SaaS:', error);
    return res.status(500).send('Internal Server Error');
  }
}
