import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "partymix";
import { useLoaderData, Form, useNavigate } from "@remix-run/react";
import WhosHere from "../components/whos-here";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Collaboration,
  getYDoc,
  getProvider,
} from "~/utils/collaboration.client";
import { MergeAdjacentLists } from "~/utils/merge-adjacent-lists";
import { requireAuth } from "~/utils/session.server";
import { useEffect, useRef, useState, useMemo } from "react";

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
  const userName = await requireAuth(request, context.env.SESSION_SECRET, "/");
  const slug = params.slug;

  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch the document to get its ID
  // Always use the current request's origin - works locally and through Cloudflare tunnel
  const url = new URL(request.url);
  const host = `${url.protocol}//${url.host}`;

  try {
    // Call Remix API route
    const response = await fetch(
      `${host}/api/documents/${encodeURIComponent(slug)}`
    );

    if (!response.ok) {
      throw new Response("Document Not Found", { status: 404 });
    }

    const document = await response.json();

    return Response.json({
      userName,
      slug,
      documentId: document.id,
    });
  } catch (error) {
    throw new Response("Document Not Found", { status: 404 });
  }
};

export default function DocPage() {
  const { userName, slug, partykitHost, documentId } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentEditorRef = useRef<any>(null);
  const [ydoc, setYdoc] = useState<ReturnType<typeof getYDoc>>(null);
  const [isClient, setIsClient] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device and update visual viewport CSS variable
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      setIsMobile(mobile);
    };

    const updateVisualViewport = () => {
      if (window.visualViewport) {
        // Update CSS custom property with visual viewport height
        document.documentElement.style.setProperty(
          "--visual-viewport-height",
          `${window.visualViewport.height}px`
        );
      }
    };

    checkMobile();
    updateVisualViewport();

    window.addEventListener("resize", checkMobile);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateVisualViewport);
      window.visualViewport.addEventListener("scroll", updateVisualViewport);
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          updateVisualViewport
        );
        window.visualViewport.removeEventListener(
          "scroll",
          updateVisualViewport
        );
      }
    };
  }, []);

  // Pick a random grocery item emoji for the Group Items button
  const foodEmoji = useMemo(() => {
    const groceryEmojis = [
      "🥑", // Avocado
      "🍅", // Tomato
      "🥕", // Carrot
      "🥦", // Broccoli
      "🥬", // Leafy greens
      "🌽", // Corn
      "🥔", // Potato
      "🍎", // Apple
      "🍊", // Orange
      "🍋", // Lemon
      "🍌", // Banana
      "🍇", // Grapes
      "🍓", // Strawberry
      "🫐", // Blueberries
      "🥒", // Cucumber
      "🧅", // Onion
      "🧄", // Garlic
      "🍞", // Bread
      "🥛", // Milk
      "🥫", // Canned food
      "🍄", // Mushroom
      "🫑", // Bell pepper
      "🥚", // Eggs
      "🧀", // Cheese
      "🍋‍🟩", // Lime
      "🥥", // Coconut
      "🍑", // Peach
      "🍐", // Pear
      "🍉", // Watermelon
      "🍒", // Cherries
      "🥝", // Kiwi
      "🍍", // Pineapple
      "🥭", // Mango
      "🫒", // Olives
      "🥜", // Peanuts
      "🌶️", // Hot pepper
      "🫘", // Beans
      "🥖", // Baguette
      "🧈", // Butter
      "🥓", // Bacon
      "🍖", // Meat
      "🍗", // Poultry
      "🥩", // Steak
      "🦴", // Bone/Meat
      "🥞", // Pancake mix
      "🧇", // Waffle mix
    ];
    return groceryEmojis[Math.floor(Math.random() * groceryEmojis.length)];
  }, []);

  // Initialize Y.Doc and provider only on the client
  // Use documentId for the collaboration room so slug changes don't break the connection
  useEffect(() => {
    setIsClient(true);
    const doc = getYDoc();
    const provider = getProvider(documentId);
    if (doc && provider) {
      setYdoc(doc);

      // Wait for initial sync before showing editors
      const handleSync = (synced: boolean) => {
        if (synced) {
          setIsSynced(true);
        }
      };

      // Check if already synced
      if (provider.synced) {
        setIsSynced(true);
      } else {
        provider.on("synced", handleSync);
      }

      return () => {
        provider.off("synced", handleSync);
      };
    }
  }, [documentId]);

  // Only create editors on the client when ydoc is ready
  // For SSR, provide minimal extensions to avoid schema errors
  const titleEditor = useEditor(
    {
      extensions:
        isClient && ydoc
          ? [
              Document,
              Paragraph,
              Text,
              Placeholder.configure({
                placeholder: "Untitled",
              }),
              Collaboration.configure({
                document: ydoc,
                field: `${documentId}-title`,
              }),
            ]
          : [Document, Paragraph, Text],
      editorProps: {
        attributes: {
          class: "title-editor",
        },
        handleKeyDown: (view, event) => {
          // When Enter is pressed in title, focus the content editor instead
          if (event.key === "Enter") {
            event.preventDefault();
            contentEditorRef.current?.commands.focus();
            return true;
          }
          return false;
        },
      },
      editable: isClient && !!ydoc,
    },
    [isClient, ydoc, documentId]
  );

  const contentEditor = useEditor(
    {
      extensions:
        isClient && ydoc
          ? [
              StarterKit.configure({
                history: false,
                bulletList: {
                  keepMarks: true,
                  keepAttributes: false,
                },
              }),
              Placeholder.configure({
                placeholder: "Start writing...",
              }),
              Collaboration.configure({
                document: ydoc,
                field: `${documentId}-content`,
              }),
              MergeAdjacentLists,
            ]
          : [StarterKit],
      editorProps: {
        attributes: {
          class: "content-editor",
        },
      },
      editable: isClient && !!ydoc,
    },
    [isClient, ydoc, documentId]
  );

  // Store contentEditor in ref so titleEditor can access it
  useEffect(() => {
    contentEditorRef.current = contentEditor;
  }, [contentEditor]);

  // Handler to organize selected list items
  const handleOrganizeList = async () => {
    if (!contentEditor) return;

    setIsOrganizing(true);
    try {
      const { state } = contentEditor;
      const { from, to } = state.selection;

      // Extract list items from selection
      // We collect all list items and flatten them
      const items: string[] = [];
      const seenItems = new Set<string>(); // Track items we've seen to avoid duplicates

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === "listItem") {
          const text = node.textContent.trim();
          // Create a unique key using position to avoid duplicate items
          const key = `${pos}-${text}`;
          if (text && !seenItems.has(key)) {
            items.push(text);
            seenItems.add(key);
          }
        }
        return true; // Continue traversing
      });

      if (items.length === 0) {
        alert("Please select list items to organize");
        return;
      }

      // Call Remix API route to organize items
      // Normalize 0.0.0.0 to localhost for client connections
      let host = window.location.origin;
      if (host.includes("0.0.0.0")) {
        host = host.replace("0.0.0.0", "localhost");
      }
      const response = await fetch(`${host}/api/organize-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error("Failed to organize list");
      }

      const { organized } = await response.json();

      if (organized.length === 0) {
        alert("No valid items to organize");
        return;
      }

      // Filter out any empty items
      const validItems = organized.filter(
        (item: string) => item && item.trim().length > 0
      );

      // Build content with headings and lists
      // Items starting with [ are group labels, others are list items
      const content: any[] = [];
      let currentGroup: any[] = [];

      validItems.forEach((item: string) => {
        const trimmed = item.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          // This is a group label - add previous list if any, then add heading
          if (currentGroup.length > 0) {
            content.push({
              type: "bulletList",
              content: currentGroup,
            });
            currentGroup = [];
          }
          // Add heading
          content.push({
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: trimmed.slice(1, -1) }], // Remove [ and ]
          });
        } else {
          // This is a list item
          currentGroup.push({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: trimmed }],
              },
            ],
          });
        }
      });

      // Add the last group if any
      if (currentGroup.length > 0) {
        content.push({
          type: "bulletList",
          content: currentGroup,
        });
      }

      // Replace the selection with organized content
      // We need to ensure we're inserting at the block level, not inside a list
      const { $from, $to } = state.selection;

      // Find the depth of the outermost list in our selection
      let listDepth = 0;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (
          node.type.name === "bulletList" ||
          node.type.name === "orderedList"
        ) {
          listDepth = d;
          break;
        }
      }

      // If we're inside a list, expand selection to include the entire list structure
      let deleteFrom = from;
      let deleteTo = to;

      if (listDepth > 0) {
        const $listStart = state.doc.resolve($from.before(listDepth));
        const $listEnd = state.doc.resolve(
          $to.after(Math.min(listDepth, $to.depth))
        );
        deleteFrom = $listStart.pos;
        deleteTo = $listEnd.pos;
      }

      // Delete the range and insert new content
      contentEditor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: deleteTo })
        .insertContentAt(deleteFrom, content)
        .run();
    } catch (error) {
      console.error("Error organizing list:", error);
      alert("Failed to organize list. Please try again.");
    } finally {
      setIsOrganizing(false);
    }
  };

  // Handler to remove headings and flatten all items into one list
  const handleFlattenList = () => {
    if (!contentEditor) return;

    try {
      const { state } = contentEditor;
      const { from, to } = state.selection;

      // Extract all list items, ignoring headings
      const items: string[] = [];
      const seenTexts = new Set<string>(); // Track to avoid duplicates

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === "listItem") {
          const text = node.textContent.trim();
          if (text && !seenTexts.has(text)) {
            items.push(text);
            seenTexts.add(text);
          }
        }
        return true; // Continue traversing
      });

      if (items.length === 0) {
        alert("Please select list items to flatten");
        return;
      }

      // Build a single flat bullet list
      const content = [
        {
          type: "bulletList",
          content: items.map((item) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: item }],
              },
            ],
          })),
        },
      ];

      // Find the selection range to replace
      const { $from, $to } = state.selection;

      // Find the depth of the outermost structure (heading or list)
      let blockDepth = 0;
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (
          node.type.name === "bulletList" ||
          node.type.name === "orderedList" ||
          node.type.name === "heading"
        ) {
          blockDepth = d;
          break;
        }
      }

      // Expand selection to include entire block structures
      let deleteFrom = from;
      let deleteTo = to;

      if (blockDepth > 0) {
        // Start from the beginning of the first block
        deleteFrom = $from.before(blockDepth);

        // Find the end position by looking for the last block in selection
        let endDepth = blockDepth;
        for (let d = $to.depth; d > 0; d--) {
          const node = $to.node(d);
          if (
            node.type.name === "bulletList" ||
            node.type.name === "orderedList" ||
            node.type.name === "heading"
          ) {
            endDepth = d;
            break;
          }
        }
        deleteTo = $to.after(Math.min(endDepth, $to.depth));
      }

      // Replace with flattened list
      contentEditor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: deleteTo })
        .insertContentAt(deleteFrom, content)
        .run();
    } catch (error) {
      console.error("Error flattening list:", error);
      alert("Failed to flatten list. Please try again.");
    }
  };

  // Update document metadata when content changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!titleEditor || !contentEditor) return;

    const updateMetadata = async () => {
      const title = titleEditor.getText() || "Untitled";
      const content = contentEditor.getText();

      try {
        // Call Remix API route
        // Normalize 0.0.0.0 to localhost for client connections
        let host = window.location.origin;
        if (host.includes("0.0.0.0")) {
          host = host.replace("0.0.0.0", "localhost");
        }
        await fetch(`${host}/api/documents/${encodeURIComponent(slug)}`, {
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
        /* Set a CSS variable for visual viewport height on mobile */
        @supports (height: 100dvh) {
          :root {
            --viewport-height: 100dvh;
          }
        }

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
          flex-wrap: wrap;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
          }
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
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .presence-indicator {
            padding: 0.5rem 0.75rem;
            gap: 0.5rem;
            font-size: 0.75rem;
          }
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
          flex-shrink: 0;
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

        /* Bubble menu styles */
        .bubble-menu {
          display: flex;
          background-color: #0D0D0D;
          padding: 0.25rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          gap: 0.5rem;
        }

        @media (max-width: 768px) {
          .bubble-menu {
            display: flex !important;
            position: fixed !important;
            /* Position near top of visual viewport to avoid keyboard */
            inset: 1rem 1.5rem auto 1.5rem !important;
            transform: none !important;
            width: calc(100vw - 3rem) !important;
            max-width: calc(100vw - 3rem) !important;
            margin: 0 auto !important;
            background-color: #0D0D0D !important;
            padding: 0.75rem;
            gap: 0.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
            z-index: 10000;
          }
        }

        .bubble-menu-button {
          border: none;
          background: none;
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .bubble-menu-button {
            flex: 1;
            padding: 0.875rem 1rem;
            font-size: 1rem;
            min-height: 48px;
          }
        }

        .bubble-menu-button:hover:not(:disabled) {
          background-color: #2a2a2a;
        }

        .bubble-menu-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
            <WhosHere room={documentId} />
            <div className="presence-divider"></div>
            <Form method="post" action="/logout" style={{ display: "inline" }}>
              <button type="submit" className="logout-button">
                Logout
              </button>
            </Form>
          </div>
        </div>

        {!isClient || !ydoc || !isSynced ? (
          <div style={{ padding: "2rem", color: "#666", textAlign: "center" }}>
            Loading editor...
          </div>
        ) : (
          <>
            <div className="title-editor">
              {titleEditor && <EditorContent editor={titleEditor} />}
            </div>

            <div className="content-editor">
              {contentEditor && (
                <>
                  <BubbleMenu
                    editor={contentEditor}
                    tippyOptions={{ duration: 100 }}
                    // @ts-expect-error - immediatelyRender is needed for SSR compatibility
                    immediatelyRender={false}
                    shouldShow={({ editor, state }) => {
                      // Only show when selection includes list items
                      const { from, to } = state.selection;
                      let hasListItem = false;

                      state.doc.nodesBetween(from, to, (node) => {
                        if (node.type.name === "listItem") {
                          hasListItem = true;
                        }
                      });

                      // Show if we have list items and a selection
                      return hasListItem && from !== to;
                    }}
                  >
                    <div className="bubble-menu">
                      <button
                        onClick={handleOrganizeList}
                        className="bubble-menu-button"
                        disabled={isOrganizing}
                      >
                        {isOrganizing
                          ? "⏳ Grouping..."
                          : `${foodEmoji} Group Items`}
                      </button>
                      <button
                        onClick={handleFlattenList}
                        className="bubble-menu-button"
                        disabled={isOrganizing}
                      >
                        📋 Flatten
                      </button>
                    </div>
                  </BubbleMenu>
                  <EditorContent editor={contentEditor} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
