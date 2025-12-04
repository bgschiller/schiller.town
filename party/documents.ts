import type * as Party from "partykit/server";

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
 * This server now only handles direct storage operations:
 * - storage-list: List all documents from storage
 * - storage-get: Get a specific document by slug
 * - storage-put: Create or update a document
 * - storage-delete: Delete a document by slug
 */
export default class DocumentsServer implements Party.Server {
  constructor(public party: Party.Room) {}

  async onRequest(request: Party.Request) {
    const url = new URL(request.url);

    // The pathname will be like /parties/documents/{room}/storage-*
    // We need to extract the path after the room name
    const pathMatch = url.pathname.match(/^\/parties\/documents\/[^/]+(.*)$/);
    const path = pathMatch ? pathMatch[1] : url.pathname;

    // Storage operation: List all documents
    if (request.method === "GET" && path === "/storage-list") {
      const showArchived = url.searchParams.get("archived") === "true";
      const documents = await this.getAllDocuments(showArchived);
      return Response.json(documents);
    }

    // Storage operation: Get a specific document by slug
    if (request.method === "GET" && path.startsWith("/storage-get/")) {
      const slugEncoded = path.split("/").pop();
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);
      let doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      // Migration: Add ID to documents that don't have one
      if (!doc.id) {
        const now = Date.now();
        const id = `doc-${now}-${Math.random().toString(36).substr(2, 9)}`;
        doc = { ...doc, id };
        await this.party.storage.put(slug, doc);
      }

      return Response.json(doc);
    }

    // Storage operation: Put (create or update) a document
    if (request.method === "POST" && path === "/storage-put") {
      const body = (await request.json()) as { key: string; value: Document };
      await this.party.storage.put(body.key, body.value);
      return Response.json({ success: true });
    }

    // Storage operation: Delete a document by slug
    if (request.method === "POST" && path.startsWith("/storage-delete/")) {
      const slugEncoded = path.split("/").pop();
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);
      await this.party.storage.delete(slug);
      return Response.json({ success: true });
    }

    return new Response("Not found", { status: 404 });
  }

  private async getAllDocuments(
    showArchived: boolean = false
  ): Promise<Document[]> {
    const docs: Document[] = [];
    const updates: Promise<void>[] = [];

    await this.party.storage.list().then((entries) => {
      for (const [key, value] of entries) {
        let doc = value as Document;

        // Migration: Add ID to documents that don't have one
        if (!doc.id) {
          const now = Date.now();
          const id = `doc-${now}-${Math.random().toString(36).substr(2, 9)}`;
          doc = { ...doc, id };
          updates.push(this.party.storage.put(key as string, doc));
        }

        // Filter by archived status
        if (showArchived ? doc.archived : !doc.archived) {
          docs.push(doc);
        }
      }
    });

    // Wait for all migrations to complete
    await Promise.all(updates);

    // Sort by updatedAt descending
    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

DocumentsServer satisfies Party.Worker;
