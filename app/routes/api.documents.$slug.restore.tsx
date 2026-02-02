import type { ActionFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import type { Document } from "./api.documents";

type Env = {
  IS_LOCAL_DEV?: string;
};

function getStorageUrl(request: Request, env: Env, path: string = "") {
  const isLocal = env.IS_LOCAL_DEV === "true";
  const host = isLocal ? `http://localhost:8787` : `http://schiller.town`;
  return `${host}/parties/documents-server/default${path}`;
}

// POST /api/documents/:slug/restore
export async function action({ request, params, context }: ActionFunctionArgs) {
  const env = context.env as Env;
  const slug = params.slug;

  if (!slug) {
    return json({ error: "Slug required" }, { status: 400 });
  }

  const decodedSlug = decodeURIComponent(slug);

  // Get existing document by slug
  const getUrl = getStorageUrl(
    request,
    env,
    `/storage-get-by-slug/${encodeURIComponent(decodedSlug)}`
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

  // Save to storage (using id as key)
  const putUrl = getStorageUrl(request, env, `/storage-put`);
  const putResponse = await fetch(putUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: updatedDoc }),
  });

  if (!putResponse.ok) {
    return json({ error: "Failed to restore document" }, { status: 500 });
  }

  return json(updatedDoc);
}
