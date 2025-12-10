import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "partymix";
import { useLoaderData, Form, useNavigate } from "@remix-run/react";
import { requireAuth } from "~/utils/session.server";
import { useEffect, useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Archived Documents" },
    { name: "description", content: "Your archived documents" },
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
  return Response.json({ userName });
};

export default function ArchivedDocuments() {
  const { userName, partykitHost } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // Call Remix API route
        // Normalize 0.0.0.0 to localhost for client connections
        let host = window.location.origin;
        if (host.includes("0.0.0.0")) {
          host = host.replace("0.0.0.0", "localhost");
        }
        const response = await fetch(`${host}/api/documents?archived=true`);

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

  const handleRestore = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Restore this document?")) {
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
        `${host}/api/documents/${encodeURIComponent(slug)}/restore`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        // Remove from local state
        setDocuments((docs) => docs.filter((doc) => doc.slug !== slug));
      } else {
        alert("Failed to restore document");
      }
    } catch (error) {
      console.error("Error restoring document:", error);
      alert("Failed to restore document");
    }
  };

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (
      !confirm(
        "Permanently delete this document? This action cannot be undone."
      )
    ) {
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
        `${host}/api/documents/${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove from local state
        setDocuments((docs) => docs.filter((doc) => doc.slug !== slug));
      } else {
        const result = await response.json();
        alert(result.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  return (
    <>
      <style>{`
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

        .back-link {
          color: #667eea;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .back-link:hover {
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
          position: relative;
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
        }

        .doc-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .action-button {
          background: none;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
          font-weight: 500;
          flex: 1;
        }

        .restore-button {
          color: #10b981;
          border-color: #10b981;
        }

        .restore-button:hover {
          background: #d1fae5;
        }

        .delete-button {
          color: #ef4444;
          border-color: #ef4444;
        }

        .delete-button:hover {
          background: #fee2e2;
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
      `}</style>

      <div className="docs-container">
        <div className="docs-header">
          <div className="header-left">
            <h1 className="docs-title">📦 Archived Documents</h1>
            <a href="/" className="back-link">
              ← Back to active documents
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
          <div className="loading">Loading archived documents...</div>
        ) : (
          <>
            {documents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-text">No archived documents</div>
                <div>Archived documents will appear here</div>
              </div>
            ) : (
              <div className="docs-grid">
                {documents.map((doc) => (
                  <div
                    key={doc.slug}
                    className="doc-card"
                    onClick={() => navigate(`/docs/${doc.slug}`)}
                  >
                    <div className="doc-card-header">
                      <div className="doc-icon">📄</div>
                      <div className="doc-card-content">
                        <div className="doc-title">
                          {doc.title || "Untitled"}
                        </div>
                        <div className="doc-slug">{doc.slug}</div>
                      </div>
                    </div>
                    <div className="doc-preview">
                      {getPreviewText(doc.content)}
                    </div>
                    <div className="doc-footer">
                      Archived {formatDate(doc.updatedAt)}
                    </div>
                    <div
                      className="doc-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="action-button restore-button"
                        onClick={(e) => handleRestore(doc.slug, e)}
                      >
                        ↩️ Restore
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={(e) => handleDelete(doc.slug, e)}
                      >
                        🗑️ Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
