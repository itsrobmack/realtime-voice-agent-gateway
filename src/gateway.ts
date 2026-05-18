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

    const transcripts = await this.options.stt.acceptFrame(frame);

    for (const transcript of transcripts) {
      await this.handleTranscript(transcript);
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
    const reply = await this.options.reasoner.respond({ transcript: transcript.text, sessionId: this.options.sessionId });
    this.lastReply = reply;
    this.record("agent.response.created", transcript.atMs + 1, { intent: reply.intent, textLength: reply.text.length });
    await this.speak(reply, transcript.atMs + 2);
  }

  private async speak(reply: AgentReply, startedAtMs: number): Promise<void> {
    this.state = "speaking";
    this.speakingStartedAtMs = startedAtMs;
    this.record("speech.started", startedAtMs, { intent: reply.intent });

    let chunkIndex = 0;

    for await (const chunk of this.options.tts.synthesize({ text: reply.text, sessionId: this.options.sessionId })) {
      if (this.state !== "speaking") {
        return;
      }

      this.speechChunks += 1;
      this.record("tts.chunk.created", startedAtMs + chunkIndex + 1, { chunkIndex, bytes: chunk.byteLength });
      chunkIndex += 1;
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

  private record(type: VoiceAuditEventType, atMs: number, detail?: VoiceAuditEvent["detail"]): void {
    this.audit.push({ type, atMs, detail });
  }
}
