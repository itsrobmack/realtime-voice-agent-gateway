import type { AgentReasoner, AudioFrame, SpeechToTextAdapter, TextToSpeechAdapter, TranscriptEvent } from "./types";

export class ScriptedSpeechToText implements SpeechToTextAdapter {
  readonly name = "scripted-stt";
  private readonly eventsBySequence: Map<number, TranscriptEvent[]>;

  constructor(eventsBySequence: Record<number, TranscriptEvent[]>) {
    this.eventsBySequence = new Map(Object.entries(eventsBySequence).map(([sequence, events]) => [Number(sequence), events]));
  }

  async acceptFrame(frame: AudioFrame): Promise<TranscriptEvent[]> {
    return this.eventsBySequence.get(frame.sequence) ?? [];
  }
}

export class StaticAgentReasoner implements AgentReasoner {
  readonly name = "static-agent-reasoner";

  async respond(input: { transcript: string; sessionId: string }) {
    return {
      text: `I heard: ${input.transcript}. I can help route that request safely.`,
      intent: "answer" as const
    };
  }
}

export class ChunkedTextToSpeech implements TextToSpeechAdapter {
  readonly name = "chunked-tts";

  constructor(private readonly chunkCount = 3) {}

  async *synthesize(input: { text: string; sessionId: string }): AsyncIterable<Uint8Array> {
    const encoder = new TextEncoder();

    for (let index = 0; index < this.chunkCount; index += 1) {
      await Promise.resolve();
      yield encoder.encode(`${input.sessionId}:${index}:${input.text.slice(0, 24)}`);
    }
  }
}

export class FailingSpeechToText implements SpeechToTextAdapter {
  readonly name = "failing-stt";

  async acceptFrame(_frame: AudioFrame): Promise<TranscriptEvent[]> {
    throw new Error("stt provider unavailable");
  }
}

export class FailingTextToSpeech implements TextToSpeechAdapter {
  readonly name = "failing-tts";

  async *synthesize(_input: { text: string; sessionId: string }): AsyncIterable<Uint8Array> {
    throw new Error("tts provider unavailable");
  }
}
