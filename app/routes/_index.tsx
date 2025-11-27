import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "partymix";
import WhosHere from "../components/whos-here";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import { Collaboration, ydoc } from "~/utils/collaboration.client";

declare const PARTYKIT_HOST: string;

export const meta: MetaFunction = () => {
  return [
    { title: "Collaborative Note" },
    { name: "description", content: "Real-time collaborative note taking" },
  ];
};

export const loader: LoaderFunction = async function ({
  context,
}: LoaderFunctionArgs) {
  return Response.json({ partykitHost: PARTYKIT_HOST });
};

export default function Index() {
  let titleEditor;
  let contentEditor;

  if (typeof document !== "undefined") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    titleEditor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Placeholder.configure({
          placeholder: "Untitled",
        }),
        Collaboration.configure({
          document: ydoc,
          field: "title",
        }),
      ],
      editorProps: {
        attributes: {
          class: "title-editor",
        },
      },
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    contentEditor = useEditor({
      extensions: [
        StarterKit.configure({ history: false }),
        Placeholder.configure({
          placeholder: "Start writing...",
        }),
        Collaboration.configure({
          document: ydoc,
          field: "content",
        }),
      ],
      editorProps: {
        attributes: {
          class: "content-editor",
        },
      },
    });
  }

  return (
    <>
      <style>{`
        .container {
          min-height: 100vh;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 3rem 2rem;
          position: relative;
        }

        .presence-indicator {
          position: fixed;
          top: 2rem;
          right: 2rem;
          font-size: 0.875rem;
          color: #666;
          background: #f5f5f5;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1.5rem;
          outline: none;
        }

        .title-editor .ProseMirror p {
          margin: 0;
        }

        .title-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
          height: 0;
          float: left;
        }

        .content-editor {
          outline: none;
          border: none;
        }

        .content-editor .ProseMirror {
          font-size: 1.125rem;
          line-height: 1.75;
          color: #374151;
          outline: none;
          min-height: 60vh;
        }

        .content-editor .ProseMirror p {
          margin-bottom: 1rem;
        }

        .content-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .content-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .content-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .content-editor .ProseMirror ul,
        .content-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .content-editor .ProseMirror li {
          margin-bottom: 0.1rem;
        }

        .content-editor .ProseMirror li p {
          margin-bottom: 0;
        }

        .content-editor .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          margin-bottom: 1rem;
          color: #6b7280;
        }

        .content-editor .ProseMirror code {
          background: #f3f4f6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875em;
        }

        .content-editor .ProseMirror pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }

        .content-editor .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        .content-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #d1d5db;
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
        <div className="presence-indicator">
          <WhosHere />
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
