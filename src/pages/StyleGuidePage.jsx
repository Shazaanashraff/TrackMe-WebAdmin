import { useState } from 'react';
import {
  Sun, Moon, Bus, Settings, MoreVertical, Info,
  AlertTriangle, CheckCircle, XCircle, Copy, Bell, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useColorMode } from '@/theme/ColorMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationPrevious, PaginationNext, PaginationLink,
} from '@/components/ui/pagination';
import { Toaster } from '@/components/ui/sonner';

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Section({ id, title, children }) {
  return (
    <section id={id} className="space-y-4 scroll-mt-20">
      <h2 className="font-heading text-base font-semibold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

// ─── Colour swatch ────────────────────────────────────────────────────────────

function Swatch({ name, cssVar }) {
  return (
    <div className="flex flex-col items-start gap-1.5 min-w-[80px]">
      <div
        className="h-10 w-full rounded-lg border border-border"
        style={{ background: cssVar }}
        aria-label={name}
      />
      <span className="text-xs font-mono text-muted-foreground leading-tight">{name}</span>
    </div>
  );
}

function SwatchGroup({ label, swatches }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {swatches.map((s) => (
          <Swatch key={s.name} name={s.name} cssVar={s.cssVar} />
        ))}
      </div>
    </div>
  );
}

// ─── Token data ───────────────────────────────────────────────────────────────

const SURFACE_TOKENS = [
  { name: '--background', cssVar: 'var(--background)' },
  { name: '--surface', cssVar: 'var(--surface)' },
  { name: '--surface-muted', cssVar: 'var(--surface-muted)' },
  { name: '--border', cssVar: 'var(--border)' },
  { name: '--overlay', cssVar: 'var(--overlay)' },
];

const TEXT_TOKENS = [
  { name: '--foreground', cssVar: 'var(--foreground)' },
  { name: '--muted-foreground', cssVar: 'var(--muted-foreground)' },
];

const BRAND_TOKENS = [
  { name: '--primary', cssVar: 'var(--primary)' },
  { name: '--primary-hover', cssVar: 'var(--primary-hover)' },
  { name: '--primary-foreground', cssVar: 'var(--primary-foreground)' },
  { name: '--primary-soft', cssVar: 'var(--primary-soft)' },
  { name: '--ring', cssVar: 'var(--ring)' },
  { name: '--destructive', cssVar: 'var(--destructive)' },
  { name: '--destructive-foreground', cssVar: 'var(--destructive-foreground)' },
];

const STATUS_TOKENS = [
  { name: '--status-pending', cssVar: 'var(--status-pending)' },
  { name: '--status-progress', cssVar: 'var(--status-progress)' },
  { name: '--status-settled', cssVar: 'var(--status-settled)' },
  { name: '--status-warning', cssVar: 'var(--status-warning)' },
  { name: '--status-danger', cssVar: 'var(--status-danger)' },
];

// ─── Sample data for Table demo ───────────────────────────────────────────────

const TABLE_ROWS = [
  { id: 'B-042', route: 'Colombo–Kandy', status: 'settled', label: 'Online' },
  { id: 'B-017', route: 'Galle–Matara', status: 'progress', label: 'Idle' },
  { id: 'B-088', route: 'Negombo–Colombo', status: 'pending', label: 'Offline' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StyleGuidePage() {
  const { mode, toggleColorMode } = useColorMode();
  const [switchOn, setSwitchOn] = useState(false);
  const [checked, setChecked] = useState(false);

  const NAV_SECTIONS = [
    'tokens', 'typography', 'elevation', 'buttons', 'badges',
    'forms', 'card', 'alert', 'data', 'tabs', 'table',
    'nav', 'overlays', 'interactive', 'scroll',
  ];

  return (
    <TooltipProvider>
      <Toaster />
      <div className="min-h-screen bg-background text-foreground">

        {/* Sticky header */}
        <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 h-14 gap-4">
            <div className="flex items-center gap-3">
              <span className="font-heading font-semibold text-foreground">Atlas Design System</span>
              <Badge variant="secondary" className="text-xs">dev only</Badge>
            </div>
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
              {NAV_SECTIONS.map((s) => (
                <a
                  key={s}
                  href={`#${s}`}
                  className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded transition-colors capitalize whitespace-nowrap"
                >
                  {s}
                </a>
              ))}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleColorMode}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-screen-xl px-6 py-10 space-y-14">

          {/* ── Token Palette ─────────────────────────────────────────── */}
          <Section id="tokens" title="Color Tokens">
            <div className="space-y-6">
              <SwatchGroup label="Canvas & Surface" swatches={SURFACE_TOKENS} />
              <SwatchGroup label="Text" swatches={TEXT_TOKENS} />
              <SwatchGroup label="Brand / Accent" swatches={BRAND_TOKENS} />
              <SwatchGroup label="Status (always label + colour)" swatches={STATUS_TOKENS} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All swatches resolve to CSS variables — toggle the theme to verify both palettes.
            </p>
          </Section>

          {/* ── Typography ────────────────────────────────────────────── */}
          <Section id="typography" title="Typography">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headings — Uber Move</p>
                <div className="space-y-1">
                  <p className="font-heading text-[26px] font-semibold leading-tight tracking-tight text-foreground">Fleet Operations Dashboard</p>
                  <p className="font-heading text-[22px] font-semibold leading-tight tracking-tight text-foreground">Route Management</p>
                  <p className="font-heading text-base font-semibold text-foreground">Section Heading</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body / UI — Inter</p>
                <div className="space-y-1">
                  <p className="text-sm text-foreground">Base UI text (14px) — 22 buses, 4 routes, 1 active request</p>
                  <p className="text-sm text-muted-foreground">Secondary / muted text — Last updated 4 minutes ago</p>
                  <p className="text-xs text-muted-foreground">Label / caption (12px) — ROUTE STATUS</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Numbers / IDs / Keys — Fira Code</p>
                <div className="space-y-1 font-mono tabular-nums">
                  <p className="text-[26px] font-medium text-foreground">Rs 1,250,000.00</p>
                  <p className="text-base text-foreground">B-042 · ROUTE-118 · NK-7X3K</p>
                  <p className="text-sm text-muted-foreground">6.9271° N, 79.8612° E</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Elevation ─────────────────────────────────────────────── */}
          <Section id="elevation" title="Elevation — Atlas Floating Shell">
            <p className="text-sm text-muted-foreground">
              Depth is spent <em>once</em>: the two shell cards and overlays carry{' '}
              <code className="font-mono text-xs bg-surface-muted px-1 py-0.5 rounded">shadow-float</code>.
              Everything inside is flat — separated by 1px border rules and surface-muted fills.
            </p>
            <div className="rounded-2xl bg-background p-[14px] border border-border">
              <div className="flex gap-3">
                <div className="w-48 shrink-0 rounded-2xl border border-border bg-surface shadow-float p-4 flex flex-col gap-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar card</p>
                  <p className="text-xs text-muted-foreground font-mono">shadow-float ✓<br />bg-surface ✓<br />rounded-2xl ✓</p>
                </div>
                <div className="flex-1 rounded-2xl border border-border bg-surface shadow-float p-4 flex flex-col gap-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content card</p>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-xs text-muted-foreground font-mono">inner panel — no shadow, rounded-xl, bg-surface-muted</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Buttons ───────────────────────────────────────────────── */}
          <Section id="buttons" title="Button">
            <Row label="Variants">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </Row>
            <Row label="Sizes">
              <Button size="lg">Large</Button>
              <Button>Default</Button>
              <Button size="sm">Small</Button>
              <Button size="icon" aria-label="Settings"><Settings className="h-4 w-4" /></Button>
            </Row>
            <Row label="Disabled">
              <Button disabled>Disabled default</Button>
              <Button variant="outline" disabled>Disabled outline</Button>
              <Button variant="destructive" disabled>Disabled destructive</Button>
            </Row>
          </Section>

          {/* ── Badges ────────────────────────────────────────────────── */}
          <Section id="badges" title="Badge">
            <Row label="Base variants">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </Row>
            <Row label="Domain status (always paired with a label)">
              <Badge variant="pending">Pending</Badge>
              <Badge variant="progress">In progress</Badge>
              <Badge variant="settled">Approved</Badge>
              <Badge variant="warning">GPS stale</Badge>
              <Badge variant="danger">Suspended</Badge>
            </Row>
          </Section>

          {/* ── Form Controls ─────────────────────────────────────────── */}
          <Section id="forms" title="Form Controls">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Input */}
              <div className="space-y-2">
                <Label htmlFor="sg-input">Bus plate number</Label>
                <Input id="sg-input" placeholder="WP ABC-1234" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-input-disabled">Disabled field</Label>
                <Input id="sg-input-disabled" value="Read-only value" disabled />
              </div>
              {/* Select */}
              <div className="space-y-2">
                <Label htmlFor="sg-select">Route</Label>
                <Select>
                  <SelectTrigger id="sg-select">
                    <SelectValue placeholder="Select a route…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="r1">Colombo–Kandy (118)</SelectItem>
                    <SelectItem value="r2">Galle–Matara (32)</SelectItem>
                    <SelectItem value="r3">Negombo–Colombo (240)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Textarea */}
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="sg-textarea">Review note</Label>
                <Textarea id="sg-textarea" placeholder="Add a review note…" rows={3} />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-8">
              {/* Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sg-checkbox"
                  checked={checked}
                  onCheckedChange={setChecked}
                />
                <Label htmlFor="sg-checkbox" className="cursor-pointer">Allow private routes</Label>
              </div>
              {/* Switch */}
              <div className="flex items-center gap-2">
                <Switch
                  id="sg-switch"
                  checked={switchOn}
                  onCheckedChange={setSwitchOn}
                />
                <Label htmlFor="sg-switch" className="cursor-pointer">
                  {switchOn ? 'GPS tracking on' : 'GPS tracking off'}
                </Label>
              </div>
              {/* RadioGroup */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Approval action</Label>
                <RadioGroup defaultValue="approve">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="approve" id="sg-r-approve" />
                    <Label htmlFor="sg-r-approve">Approve</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="reject" id="sg-r-reject" />
                    <Label htmlFor="sg-r-reject">Reject</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </Section>

          {/* ── Card ──────────────────────────────────────────────────── */}
          <Section id="card" title="Card">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Total Buses</CardTitle>
                    <Bus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>Active fleet in this region</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-[26px] font-medium tabular-nums">22</p>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">Last synced 3 min ago</p>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-[26px] font-medium tabular-nums">8</p>
                </CardContent>
              </Card>
              <Card className="bg-surface-muted">
                <CardHeader>
                  <CardTitle>Inset panel</CardTitle>
                  <CardDescription>Uses bg-surface-muted — no shadow</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Secondary panels inside the content card are flat: radius-xl, surface-muted, 1px border rule.</p>
                </CardContent>
              </Card>
            </div>
          </Section>

          {/* ── Alert ─────────────────────────────────────────────────── */}
          <Section id="alert" title="Alert">
            <div className="space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Default</AlertTitle>
                <AlertDescription>Informational inline notice — no action needed.</AlertDescription>
              </Alert>
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>GPS data is stale</AlertTitle>
                <AlertDescription>Last position received 18 minutes ago. Check device connectivity.</AlertDescription>
              </Alert>
              <Alert variant="danger">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Request rejected</AlertTitle>
                <AlertDescription>The route change request was rejected by the super-admin.</AlertDescription>
              </Alert>
              <Alert variant="info">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Route approved</AlertTitle>
                <AlertDescription>Colombo–Kandy (118) is now active.</AlertDescription>
              </Alert>
            </div>
          </Section>

          {/* ── Avatar · Skeleton · Separator ─────────────────────────── */}
          <Section id="data" title="Avatar · Skeleton · Separator">
            <Row label="Avatar — initials fallback (avatars are backend base64; fallback shown here)">
              <Avatar className="h-10 w-10">
                <AvatarFallback>SA</AvatarFallback>
              </Avatar>
              <Avatar className="h-9 w-9">
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
              <Avatar className="h-8 w-8">
                <AvatarFallback>JA</AvatarFallback>
              </Avatar>
            </Row>
            <Row label="Skeleton — loading affordance">
              <div className="space-y-2 w-full max-w-xs">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </Row>
            <Row label="Separator — horizontal and vertical">
              <div className="w-full max-w-sm">
                <p className="text-sm text-muted-foreground">Above</p>
                <Separator className="my-2" />
                <p className="text-sm text-muted-foreground">Below</p>
              </div>
              <div className="flex items-center gap-2 h-8">
                <span className="text-sm text-muted-foreground">Left</span>
                <Separator orientation="vertical" className="h-full" />
                <span className="text-sm text-muted-foreground">Right</span>
              </div>
            </Row>
          </Section>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <Section id="tabs" title="Tabs">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="audit" disabled>Audit</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Overview panel content — stats, summaries, KPI tiles.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="requests">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Requests panel — pending approvals list.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </Section>

          {/* ── Table ─────────────────────────────────────────────────── */}
          <Section id="table" title="Table">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bus ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TABLE_ROWS.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono tabular-nums">{row.id}</TableCell>
                      <TableCell>{row.route}</TableCell>
                      <TableCell>
                        <Badge variant={row.status}>{row.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" aria-label="Row actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </Section>

          {/* ── Breadcrumb · Pagination ────────────────────────────────── */}
          <Section id="nav" title="Breadcrumb · Pagination">
            <Row label="Breadcrumb">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Operations</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>B-042 Detail</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </Row>
            <Row label="Pagination">
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                  <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationNext href="#" /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </Row>
          </Section>

          {/* ── Overlays: Dialog · AlertDialog · Sheet ─────────────────── */}
          <Section id="overlays" title="Dialog · AlertDialog · Sheet">
            <Row>
              {/* Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Manager</DialogTitle>
                    <DialogDescription>Create a new manager account. They will receive an invitation email.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="sg-dialog-name">Full name</Label>
                      <Input id="sg-dialog-name" placeholder="Samantha de Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sg-dialog-email">Email</Label>
                      <Input id="sg-dialog-email" type="email" placeholder="samantha@trackme.com" />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button>Create Manager</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* AlertDialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Bus</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove bus B-042?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the bus from the fleet. All tracking history will be archived. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Remove bus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Open Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Bus B-042 Detail</SheetTitle>
                    <SheetDescription>Colombo–Kandy route · Last GPS 2 min ago</SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Plate</span>
                      <span className="font-mono text-sm tabular-nums">WP ABC-1234</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="settled">Online</Badge>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Driver</span>
                      <span className="text-sm">Kasun Perera</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-border">
                      <span className="text-sm text-muted-foreground">Coordinates</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">6.9271° N, 79.8612° E</span>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </Row>
          </Section>

          {/* ── Interactive: Tooltip · Popover · Dropdown ─────────────── */}
          <Section id="interactive" title="Tooltip · Popover · Dropdown Menu">
            <Row>
              {/* Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-muted-foreground underline decoration-dashed cursor-help">
                    6 min ago
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">2026-07-16 · 09:14:22 +0530</p>
                </TooltipContent>
              </Tooltip>

              {/* Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">Open Popover</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Filter routes</p>
                    <div className="flex items-center gap-2">
                      <Checkbox id="sg-pop-private" />
                      <Label htmlFor="sg-pop-private" className="text-sm cursor-pointer">Private only</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="sg-pop-active" defaultChecked />
                      <Label htmlFor="sg-pop-active" className="text-sm cursor-pointer">Active routes</Label>
                    </div>
                    <Button size="sm" className="w-full mt-2">Apply</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <MoreVertical className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Bus B-042</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4" /> View detail
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4" /> Copy room key
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <XCircle className="h-4 w-4" /> Remove bus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Toast trigger */}
              <Button
                variant="secondary"
                onClick={() => toast.success('Manager created', { description: 'Samantha de Silva has been invited.' })}
              >
                Fire toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.error('Request failed', { description: 'Unable to reach the backend.' })}
              >
                Error toast
              </Button>
            </Row>
          </Section>

          {/* ── Scroll Area ───────────────────────────────────────────── */}
          <Section id="scroll" title="Scroll Area">
            <div className="flex gap-4">
              <div className="w-64">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Bus list (scroll)</p>
                <ScrollArea className="h-48 rounded-xl border border-border bg-surface">
                  <div className="p-3 space-y-1">
                    {Array.from({ length: 16 }, (_, i) => `B-0${String(i + 1).padStart(2, '0')}`).map((id, i) => (
                      <div key={id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-surface-muted transition-colors">
                        <span className="font-mono text-sm tabular-nums text-foreground">{id}</span>
                        <Badge variant={i % 3 === 0 ? 'settled' : i % 3 === 1 ? 'progress' : 'pending'}>
                          {i % 3 === 0 ? 'Online' : i % 3 === 1 ? 'Idle' : 'Offline'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Section>

          <div className="border-t border-border pt-8 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              Atlas Design System · TrackMe web-admin · dev only ·{' '}
              <span className="font-mono">{mode}</span> theme
            </p>
          </div>

        </main>
      </div>
    </TooltipProvider>
  );
}
