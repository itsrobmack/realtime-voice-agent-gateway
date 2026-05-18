# Runtime proof

Latest local verification:

```bash
bun test
bun run test:evals
bun run demo
```

Expected behavior:

1. Full test suite passes.
2. Eval suite returns three passing cases.
3. Demo prints final transcript, interruption, and partial transcript eval results.

The evals cover:

1. Final transcript to agent speech.
2. User barge in during active speech.
3. Partial transcript without agent response.
