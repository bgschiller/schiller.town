import type { LoaderFunctionArgs, ActionFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import type { StarChart, StarChartExchange } from "~/../../party/star-chart";

// Hardcoded chart ID for now - can support multiple charts in the future
const CHART_ID = "everett-potty";

function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  // In development (wrangler dev), use localhost
  // In production, use the actual host
  const isDev = url.hostname === "schiller.town" && url.port === "";
  const host = isDev ? "http://127.0.0.1:8787" : `${url.protocol}//${url.host}`;
  return `${host}/parties/star-chart-server/default${path}`;
}

// GET /api/star-chart - fetch the chart state
export async function loader({ request }: LoaderFunctionArgs) {
  const storageUrl = getStorageUrl(request, `/storage-get/${CHART_ID}`);
  const response = await fetch(storageUrl);

  if (response.status === 404) {
    // Chart doesn't exist, create it
    const newChart: StarChart = {
      id: CHART_ID,
      type: "potty-training",
      title: "Everett's Potty Chart",
      totalSquares: 0,
      exchanges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const putUrl = getStorageUrl(request, "/storage-put");
    await fetch(putUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newChart }),
    });

    return json(newChart);
  }

  if (!response.ok) {
    throw new Response("Failed to fetch star chart", { status: 500 });
  }

  const chart = await response.json();
  return json(chart);
}

// POST /api/star-chart - handle actions (add, subtract, exchange)
export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as { action: string; amount?: number };
  const { action, amount } = body;

  // Fetch current chart state
  const storageUrl = getStorageUrl(request, `/storage-get/${CHART_ID}`);
  const response = await fetch(storageUrl);

  if (!response.ok) {
    return json({ error: "Chart not found" }, { status: 404 });
  }

  const chart: StarChart = await response.json();

  // Calculate current active squares (total - exchanged)
  const totalExchanged = chart.exchanges.reduce(
    (sum, ex) => sum + ex.squaresExchanged,
    0
  );

  const activeSquares = chart.totalSquares - totalExchanged;

  // Handle different actions
  if (action === "add") {
    if (typeof amount !== "number" || amount <= 0) {
      return json({ error: "Invalid amount" }, { status: 400 });
    }

    chart.totalSquares += amount;
    chart.updatedAt = Date.now();
  } else if (action === "subtract") {
    // Only subtract from active squares
    if (activeSquares <= 0) {
      return json({ error: "No active squares to subtract" }, { status: 400 });
    }

    chart.totalSquares = Math.max(totalExchanged, chart.totalSquares - 1);
    chart.updatedAt = Date.now();
  } else if (action === "exchange") {
    // Validate we have at least 20 active squares
    if (activeSquares < 20) {
      return json(
        { error: "Need at least 20 active squares to exchange" },
        { status: 400 }
      );
    }

    // Calculate the square range for this exchange
    const startSquare = totalExchanged + 1;
    const endSquare = totalExchanged + 20;

    // Get current date in ISO format (YYYY-MM-DD)
    const now = new Date();
    const usedDate = now.toISOString().split("T")[0];

    const newExchange: StarChartExchange = {
      timestamp: Date.now(),
      squaresExchanged: 20,
      squareRange: [startSquare, endSquare],
      usedDate,
    };

    chart.exchanges.push(newExchange);
    chart.updatedAt = Date.now();
  } else {
    return json({ error: "Invalid action" }, { status: 400 });
  }

  // Save updated chart
  const putUrl = getStorageUrl(request, "/storage-put");
  const saveResponse = await fetch(putUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: chart }),
  });

  if (!saveResponse.ok) {
    return json({ error: "Failed to save chart" }, { status: 500 });
  }

  return json(chart);
}
