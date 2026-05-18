# Interview notes

## Short explanation

I built this as a public proof repo for realtime voice agent infrastructure. It focuses on the runtime layer around the model: streaming audio, partial and final transcripts, interruption handling, provider adapters, state transitions, audit events, and evals.

## Why this matters

Voice agents fail in production when the runtime feels sloppy. The model can be good, but the product still fails if interruption handling is bad, state is unclear, provider behavior is not isolated, or nobody can debug what happened during a call.

## How I would scale it

1. Add WebSocket media stream support for Twilio or browser audio.
2. Add real Deepgram or Whisper compatible STT adapters.
3. Add ElevenLabs, OpenAI TTS, or Cartesia compatible TTS adapters.
4. Add OpenAI or Anthropic reasoning adapters.
5. Add Redis or Postgres session persistence.
6. Add latency metrics for transcript, reasoning, and first audio chunk.
7. Add eval cases for silence, timeout, correction, transfer, and recovery.
8. Add an operator dashboard for live sessions and replay.

## How it connects to AI platform work

This is agent infrastructure work. The product surface is voice, but the systems problems are platform problems: event flow, state machines, latency, provider abstraction, evals, auditability, observability, and safe tool execution.
