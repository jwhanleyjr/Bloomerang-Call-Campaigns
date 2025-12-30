import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BASE_URL = process.env.BLOOMERANG_API_BASE ?? 'https://api.bloomerang.co/v2';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const type = url.searchParams.get('type') ?? 'constituent';

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const apiKey = process.env.BLOOMERANG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const resource = type === 'household' ? 'household' : 'constituent';
  const targetUrl = `${BASE_URL}/${resource}/${encodeURIComponent(id)}`;

  try {
    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await resp.text();
    return new NextResponse(text, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('Bloomerang proxy failed', error);
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }
}
