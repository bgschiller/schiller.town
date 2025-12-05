import Collaboration from "@tiptap/extension-collaboration";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";

let ydoc: Y.Doc | null = null;
let provider: YPartyKitProvider | null = null;
let awareness: awarenessProtocol.Awareness | null = null;
let currentRoom: string | null = null;

// Initialize only when running in the browser
function getYDoc() {
  if (typeof window === "undefined") return null;

  if (!ydoc) {
    ydoc = new Y.Doc();
    awareness = new awarenessProtocol.Awareness(ydoc);
  }
  return ydoc;
}

function getProvider(room: string) {
  if (typeof window === "undefined") return null;

  // If room changed, cleanup old provider
  if (provider && currentRoom !== room) {
    provider.destroy();
    provider = null;
    // Reset the doc and awareness for a new room
    if (ydoc) {
      ydoc.destroy();
      ydoc = null;
      awareness = null;
    }
  }

  if (!provider) {
    const doc = getYDoc();
    if (!doc || !awareness) return null;

    // Use current origin for PartyKit connection
    // This works both locally and through Cloudflare tunnel
    // Normalize 0.0.0.0 to localhost for client connections
    let host = window.location.origin;
    if (host.includes("0.0.0.0")) {
      host = host.replace("0.0.0.0", "localhost");
    }

    provider = new YPartyKitProvider(host, room, doc, {
      awareness,
      party: "yjs",
    });
    currentRoom = room;
  }
  return provider;
}

export { Collaboration, getProvider, getYDoc };
export { ydoc, provider };
