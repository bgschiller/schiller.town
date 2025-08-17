import Collaboration from "@tiptap/extension-collaboration";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";

const ydoc = new Y.Doc();
const provider = new YPartyKitProvider(
  "http://localhost:1999",
  "note-1",
  ydoc,
  {
    awareness: new awarenessProtocol.Awareness(ydoc),
    party: "yjs",
  }
);

export { Collaboration, provider, ydoc };
