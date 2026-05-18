# Runtime eval matrix

This repo evaluates realtime voice behavior as a system contract, not as a generic answer quality test.

The question is not only whether the agent can respond. The question is whether the voice runtime handles turns, interruptions, transcripts, provider boundaries, and audit events in a way an operator can trust.

## Current eval coverage

| Eval | What it proves | Why it matters |
|---|---|---|
| Final transcript creates response and speech | A completed user turn advances through transcript, agent response, and text to speech output | Voice systems need clear turn boundaries before downstream actions can be trusted |
| User interruption cancels active speech | Barge in stops active agent speech and records interruption behavior | Real calls are messy. Users interrupt, correct, and redirect the agent |
| Partial transcript does not trigger response | Incomplete speech updates do not prematurely trigger agent output | Prevents the agent from responding to unstable transcript fragments |
| Health endpoint returns runtime status | The service exposes a simple runtime health check | Operators need a fast signal before routing traffic or test calls |
| Eval endpoint returns structured results | Runtime evals are accessible through the API | Teams need a lightweight way to verify behavior outside the test runner |

## Failure cases this suite is meant to catch

1. Agent responds before the user has finished speaking.
2. Agent keeps talking after the user interrupts.
3. Final transcript does not create a response.
4. Text to speech output is not attached to the response path.
5. Runtime health is unavailable.
6. Eval output is not machine readable.
7. Audit events are missing for key turn transitions.

## Additional evals to add next

1. Silence timeout creates a safe fallback state.
2. Repeated user correction updates intent instead of creating duplicate responses.
3. Provider adapter failure returns a visible degraded state.
4. Transfer request creates an explicit handoff event.
5. Transcript logging preserves partial and final turn history.
6. Latency budget warning fires when a turn exceeds the configured threshold.
7. Unsupported intent produces a safe clarification response.

## Interview framing

For realtime voice AI, I would not only eval whether the model gives a good answer. I would eval the runtime behavior around the conversation.

The key checks are partial transcript handling, final transcript boundaries, interruption behavior, text to speech cancellation, transfer fallback, transcript visibility, provider failure, and latency. If those are not tested, the agent may sound good in a demo but fail in real calls.

This repo is intentionally small, but the eval shape is the important part: define the runtime contract, test the risky transitions, and make the result visible to operators.
