import usePartySocket from "partysocket/react";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import type { State } from "../../messages.d";

// This is a component that will connect to the partykit backend
// and display the number of connected users, and where they're from.
export default function WhosHere({ room = "index" }: { room?: string }) {
  const loaderData = useLoaderData<{
    userName?: string;
    partykitHost?: string;
  }>();
  const userName = loaderData?.userName;
  const [users, setUsers] = useState<State | undefined>();

  // Use localhost in development, otherwise use the current origin
  // Handle special cases like 0.0.0.0 which won't work for client connections
  const host =
    typeof window !== "undefined"
      ? window.location.hostname === "localhost" ||
        window.location.hostname === "0.0.0.0" ||
        window.location.hostname === "127.0.0.1"
        ? "localhost:1999"
        : window.location.origin
      : loaderData?.partykitHost;

  usePartySocket({
    host,
    // connect to the party defined by 'geo.ts'
    party: "geo",
    // use the provided room or default to 'index'
    room,
    // Pass the user name in the query string
    query: userName ? { name: userName } : {},
    onMessage(evt) {
      const data = JSON.parse(evt.data) as State;
      setUsers(data);
    },
  });

  const getUsersTooltip = () => {
    if (!users?.users || users.users.length === 0) return "";
    return users.users.map((u) => u.name).join(", ");
  };

  return !users ? (
    <>
      <span className="online-dot" style={{ opacity: 0.5, flexShrink: 0 }}></span>
      <span style={{ whiteSpace: "nowrap" }}>Connecting...</span>
    </>
  ) : (
    <span
      title={getUsersTooltip()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span className="online-dot" style={{ flexShrink: 0 }}></span>
      <span style={{ whiteSpace: "nowrap" }}>{users.total} online</span>
    </span>
  );
}
