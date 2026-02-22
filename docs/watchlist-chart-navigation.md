# Watchlist Add + Chart Navigation Feature

How the "add symbol to watchlist and auto-open its chart" flow works end-to-end.

---

## Overview

When a user asks the AI to add a symbol to their watchlist, three things happen:

1. The symbol is added to the active watchlist (persisted in Supabase).
2. The chart navigates to that symbol.
3. The chat panel collapses so the user can see the chart.

This requires coordination across the server-side prompt, the streaming parser, and the tool execution layer. Below is the full breakdown.

---

## Key Files

| File | Role |
|------|------|
| `src/lib/aiTools.ts` | Tool definitions, `CHART_NAV_TOOLS` set, `executeToolCall`, `isChartNavToolCall`, `extractSymbolFromToolCall` |
| `src/hooks/useAIChat.ts` | Streaming handler, early chart-nav detection, final `onDone` collapse logic |
| `supabase/functions/global-monitor/index.ts` | Server-side system prompt that instructs the AI to pair `add_to_watchlist` with `change_symbol` |

---

## Architecture: Three Layers of Defense

The feature uses three independent mechanisms to ensure the chart always navigates and the chat always collapses, even if one layer fails.

### Layer 1: `executeToolCall` in `aiTools.ts` (lines 95-104)

The `add_to_watchlist` case in `executeToolCall` performs all three actions directly:

```
case 'add_to_watchlist':
  actions.addToWatchlist(symbol, name)   // persist to watchlist
  actions.selectSymbol(symbol)           // navigate chart
  actions.collapseChat()                 // collapse chat panel
```

This means even if the AI only emits `add_to_watchlist` without a separate `change_symbol`, the chart still navigates and the chat still collapses.

### Layer 2: Early Streaming Detection in `useAIChat.ts` (lines 264-281)

While the AI response is still streaming in, the `onChunk` callback scans the accumulated text for `<tool_call>` XML tags. When it finds one that matches `CHART_NAV_TOOLS` (which includes `add_to_watchlist`):

1. Sets `chartNavDetectedRef.current = true` (a ref, not state, to avoid race conditions).
2. Extracts the symbol via `extractSymbolFromToolCall` and calls `selectSymbol` immediately.
3. Sets `isExpanded` to `false` to collapse the chat before the stream even finishes.

This gives instant feedback -- the chart switches as soon as the tool call XML appears in the stream, not when streaming completes.

### Layer 3: Final `onDone` Callback in `useAIChat.ts` (lines 295-340)

When streaming completes, the `onDone` callback:

1. Parses all tool calls from the final text via `parseAIResponse`.
2. Executes each client tool call via `executeToolCall` (Layer 1).
3. Computes `hasChartNavCall` using **both** the parsed tool calls AND the `chartNavDetectedRef` (combining streaming detection with final parsing).
4. As the very last state update, if `hasChartNavCall` is true, forces `setIsExpanded(false)`.

This ensures the chat is collapsed even if a React re-render temporarily expanded it between streaming and the final callback.

---

## Server-Side Prompt Reinforcement

In `supabase/functions/global-monitor/index.ts`, the system prompt includes these critical instructions (around lines 1716-1725):

- "If the user asks to add something to the watchlist, you MUST call the `add_to_watchlist` tool."
- "CRITICAL: When adding a symbol to the watchlist, you MUST ALSO call `change_symbol` for the same symbol so the chart navigates to it. ALWAYS pair `add_to_watchlist` with `change_symbol`."
- "When the user mentions MULTIPLE actions (e.g., 'add to watchlist AND show chart'), you MUST call ALL relevant tools."

These prompt rules mean the AI typically emits both `add_to_watchlist` and `change_symbol` tool calls. But thanks to Layers 1-3, the feature works even if the AI only emits one of them.

---

## `CHART_NAV_TOOLS` Set

Defined in `aiTools.ts` (lines 30-36):

```
change_symbol
change_timeframe
change_chart_type
toggle_indicator
add_to_watchlist
```

Any tool in this set triggers chart collapse behavior. The `add_to_watchlist` tool was specifically added to this set to ensure it triggers the same early-detection and collapse logic as `change_symbol`.

---

## `extractSymbolFromToolCall`

Defined in `aiTools.ts` (lines 42-48). Returns the uppercase symbol from either `change_symbol` or `add_to_watchlist` tool calls. Used by Layer 2 to navigate the chart immediately during streaming.

---

## `platformActionsRef`

Defined in `useAIChat.ts` (lines 145-169). A ref (not state) that always holds the latest platform actions. This avoids stale closures in the streaming callbacks. Key actions:

- `selectSymbol`: navigates the chart
- `addToWatchlist`: delegates to `addToActiveWatchlist` from `WatchlistContext`
- `collapseChat`: sets `isExpanded` to `false`

---

## Flow Diagram

```
User: "Add AAPL to my watchlist"
         |
         v
  [AI generates response with tool_call tags]
         |
         v
  Layer 2: onChunk detects <tool_call>add_to_watchlist
         |-- sets chartNavDetectedRef = true
         |-- calls selectSymbol("AAPL") immediately
         |-- sets isExpanded = false
         |
         v
  [Streaming finishes]
         |
         v
  Layer 3: onDone callback
         |-- parseAIResponse extracts tool calls
         |-- executeToolCall runs add_to_watchlist (Layer 1):
         |     |-- addToWatchlist("AAPL", "Apple Inc")
         |     |-- selectSymbol("AAPL")
         |     |-- collapseChat()
         |-- hasChartNavCall = true (from either parsed calls or ref)
         |-- final: setIsExpanded(false)
         |
         v
  Result: Symbol in watchlist, chart showing AAPL, chat collapsed
```

---

## Troubleshooting

### Chart does not navigate after adding to watchlist

1. Check `aiTools.ts` -- is `add_to_watchlist` still in the `CHART_NAV_TOOLS` set?
2. Check `executeToolCall` -- does the `add_to_watchlist` case still call `actions.selectSymbol`?
3. Check `extractSymbolFromToolCall` -- does it handle `add_to_watchlist`?
4. Check the AI response -- is it emitting `<tool_call>` tags at all? Look at raw streaming content.

### Chat does not collapse after adding to watchlist

1. Check `useAIChat.ts` onChunk callback -- is `chartNavDetectedRef` being set?
2. Check `useAIChat.ts` onDone callback -- is `hasChartNavCall` computed using both `clientCalls.some(isChartNavToolCall)` AND `chartNavDetectedRef.current`?
3. Check that the final `if (hasChartNavCall) setIsExpanded(false)` is the LAST state update in onDone, after the message is added.

### Symbol added to watchlist but not persisted

1. Check `WatchlistContext` -- is `addToActiveWatchlist` calling the Supabase insert?
2. Check the Supabase `watchlist_items` table and RLS policies.
3. Check that `platformActionsRef.current.addToWatchlist` is wired to `addToActiveWatchlist`.

### AI does not emit the tool call at all

1. Check the system prompt in `global-monitor/index.ts` -- are the "MUST call add_to_watchlist" and "MUST ALSO call change_symbol" instructions still present?
2. Check that `add_to_watchlist` is still in the `tools` array passed to the AI model.
3. Test with a simple prompt like "add AAPL to my watchlist" to isolate the issue.

---

## Version History

- **v1.0** (2026-02-22): Initial documentation of the three-layer defense architecture.
