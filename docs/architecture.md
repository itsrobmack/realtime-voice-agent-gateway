# Architecture

The gateway is intentionally small so the runtime contract is easy to inspect.

## Core pieces

1. `RealtimeVoiceGateway`

The session controller. It owns voice state, transcript handling, speech output, interruption behavior, and audit events.

2. `SpeechToTextAdapter`

A provider boundary for streaming transcription. In production this could wrap Deepgram, AssemblyAI, Whisper, or another STT provider.

3. `AgentReasoner`

A provider boundary for the reasoning layer. In production this could wrap OpenAI, Anthropic, xAI, local models, or a routed planner.

4. `TextToSpeechAdapter`

A provider boundary for speech synthesis. In production this could wrap ElevenLabs, OpenAI TTS, Cartesia, or another TTS stack.

5. `runVoiceEvalSuite`

Operational evals for realtime behavior. The suite checks final transcript handling, interruption behavior, partial transcript behavior, expected state, audit events, and speech chunks.

## State model

A session moves through:

1. `idle`
2. `listening`
3. `thinking`
4. `speaking`
5. `ended`

The important production behavior is that user audio received during `speaking` interrupts the active speech and returns the session to `listening`.

## What this proves

This repo proves a practical runtime pattern:

1. Voice sessions need explicit state.
2. Barge in must be first class behavior, not an afterthought.
3. Provider adapters should be swappable.
4. Runtime behavior should be evaluated.
5. Audit events should make voice sessions debuggable.

## What this is not

This repo does not include real provider credentials, call routing, telephony, customer data, or production secrets.

Those are deliberate boundaries. The public proof is the runtime shape, not a leaked production system.
