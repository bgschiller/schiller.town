import { routePartykitRequest, Server, getServerByName } from "partyserver";
import { createRequestHandler, logDevReady } from "partymix";
import * as build from "@remix-run/dev/server-build";
import * as fs from "fs";
import * as path from "path";

// Define the Env type for Cloudflare Workers
export interface Env {
  MainServer: DurableObjectNamespace;
  DocumentsServer: DurableObjectNamespace;
  YjsServer: DurableObjectNamespace;
  GeoServer: DurableObjectNamespace;
  ANTHROPIC_API_KEY?: string;
  SESSION_SECRET?: string;
  HOUSEHOLD_PASSWORD?: string;
}

// Only log dev ready in Node.js environments (not Cloudflare Workers)
if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
  // trigger a reload on the remix dev server
  logDevReady(build);
}

// Create a request handler for Remix
const handleRequest = createRequestHandler({
  build,
  getLoadContext: (req: any, lobby: any, ctx: any) => {
    // Provide access to Durable Objects and env vars
    const env = ctx.env as Env;
    return {
      getServer: (namespace: any, name: string) =>
        getServerByName(namespace, name),
      env,
    };
  },
});

// Main server class that handles Remix HTTP requests
export class MainServer extends Server {
  async onRequest(request: Request): Promise<Response> {
    // Handle the Remix request - pass env from this.env
    const ctx = {
      env: this.env as Env,
    };
    return handleRequest(request as any, null as any, ctx as any);
  }
}

// Re-export the other server classes
export { DocumentsServer } from "./documents";
export { YjsServer } from "./yjs";
export { GeoServer } from "./geo";

// Helper function to serve static files in development
function serveStaticAsset(pathname: string): Response | null {
  // Only in Node.js environments (local development)
  if (typeof process === 'undefined' || !process.cwd) {
    return null;
  }

  try {
    const publicPath = path.join(process.cwd(), 'public', pathname);
    if (fs.existsSync(publicPath)) {
      const content = fs.readFileSync(publicPath);
      const ext = path.extname(pathname);
      const contentType =
        ext === '.js' ? 'application/javascript' :
        ext === '.css' ? 'text/css' :
        ext === '.html' ? 'text/html' :
        ext === '.json' ? 'application/json' :
        ext === '.ico' ? 'image/x-icon' :
        'application/octet-stream';

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (e) {
    console.error('[Static Asset] Error serving file:', e);
  }

  return null;
}

// Export default handler for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Try to route to a PartyServer instance (yjs-server, geo-server, documents-server)
    const partyResponse = await routePartykitRequest(request, env as any);
    if (partyResponse) {
      return partyResponse;
    }

    // Serve static assets from the public directory (development only)
    if (url.pathname.startsWith('/build/') || url.pathname === '/favicon.ico') {
      const staticResponse = serveStaticAsset(url.pathname);
      if (staticResponse) {
        return staticResponse;
      }
    }

    // Otherwise, handle as a Remix request via MainServer
    const mainServer = await getServerByName(env.MainServer as any, "default");
    return mainServer.fetch(request);
  },
} satisfies ExportedHandler<Env>;
