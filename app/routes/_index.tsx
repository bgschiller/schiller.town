import type {
  LoaderFunction,
  MetaFunction,
  ActionFunction,
  LinksFunction,
} from "partymix";
import { useLoaderData, Form, useNavigate, useFetcher } from "@remix-run/react";
import { authenticateLoader } from "~/utils/session.server";
import { getApiUrl } from "~/utils/api.client";
import { useEffect, useState } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/styles/index.css" },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Home - Documents & Star Charts" },
    {
      name: "description",
      content: "Your collaborative documents and star charts",
    },
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

export const loader: LoaderFunction = async function (args) {
  const userName = await authenticateLoader(args);
  return Response.json({ userName });
};

export const action: ActionFunction = async function ({ request, context }) {
  const env = context.env as { IS_LOCAL_DEV?: string };
  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "create") {
    // Generate a random slug
    const slug = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Call Remix API route - use environment variable to detect local dev
      const isLocal = env.IS_LOCAL_DEV === "true";
      const host = isLocal ? "http://localhost:8787" : "http://schiller.town";

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
  const data = useLoaderData<typeof loader>();
  const { userName } = data as unknown as { userName: string };
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
        const response = await fetch(getApiUrl("/api/documents"));

        if (response.ok) {
          const docs = (await response.json()) as Document[];
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
    if (
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "slug" in fetcher.data &&
      fetcher.state === "idle"
    ) {
      navigate(`/docs/${fetcher.data.slug}`);
    } else if (
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "error" in fetcher.data &&
      fetcher.state === "idle"
    ) {
      const errorData = fetcher.data as { error: string };
      alert(`Failed to create document: ${errorData.error}`);
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
      const response = await fetch(
        getApiUrl(`/api/documents/${encodeURIComponent(oldSlug)}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newSlug: trimmedSlug }),
        }
      );

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
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
      const response = await fetch(
        getApiUrl(`/api/documents/${encodeURIComponent(slug)}/archive`),
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
      <div className="docs-container">
        <div className="docs-header">
          <div className="header-left">
            <h1 className="page-title">Household</h1>
            <p className="page-subtitle">Documents and Star Charts</p>
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

        {/* Documents Section */}
        <div className="section-header">
          <div className="header-left">
            <h2 className="section-title">📄 Documents</h2>
            <a href="/archived-docs" className="archived-link">
              📦 View archived documents
            </a>
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

        <hr className="section-divider" />

        {/* Star Chart Section */}
        <div className="section-header">
          <h2 className="section-title">⭐ Star Charts</h2>
        </div>

        <div className="docs-grid" style={{ marginBottom: "3rem" }}>
          <div
            className="doc-card star-chart-card"
            onClick={() => navigate("/star-chart")}
          >
            <div className="star-chart-icon">🎉</div>
            <div className="star-chart-title">Everett's Potty Chart</div>
            <div className="star-chart-description">
              Track potty training progress
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
