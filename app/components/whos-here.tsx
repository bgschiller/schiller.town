import usePartySocket from "partysocket/react";
import { useState } from "react";
import type { State } from "../../messages.d";
import countryCodeEmoji from "./country-code-emoji";

// This is a component that will connect to the partykit backend
// and display the number of connected users, and where they're from.
export default function WhosHere() {
  const [users, setUsers] = useState<State | undefined>();

  usePartySocket({
    // connect to the party defined by 'geo.ts'
    party: "geo",
    // this can be any name, we just picked 'index'
    room: "index",
    onMessage(evt) {
      const data = JSON.parse(evt.data) as State;
      setUsers(data);
    },
  });

  return !users ? (
    <>
      <span className="online-dot" style={{ opacity: 0.5 }}></span>
      Connecting...
    </>
  ) : (
    <>
      <span className="online-dot"></span>
      {users?.total} online
    </>
  );
}
