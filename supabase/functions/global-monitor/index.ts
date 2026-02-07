import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchSports() {
  const leagues = [
    { key: "basketball/nba", tag: "NBA" },
    { key: "football/nfl", tag: "NFL" },
    { key: "hockey/nhl", tag: "NHL" },
  ];
  const results = [];
  for (const l of leagues) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${l.key}/scoreboard`
      );
      const json = await res.json();
      const events = json.events?.slice(0, 2) || [];
      for (const e of events) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        const away = comp.competitors?.find(
          (c: { homeAway: string }) => c.homeAway === "away"
        );
        const home = comp.competitors?.find(
          (c: { homeAway: string }) => c.homeAway === "home"
        );
        results.push({
          league: l.tag,
          matchup: `${away?.team?.abbreviation || "?"} vs ${home?.team?.abbreviation || "?"}`,
          status: e.status?.type?.shortDetail || "Scheduled",
          score: `${away?.score || 0}-${home?.score || 0}`,
        });
      }
    } catch {
      // skip league on error
    }
  }
  return results;
}

async function fetchMarkets() {
  const markets = [];

  try {
    const fxRes = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD"
    );
    const fxJson = await fxRes.json();
    const rate = fxJson?.rates?.USD;
    if (rate) {
      markets.push({
        symbol: "EUR/USD",
        price: rate,
        change: 0.12,
        isCrypto: false,
      });
    }
  } catch {
    markets.push({
      symbol: "EUR/USD",
      price: 1.0842,
      change: 0.12,
      isCrypto: false,
    });
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true"
    );
    const json = await res.json();
    const map: Record<string, { symbol: string; isCrypto: boolean }> = {
      bitcoin: { symbol: "BTC", isCrypto: true },
      ethereum: { symbol: "ETH", isCrypto: true },
      solana: { symbol: "SOL", isCrypto: true },
    };
    for (const [id, meta] of Object.entries(map)) {
      markets.push({
        symbol: meta.symbol,
        price: json[id]?.usd || 0,
        change: json[id]?.usd_24h_change || 0,
        isCrypto: meta.isCrypto,
      });
    }
  } catch {
    // crypto unavailable
  }

  return markets;
}

async function fetchNews() {
  try {
    const res = await fetch(
      "https://api.gdeltproject.org/api/v2/doc/doc?query=geopolitics%20OR%20military%20OR%20intelligence&mode=ArtList&maxrecords=5&format=json&sort=DateDesc"
    );
    const json = await res.json();
    const articles = json.articles?.slice(0, 5) || [];
    return articles.map(
      (a: { domain: string; title: string; seendate: string }) => ({
        source: a.domain || "unknown",
        headline:
          a.title?.length > 80 ? a.title.slice(0, 77) + "..." : a.title || "",
      })
    );
  } catch {
    return [];
  }
}

async function fetchFlights() {
  try {
    const res = await fetch(
      "https://opensky-network.org/api/states/all?lamin=25&lomin=-130&lamax=55&lomax=50"
    );
    const json = await res.json();
    const states = json.states?.slice(0, 8) || [];
    const notable = [
      "AF1",
      "AF2",
      "SAM",
      "EXEC",
      "RCH",
      "NAVY",
      "EVAC",
      "SAMU",
    ];
    const filtered = states.filter((s: string[]) => {
      const cs = (s[1] || "").trim();
      return cs && notable.some((n) => cs.startsWith(n));
    });
    const picks = filtered.length > 0 ? filtered : states.slice(0, 5);
    return picks.map((s: (string | number | null)[]) => ({
      callsign: ((s[1] as string) || "UNKN").trim(),
      origin: (s[2] as string) || "Unknown",
      altitude:
        s[7] && Number(s[7]) > 0
          ? `FL${Math.round(Number(s[7]) / 30.48)}`
          : "On Ground",
      lat: s[6] || 0,
      lon: s[5] || 0,
    }));
  } catch {
    return [];
  }
}

async function fetchPizza() {
  try {
    const res = await fetch("https://pizzint.watch/api/data");
    const json = await res.json();
    return {
      index: json.index ?? 50,
      doughcon: json.doughcon ?? 3,
      statusText: json.statusText ?? "NORMAL",
      hourlyData: json.hourlyData ?? [40, 50, 60, 45, 35],
    };
  } catch {
    return {
      index: 50,
      doughcon: 3,
      statusText: "NORMAL",
      hourlyData: [40, 50, 60, 45, 35],
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const feed = url.searchParams.get("feed");

    switch (feed) {
      case "sports": {
        const sports = await fetchSports();
        return jsonResponse({ sports });
      }
      case "markets": {
        const markets = await fetchMarkets();
        return jsonResponse({ markets });
      }
      case "news": {
        const news = await fetchNews();
        return jsonResponse({ news });
      }
      case "flights": {
        const flights = await fetchFlights();
        return jsonResponse({ flights });
      }
      case "pizza": {
        const pizza = await fetchPizza();
        return jsonResponse({ pizza });
      }
      default:
        return jsonResponse({ error: "Unknown feed" }, 400);
    }
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
