/// <reference types="@remix-run/dev" />
/// <reference types="@cloudflare/workers-types" />

import type { Env } from "./party/main";

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    getServer: (namespace: DurableObjectNamespace, name: string) => DurableObjectStub;
    env: Env;
  }
}
