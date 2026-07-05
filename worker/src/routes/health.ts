import { Hono } from 'hono';
import type { Env } from '../env';

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get('/', (c) => c.json({ ok: true, time: new Date().toISOString() }));
