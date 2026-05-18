import { runVoiceEvalSuite } from "./evals";

const port = Number(process.env.PORT ?? 8788);

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "realtime-voice-agent-gateway" });
    }

    if (url.pathname === "/evals") {
      const results = await runVoiceEvalSuite();
      return Response.json({ passed: results.every((result) => result.passed), results });
    }

    return Response.json({ error: "not found" }, { status: 404 });
  }
});

console.log(`realtime voice agent gateway listening on http://localhost:${port}`);
