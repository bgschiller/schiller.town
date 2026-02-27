import type { LoaderFunction, MetaFunction, LinksFunction } from "partymix";
import { useLoaderData, Form } from "@remix-run/react";
import { authenticateLoader } from "~/utils/session.server";
import { useEffect, useState } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/styles/home.css" },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Schiller Household" },
    { name: "description", content: "Schiller household services" },
  ];
};

export const loader: LoaderFunction = async (args) => {
  const userName = await authenticateLoader(args);
  return Response.json({ userName });
};

type NetworkStatus = "detecting" | "lan" | "tailscale" | "external";

const MEDIA_SERVICES = [
  {
    name: "Jellyfin",
    desc: "Watch movies and TV",
    url: "https://stream.schiller.town",
    icon: "📺",
    requiresNetwork: true,
  },
  {
    name: "Jellyseerr",
    desc: "Request new content",
    url: "https://request.schiller.town",
    icon: "🎬",
    requiresNetwork: true,
  },
  {
    name: "Photos",
    desc: "Photo library",
    url: "https://photos.schiller.town",
    icon: "📷",
    requiresNetwork: false,
  },
  {
    name: "Songs",
    desc: "Music streaming",
    url: "https://songs.schiller.town",
    icon: "🎵",
    requiresNetwork: false,
  },
];

const FAMILY_SERVICES = [
  { name: "Docs", desc: "Shared documents", url: "/docs", icon: "📄" },
  {
    name: "Potty Chart",
    desc: "Everett's potty progress",
    url: "/star-chart",
    icon: "⭐",
  },
];

const ADMIN_SERVICES = [
  { name: "Radarr", desc: "Movie downloads", port: 7878 },
  { name: "Sonarr", desc: "TV show downloads", port: 8989 },
  { name: "Lidarr", desc: "Music downloads", port: 8686 },
  { name: "Prowlarr", desc: "Indexer management", port: 9696 },
  { name: "rdt-client", desc: "Real-Debrid downloads", port: 6500 },
  { name: "Audiobookshelf", desc: "Audiobooks & podcasts", port: 13378 },
];

function adminUrl(port: number, network: NetworkStatus): string | null {
  if (network === "lan") return `http://192.168.0.44:${port}`;
  if (network === "tailscale") return `http://raichu:${port}`;
  return null;
}

function ServiceCard({
  name,
  desc,
  url,
  icon,
  unavailable,
}: {
  name: string;
  desc: string;
  url: string;
  icon: string;
  unavailable?: boolean;
}) {
  const isExternal = url.startsWith("http");
  const displayUrl = isExternal ? url.replace("https://", "") : url;
  if (unavailable) {
    return (
      <div className="service-card service-card--unavailable">
        <span className="service-icon">{icon}</span>
        <span className="service-name">{name}</span>
        <span className="service-desc">{desc}</span>
        <span className="service-url">{displayUrl}</span>
      </div>
    );
  }
  return (
    <a
      href={url}
      className="service-card"
      {...(isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      <span className="service-icon">{icon}</span>
      <span className="service-name">{name}</span>
      <span className="service-desc">{desc}</span>
      <span className="service-url">{displayUrl}</span>
    </a>
  );
}

function ServiceSection({
  title,
  services,
  network,
}: {
  title: string;
  services: { name: string; desc: string; url: string; icon: string; requiresNetwork?: boolean }[];
  network: NetworkStatus;
}) {
  const someUnavailable =
    network === "external" && services.some((s) => s.requiresNetwork);
  return (
    <div className="service-group">
      <div className="group-heading">{title}</div>
      {someUnavailable && (
        <div className="network-warning">
          Some services require Tailscale or home Wi-Fi
        </div>
      )}
      <div className="service-list">
        {services.map((s) => (
          <ServiceCard
            key={s.name}
            {...s}
            unavailable={s.requiresNetwork && network === "external"}
          />
        ))}
      </div>
    </div>
  );
}

function AdminCard({
  name,
  desc,
  url,
  network,
}: {
  name: string;
  desc: string;
  url: string | null;
  network: NetworkStatus;
}) {
  if (url) {
    return (
      <a
        href={url}
        className="service-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="service-icon">🔧</span>
        <span className="service-name">{name}</span>
        <span className="service-desc">{desc}</span>
        <span className="service-url">{url.replace("http://", "")}</span>
      </a>
    );
  }
  return (
    <div className="service-card service-card--unavailable">
      <span className="service-icon">🔧</span>
      <span className="service-name">{name}</span>
      <span className="service-desc">{desc}</span>
      <span className="service-url">
        {network === "detecting" ? "…" : "unavailable"}
      </span>
    </div>
  );
}

function NetworkBanner({ network }: { network: NetworkStatus }) {
  if (network === "lan" || network === "tailscale") return null;
  if (network === "detecting") {
    return <div className="network-warning">Detecting network…</div>;
  }
  return (
    <div className="network-warning">
      Admin tools require LAN or Tailscale access
    </div>
  );
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const { userName } = data as unknown as { userName: string };
  const [network, setNetwork] = useState<NetworkStatus>("detecting");

  useEffect(() => {
    const detect = async () => {
      try {
        await fetch("https://ping-lan.schiller.town:4443", {
          signal: AbortSignal.timeout(1500),
          mode: "no-cors",
        });
        setNetwork("lan");
        return;
      } catch {}
      try {
        await fetch("https://stream.schiller.town", {
          signal: AbortSignal.timeout(2000),
          mode: "no-cors",
        });
        setNetwork("tailscale");
        return;
      } catch {}
      setNetwork("external");
    };
    detect();
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-title">Household</h1>
        <div className="user-info">
          <span>👋 {userName}</span>
          <Form method="post" action="/logout">
            <button type="submit" className="logout-button">
              Logout
            </button>
          </Form>
        </div>
      </header>

      <ServiceSection title="Media" services={MEDIA_SERVICES} network={network} />
      <ServiceSection title="Family" services={FAMILY_SERVICES} network={network} />

      <details className="service-group admin-group">
        <summary className="group-heading">Admin Tools</summary>
        <NetworkBanner network={network} />
        <div className="service-list">
          {ADMIN_SERVICES.map((s) => (
            <AdminCard
              key={s.name}
              name={s.name}
              desc={s.desc}
              url={adminUrl(s.port, network)}
              network={network}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
