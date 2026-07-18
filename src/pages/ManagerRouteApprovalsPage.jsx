import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomRoutePreviewModal } from '../components/CustomRoutePreviewModal';
import { RouteComparisonPanel } from '../components/RouteComparisonPanel';
import {
  useManagerCustomRoutes,
  useRouteChangeRequests,
  useNameCustomRoute,
  useResolveRouteChangeRequest,
} from '@/hooks/use-route-approvals';

export function ManagerRouteApprovalsPage() {
  const [previewRoute, setPreviewRoute] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [selectedChangeRequest, setSelectedChangeRequest] = useState(null);
  const [resolveError, setResolveError] = useState('');

  const routesQ = useManagerCustomRoutes({ status: 'PENDING_NAMING' });
  const changeRequestsQ = useRouteChangeRequests({ status: 'PENDING' });
  const nameRouteMut = useNameCustomRoute();
  const resolveM = useResolveRouteChangeRequest();

  const routes = routesQ.data?.data || [];
  const changeRequests = changeRequestsQ.data?.data || [];

  const recordedRoutes = routes.filter((r) => r.pathPolyline);
  const awaitingDriverRoutes = routes.filter((r) => !r.pathPolyline);

  const queryError = routesQ.error?.message || changeRequestsQ.error?.message;
  const isEmpty =
    !routesQ.isLoading &&
    !changeRequestsQ.isLoading &&
    recordedRoutes.length === 0 &&
    awaitingDriverRoutes.length === 0 &&
    changeRequests.length === 0;

  const openPreview = (route) => { setSaveError(''); setPreviewRoute(route); };
  const closePreview = () => { setPreviewRoute(null); setSaveError(''); };

  const handleNameRoute = async (routeName) => {
    if (!previewRoute) return;
    setSaveError('');
    try {
      await nameRouteMut.mutateAsync({ routeId: previewRoute.routeId, payload: { routeName } });
      setPreviewRoute(null);
    } catch (err) {
      setSaveError(err?.message || 'Failed to name route');
    }
  };

  const openComparison = (cr) => { setResolveError(''); setSelectedChangeRequest(cr); };
  const closeComparison = () => { setSelectedChangeRequest(null); setResolveError(''); };

  const handleResolve = async (resolution) => {
    if (!selectedChangeRequest) return;
    setResolveError('');
    try {
      await resolveM.mutateAsync({ id: selectedChangeRequest._id, payload: { resolution } });
      setSelectedChangeRequest(null);
    } catch (err) {
      setResolveError(err?.message || 'Failed to resolve route change request');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Route Approvals"
        description="Recorded custom routes from your drivers, waiting to be named and activated."
      />

      {queryError && (
        <Alert variant="destructive">
          <AlertDescription>{queryError}</AlertDescription>
        </Alert>
      )}

      {isEmpty && (
        <Alert>
          <AlertDescription>No custom routes are pending right now.</AlertDescription>
        </Alert>
      )}

      {/* Change requests */}
      {changeRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Route Change Requests
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {changeRequests.map((cr) => (
              <Card key={cr._id} className="border-yellow-400/40">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {cr.currentRouteId?.routeName || cr.currentRouteId?.routeId || 'Route'}
                    </span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-400">Off-route</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max deviation {Math.round(cr.deviation?.maxMeters || 0)} m &middot;{' '}
                    {Math.round((cr.deviation?.fractionOff || 0) * 100)}% off-route
                  </p>
                  <Button size="sm" className="w-full" onClick={() => openComparison(cr)}>
                    Review Diff
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recorded routes ready to name */}
      {recordedRoutes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordedRoutes.map((route) => (
            <Card key={route.routeId}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{route.routeId}</span>
                  <Badge className="bg-status-settled/10 text-status-settled border-status-settled/30">
                    Recorded
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {route.distance ?? 0} km &middot; {route.stopsCount ?? 0} stops
                </p>
                <Button size="sm" className="w-full" onClick={() => openPreview(route)}>
                  Review &amp; Name
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Awaiting driver recording */}
      {awaitingDriverRoutes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Awaiting driver recording
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {awaitingDriverRoutes.map((route) => (
              <Card key={route.routeId} className="opacity-70">
                <CardContent className="pt-4 space-y-1">
                  <span className="font-semibold text-sm">{route.routeId}</span>
                  <p className="text-xs text-muted-foreground">
                    The assigned driver hasn&apos;t recorded this route yet.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <CustomRoutePreviewModal
        open={Boolean(previewRoute)}
        route={previewRoute}
        saving={nameRouteMut.isPending}
        error={saveError}
        onClose={closePreview}
        onSubmit={handleNameRoute}
      />

      <RouteComparisonPanel
        open={Boolean(selectedChangeRequest)}
        changeRequest={selectedChangeRequest}
        resolving={resolveM.isPending}
        error={resolveError}
        onClose={closeComparison}
        onResolve={handleResolve}
      />
    </div>
  );
}
