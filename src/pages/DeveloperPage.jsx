import { Fragment, useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_MODES, getApiBaseUrl, getApiMode, setApiMode, subscribeApiMode } from '@/lib/apiMode';
import { fetchCatalog, runTest, resetSandbox } from '@/lib/devkit';

// Developer Mode: sandbox toggle + auto-generated test catalog + local test runner.
// Dev-only by construction — this page and its nav entry are gated behind
// import.meta.env.DEV at the call site (App.jsx / AppShell.jsx), so none of it ships in
// a production build. See DEVELOPER_MODE_PLAN.md and docs/modules/DEVELOPER_MODE.md.

function useHealth(mode) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/health`);
        const data = await response.json();
        if (!cancelled) {
          setHealth(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not reach the backend');
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // mode is a dependency purely to force an immediate re-check on toggle, not because
    // getApiBaseUrl() needs it passed in.
  }, [mode]);

  return { health, error };
}

function SandboxToggleCard() {
  const [mode, setMode] = useState(getApiMode);
  const [resetting, setResetting] = useState(false);
  const [resetLog, setResetLog] = useState([]);
  const { health, error } = useHealth(mode);

  useEffect(() => subscribeApiMode(setMode), []);

  const isSandbox = mode === API_MODES.SANDBOX;
  // The badge trusts the server's own report, not the client-side toggle — a stale or
  // buggy toggle can never make prod look like sandbox this way (safety rail 6).
  const serverSaysSandbox = health?.mode === 'sandbox';

  const handleToggle = (checked) => {
    setApiMode(checked ? API_MODES.SANDBOX : API_MODES.PRIMARY);
  };

  const handleReset = async () => {
    setResetting(true);
    setResetLog([]);
    try {
      await resetSandbox((event, data) => {
        if (event === 'stdout' || event === 'stderr') {
          setResetLog((prev) => [...prev, data]);
        } else if (event === 'error') {
          setResetLog((prev) => [...prev, `error: ${data}`]);
        } else if (event === 'exit') {
          setResetLog((prev) => [...prev, `exit code ${data.code}`]);
        }
      });
    } catch (err) {
      setResetLog((prev) => [...prev, `error: ${err.message}`]);
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Sandbox
        </CardTitle>
        <CardDescription>
          Point this browser tab at a second backend (:5001) on its own database, so CRUD can be
          exercised destructively without touching real data. The toggle is per-tab, stored in
          this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch checked={isSandbox} onCheckedChange={handleToggle} aria-label="Toggle sandbox mode" />
            <span className="text-sm font-medium">{isSandbox ? 'Sandbox' : 'Primary'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}>
            <RotateCcw className="h-4 w-4" />
            {resetting ? 'Resetting…' : 'Reset sandbox'}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Server reports:</span>
          {error && <Badge variant="danger">unreachable</Badge>}
          {!error && health && (
            <>
              <Badge variant={serverSaysSandbox ? 'warning' : 'default'}>{health.mode}</Badge>
              <code className="text-xs text-muted-foreground">{health.dbName}</code>
            </>
          )}
          {!error && !health && <span className="text-muted-foreground">checking…</span>}
        </div>

        {isSandbox && !serverSaysSandbox && health && (
          <Alert variant="warning">
            <AlertDescription>
              This tab is set to sandbox, but the server at {getApiBaseUrl()} reports mode "
              {health.mode}". Is the sandbox backend running (`npm run dev:sandbox` in backend)?
            </AlertDescription>
          </Alert>
        )}

        {resetLog.length > 0 && (
          <ScrollArea className="h-32 rounded-md border border-border bg-surface-muted p-2">
            <pre className="text-xs font-mono whitespace-pre-wrap">{resetLog.join('\n')}</pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function groupCatalog(catalog) {
  if (!catalog) return [];
  const byRepo = new Map();
  for (const file of catalog.files) {
    if (!byRepo.has(file.repo)) byRepo.set(file.repo, new Map());
    const byModule = byRepo.get(file.repo);
    if (!byModule.has(file.module)) byModule.set(file.module, []);
    byModule.get(file.module).push(file);
  }

  return [...byRepo.entries()].map(([repo, moduleMap]) => ({
    repo,
    modules: [...moduleMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, files]) => ({
        module,
        files: files.sort((a, b) => a.file.localeCompare(b.file)),
      })),
  }));
}

function FileRow({ file, catalog, onRun, runningId }) {
  const [expanded, setExpanded] = useState(false);
  const tests = useMemo(
    () => catalog.entries.filter((e) => e.repo === file.repo && e.file === file.file),
    [catalog, file]
  );

  return (
    <>
      <TableRow>
        <TableCell>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-left hover:text-foreground text-muted-foreground"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <code className="text-xs">{file.file}</code>
          </button>
        </TableCell>
        <TableCell><Badge variant="secondary">{file.type}</Badge></TableCell>
        <TableCell className="text-sm">{file.testCount}</TableCell>
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRun(file.id, file.file)}
            disabled={runningId === file.id}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </TableCell>
      </TableRow>
      {expanded && tests.map((test) => (
        <TableRow key={test.id} className="bg-surface-muted/40">
          <TableCell className="pl-10">
            <span className="text-xs text-muted-foreground">
              {[...test.suite, test.name].join(' > ')}
            </span>
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRun(test.id, test.name)}
              disabled={runningId === test.id}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function CatalogPanel() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [output, setOutput] = useState([]);
  const [runLabel, setRunLabel] = useState(null);

  useEffect(() => {
    fetchCatalog()
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  const grouped = useMemo(() => groupCatalog(catalog), [catalog]);

  const handleRun = async (testId, label) => {
    setRunningId(testId);
    setRunLabel(label);
    setOutput([]);
    try {
      await runTest(testId, (event, data) => {
        if (event === 'stdout' || event === 'stderr') {
          setOutput((prev) => [...prev, data]);
        } else if (event === 'error') {
          setOutput((prev) => [...prev, `error: ${data}`]);
        } else if (event === 'exit') {
          setOutput((prev) => [...prev, `exit code ${data.code}`]);
        }
      });
    } catch (err) {
      setOutput((prev) => [...prev, `error: ${err.message}`]);
    } finally {
      setRunningId(null);
    }
  };

  if (error) {
    return (
      <Alert variant="danger">
        <AlertDescription>
          Could not reach the devkit runner at 127.0.0.1:5099 ({error}). Start it with `npm run
          devkit` from the repo root.
        </AlertDescription>
      </Alert>
    );
  }

  if (!catalog) {
    return <p className="text-sm text-muted-foreground">Loading catalog…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {catalog.counts.total} test cases — web-admin {catalog.counts.webAdmin}, backend{' '}
        {catalog.counts.backend}. Regenerate with `npm run devkit:catalog` after adding a test.
      </p>

      {grouped.map(({ repo, modules }) => (
        <Card key={repo}>
          <CardHeader>
            <CardTitle>{repo}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map(({ module, files }) => (
                  <Fragment key={`${repo}-${module}`}>
                    <TableRow className="bg-surface-muted/70">
                      <TableCell colSpan={4} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {module}
                        {files[0]?.moduleInferred && (
                          <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                            (inferred from file path — not yet in TESTING_GUIDE.md)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                    {files.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        catalog={catalog}
                        onRun={handleRun}
                        runningId={runningId}
                      />
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {(output.length > 0 || runningId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {runningId ? `Running ${runLabel}…` : `Last run: ${runLabel}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 rounded-md border border-border bg-surface-muted p-2">
              <pre className="text-xs font-mono whitespace-pre-wrap">{output.join('\n')}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GapReportPanel() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCatalog()
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Alert variant="danger">
        <AlertDescription>Could not reach the devkit runner at 127.0.0.1:5099 ({error}).</AlertDescription>
      </Alert>
    );
  }

  if (!catalog) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap report</CardTitle>
        <CardDescription>
          Per module, which test categories are present, by name-matching heuristic. Absence is
          reported, not inferred as a failure.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Happy path</TableHead>
              <TableHead>Invalid input</TableHead>
              <TableHead>Authz</TableHead>
              <TableHead>Boundary</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Missing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.gapReport.map((row) => (
              <TableRow key={row.module}>
                <TableCell className="font-medium">{row.module}</TableCell>
                <TableCell>{row.total}</TableCell>
                <TableCell>{row.happyPath}</TableCell>
                <TableCell>{row.invalidInput}</TableCell>
                <TableCell>{row.authz}</TableCell>
                <TableCell>{row.boundary}</TableCell>
                <TableCell>{row.load}</TableCell>
                <TableCell>
                  {row.missing.length ? (
                    <div className="flex flex-wrap gap-1">
                      {row.missing.map((m) => (
                        <Badge key={m} variant="secondary">{m}</Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function DeveloperPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Developer"
        description="Sandbox toggle, auto-generated test catalog, and local test runner. Dev-only — none of this ships in a production build."
      />

      <SandboxToggleCard />

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="gaps">Gap report</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogPanel />
        </TabsContent>
        <TabsContent value="gaps">
          <GapReportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
