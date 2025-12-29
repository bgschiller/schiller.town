import { Server } from "partyserver";

export type StarChartExchange = {
  timestamp: number;
  squaresExchanged: number; // Always 20
  squareRange: [number, number]; // e.g., [1, 20] for first exchange
  usedDate: string; // ISO date string (YYYY-MM-DD) when TV time was used
};

export type StarChart = {
  id: string; // e.g., "everett-potty" (allows future charts)
  type: string; // e.g., "potty-training" (allows different chart types)
  title: string; // e.g., "Everett's Potty Chart"
  totalSquares: number; // Total accumulated (never decreases)
  exchanges: StarChartExchange[]; // History of TV time exchanges
  createdAt: number;
  updatedAt: number;
};

/**
 * StarChartServer provides low-level storage operations for star charts.
 * Similar to DocumentsServer but for star chart data.
 * Storage keys use chart `id` for future multiple chart support.
 */
export class StarChartServer extends Server {
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // The pathname will be like /parties/star-chart-server/{room}/storage-*
    // We need to extract the path after the room name
    const pathMatch = url.pathname.match(
      /^\/parties\/star-chart-server\/[^/]+(.*)$/
    );
    const path = pathMatch ? pathMatch[1] : url.pathname;

    // Storage operation: List all star charts
    if (request.method === "GET" && path === "/storage-list") {
      const charts = await this.getAllCharts();
      return Response.json(charts);
    }

    // Storage operation: Get a specific chart by id
    if (request.method === "GET" && path.startsWith("/storage-get/")) {
      const idEncoded = path.split("/").pop();
      if (!idEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const id = decodeURIComponent(idEncoded);
      const chart = await this.ctx.storage.get<StarChart>(id);
      if (!chart) {
        return new Response("Not found", { status: 404 });
      }

      // Age out old exchanges and save if any were removed
      const wasModified = this.ageOutOldExchanges(chart);
      if (wasModified) {
        chart.updatedAt = Date.now();
        await this.ctx.storage.put(id, chart);
      }

      return Response.json(chart);
    }

    // Storage operation: Put (create or update) a chart
    // Key should be the chart id
    if (request.method === "POST" && path === "/storage-put") {
      const body = (await request.json()) as { value: StarChart };
      await this.ctx.storage.put(body.value.id, body.value);
      return Response.json({ success: true });
    }

    // Storage operation: Delete a chart by id
    if (request.method === "POST" && path.startsWith("/storage-delete/")) {
      const idEncoded = path.split("/").pop();
      if (!idEncoded) {
        return new Response("Not found", { status: 404 });
      }

      const id = decodeURIComponent(idEncoded);
      await this.ctx.storage.delete(id);
      return Response.json({ success: true });
    }

    return new Response("Not found", { status: 404 });
  }

  private async getAllCharts(): Promise<StarChart[]> {
    const charts: StarChart[] = [];

    await this.ctx.storage.list<StarChart>().then((entries) => {
      for (const [, chart] of entries) {
        charts.push(chart);
      }
    });

    // Sort by updatedAt descending
    return charts.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Age out completed exchanges that are past end of day (in Pacific time).
   * Returns true if any exchanges were removed.
   */
  private ageOutOldExchanges(chart: StarChart): boolean {
    // Get today's date in Pacific time
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date()); // Returns YYYY-MM-DD

    const initialLength = chart.exchanges.length;

    // Calculate total squares in exchanges that will be removed
    const squaresToRemove = chart.exchanges
      .filter((exchange) => exchange.usedDate < todayStr)
      .reduce((sum, exchange) => sum + exchange.squaresExchanged, 0);

    // Remove exchanges where usedDate is before today
    chart.exchanges = chart.exchanges.filter((exchange) => {
      return exchange.usedDate >= todayStr;
    });

    // Reduce totalSquares by the number of exchanged squares that were aged out
    if (squaresToRemove > 0) {
      chart.totalSquares = Math.max(0, chart.totalSquares - squaresToRemove);
    }

    return chart.exchanges.length < initialLength;
  }
}
