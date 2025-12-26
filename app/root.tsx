import type { LinksFunction } from "partymix";
import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import ViewportSizeLayout from "./components/ViewportSizeLayout";
import TouchScrollControl from "./components/TouchScrollControl";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,height=device-height"
        />
        <Meta />
        <Links />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1a1a1a;
            background: #ffffff;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          :root {
            --max-width: 800px;
            --safe-padding-bottom: max(calc(env(safe-area-inset-bottom) - 8px), 16px);
          }

          html, body {
            width: 100%;
            overscroll-behavior: none;
          }

          #root-viewport {
            height: 100%;
          }
        `,
          }}
        />
      </head>
      <body>
        <TouchScrollControl />
        <ViewportSizeLayout>
          <Outlet />
        </ViewportSizeLayout>
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}
