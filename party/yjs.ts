import { Server } from "partyserver";
import { onConnect } from "y-partykit";
import type { Connection, ConnectionContext } from "partyserver";

// Define a compatibility type for y-partykit
type YPartykitRoom = {
  id: string;
  storage: DurableObjectStorage;
};

export class YjsServer extends Server {
  async onConnect(connection: Connection, context: ConnectionContext): Promise<void> {
    // Create a compatibility object for y-partykit
    const room: YPartykitRoom = {
      id: this.name,
      storage: this.ctx.storage,
    };

    // Use y-partykit's onConnect with our compatibility layer
    return onConnect(connection as any, room as any, {
      persist: {
        mode: "snapshot",
      },
    });
  }
}
