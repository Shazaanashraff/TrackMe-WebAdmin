// Client for tools/devkit/runner (127.0.0.1:5099) — the local test catalog + runner,
// not the TrackMe API. Deliberately bypasses api.js's request() (auth headers, 401
// refresh/retry, session redirect): none of that applies to a loopback-only dev tool
// with no auth of its own. This file, and DeveloperPage.jsx which uses it, are the one
// place in web-admin allowed to call fetch directly — see docs/modules/DEVELOPER_MODE.md.

const RUNNER_URL = 'http://127.0.0.1:5099';

export async function fetchCatalog() {
  const response = await fetch(`${RUNNER_URL}/api/catalog`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Catalog request failed (${response.status})`);
  }
  return response.json();
}

// Streams an SSE-formatted response (event: <name>\ndata: <json>\n\n) from the runner.
// Not a native EventSource, because /api/run and /api/reset-sandbox are POST endpoints
// (they need a JSON body) and EventSource only supports GET.
async function streamSSE(path, body, onEvent) {
  const response = await fetch(`${RUNNER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const rawEvent of events) {
      const eventLine = rawEvent.split('\n').find((line) => line.startsWith('event: '));
      const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data: '));
      if (!eventLine || !dataLine) continue;

      const name = eventLine.slice('event: '.length);
      let data;
      try {
        data = JSON.parse(dataLine.slice('data: '.length));
      } catch {
        data = dataLine.slice('data: '.length);
      }
      onEvent(name, data);
    }
  }
}

export function runTest(testId, onEvent) {
  return streamSSE('/api/run', { testId }, onEvent);
}

export function resetSandbox(onEvent) {
  return streamSSE('/api/reset-sandbox', {}, onEvent);
}
