import { useState } from 'react';
import { Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  useManagerOwnedRoutes,
  useRouteJoinRequests,
  useRouteMembers,
  useUpdateRoutePrivacy,
  useUpdateRouteQr,
  useRevealRoomKey,
  useRotateRoomKey,
  useDecideJoinRequest,
  useRevokeRouteMember,
} from '@/hooks/use-private-routes';

const MASKED = '••••••';

export function ManagerPrivateRoutesPage() {
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [revealedCode, setRevealedCode] = useState('');
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState({});

  const routesQ = useManagerOwnedRoutes();
  const joinRequestsQ = useRouteJoinRequests(selectedRouteId, { status: 'PENDING' });
  const membersQ = useRouteMembers(selectedRouteId, { status: 'ACTIVE' });

  const updatePrivacyM = useUpdateRoutePrivacy();
  const updateQrM = useUpdateRouteQr();
  const revealM = useRevealRoomKey();
  const rotateM = useRotateRoomKey();
  const decideM = useDecideJoinRequest();
  const revokeM = useRevokeRouteMember();

  const routes = routesQ.data?.data || [];
  const joinRequests = joinRequestsQ.data?.data || [];
  const members = membersQ.data?.data || [];
  const selectedRoute = routes.find((r) => r.routeId === selectedRouteId) || null;

  const handleSelectRoute = (route) => {
    const next = selectedRouteId === route.routeId ? null : route.routeId;
    setSelectedRouteId(next);
    setRevealedCode('');
  };

  const handleTogglePrivacy = async (route, field, value) => {
    try {
      const payload = {};
      if (field === 'isPrivate') payload.isPrivate = value;
      if (field === 'isHidden') payload.isHidden = value;
      if (field === 'joinApprovalRequired') payload.joinApprovalRequired = value;
      await updatePrivacyM.mutateAsync({ routeId: route.routeId, payload });
      toast('Route privacy settings updated');
    } catch (err) {
      toast(err?.message || 'Failed to update route privacy');
    }
  };

  const handleToggleQr = async (route, value) => {
    try {
      await updateQrM.mutateAsync({ routeId: route.routeId, qrEnabled: value });
      toast(value ? 'QR attendance enabled for this route' : 'QR attendance disabled for this route');
    } catch (err) {
      toast(err?.message || 'Failed to update QR attendance');
    }
  };

  const handleReveal = async () => {
    if (!selectedRoute) return;
    try {
      const res = await revealM.mutateAsync(selectedRoute.routeId);
      setRevealedCode(res?.data?.code || '');
    } catch (err) {
      toast(err?.message || 'Failed to reveal room key');
    }
  };

  const handleCopy = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      toast('Room key copied to clipboard');
    } catch {
      toast('Failed to copy room key');
    }
  };

  const handleRotate = async () => {
    if (!selectedRoute) return;
    try {
      const res = await rotateM.mutateAsync(selectedRoute.routeId);
      setRevealedCode(res?.data?.code || '');
      setRotateDialogOpen(false);
      toast('Room key regenerated');
    } catch (err) {
      toast(err?.message || 'Failed to regenerate room key');
    }
  };

  const handleDecision = async (requestId, decision) => {
    try {
      const note = decisionNotes[requestId] || '';
      await decideM.mutateAsync({ id: requestId, payload: { decision, note } });
      toast(decision === 'APPROVED' ? 'Join request approved' : 'Join request rejected');
    } catch (err) {
      toast(err?.message || 'Failed to record decision');
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget || !selectedRoute) return;
    try {
      await revokeM.mutateAsync({
        routeId: selectedRoute.routeId,
        userId: removeTarget.userId?._id || removeTarget.userId,
      });
      setRemoveTarget(null);
      toast('Member removed');
    } catch (err) {
      toast(err?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Private Routes"
        description="Manage room-key access, visibility, join approval, and QR attendance for your routes."
      />

      {/* Routes table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owned Routes</CardTitle>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <Alert><AlertDescription>You don&apos;t own any routes yet.</AlertDescription></Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Private</TableHead>
                    <TableHead className="text-center">Hidden</TableHead>
                    <TableHead className="text-center">Require Approval</TableHead>
                    <TableHead className="text-center">QR Attendance</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route) => {
                    const isPrivate = route.visibility === 'PRIVATE';
                    return (
                      <TableRow key={route.routeId} data-selected={selectedRouteId === route.routeId || undefined}>
                        <TableCell>
                          <p className="text-sm font-semibold">{route.routeName || route.routeId}</p>
                          <p className="text-xs text-muted-foreground">{route.source} → {route.destination}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={route.isActive ? 'default' : 'secondary'}>
                            {route.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isPrivate}
                            onCheckedChange={(v) => handleTogglePrivacy(route, 'isPrivate', v)}
                            aria-label={`Private toggle for ${route.routeId}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={Boolean(route.isHidden)}
                            disabled={!isPrivate}
                            onCheckedChange={(v) => handleTogglePrivacy(route, 'isHidden', v)}
                            aria-label={`Hidden toggle for ${route.routeId}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={Boolean(route.joinApprovalRequired)}
                            disabled={!isPrivate}
                            onCheckedChange={(v) => handleTogglePrivacy(route, 'joinApprovalRequired', v)}
                            aria-label={`Require approval toggle for ${route.routeId}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={Boolean(route.qrEnabled)}
                            onCheckedChange={(v) => handleToggleQr(route, v)}
                            aria-label={`QR attendance toggle for ${route.routeId}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">
                            {route.pendingRequestCount > 0 ? (
                              <Badge variant="destructive">{route.pendingRequestCount}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={selectedRouteId === route.routeId ? 'default' : 'outline'}
                            disabled={!isPrivate}
                            onClick={() => handleSelectRoute(route)}
                          >
                            {selectedRouteId === route.routeId ? 'Close' : 'Manage'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail panel — only when a route is selected */}
      {selectedRoute && (
        <>
          {/* Room Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Room Key — {selectedRoute.routeName || selectedRoute.routeId}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-2xl tracking-widest select-none"
                  data-testid="room-key-display"
                >
                  {revealedCode || MASKED}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReveal}
                  disabled={revealM.isPending}
                  aria-label="Reveal room key"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  disabled={!revealedCode}
                  aria-label="Copy room key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRotateDialogOpen(true)}
                >
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Join Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Join Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {joinRequests.length === 0 ? (
                <Alert><AlertDescription>No pending join requests.</AlertDescription></Alert>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((req) => (
                    <div key={req._id} className="flex items-center justify-between flex-wrap gap-3 rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-semibold">{req.userId?.name || 'Unknown user'}</p>
                        <p className="text-xs text-muted-foreground">{req.userId?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          size="sm"
                          placeholder="Note (optional)"
                          value={decisionNotes[req._id] || ''}
                          onChange={(e) => setDecisionNotes((p) => ({ ...p, [req._id]: e.target.value }))}
                          className="h-8 w-36"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleDecision(req._id, 'APPROVED')}
                          disabled={decideM.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(req._id, 'REJECTED')}
                          disabled={decideM.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <Alert><AlertDescription>No active members yet.</AlertDescription></Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Granted Via</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell className="font-medium">{member.userId?.name || 'Unknown'}</TableCell>
                        <TableCell>{member.userId?.email}</TableCell>
                        <TableCell>{member.grantedVia}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setRemoveTarget(member)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Rotate room key confirmation dialog */}
      <Dialog open={rotateDialogOpen} onOpenChange={(v) => { if (!v && !rotateM.isPending) setRotateDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate room key?</DialogTitle>
            <DialogDescription>
              This generates a new 6-digit code. Existing members keep their access — this does not kick them out.
              Anyone using the old code to join for the first time will need the new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotateDialogOpen(false)} disabled={rotateM.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleRotate} disabled={rotateM.isPending}>
              {rotateM.isPending ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation dialog */}
      <Dialog open={Boolean(removeTarget)} onOpenChange={(v) => { if (!v && !revokeM.isPending) setRemoveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              {removeTarget?.userId?.name || 'This user'} will lose access to live tracking for this route.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={revokeM.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={revokeM.isPending}>
              {revokeM.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
