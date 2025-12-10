import { Server } from "partyserver";

export type Document = {
  id: string; // Stable identifier for the document
  slug: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

/**
 * Simplified DocumentsServer that only provides low-level storage operations.
 * All HTTP request handling and business logic has been moved to Remix routes.
 * Storage keys use document `id` (not slug) for atomic renames.
 * This server now only handles direct storage operations:
 * - storage-list: List all documents from storage
 * - storage-get-by-id: Get a specific document by id
 * - storage-get-by-slug: Get a specific document by slug (searches all docs)
 * - storage-put: Create or update a document (uses id as key)
 * - storage-delete: Delete a document by id
 */
export class DocumentsServer extends Server {
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // The pathname will be like /parties/documents-server/{room}/storage-*
    // We need to extract the path after the room name
    const pathMatch = url.pathname.match(
      /^\/parties\/documents-server\/[^/]+(.*)$/
    );
    const path = pathMatch ? pathMatch[1] : url.pathname;

    // Storage operation: List all documents
    if (request.method === "GET" && path === "/storage-list") {
      const showArchived = url.searchParams.get("archived") === "true";
      const documents = await this.getAllDocuments(showArchived);
      return Response.json(documents);
    }

    // Storage operation: Get a specific document by id
    if (request.method === "GET" && path.startsWith("/storage-get-by-id/")) {
      const idEncoded = path.split("/").pop();
      if (!idEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const id = decodeURIComponent(idEncoded);
      const doc = await this.ctx.storage.get<Document>(id);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      return Response.json(doc);
    }

    // Storage operation: Get a specific document by slug
    if (request.method === "GET" && path.startsWith("/storage-get-by-slug/")) {
      const slugEncoded = path.split("/").pop();
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);

      // Search through all documents to find matching slug
      const entries = await this.ctx.storage.list<Document>();
      for (const [, doc] of entries) {
        if (doc.slug === slug) {
          return Response.json(doc);
        }
      }

      return new Response("Not found", { status: 404 });
    }

    // Storage operation: Put (create or update) a document
    // Key should be the document id
    if (request.method === "POST" && path === "/storage-put") {
      const body = (await request.json()) as { value: Document };
      await this.ctx.storage.put(body.value.id, body.value);
      return Response.json({ success: true });
    }

    // Storage operation: Delete a document by id
    if (request.method === "POST" && path.startsWith("/storage-delete/")) {
      const idEncoded = path.split("/").pop();
      if (!idEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const id = decodeURIComponent(idEncoded);
      await this.ctx.storage.delete(id);
      return Response.json({ success: true });
    }

    return new Response("Not found", { status: 404 });
  }

  private async getAllDocuments(
    showArchived: boolean = false
  ): Promise<Document[]> {
    const docs: Document[] = [];

    await this.ctx.storage.list<Document>().then((entries) => {
      for (const [, doc] of entries) {
        // Filter by archived status
        if (showArchived ? doc.archived : !doc.archived) {
          docs.push(doc);
        }
      }
    });

    // Sort by updatedAt descending
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
