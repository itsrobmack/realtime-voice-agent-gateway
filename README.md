# Realtime Voice Agent Gateway

A small TypeScript and Bun skeleton for realtime voice AI systems.

This is not a voice demo app. It is the control layer a realtime voice agent needs before it can safely handle production calls, streaming turns, interruptions, provider adapters, audit events, and runtime evals.

## Why this exists

Realtime voice AI is hard because the system has to handle more than a model response.

It needs:

1. Streaming audio input.
2. Partial and final transcripts.
3. Agent reasoning boundaries.
4. Text to speech streaming.
5. User interruption and barge in behavior.
6. Provider abstraction for STT, TTS, and reasoning.
7. State transitions that can be observed and tested.
8. Audit events that explain what happened.
9. Evals for turn behavior, not just answer quality.

This repo models those primitives in a small, readable form.

## Run it

```bash
bun install
bun test
bun run demo
bun start
```

Then:

```bash
curl http://localhost:8788/health
curl http://localhost:8788/evals
```

## Eval coverage

The eval suite validates three runtime behaviors:

1. A final transcript creates an agent response and streamed speech.
2. User barge in interrupts active speech.
3. A partial transcript does not trigger an agent response.

Run it:

```bash
bun run test:evals
```

## Architecture

See `docs/architecture.md`.

## Interview notes

See `docs/interview-notes.md`.

## Positioning

Built by Rob McElvenny as public proof for realtime AI systems infrastructure: voice agent turn handling, interruption logic, provider adapters, operational evals, audit events, and production minded runtime design.
