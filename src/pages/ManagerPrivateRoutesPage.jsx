import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { adminApi } from '../api';

const maskedCode = '••••••';

export function ManagerPrivateRoutesPage({ refreshSignal }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const [revealedCode, setRevealedCode] = useState('');
  const [revealing, setRevealing] = useState(false);

  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState({});

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getManagerOwnedRoutes();
      setRoutes(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load owned routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes, refreshSignal]);

  const selectedRoute = routes.find((route) => route.routeId === selectedRouteId) || null;

  const loadJoinRequests = useCallback(async (routeId) => {
    if (!routeId) return;
    setLoadingJoinRequests(true);
    try {
      const response = await adminApi.getRouteJoinRequests(routeId, { status: 'PENDING' });
      setJoinRequests(response.data || []);
    } catch (err) {
      setToast(err.message || 'Failed to load join requests');
    } finally {
      setLoadingJoinRequests(false);
    }
  }, []);

  const loadMembers = useCallback(async (routeId) => {
    if (!routeId) return;
    setLoadingMembers(true);
    try {
      const response = await adminApi.getRouteMembers(routeId, { status: 'ACTIVE' });
      setMembers(response.data || []);
    } catch (err) {
      setToast(err.message || 'Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const handleSelectRoute = (route) => {
    const nextId = selectedRouteId === route.routeId ? null : route.routeId;
    setSelectedRouteId(nextId);
    setRevealedCode('');
    if (nextId) {
      loadJoinRequests(nextId);
      loadMembers(nextId);
    }
  };

  const handleTogglePrivacy = async (route, field, value) => {
    setError('');
    try {
      const payload = {};
      if (field === 'isPrivate') payload.isPrivate = value;
      if (field === 'isHidden') payload.isHidden = value;
      if (field === 'joinApprovalRequired') payload.joinApprovalRequired = value;

      await adminApi.updateRoutePrivacy(route.routeId, payload);
      await loadRoutes();
      setToast('Route privacy settings updated');
    } catch (err) {
      setToast(err.message || 'Failed to update route privacy');
    }
  };

  const handleReveal = async () => {
    if (!selectedRoute) return;
    setRevealing(true);
    try {
      const response = await adminApi.revealRoomKey(selectedRoute.routeId);
      setRevealedCode(response?.data?.code || '');
    } catch (err) {
      setToast(err.message || 'Failed to reveal room key');
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      setToast('Room key copied to clipboard');
    } catch {
      setToast('Failed to copy room key');
    }
  };

  const openRotateDialog = () => setRotateDialogOpen(true);
  const closeRotateDialog = () => {
    if (rotating) return;
    setRotateDialogOpen(false);
  };

  const handleRotate = async () => {
    if (!selectedRoute) return;
    setRotating(true);
    try {
      const response = await adminApi.rotateRoomKey(selectedRoute.routeId);
      setRevealedCode(response?.data?.code || '');
      setRotateDialogOpen(false);
      setToast('Room key regenerated');
      await loadRoutes();
    } catch (err) {
      setToast(err.message || 'Failed to regenerate room key');
    } finally {
      setRotating(false);
    }
  };

  const handleDecision = async (requestId, decision) => {
    setError('');
    try {
      const note = decisionNotes[requestId] || '';
      await adminApi.decideJoinRequest(requestId, { decision, note });
      await loadJoinRequests(selectedRouteId);
      await loadMembers(selectedRouteId);
      await loadRoutes();
      setToast(decision === 'APPROVED' ? 'Join request approved' : 'Join request rejected');
    } catch (err) {
      setToast(err.message || 'Failed to record decision');
    }
  };

  const openRemoveDialog = (member) => setRemoveTarget(member);
  const closeRemoveDialog = () => {
    if (removing) return;
    setRemoveTarget(null);
  };

  const handleRemoveMember = async () => {
    if (!removeTarget || !selectedRoute) return;
    setRemoving(true);
    try {
      await adminApi.revokeRouteMember(selectedRoute.routeId, removeTarget.userId?._id || removeTarget.userId);
      setRemoveTarget(null);
      await loadMembers(selectedRouteId);
      await loadRoutes();
      setToast('Member removed');
    } catch (err) {
      setToast(err.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Private Routes
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Manage room-key access, visibility, and join approval for your routes.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
            Owned Routes
          </Typography>

          {!loading && routes.length === 0 ? (
            <Alert severity="info">You don&apos;t own any routes yet.</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Private</TableCell>
                    <TableCell align="center">Hidden</TableCell>
                    <TableCell align="center">Require Approval</TableCell>
                    <TableCell align="center">Pending</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route) => {
                    const isPrivate = route.visibility === 'PRIVATE';
                    return (
                      <TableRow key={route.routeId} hover selected={selectedRouteId === route.routeId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{route.routeName || route.routeId}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {route.source} → {route.destination}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={route.isActive ? 'Active' : 'Inactive'}
                            color={route.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={isPrivate}
                            onChange={(e) => handleTogglePrivacy(route, 'isPrivate', e.target.checked)}
                            slotProps={{ input: { 'aria-label': `Private toggle for ${route.routeId}` } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={Boolean(route.isHidden)}
                            disabled={!isPrivate}
                            onChange={(e) => handleTogglePrivacy(route, 'isHidden', e.target.checked)}
                            slotProps={{ input: { 'aria-label': `Hidden toggle for ${route.routeId}` } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={Boolean(route.joinApprovalRequired)}
                            disabled={!isPrivate}
                            onChange={(e) => handleTogglePrivacy(route, 'joinApprovalRequired', e.target.checked)}
                            slotProps={{ input: { 'aria-label': `Require approval toggle for ${route.routeId}` } }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {route.pendingRequestCount > 0 ? (
                            <Badge badgeContent={route.pendingRequestCount} color="error" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">0</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={selectedRouteId === route.routeId ? 'contained' : 'outlined'}
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
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {selectedRoute ? (
        <>
          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                Room Key — {selectedRoute.routeName || selectedRoute.routeId}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5" sx={{ fontFamily: 'monospace', letterSpacing: 2 }} data-testid="room-key-display">
                  {revealedCode || maskedCode}
                </Typography>
                <IconButton size="small" onClick={handleReveal} disabled={revealing} aria-label="Reveal room key">
                  <VisibilityRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleCopy} disabled={!revealedCode} aria-label="Copy room key">
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
                <Button variant="outlined" color="warning" size="small" onClick={openRotateDialog}>
                  Regenerate
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                Join Requests
              </Typography>
              {!loadingJoinRequests && joinRequests.length === 0 ? (
                <Alert severity="info">No pending join requests.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {joinRequests.map((req) => (
                    <Card key={req._id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{req.userId?.name || 'Unknown user'}</Typography>
                          <Typography variant="caption" color="text.secondary">{req.userId?.email}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField
                            size="small"
                            placeholder="Note (optional)"
                            value={decisionNotes[req._id] || ''}
                            onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [req._id]: e.target.value }))}
                          />
                          <Button size="small" variant="contained" color="success" onClick={() => handleDecision(req._id, 'APPROVED')}>
                            Approve
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDecision(req._id, 'REJECTED')}>
                            Reject
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                Members
              </Typography>
              {!loadingMembers && members.length === 0 ? (
                <Alert severity="info">No active members yet.</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Granted Via</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member._id}>
                          <TableCell>{member.userId?.name || 'Unknown'}</TableCell>
                          <TableCell>{member.userId?.email}</TableCell>
                          <TableCell>{member.grantedVia}</TableCell>
                          <TableCell align="right">
                            <Button size="small" color="error" variant="outlined" onClick={() => openRemoveDialog(member)}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={rotateDialogOpen} onClose={closeRotateDialog}>
        <DialogTitle>Regenerate room key?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This generates a new 6-digit code. Existing members keep their access — this does not kick them out.
            Anyone using the old code to join for the first time will need the new one.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRotateDialog} disabled={rotating}>Cancel</Button>
          <Button onClick={handleRotate} variant="contained" color="warning" disabled={rotating}>
            {rotating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(removeTarget)} onClose={closeRemoveDialog}>
        <DialogTitle>Remove member?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {removeTarget?.userId?.name || 'This user'} will lose access to live tracking for this route.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemoveDialog} disabled={removing}>Cancel</Button>
          <Button onClick={handleRemoveMember} variant="contained" color="error" disabled={removing}>
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </Box>
  );
}
