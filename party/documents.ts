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

    if (request.method === "POST" && path === "/documents") {
      // Create a new document
      const body = (await request.json()) as { slug: string; title?: string };

      // Validate slug format: only alphanumeric, dashes, dots, and underscores
      const slugRegex = /^[a-zA-Z0-9._-]+$/;
      if (!body.slug || !slugRegex.test(body.slug)) {
        return new Response(
          "Slug can only contain letters, numbers, dashes, dots, and underscores",
          { status: 400 }
        );
      }

      const now = Date.now();

      // Generate a unique ID for the document
      const id = `doc-${now}-${Math.random().toString(36).substr(2, 9)}`;

      const doc: Document = {
        id,
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
      const slugEncoded = path.split("/").pop();
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);

      const doc = await this.party.storage.get<Document>(slug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const updates = (await request.json()) as Partial<Document>;
      const updatedDoc: Document = {
        ...doc,
        ...updates,
        id: doc.id, // Don't allow changing the ID
        slug: doc.slug, // Don't allow changing the slug
        updatedAt: Date.now(),
      };

      await this.party.storage.put(slug, updatedDoc);
      return Response.json(updatedDoc);
    }

    if (request.method === "PATCH" && path.startsWith("/documents/")) {
      // Change document slug
      const oldSlugEncoded = path.split("/").pop();
      if (!oldSlugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      // Decode the URL-encoded slug
      const oldSlug = decodeURIComponent(oldSlugEncoded);

      const doc = await this.party.storage.get<Document>(oldSlug);
      if (!doc) {
        return new Response("Not found", { status: 404 });
      }

      const { newSlug } = (await request.json()) as { newSlug: string };

      if (!newSlug || newSlug.trim() === "") {
        return new Response("New slug is required", { status: 400 });
      }

      // Validate slug format: only alphanumeric, dashes, dots, and underscores
      const slugRegex = /^[a-zA-Z0-9._-]+$/;
      if (!slugRegex.test(newSlug)) {
        return new Response(
          "Slug can only contain letters, numbers, dashes, dots, and underscores",
          { status: 400 }
        );
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

      // Create updated document with new slug (preserving ID for collaboration)
      const updatedDoc: Document = {
        ...doc,
        id: doc.id, // Keep the same ID so collaboration data remains connected
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
      const slugEncoded = path.split("/").slice(-2)[0];
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);
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
      const slugEncoded = path.split("/").slice(-2)[0];
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);
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
      const slugEncoded = path.split("/").pop();
      if (!slugEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const slug = decodeURIComponent(slugEncoded);
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

    if (request.method === "POST" && path === "/organize-list") {
      // Organize a list of items (e.g., groceries by department)
      const body = (await request.json()) as { items: string[] };

      if (!body.items || !Array.isArray(body.items)) {
        return new Response("Invalid request: items array required", {
          status: 400,
        });
      }

      // Stub implementation: group by word count
      // This will be replaced with LLM-based grocery department grouping
      const organized = this.organizeListItems(body.items);

      return Response.json({ organized });
    }

    return new Response("Not found", { status: 404 });
  }

  private organizeListItems(items: string[]): string[] {
    // Stub: Group items by word count
    // In the future, this will call an LLM to organize groceries by department

    // Filter out empty items
    const validItems = items.filter((item) => item.trim().length > 0);

    if (validItems.length === 0) {
      return [];
    }

    // Group items by word count
    const grouped = new Map<number, string[]>();

    validItems.forEach((item) => {
      const trimmed = item.trim();
      const wordCount = trimmed.split(/\s+/).length;
      if (!grouped.has(wordCount)) {
        grouped.set(wordCount, []);
      }
      grouped.get(wordCount)!.push(trimmed);
    });

    // Sort groups by word count and flatten
    const sortedGroups = Array.from(grouped.entries()).sort(
      ([a], [b]) => a - b
    );

    const result: string[] = [];
    sortedGroups.forEach(([wordCount, groupItems]) => {
      // Add a header for each group
      result.push(`[${wordCount} word${wordCount !== 1 ? "s" : ""}]`);
      // Add the items in this group
      result.push(...groupItems);
    });

    return result;
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
