// We use this 'party' to get and broadcast presence information
// from all connected users. We'll use this to show how many people
// are connected to the room, and where they're from.

import type { State } from "../messages";

import type * as Party from "partykit/server";

export default class MyRemix implements Party.Server {
  // eslint-disable-next-line no-useless-constructor
  constructor(public room: Party.Room) {}

  // we'll store the state in memory
  state: State = {
    total: 0,
    from: {},
    users: [],
  };
  // let's opt in to hibernation mode, for much higher concurrency
  // like, 1000s of people in a room 🤯
  // This has tradeoffs for the developer, like needing to hydrate/rehydrate
  // state on start, so be careful!
  static options = {
    hibernate: true,
  };

  // This is called every time a new room is made
  // since we're using hibernation mode, we should
  // "rehydrate" this.state here from all connections
  onStart(): void | Promise<void> {
    const users: Array<{ name: string; country: string }> = [];
    for (const connection of this.room.getConnections<{ from: string; name: string }>()) {
      const from = connection.state!.from;
      const name = connection.state!.name || "Unknown";
      users.push({ name, country: from });
      this.state = {
        total: this.state.total + 1,
        from: {
          ...this.state.from,
          [from]: (this.state.from[from] ?? 0) + 1,
        },
        users,
      };
    }
  }

  // This is called every time a new connection is made
  async onConnect(
    connection: Party.Connection<{ from: string; name: string }>,
    ctx: Party.ConnectionContext
  ): Promise<void> {
    // Let's read the country from the request context
    const from = (ctx.request.cf?.country ?? "unknown") as string;
    // Read the user name from the URL query params
    const url = new URL(ctx.request.url);
    const name = url.searchParams.get("name") || "Unknown";
    // and update our state
    this.state = {
      total: this.state.total + 1,
      from: {
        ...this.state.from,
        [from]: (this.state.from[from] ?? 0) + 1,
      },
      users: [...this.state.users, { name, country: from }],
    };
    // let's also store where we're from on the connection
    // so we can hydrate state on start, as well as reference it on close
    connection.setState({ from, name });
    // finally, let's broadcast the new state to all connections
    this.room.broadcast(JSON.stringify(this.state));
  }

  // This is called every time a connection is closed
  async onClose(connection: Party.Connection<{ from: string; name: string }>): Promise<void> {
    // let's update our state
    // first let's read the country from the connection state
    const from = connection.state!.from;
    const name = connection.state!.name || "Unknown";
    // Remove the user from the users list
    const users = this.state.users.filter(
      (u) => !(u.name === name && u.country === from)
    );
    // and update our state
    this.state = {
      total: this.state.total - 1,
      from: {
        ...this.state.from,
        [from]: (this.state.from[from] ?? 0) - 1,
      },
      users,
    };
    // finally, let's broadcast the new state to all connections
    this.room.broadcast(JSON.stringify(this.state));
  }

  // This is called when a connection has an error
  async onError(
    connection: Party.Connection<{ from: string; name: string }>,
    err: Error
  ): Promise<void> {
    // let's log the error
    console.error(err);
    // and close the connection
    await this.onClose(connection);
  }
}

MyRemix satisfies Party.Worker;
