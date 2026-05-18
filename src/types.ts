export type VoiceSessionState = "idle" | "listening" | "thinking" | "speaking" | "ended";

export type TranscriptEvent = {
  text: string;
  isFinal: boolean;
  atMs: number;
};

export type AudioFrame = {
  sequence: number;
  payload: Uint8Array;
  atMs: number;
};

export type VoiceAuditEventType =
  | "session.created"
  | "audio.received"
  | "transcript.partial"
  | "transcript.final"
  | "agent.response.created"
  | "tts.chunk.created"
  | "speech.started"
  | "speech.interrupted"
  | "speech.completed"
  | "session.ended";

export type VoiceAuditEvent = {
  type: VoiceAuditEventType;
  atMs: number;
  detail?: Record<string, string | number | boolean>;
};

export type AgentReply = {
  text: string;
  intent: "answer" | "clarify" | "handoff";
};

export interface SpeechToTextAdapter {
  readonly name: string;
  acceptFrame(frame: AudioFrame): Promise<TranscriptEvent[]>;
}

export interface AgentReasoner {
  readonly name: string;
  respond(input: { transcript: string; sessionId: string }): Promise<AgentReply>;
}

export interface TextToSpeechAdapter {
  readonly name: string;
  synthesize(input: { text: string; sessionId: string }): AsyncIterable<Uint8Array>;
}

export type VoiceGatewaySnapshot = {
  sessionId: string;
  state: VoiceSessionState;
  lastTranscript?: string;
  lastReply?: AgentReply;
  speechChunks: number;
  interruptedSpeechCount: number;
  audit: VoiceAuditEvent[];
};
