/**
 * Admin worker — serves the built editor (dist/admin) and proxies /api/* and
 * /media/* to the main `hope-on-studio` worker over a service binding, so the
 * editor talks same-origin and Cloudflare Access headers (injected on the
 * admin hostname) flow through to the API's auth middleware untouched.
 */
export interface Env {
  SITE: Fetcher;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
      return env.SITE.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
