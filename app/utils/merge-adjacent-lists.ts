import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment } from "@tiptap/pm/model";

/**
 * Extension that automatically merges adjacent lists of the same type.
 * When two bullet lists or ordered lists are next to each other with no content between them,
 * they will be merged into a single list.
 */
export const MergeAdjacentLists = Extension.create({
  name: "mergeAdjacentLists",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("mergeAdjacentLists"),
        appendTransaction: (transactions, oldState, newState) => {
          // Only run if document changed
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) {
            return null;
          }

          const { doc, schema } = newState;
          const tr = newState.tr;
          let modified = false;

          // Traverse the document to find adjacent lists
          // We need to work backwards to avoid position shifts
          const mergePositions: Array<{ from: number; to: number; node: any }> =
            [];

          doc.descendants((node, pos, parent, index) => {
            // Check if this node is a list type
            if (
              node.type.name === "bulletList" ||
              node.type.name === "orderedList"
            ) {
              // Check if parent exists and if there's a next sibling
              if (parent && index < parent.childCount - 1) {
                const nextSibling = parent.child(index + 1);

                // If next sibling is the same list type, mark for merging
                if (nextSibling.type.name === node.type.name) {
                  const nextSiblingPos = pos + node.nodeSize;

                  // Create merged content by combining list items
                  const mergedContent = Fragment.from([
                    ...node.content.content,
                    ...nextSibling.content.content,
                  ]);

                  // Create new merged list node
                  const mergedList = node.type.create(
                    node.attrs,
                    mergedContent
                  );

                  mergePositions.push({
                    from: pos,
                    to: nextSiblingPos + nextSibling.nodeSize,
                    node: mergedList,
                  });
                }
              }
            }
          });

          // Apply merges in reverse order to maintain correct positions
          if (mergePositions.length > 0) {
            // Sort by position descending to work backwards
            mergePositions.sort((a, b) => b.from - a.from);

            mergePositions.forEach(({ from, to, node }) => {
              tr.replaceWith(from, to, node);
              modified = true;
            });
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
