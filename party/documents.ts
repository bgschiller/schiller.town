import type * as Party from "partykit/server";

export type Document = {
  slug: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

export default class DocumentsServer implements Party.Server {
  constructor(public party: Party.Room) {}

  async onRequest(request: Party.Request) {
    const url = new URL(request.url);

    // The pathname will be like /parties/documents/{room}/documents
    // We need to extract the path after the room name
    const pathMatch = url.pathname.match(/^\/parties\/documents\/[^/]+(.*)$/);
    const path = pathMatch ? pathMatch[1] : url.pathname;

    if (request.method === "GET" && path === "/documents") {
      // List all documents (optionally filter by archived status)
      const showArchived = url.searchParams.get("archived") === "true";
      const documents = await this.getAllDocuments(showArchived);
      return Response.json(documents);
    }

    if (request.method === "GET" && path.startsWith("/documents/")) {
      // Get a specific document
      const slug = path.split("/").pop();
      if (!slug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      return Response.json(doc);
    }

    if (request.method === "POST" && path === "/documents") {
      // Create a new document
      const body = (await request.json()) as { slug: string; title?: string };
      const now = Date.now();

      const doc: Document = {
        slug: body.slug,
        title: body.title || "Untitled",
        content: "",
        createdAt: now,
        updatedAt: now,
        archived: false,
      };

      await this.party.storage.put(doc.slug, doc);
      return Response.json(doc);
    }

    if (request.method === "PUT" && path.startsWith("/documents/")) {
      // Update a document
      const slug = path.split("/").pop();
      if (!slug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const updates = (await request.json()) as Partial<Document>;
      const updatedDoc: Document = {
        ...doc,
        ...updates,
        slug: doc.slug, // Don't allow changing the slug
        updatedAt: Date.now(),
      };

      await this.party.storage.put(slug, updatedDoc);
      return Response.json(updatedDoc);
    }

    if (request.method === "PATCH" && path.startsWith("/documents/")) {
      // Change document slug
      const oldSlug = path.split("/").pop();
      if (!oldSlug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(oldSlug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const { newSlug } = (await request.json()) as { newSlug: string };

      if (!newSlug || newSlug.trim() === "") {
        return new Response("New slug is required", { status: 400 });
      }

      // Check if the new slug is the same as the old one
      if (newSlug === oldSlug) {
        return Response.json(doc);
      }

      // Check if the new slug already exists
      const existingDoc = await this.party.storage.get<Document>(newSlug);
      if (existingDoc) {
        return new Response("A document with this slug already exists", {
          status: 409,
        });
      }

      // Create updated document with new slug
      const updatedDoc: Document = {
        ...doc,
        slug: newSlug,
        updatedAt: Date.now(),
      };

      // Delete old document and create new one
      await this.party.storage.delete(oldSlug);
      await this.party.storage.put(newSlug, updatedDoc);

      return Response.json(updatedDoc);
    }

    if (request.method === "POST" && path.endsWith("/archive")) {
      // Archive a document
      const slug = path.split("/").slice(-2)[0];
      if (!slug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const updatedDoc: Document = {
        ...doc,
        archived: true,
        updatedAt: Date.now(),
      };

      await this.party.storage.put(slug, updatedDoc);
      return Response.json(updatedDoc);
    }

    if (request.method === "POST" && path.endsWith("/restore")) {
      // Restore an archived document
      const slug = path.split("/").slice(-2)[0];
      if (!slug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const updatedDoc: Document = {
        ...doc,
        archived: false,
        updatedAt: Date.now(),
      };

      await this.party.storage.put(slug, updatedDoc);
      return Response.json(updatedDoc);
    }

    if (request.method === "DELETE" && path.startsWith("/documents/")) {
      // Permanently delete a document (only if already archived)
      const slug = path.split("/").pop();
      if (!slug) {
        return new Response("Not found", { status: 404 });
      }

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      if (!doc.archived) {
        return new Response(
          "Document must be archived before it can be deleted",
          { status: 400 }
        );
      }

      await this.party.storage.delete(slug);
      return Response.json({ success: true, deletedSlug: slug });
    }

    return new Response("Not found", { status: 404 });
  }

  private async getAllDocuments(
    showArchived: boolean = false
  ): Promise<Document[]> {
    const docs: Document[] = [];
    await this.party.storage.list().then((entries) => {
      for (const [, value] of entries) {
        const doc = value as Document;
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

DocumentsServer satisfies Party.Worker;
