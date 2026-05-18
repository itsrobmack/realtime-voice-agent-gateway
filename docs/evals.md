# Runtime eval matrix

This repo evaluates realtime voice behavior as a system contract, not as a generic answer quality test.

The question is not only whether the agent can respond. The question is whether the voice runtime handles turns, interruptions, transcripts, provider boundaries, and audit events in a way an operator can trust.

## Current eval coverage

| Eval | What it proves | Why it matters |
|---|---|---|
| Final transcript creates response and speech | A completed user turn advances through transcript, agent response, and text to speech output | Voice systems need clear turn boundaries before downstream actions can be trusted |
| User interruption cancels active speech | Barge in stops active agent speech and records interruption behavior | Real calls are messy. Users interrupt, correct, and redirect the agent |
| Partial transcript does not trigger response | Incomplete speech updates do not prematurely trigger agent output | Prevents the agent from responding to unstable transcript fragments |
| Multiple partials wait for final transcript | Several partial transcripts can arrive before the final turn produces speech | Real STT streams often revise partial text before finalizing intent |
| STT provider failure creates degraded fallback | A speech to text provider failure moves the session into degraded state and emits a safe fallback event | Provider outages should be visible and should not silently look like user silence |
| TTS provider failure creates degraded fallback | A text to speech provider failure records the provider failure after agent response creation and emits a safe fallback event | Voice systems need an explicit recovery path when speech output fails |
| Session end records ended state | Ending a session emits an ended state and audit event | Operators need clean call termination and traceability |
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
8. Multiple partial transcripts produce duplicate agent responses.
9. Provider failure disappears without a degraded state.
10. Ended sessions do not produce a clear terminal state.

## Additional evals to add next

1. Silence timeout creates a safe fallback state.
2. Repeated user correction updates intent instead of creating duplicate responses.
3. Transfer request creates an explicit handoff event.
5. Transcript logging preserves partial and final turn history.
6. Latency budget warning fires when a turn exceeds the configured threshold.
7. Unsupported intent produces a safe clarification response.

## Interview framing

For realtime voice AI, I would not only eval whether the model gives a good answer. I would eval the runtime behavior around the conversation.

The key checks are partial transcript handling, final transcript boundaries, interruption behavior, text to speech cancellation, provider failure fallback, transcript visibility, and latency. If those are not tested, the agent may sound good in a demo but fail in real calls.

This repo is intentionally small, but the eval shape is the important part: define the runtime contract, test the risky transitions, and make the result visible to operators.
