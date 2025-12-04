import type { ActionFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import type { Document } from "./api.documents";

function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;
  return `${host}/parties/documents/default${path}`;
}

// POST /api/documents/:slug/restore
export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug;

  if (!slug) {
    return json({ error: "Slug required" }, { status: 400 });
  }

  const decodedSlug = decodeURIComponent(slug);

  // Get existing document
  const getUrl = getStorageUrl(
    request,
    `/storage-get/${encodeURIComponent(decodedSlug)}`
  );
  const getResponse = await fetch(getUrl);

  if (!getResponse.ok) {
    return json({ error: "Document not found" }, { status: 404 });
  }

  const doc = (await getResponse.json()) as Document;

  // Update archived status
  const updatedDoc: Document = {
    ...doc,
    archived: false,
    updatedAt: Date.now(),
  };

  // Save to storage
  const putUrl = getStorageUrl(request, `/storage-put`);
  const putResponse = await fetch(putUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: decodedSlug, value: updatedDoc }),
  });

  if (!putResponse.ok) {
    return json({ error: "Failed to restore document" }, { status: 500 });
  }

  return json(updatedDoc);
}
