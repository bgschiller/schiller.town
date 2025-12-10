import type { ActionFunctionArgs, LoaderFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import type { Document } from "./api.documents";

// Helper to get PartyServer storage URL
function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;
  return `${host}/parties/documents-server/default${path}`;
}

// GET /api/documents/:slug
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug;

  if (!slug) {
    throw new Response("Slug required", { status: 400 });
  }

  const decodedSlug = decodeURIComponent(slug);
  const storageUrl = getStorageUrl(
    request,
    `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
  );
  const response = await fetch(storageUrl);

  if (!response.ok) {
    throw new Response("Document not found", { status: 404 });
  }

  const document = await response.json();
  return json(document);
}

// PUT /api/documents/:slug (update)
// PATCH /api/documents/:slug (rename)
// DELETE /api/documents/:slug (delete)
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug;
  const method = request.method;

  if (!slug) {
    return json({ error: "Slug required" }, { status: 400 });
  }

  const decodedSlug = decodeURIComponent(slug);

  // PUT /api/documents/:slug - Update document
  if (method === "PUT") {
    // Get existing document by slug
    const getUrl = getStorageUrl(
      request,
      `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
    );
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      return json({ error: "Document not found" }, { status: 404 });
    }

    const doc = (await getResponse.json()) as Document;
    const updates = await request.json();

    const updatedDoc: Document = {
      ...doc,
      ...updates,
      id: doc.id, // Don't allow changing the ID
      slug: doc.slug, // Don't allow changing the slug via PUT
      updatedAt: Date.now(),
    };

    // Update in storage (using id as key)
    const storageUrl = getStorageUrl(request, `/storage-put`);
    const response = await fetch(storageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: updatedDoc }),
    });

    if (!response.ok) {
      return json({ error: "Failed to update document" }, { status: 500 });
    }

    return json(updatedDoc);
  }

  // PATCH /api/documents/:slug - Rename document (change slug)
  if (method === "PATCH") {
    const { newSlug } = await request.json();

    if (!newSlug || newSlug.trim() === "") {
      return json({ error: "New slug is required" }, { status: 400 });
    }

    // Validate slug format
    const slugRegex = /^[a-zA-Z0-9._-]+$/;
    if (!slugRegex.test(newSlug)) {
      return json(
        {
          error:
            "Slug can only contain letters, numbers, dashes, dots, and underscores",
        },
        { status: 400 }
      );
    }

    if (newSlug === decodedSlug) {
      // No change needed, just return existing doc
      const getUrl = getStorageUrl(
        request,
        `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
      );
      const response = await fetch(getUrl);
      const doc = await response.json();
      return json(doc);
    }

    // Check if new slug already exists
    const checkUrl = getStorageUrl(
      request,
      `/storage-get-by-slug/${encodeURIComponent(newSlug)}`
    );
    const checkResponse = await fetch(checkUrl);
    if (checkResponse.ok) {
      return json(
        { error: "A document with this slug already exists" },
        { status: 409 }
      );
    }

    // Get old document
    const getUrl = getStorageUrl(
      request,
      `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
    );
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      return json({ error: "Document not found" }, { status: 404 });
    }

    const doc = (await getResponse.json()) as Document;

    // Create updated document with new slug
    // No need to change storage key - it uses id!
    const updatedDoc: Document = {
      ...doc,
      slug: newSlug,
      updatedAt: Date.now(),
    };

    // Simply update the document in place (storage key is id, which doesn't change)
    const putUrl = getStorageUrl(request, `/storage-put`);
    await fetch(putUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: updatedDoc }),
    });

    return json(updatedDoc);
  }

  // DELETE /api/documents/:slug - Permanently delete document
  if (method === "DELETE") {
    // Get document to check if it's archived
    const getUrl = getStorageUrl(
      request,
      `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
    );
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      return json({ error: "Document not found" }, { status: 404 });
    }

    const doc = (await getResponse.json()) as Document;

    if (!doc.archived) {
      return json(
        { error: "Document must be archived before it can be deleted" },
        { status: 400 }
      );
    }

    // Delete from storage using id
    const deleteUrl = getStorageUrl(
      request,
      `/storage-delete/${encodeURIComponent(doc.id)}`
    );
    const response = await fetch(deleteUrl, { method: "POST" });

    if (!response.ok) {
      return json({ error: "Failed to delete document" }, { status: 500 });
    }

    return json({ success: true, deletedSlug: decodedSlug });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
