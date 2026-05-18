import { ChunkedTextToSpeech, ScriptedSpeechToText, StaticAgentReasoner } from "./adapters";
import { RealtimeVoiceGateway } from "./gateway";
import type { VoiceAuditEventType, VoiceGatewaySnapshot } from "./types";

export type VoiceEvalResult = {
  name: string;
  passed: boolean;
  finalState: VoiceGatewaySnapshot["state"];
  missingAuditEvents: VoiceAuditEventType[];
  notes: string[];
};

type VoiceEvalCase = {
  name: string;
  run: () => Promise<VoiceGatewaySnapshot>;
  expectedState: VoiceGatewaySnapshot["state"];
  expectedAuditEvents: VoiceAuditEventType[];
  minimumSpeechChunks?: number;
  minimumInterruptions?: number;
};

const encoder = new TextEncoder();

function frame(sequence: number, atMs: number) {
  return { sequence, atMs, payload: encoder.encode(`frame-${sequence}`) };
}

export const voiceEvalCases: VoiceEvalCase[] = [
  {
    name: "final transcript creates agent speech",
    expectedState: "listening",
    expectedAuditEvents: [
      "session.created",
      "audio.received",
      "transcript.final",
      "agent.response.created",
      "speech.started",
      "tts.chunk.created",
      "speech.completed"
    ],
    minimumSpeechChunks: 3,
    run: async () => {
      const gateway = new RealtimeVoiceGateway({
        sessionId: "eval-final-transcript",
        stt: new ScriptedSpeechToText({ 1: [{ text: "Can you check my order status?", isFinal: true, atMs: 20 }] }),
        reasoner: new StaticAgentReasoner(),
        tts: new ChunkedTextToSpeech(3)
      });

      await gateway.receiveAudio(frame(1, 20));
      return gateway.snapshot();
    }
  },
  {
    name: "user barge in interrupts active speech",
    expectedState: "listening",
    expectedAuditEvents: ["session.created", "speech.started", "speech.interrupted", "audio.received"],
    minimumInterruptions: 1,
    run: async () => {
      const gateway = new RealtimeVoiceGateway({
        sessionId: "eval-interrupt",
        stt: new ScriptedSpeechToText({ 1: [{ text: "Start explaining the policy", isFinal: true, atMs: 10 }] }),
        reasoner: new StaticAgentReasoner(),
        tts: new ChunkedTextToSpeech(250)
      });

      const firstTurn = gateway.receiveAudio(frame(1, 10));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await gateway.receiveAudio(frame(2, 12));
      await firstTurn;
      return gateway.snapshot();
    }
  },
  {
    name: "partial transcript does not trigger agent response",
    expectedState: "listening",
    expectedAuditEvents: ["session.created", "audio.received", "transcript.partial"],
    minimumSpeechChunks: 0,
    run: async () => {
      const gateway = new RealtimeVoiceGateway({
        sessionId: "eval-partial",
        stt: new ScriptedSpeechToText({ 1: [{ text: "I need", isFinal: false, atMs: 8 }] }),
        reasoner: new StaticAgentReasoner(),
        tts: new ChunkedTextToSpeech(3)
      });

      await gateway.receiveAudio(frame(1, 8));
      return gateway.snapshot();
    }
  },
  {
    name: "multiple partials wait for final transcript",
    expectedState: "listening",
    expectedAuditEvents: [
      "session.created",
      "audio.received",
      "transcript.partial",
      "transcript.final",
      "agent.response.created",
      "speech.started",
      "speech.completed"
    ],
    minimumSpeechChunks: 2,
    run: async () => {
      const gateway = new RealtimeVoiceGateway({
        sessionId: "eval-partials-then-final",
        stt: new ScriptedSpeechToText({
          1: [{ text: "I need", isFinal: false, atMs: 8 }],
          2: [{ text: "I need to update", isFinal: false, atMs: 14 }],
          3: [{ text: "I need to update my appointment", isFinal: true, atMs: 28 }]
        }),
        reasoner: new StaticAgentReasoner(),
        tts: new ChunkedTextToSpeech(2)
      });

      await gateway.receiveAudio(frame(1, 8));
      await gateway.receiveAudio(frame(2, 14));
      await gateway.receiveAudio(frame(3, 28));
      return gateway.snapshot();
    }
  },
  {
    name: "session end records ended state",
    expectedState: "ended",
    expectedAuditEvents: ["session.created", "session.ended"],
    run: async () => {
      const gateway = new RealtimeVoiceGateway({
        sessionId: "eval-ended",
        stt: new ScriptedSpeechToText({}),
        reasoner: new StaticAgentReasoner(),
        tts: new ChunkedTextToSpeech(1)
      });

      return gateway.end(100);
    }
  }
];

function evaluate(snapshot: VoiceGatewaySnapshot, testCase: VoiceEvalCase): VoiceEvalResult {
  const auditTypes = new Set(snapshot.audit.map((event) => event.type));
  const missingAuditEvents = testCase.expectedAuditEvents.filter((eventType) => !auditTypes.has(eventType));
  const speechChunkOk = snapshot.speechChunks >= (testCase.minimumSpeechChunks ?? 0);
  const interruptionOk = snapshot.interruptedSpeechCount >= (testCase.minimumInterruptions ?? 0);
  const stateOk = snapshot.state === testCase.expectedState;

  return {
    name: testCase.name,
    passed: stateOk && speechChunkOk && interruptionOk && missingAuditEvents.length === 0,
    finalState: snapshot.state,
    missingAuditEvents,
    notes: [
      stateOk ? "state matched expectation" : `expected ${testCase.expectedState}, got ${snapshot.state}`,
      speechChunkOk ? "speech chunk expectation matched" : `expected at least ${testCase.minimumSpeechChunks ?? 0} speech chunks`,
      interruptionOk ? "interruption expectation matched" : `expected at least ${testCase.minimumInterruptions ?? 0} interruptions`,
      missingAuditEvents.length === 0 ? "audit events matched" : `missing audit events: ${missingAuditEvents.join(", ")}`
    ]
  };
}

export async function runVoiceEvalSuite(cases = voiceEvalCases): Promise<VoiceEvalResult[]> {
  const results: VoiceEvalResult[] = [];

  for (const testCase of cases) {
    results.push(evaluate(await testCase.run(), testCase));
  }

  return results;
}
