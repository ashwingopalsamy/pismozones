import { validateBatch } from '@core/analytics/schema';

export const ORIGIN_RE =
  /^(https:\/\/(pismozones\.ashwingopalsamy\.in|([a-z0-9-]+-)?pismozones\.[a-z0-9-]+\.workers\.dev)|http:\/\/localhost:\d+)$/;

const MAX_BYTES = 16_384;

/** Reads at most `max` bytes; null if the body is (or claims to be) larger. */
async function readCapped(request: Request, max: number): Promise<string | null> {
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * First-party analytics ingest: one positional Analytics Engine data point per event.
 * Nothing about the request (IP, user agent) is written; country comes only from Cloudflare.
 */
export async function handleEvents(request: Request, env: Pick<Env, 'EVENTS'>): Promise<Response> {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (!ORIGIN_RE.test(request.headers.get('origin') ?? ''))
    return new Response(null, { status: 403 });
  const body = await readCapped(request, MAX_BYTES);
  if (body === null) return new Response(null, { status: 413 });
  let batch: ReturnType<typeof validateBatch>;
  try {
    batch = validateBatch(JSON.parse(body));
  } catch {
    batch = null;
  }
  if (!batch) return new Response(null, { status: 400 });
  const country = (request.cf?.country as string | undefined) ?? 'XX';
  for (const e of batch.e)
    env.EVENTS.writeDataPoint({
      indexes: [e.n],
      blobs: [e.n, String(batch.v), batch.a, country, batch.s, ...e.b],
      doubles: [e.t, ...e.d],
    });
  return new Response(null, { status: 204 });
}
