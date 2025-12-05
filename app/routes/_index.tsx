import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
  ActionFunction,
} from "partymix";
import { useLoaderData, Form, useNavigate, useFetcher } from "@remix-run/react";
import { requireAuth } from "~/utils/session.server";
import { useEffect, useState } from "react";

declare const PARTYKIT_HOST: string;

export const meta: MetaFunction = () => {
  return [
    { title: "Documents" },
    { name: "description", content: "Your collaborative documents" },
  ];
};

type Document = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
};

export const loader: LoaderFunction = async function ({
  context,
  request,
}: LoaderFunctionArgs) {
  const userName = await requireAuth(request, "/");
  return Response.json({ partykitHost: PARTYKIT_HOST, userName });
};

export const action: ActionFunction = async function ({ request }) {
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create") {
    // Generate a random slug
    const slug = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Call Remix API route instead of PartyKit directly
      const url = new URL(request.url);
      const host = `${url.protocol}//${url.host}`;

      const response = await fetch(`${host}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, title: "Untitled" }),
      });

      if (response.ok) {
        return Response.json({ slug });
      }

      return Response.json(
        { error: `Failed to create document: ${response.status}` },
        { status: response.status }
      );
    } catch (error) {
      console.error("Error creating document:", error);
      return Response.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
};

export default function Index() {
  const { userName, partykitHost } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Call Remix API route
        // Normalize 0.0.0.0 to localhost for client connections
        let host = window.location.origin;
        if (host.includes("0.0.0.0")) {
          host = host.replace("0.0.0.0", "localhost");
        }
        const response = await fetch(`${host}/api/documents`);

        if (response.ok) {
          const docs = await response.json();
          setDocuments(docs);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Handle navigation when document creation is complete
  useEffect(() => {
    if (fetcher.data && "slug" in fetcher.data && fetcher.state === "idle") {
      navigate(`/docs/${fetcher.data.slug}`);
    } else if (
      fetcher.data &&
      "error" in fetcher.data &&
      fetcher.state === "idle"
    ) {
      alert(`Failed to create document: ${fetcher.data.error}`);
    }
  }, [fetcher.data, fetcher.state, navigate]);

  const handleCreateNew = () => {
    const formData = new FormData();
    formData.append("action", "create");
    fetcher.submit(formData, { method: "post" });
  };

  const getPreviewText = (content: string) => {
    if (!content) return "No content yet...";
    // Strip HTML tags and get first 100 characters
    const text = content.replace(/<[^>]*>/g, "").trim();
    return text.substring(0, 100) + (text.length > 100 ? "..." : "");
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years > 1 ? "s" : ""} ago`;
    }
  };

  const handleEditSlug = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSlug(doc.slug);
    setNewSlug(doc.slug);
    setSlugError("");
  };

  const handleCancelEdit = () => {
    setEditingSlug(null);
    setNewSlug("");
    setSlugError("");
  };

  const handleSaveSlug = async (oldSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const trimmedSlug = newSlug.trim();

    if (!trimmedSlug) {
      setSlugError("Slug cannot be empty");
      return;
    }

    // Validate slug format: only alphanumeric, dashes, dots, and underscores
    const slugRegex = /^[a-zA-Z0-9._-]+$/;
    if (!slugRegex.test(trimmedSlug)) {
      setSlugError(
        "Slug can only contain letters, numbers, dashes, dots, and underscores"
      );
      return;
    }

    if (trimmedSlug === oldSlug) {
      handleCancelEdit();
      return;
    }

    try {
      // Call Remix API route
      // Normalize 0.0.0.0 to localhost for client connections
      let host = window.location.origin;
      if (host.includes("0.0.0.0")) {
        host = host.replace("0.0.0.0", "localhost");
      }
      const response = await fetch(
        `${host}/api/documents/${encodeURIComponent(oldSlug)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newSlug: trimmedSlug }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        setSlugError(result.error || "Failed to update slug");
        return;
      }

      // Update local state
      setDocuments((docs) =>
        docs.map((doc) =>
          doc.slug === oldSlug ? { ...doc, slug: trimmedSlug } : doc
        )
      );
      handleCancelEdit();
    } catch (error) {
      console.error("Error updating slug:", error);
      setSlugError("Failed to update slug");
    }
  };

  const handleArchive = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Archive this document?")) {
      return;
    }

    try {
      // Call Remix API route
      // Normalize 0.0.0.0 to localhost for client connections
      let host = window.location.origin;
      if (host.includes("0.0.0.0")) {
        host = host.replace("0.0.0.0", "localhost");
      }
      const response = await fetch(
        `${host}/api/documents/${encodeURIComponent(slug)}/archive`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        // Remove from local state
        setDocuments((docs) => docs.filter((doc) => doc.slug !== slug));
      } else {
        alert("Failed to archive document");
      }
    } catch (error) {
      console.error("Error archiving document:", error);
      alert("Failed to archive document");
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .docs-container {
          min-height: 100vh;
          background: #f9fafb;
          padding: 3rem 2rem;
        }

        .docs-header {
          max-width: 1200px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .docs-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        .archived-link {
          color: #667eea;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .archived-link:hover {
          text-decoration: underline;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: #666;
        }

        .logout-button {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0;
          font-weight: 500;
          text-decoration: underline;
          font-family: inherit;
        }

        .logout-button:hover {
          color: #991b1b;
        }

        .docs-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .doc-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 180px;
        }

        .doc-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border-color: #d1d5db;
          transform: translateY(-2px);
        }

        .doc-card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .doc-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .doc-card-content {
          flex: 1;
          min-width: 0;
        }

        .doc-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.25rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .doc-slug {
          font-size: 0.75rem;
          color: #9ca3af;
          font-family: 'Monaco', 'Courier New', monospace;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .doc-slug-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .edit-slug-button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.125rem 0.25rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          opacity: 0;
        }

        .doc-card:hover .edit-slug-button {
          opacity: 1;
        }

        .edit-slug-button:hover {
          color: #667eea;
          background: #f3f4f6;
        }

        .slug-edit-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .slug-input-wrapper {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .slug-input {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.75rem;
          padding: 0.25rem 0.375rem;
          border: 1px solid #667eea;
          border-radius: 0.25rem;
          flex: 1;
          outline: none;
          background: white;
          color: #374151;
        }

        .slug-input:focus {
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }

        .slug-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 0.875rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .slug-save-btn {
          color: #10b981;
        }

        .slug-save-btn:hover {
          background: #d1fae5;
        }

        .slug-cancel-btn {
          color: #ef4444;
        }

        .slug-cancel-btn:hover {
          background: #fee2e2;
        }

        .slug-error-text {
          font-size: 0.625rem;
          color: #dc2626;
        }

        .doc-preview {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .doc-footer {
          font-size: 0.75rem;
          color: #9ca3af;
          padding-top: 0.5rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .archive-button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          opacity: 0;
        }

        .doc-card:hover .archive-button {
          opacity: 1;
        }

        .archive-button:hover {
          color: #f59e0b;
          background: #fef3c7;
        }

        .create-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed rgba(255, 255, 255, 0.5);
        }

        .create-card:hover {
          border-color: white;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
        }

        .create-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .create-text {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .loading {
          text-align: center;
          padding: 4rem;
          color: #6b7280;
        }

        .empty-state {
          max-width: 1200px;
          margin: 4rem auto;
          text-align: center;
          color: #6b7280;
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state-text {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
      `,
        }}
      />

      <div className="docs-container">
        <div className="docs-header">
          <div className="header-left">
            <h1 className="docs-title">Documents</h1>
            <a href="/archived-docs" className="archived-link">
              📦 View archived documents
            </a>
          </div>
          <div className="user-info">
            <span>👋 {userName}</span>
            <Form method="post" action="/logout">
              <button type="submit" className="logout-button">
                Logout
              </button>
            </Form>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading documents...</div>
        ) : (
          <>
            <div className="docs-grid">
              <div
                className="doc-card create-card"
                onClick={handleCreateNew}
                style={{
                  opacity: fetcher.state !== "idle" ? 0.7 : 1,
                  pointerEvents: fetcher.state !== "idle" ? "none" : "auto",
                }}
              >
                <div className="create-icon">+</div>
                <div className="create-text">
                  {fetcher.state !== "idle" ? "Creating..." : "Create new"}
                </div>
              </div>

              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="doc-card"
                  onClick={() => navigate(`/docs/${doc.slug}`)}
                >
                  <div className="doc-card-header">
                    <div className="doc-icon">📄</div>
                    <div className="doc-card-content">
                      <div className="doc-title">{doc.title || "Untitled"}</div>
                      {editingSlug === doc.slug ? (
                        <div
                          className="slug-edit-container"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="slug-input-wrapper">
                            <input
                              type="text"
                              className="slug-input"
                              value={newSlug}
                              onChange={(e) => setNewSlug(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveSlug(doc.slug, e as any);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <button
                              className="slug-button slug-save-btn"
                              onClick={(e) => handleSaveSlug(doc.slug, e)}
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              className="slug-button slug-cancel-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                          {slugError && (
                            <div className="slug-error-text">{slugError}</div>
                          )}
                        </div>
                      ) : (
                        <div className="doc-slug">
                          <span className="doc-slug-text">{doc.slug}</span>
                          <button
                            className="edit-slug-button"
                            onClick={(e) => handleEditSlug(doc, e)}
                            title="Edit slug"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="doc-preview">
                    {getPreviewText(doc.content)}
                  </div>
                  <div className="doc-footer">
                    <span>Edited {formatDate(doc.updatedAt)}</span>
                    <button
                      className="archive-button"
                      onClick={(e) => handleArchive(doc.slug, e)}
                      title="Archive document"
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {documents.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-text">No documents yet</div>
                <div>Click "Create new" to get started</div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
