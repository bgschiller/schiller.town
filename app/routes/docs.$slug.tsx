import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "partymix";
import { useLoaderData, Form, useNavigate } from "@remix-run/react";
import WhosHere from "../components/whos-here";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { Collaboration, ydoc } from "~/utils/collaboration.client";
import { requireAuth } from "~/utils/session.server";
import { useEffect, useRef } from "react";

declare const PARTYKIT_HOST: string;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.slug ? `${data.slug} - Collaborative Doc` : "Document" },
    {
      name: "description",
      content: "Real-time collaborative document editing",
    },
  ];
};

export const loader: LoaderFunction = async function ({
  context,
  request,
  params,
}: LoaderFunctionArgs) {
  const userName = await requireAuth(request, "/");
  const slug = params.slug;

  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  return Response.json({
    partykitHost: PARTYKIT_HOST,
    userName,
    slug,
  });
};

export default function DocPage() {
  const { userName, slug, partykitHost } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const titleEditor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Placeholder.configure({
        placeholder: "Untitled",
      }),
      Collaboration.configure({
        document: ydoc,
        field: `${slug}-title`,
      }),
    ],
    editorProps: {
      attributes: {
        class: "title-editor",
      },
    },
  });

  const contentEditor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Collaboration.configure({
        document: ydoc,
        field: `${slug}-content`,
      }),
    ],
    editorProps: {
      attributes: {
        class: "content-editor",
      },
    },
  });

  // Update document metadata when content changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!titleEditor || !contentEditor) return;

    const updateMetadata = async () => {
      const title = titleEditor.getText() || "Untitled";
      const content = contentEditor.getText();

      try {
        const isDevelopment =
          window.location.hostname === "localhost" ||
          window.location.hostname === "0.0.0.0" ||
          window.location.hostname === "127.0.0.1";

        const host = isDevelopment
          ? `http://${window.location.hostname}:1999`
          : `https://${partykitHost}`;

        await fetch(`${host}/parties/documents/default/documents/${slug}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, content }),
        });
      } catch (error) {
        console.error("Failed to update document metadata:", error);
      }
    };

    // Debounce updates to avoid too many API calls
    const handleUpdate = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(updateMetadata, 1000);
    };

    titleEditor.on("update", handleUpdate);
    contentEditor.on("update", handleUpdate);

    return () => {
      titleEditor.off("update", handleUpdate);
      contentEditor.off("update", handleUpdate);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [titleEditor, contentEditor, slug, partykitHost]);

  return (
    <>
      <style>{`
        body {
          background: #f5f5f0;
        }

        .container {
          min-height: 100vh;
          background: white;
          max-width: 50rem;
          margin: 0 auto;
          padding: 3rem 4rem;
          position: relative;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        @media (max-width: 768px) {
          .container {
            padding: 2rem 1.5rem;
          }
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 3rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .back-button {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0.5rem 0.75rem;
          font-weight: 500;
          text-decoration: none;
          font-family: inherit;
          border-radius: 0.375rem;
          transition: all 0.15s;
        }

        .back-button:hover {
          background: #f5f5f0;
          color: #1a1a1a;
        }

        .presence-indicator {
          font-size: 0.8125rem;
          color: #666;
          background: #fafaf8;
          padding: 0.5rem 1rem;
          border-radius: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid #e5e5e5;
        }

        .presence-divider {
          width: 1px;
          height: 1rem;
          background: #d1d5db;
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

        .presence-indicator b {
          font-weight: 500;
        }

        .online-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
        }

        .title-editor {
          outline: none;
          border: none;
        }

        .title-editor .ProseMirror {
          font-size: 2.5rem;
          font-weight: 600;
          line-height: 1.25;
          margin-bottom: 2rem;
          outline: none;
          color: #1a1a1a;
          letter-spacing: -0.025em;
        }

        .title-editor .ProseMirror p {
          margin: 0;
        }

        .title-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #c4c4c4;
          pointer-events: none;
          height: 0;
          float: left;
        }

        .content-editor {
          outline: none;
          border: none;
        }

        .content-editor .ProseMirror {
          font-size: 1.0625rem;
          line-height: 1.7;
          color: #2e2e2e;
          outline: none;
          min-height: 60vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .content-editor .ProseMirror p {
          margin-bottom: 1.25rem;
        }

        .content-editor .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: #1a1a1a;
          letter-spacing: -0.025em;
        }

        .content-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }

        .content-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
          letter-spacing: -0.015em;
        }

        .content-editor .ProseMirror ul,
        .content-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }

        .content-editor .ProseMirror li {
          margin-bottom: 0.375rem;
        }

        .content-editor .ProseMirror li p {
          margin-bottom: 0;
        }

        .content-editor .ProseMirror ul {
          list-style-type: disc;
        }

        .content-editor .ProseMirror ul ul {
          list-style-type: circle;
        }

        .content-editor .ProseMirror blockquote {
          border-left: 3px solid #d1d1d1;
          padding-left: 1rem;
          margin-left: 0;
          margin-bottom: 1.25rem;
          color: #5a5a5a;
          font-style: italic;
        }

        .content-editor .ProseMirror code {
          background: #f5f5f0;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          color: #1a1a1a;
        }

        .content-editor .ProseMirror pre {
          background: #2a2a2a;
          color: #f5f5f0;
          padding: 1.25rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.25rem;
        }

        .content-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        .content-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #c4c4c4;
          pointer-events: none;
          height: 0;
          float: left;
        }

        /* Collaboration cursor styles */
        .collaboration-cursor__caret {
          border-left: 2px solid currentColor;
          border-right: 2px solid currentColor;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px;
          color: #fff;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 0.1rem 0.3rem;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="container">
        <div className="header">
          <button className="back-button" onClick={() => navigate("/")}>
            ← Back to documents
          </button>

          <div className="presence-indicator">
            <span>👋 {userName}</span>
            <div className="presence-divider"></div>
            <WhosHere room={slug} />
            <div className="presence-divider"></div>
            <Form method="post" action="/logout" style={{ display: "inline" }}>
              <button type="submit" className="logout-button">
                Logout
              </button>
            </Form>
          </div>
        </div>

        <div className="title-editor">
          {titleEditor && <EditorContent editor={titleEditor} />}
        </div>

        <div className="content-editor">
          {contentEditor && <EditorContent editor={contentEditor} />}
        </div>
      </div>
    </>
  );
}
