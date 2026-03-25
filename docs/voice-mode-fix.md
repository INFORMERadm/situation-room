# Voice Mode — How It Works & Fix Log

## How Voice Mode Works

Voice mode uses the **OpenAI Realtime API** to create a live, two-way audio conversation between the user and the AI assistant (Sica).

### Architecture

1. **Client (browser)** — The `ConversationModeButton` component triggers a WebRTC connection. The browser captures microphone audio and creates an SDP (Session Description Protocol) offer.

2. **Edge Function (`realtime-conversation`)** — Acts as a secure relay between the client and OpenAI. It:
   - Receives the SDP offer from the client
   - Fetches available MCP tools from all connected servers (Tavily, CustomGPT, Smithery, etc.)
   - Fetches latest market news headlines from the RSS cache
   - Builds a full system prompt with instructions, tool definitions, news context, and conversation history
   - Sends a `POST` request to `https://api.openai.com/v1/realtime/calls` with the SDP and session config as `multipart/form-data`
   - Returns the OpenAI SDP answer back to the client along with tool-server mapping metadata

3. **OpenAI Realtime API** — Manages the live audio stream, voice synthesis (Marin voice), speech-to-text transcription, turn detection, and tool calling.

4. **Client-side tool execution** — When the AI decides to call a tool (e.g., `fetch_fmp_data`, `change_symbol`), the client receives the tool call, executes it via the appropriate MCP server or locally, and sends results back through the WebRTC data channel.

### Session Config Structure

The session is configured via a JSON payload sent alongside the SDP offer:

```json
{
  "type": "realtime",
  "model": "gpt-realtime",
  "instructions": "...",
  "output_modalities": ["audio"],
  "audio": {
    "input": {
      "transcription": {
        "model": "gpt-4o-transcribe"
      },
      "turn_detection": {
        "type": "semantic_vad"
      }
    },
    "output": {
      "voice": "marin"
    }
  },
  "tools": [...],
  "tool_choice": "auto"
}
```

### Key Components

| Component | File |
|---|---|
| Voice button UI | `src/components/ConversationModeButton.tsx` |
| Realtime client logic | `src/lib/realtimeConversation.ts` |
| Edge function (server relay) | `supabase/functions/realtime-conversation/index.ts` |
| Tool call handler | `supabase/functions/realtime-tool-call/index.ts` |

---

## Fix Applied — 2026-03-25

### Problem

Voice mode was producing hallucinated/nonsensical speech immediately upon activation. It did not respond to user queries and the voice did not sound like the expected Marin voice.

### Root Cause

Two issues in the session config sent to `POST /v1/realtime/calls`:

1. **Wrong model identifier** — The config used `"model": "gpt-realtime-1.5"`. The `/v1/realtime/calls` endpoint expects the alias `"gpt-realtime"` (it resolves to the latest version automatically). The explicit version string caused the API to either reject or misinterpret the config, falling back to defaults with a different voice and no proper instruction adherence.

2. **Outdated turn detection method** — The config used `"type": "server_vad"` with manual tuning parameters (`threshold`, `prefix_padding_ms`, `silence_duration_ms`). This was replaced with `"type": "semantic_vad"`, which is OpenAI's newer and recommended approach. Semantic VAD understands conversational pauses vs actual end-of-turn, resulting in more natural interaction.

### Changes Made

File: `supabase/functions/realtime-conversation/index.ts`

**Before:**
```typescript
const callSessionConfig = {
  type: "realtime",
  model: "gpt-realtime-1.5",
  instructions: fullInstructions,
  output_modalities: ["audio"],
  audio: {
    input: {
      transcription: { model: "gpt-4o-transcribe" },
      turn_detection: {
        type: "server_vad",
        threshold: 0.7,
        prefix_padding_ms: 500,
        silence_duration_ms: 700,
      },
    },
    output: { voice: "marin" },
  },
};
```

**After:**
```typescript
const callSessionConfig = {
  type: "realtime",
  model: "gpt-realtime",
  instructions: fullInstructions,
  output_modalities: ["audio"],
  audio: {
    input: {
      transcription: { model: "gpt-4o-transcribe" },
      turn_detection: {
        type: "semantic_vad",
      },
    },
    output: { voice: "marin" },
  },
};
```

### Result

Voice mode activates with the correct Marin voice, follows the system instructions, and responds properly to user speech.
