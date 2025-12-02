import usePartySocket from "partysocket/react";
import { useState } from "react";
import { useLoaderData } from "@remix-run/react";
import type { State } from "../../messages.d";
import countryCodeEmoji from "./country-code-emoji";

// This is a component that will connect to the partykit backend
// and display the number of connected users, and where they're from.
export default function WhosHere() {
  const loaderData = useLoaderData<{
    userName?: string;
    partykitHost?: string;
  }>();
  const userName = loaderData?.userName;
  const [users, setUsers] = useState<State | undefined>();

  // Use localhost in development, otherwise use the provided host
  const host =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "localhost:1999"
      : loaderData?.partykitHost;

  usePartySocket({
    host,
    // connect to the party defined by 'geo.ts'
    party: "geo",
    // this can be any name, we just picked 'index'
    room: "index",
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
      <span className="online-dot" style={{ opacity: 0.5 }}></span>
      Connecting...
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
      <span className="online-dot"></span>
      {users.total} online
    </span>
  );
}
