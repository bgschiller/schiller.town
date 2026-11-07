import type { LoaderFunction, MetaFunction, LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Form } from "@remix-run/react";
import { requireAuth, ensureCsrfToken } from "~/utils/session.server";
import { getBlockingStatus } from "~/utils/pihole.server";
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

type BlockingStatus = { blocking: boolean; timerSeconds: number | null };

export const loader: LoaderFunction = async ({ request }) => {
  const userName = await requireAuth(request);
  const csrf = await ensureCsrfToken(request);

  let piholeStatus: BlockingStatus | null = null;
  let piholeError: string | null = null;
  try {
    piholeStatus = await getBlockingStatus();
  } catch (e) {
    piholeError = e instanceof Error ? e.message : "pi-hole unavailable";
  }

  return json(
    {
      userName,
      csrf: csrf.token,
      pihole: { status: piholeStatus, error: piholeError },
    },
    csrf.headers ? { headers: csrf.headers } : undefined
  );
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
    desc: "Bedtime Songs",
    url: "https://songs.schiller.town",
    icon: "🎵",
    requiresNetwork: false,
  },
  {
    name: "Files",
    desc: "Shared file downloads",
    url: "https://files.schiller.town",
    icon: "📁",
    requiresNetwork: false,
  },
];

const ADMIN_SERVICES = [
  { name: "Radarr", desc: "Movie downloads", port: 7878 },
  { name: "Sonarr", desc: "TV show downloads", port: 8989 },
  { name: "Lidarr", desc: "Music downloads", port: 8686 },
  { name: "Prowlarr", desc: "Indexer management", port: 9696 },
  { name: "rdt-client", desc: "Real-Debrid downloads", port: 6500 },
  { name: "Audiobookshelf", desc: "Audiobooks & podcasts", port: 13378 },
  { name: "Bookshelf", desc: "Audiobook automation", port: 8787 },
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
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
  services: {
    name: string;
    desc: string;
    url: string;
    icon: string;
    requiresNetwork?: boolean;
  }[];
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

function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function PiHoleCard({
  status,
  error,
  csrf,
}: {
  status: BlockingStatus | null;
  error: string | null;
  csrf: string;
}) {
  const fetcher = useFetcher();
  const current =
    (fetcher.data as { status?: BlockingStatus } | undefined)?.status ?? status;

  // Countdown: once we know the pi-hole pause timer, derive an absolute
  // "resume at" time and tick a local clock down to it — no polling, just
  // trusting the clocks to be close enough.
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (current && !current.blocking && current.timerSeconds != null) {
      setResumeAt(Date.now() + current.timerSeconds * 1000);
    } else {
      setResumeAt(null);
    }
  }, [current]);

  useEffect(() => {
    if (resumeAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resumeAt]);

  const remaining =
    resumeAt != null ? Math.max(0, (resumeAt - now) / 1000) : null;
  const expired = remaining === 0;
  const showBlocking = current?.blocking === true || expired;

  let label: string;
  let tone: "on" | "off" | "paused" | "unknown";
  if (!current) {
    label = error ? "Unreachable" : "Checking…";
    tone = "unknown";
  } else if (showBlocking) {
    label = "Blocking enabled";
    tone = "on";
  } else if (current.blocking === false && current.timerSeconds != null) {
    label = `Paused — resumes in ${formatRemaining(
      remaining ?? current.timerSeconds
    )}`;
    tone = "paused";
  } else {
    label = "Blocking disabled";
    tone = "off";
  }

  const fetcherData = fetcher.data as
    | { ok?: boolean; error?: string }
    | undefined;

  return (
    <div className={`pihole-card pihole-card--${tone}`}>
      <div className="pihole-heading">
        <span className="service-icon">🛡️</span>
        <span className="pihole-name">Pi-hole</span>
      </div>
      <div className="pihole-status">{label}</div>
      <fetcher.Form
        method="post"
        action="/api/pi-hole"
        className="pihole-actions"
      >
        <input type="hidden" name="csrf" value={csrf} />
        {showBlocking ? (
          <>
            <span className="pihole-pause-label">Pause for</span>
            <button type="submit" name="duration" value="30s">
              30s
            </button>
            <button type="submit" name="duration" value="5m">
              5m
            </button>
            <button type="submit" name="duration" value="15m">
              15m
            </button>
            <button type="submit" name="duration" value="30m">
              30m
            </button>
            <button type="submit" name="duration" value="1h">
              1h
            </button>
          </>
        ) : (
          <button type="submit" name="intent" value="enable">
            Resume blocking
          </button>
        )}
      </fetcher.Form>
      {fetcherData && fetcherData.ok === false && (
        <div className="pihole-error">{fetcherData.error}</div>
      )}
    </div>
  );
}

export default function Home() {
  const data = useLoaderData<typeof loader>() as unknown as {
    userName: string;
    csrf: string;
    pihole: { status: BlockingStatus | null; error: string | null };
  };
  const { userName, csrf, pihole } = data;
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

      <ServiceSection
        title="Media"
        services={MEDIA_SERVICES}
        network={network}
      />

      <div className="service-group">
        <div className="group-heading">Network</div>
        <PiHoleCard status={pihole.status} error={pihole.error} csrf={csrf} />
      </div>

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
