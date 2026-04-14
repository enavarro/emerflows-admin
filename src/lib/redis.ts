// Upstash Redis REST client. Edge-runtime safe (uses fetch, no TCP).
// Shared with terenure-proyect — both repos hit the same Upstash instance
// so admin can SADD demo:revoked and the demo middleware sees it instantly.

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type RedisResp<T> = { result: T } | { error: string };

async function cmd<T = unknown>(args: (string | number)[]): Promise<T> {
  if (!URL || !TOKEN) throw new Error('Upstash env not configured');
  const res = await fetch(`${URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const body = (await res.json()) as RedisResp<T>;
  if ('error' in body) throw new Error(`Upstash: ${body.error}`);
  return body.result;
}

export async function get(key: string): Promise<string | null> {
  return cmd<string | null>(['GET', key]);
}

export async function setex(key: string, ttlSeconds: number, value: string): Promise<void> {
  await cmd(['SET', key, value, 'EX', ttlSeconds]);
}

export async function del(key: string): Promise<void> {
  await cmd(['DEL', key]);
}

export async function sadd(set: string, member: string): Promise<void> {
  await cmd(['SADD', set, member]);
}

export async function srem(set: string, member: string): Promise<void> {
  await cmd(['SREM', set, member]);
}

export async function smembers(set: string): Promise<string[]> {
  return (await cmd<string[]>(['SMEMBERS', set])) ?? [];
}

export async function sismember(set: string, member: string): Promise<boolean> {
  return (await cmd<number>(['SISMEMBER', set, member])) === 1;
}
