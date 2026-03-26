import { z } from 'zod';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  return schema.parse(await response.json());
}
