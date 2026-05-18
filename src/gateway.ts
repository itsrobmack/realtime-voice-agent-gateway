import type {
  AgentReasoner,
  AgentReply,
  AudioFrame,
  SpeechToTextAdapter,
  TextToSpeechAdapter,
  TranscriptEvent,
  VoiceAuditEvent,
  VoiceAuditEventType,
  VoiceGatewaySnapshot,
  VoiceSessionState
} from "./types";

export type VoiceGatewayOptions = {
  sessionId: string;
  stt: SpeechToTextAdapter;
  reasoner: AgentReasoner;
  tts: TextToSpeechAdapter;
  interruptionWindowMs?: number;
};

export class RealtimeVoiceGateway {
  private state: VoiceSessionState = "idle";
  private readonly audit: VoiceAuditEvent[] = [];
  private lastTranscript: string | undefined;
  private lastReply: AgentReply | undefined;
  private speechChunks = 0;
  private interruptedSpeechCount = 0;
  private speakingStartedAtMs: number | undefined;

  constructor(private readonly options: VoiceGatewayOptions) {
    this.record("session.created", 0, {
      sessionId: options.sessionId,
      stt: options.stt.name,
      reasoner: options.reasoner.name,
      tts: options.tts.name
    });
    this.state = "listening";
  }

  async receiveAudio(frame: AudioFrame): Promise<void> {
    if (this.state === "ended") {
      return;
    }

    this.record("audio.received", frame.atMs, { sequence: frame.sequence, bytes: frame.payload.byteLength });

    if (this.state === "speaking") {
      this.interruptSpeech(frame.atMs);
    }

    try {
      const transcripts = await this.options.stt.acceptFrame(frame);

      for (const transcript of transcripts) {
        await this.handleTranscript(transcript);
      }
    } catch (error) {
      this.markProviderFailure("stt", frame.atMs, error);
    }
  }

  end(atMs: number): VoiceGatewaySnapshot {
    this.state = "ended";
    this.record("session.ended", atMs);
    return this.snapshot();
  }

  snapshot(): VoiceGatewaySnapshot {
    return {
      sessionId: this.options.sessionId,
      state: this.state,
      lastTranscript: this.lastTranscript,
      lastReply: this.lastReply,
      speechChunks: this.speechChunks,
      interruptedSpeechCount: this.interruptedSpeechCount,
      audit: [...this.audit]
    };
  }

  private async handleTranscript(transcript: TranscriptEvent): Promise<void> {
    this.lastTranscript = transcript.text;
    this.record(transcript.isFinal ? "transcript.final" : "transcript.partial", transcript.atMs, {
      textLength: transcript.text.length
    });

    if (!transcript.isFinal) {
      return;
    }

    this.state = "thinking";
    try {
      const reply = await this.options.reasoner.respond({ transcript: transcript.text, sessionId: this.options.sessionId });
      this.lastReply = reply;
      this.record("agent.response.created", transcript.atMs + 1, { intent: reply.intent, textLength: reply.text.length });
      await this.speak(reply, transcript.atMs + 2);
    } catch (error) {
      this.markProviderFailure("reasoner", transcript.atMs + 1, error);
    }
  }

  private async speak(reply: AgentReply, startedAtMs: number): Promise<void> {
    this.state = "speaking";
    this.speakingStartedAtMs = startedAtMs;
    this.record("speech.started", startedAtMs, { intent: reply.intent });

    let chunkIndex = 0;

    try {
      for await (const chunk of this.options.tts.synthesize({ text: reply.text, sessionId: this.options.sessionId })) {
        if (this.state !== "speaking") {
          return;
        }

        this.speechChunks += 1;
        this.record("tts.chunk.created", startedAtMs + chunkIndex + 1, { chunkIndex, bytes: chunk.byteLength });
        chunkIndex += 1;
      }
    } catch (error) {
      this.markProviderFailure("tts", startedAtMs + chunkIndex + 1, error);
      return;
    }

    if (this.state === "speaking") {
      this.state = "listening";
      this.speakingStartedAtMs = undefined;
      this.record("speech.completed", startedAtMs + chunkIndex + 1, { chunks: chunkIndex });
    }
  }

  private interruptSpeech(atMs: number): void {
    if (this.state !== "speaking") {
      return;
    }

    this.state = "listening";
    this.interruptedSpeechCount += 1;
    this.record("speech.interrupted", atMs, {
      previousSpeechAgeMs: this.speakingStartedAtMs === undefined ? 0 : Math.max(0, atMs - this.speakingStartedAtMs)
    });
    this.speakingStartedAtMs = undefined;
  }

  private markProviderFailure(provider: "stt" | "reasoner" | "tts", atMs: number, error: unknown): void {
    this.state = "degraded";
    this.speakingStartedAtMs = undefined;
    this.record("provider.failed", atMs, {
      provider,
      message: error instanceof Error ? error.message : "unknown provider failure"
    });
    this.record("fallback.created", atMs + 1, { provider, action: "safe_handoff" });
  }

  private record(type: VoiceAuditEventType, atMs: number, detail?: VoiceAuditEvent["detail"]): void {
    this.audit.push({ type, atMs, detail });
  }
}
