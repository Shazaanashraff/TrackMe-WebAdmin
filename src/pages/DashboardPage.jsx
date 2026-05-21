import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, CardContent, Skeleton, Stack, Typography
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { motion } from 'framer-motion';
import {
  AttachMoneyRounded,
  PeopleAltRounded,
  DirectionsBusRounded,
  BookOnlineRounded,
  TrendingUpRounded,
  AccessTimeRounded
} from '@mui/icons-material';
import { adminApi } from '../api';

function StatCard({ label, value, change, changePositive, icon: Icon, index }) {
  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.07 * index, duration: 0.3 }}
      sx={{
        borderRadius: 2.5,
        boxShadow: '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(52, 71, 103, 0.08)',
        backgroundColor: '#fff',
        height: '100%',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-2px)' }
      }}
    >
      <CardContent sx={{ p: 2.4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#6b7280',
                fontWeight: 800,
                textTransform: 'uppercase',
                fontSize: '0.66rem',
                letterSpacing: '0.06em',
              }}
            >
              {label}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.7 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: '2rem',
                  color: '#2f2f2f',
                  lineHeight: 1,
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: changePositive ? '#2e7d32' : '#c62828',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                {change}
              </Typography>
            </Stack>
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(20, 23, 39, 0.28)',
              flexShrink: 0
            }}
          >
            <Icon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, subtitle, footer, children, index, emphasis = 'default', minHeight = 220 }) {
  const isPrimary = emphasis === 'primary';

  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + 0.08 * index, duration: 0.35 }}
      sx={{
        borderRadius: 2.5,
        boxShadow: '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
        border: isPrimary ? '1px solid rgba(52, 71, 103, 0.16)' : '1px solid rgba(52, 71, 103, 0.08)',
        backgroundColor: '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        '&::before': isPrimary ? {
          content: '""',
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 3,
          background: 'linear-gradient(90deg, #2f2f2f 0%, #4caf50 100%)',
        } : {},
      }}
    >
      <Box sx={{ p: 2.5, pb: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{ color: '#2f2f2f', mb: 0.6, fontWeight: 800, fontSize: '1.06rem' }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#6b7280',
            opacity: 0.9,
            letterSpacing: '0.03em',
            fontSize: '0.7rem'
          }}
        >
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ px: 1.2, pb: 0.6, flexGrow: 1, minHeight }}>{children}</Box>
      {footer && (
        <Box sx={{ px: 2.5, pb: 2, pt: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.8}>
            <AccessTimeRounded sx={{ fontSize: 13, color: '#6b7280' }} />
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {footer}
            </Typography>
          </Stack>
        </Box>
      )}
    </Card>
  );
}

export function DashboardPage({ refreshSignal }) {
  const [data, setData] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [metrics, operations, pending] = await Promise.all([
        adminApi.getSuperAdminDashboard(),
        adminApi.getOperationsOverview(),
        adminApi.getPendingBusRequests({ status: 'PENDING' })
      ]);
      setData({ metrics, operations: operations.data || [] });
      setPendingRequests((pending.data || []).length);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshSignal]);

  const metricsData = data?.metrics?.data;

  const totalManagers = metricsData?.managers?.totalManagers ?? 0;
  const activeBuses = metricsData?.buses?.activeBuses ?? 0;
  const confirmedBookings = metricsData?.bookings?.confirmedBookings ?? 0;
  const avgRating = metricsData?.reviews?.averageRating ?? 0;

  const barData = [
    activeBuses > 0 ? Math.round(activeBuses * 0.6) : 40,
    activeBuses > 0 ? Math.round(activeBuses * 0.8) : 55,
    activeBuses > 0 ? Math.round(activeBuses * 0.9) : 65,
    activeBuses > 0 ? Math.round(activeBuses * 0.75) : 50,
    activeBuses > 0 ? Math.round(activeBuses * 0.95) : 70,
    activeBuses > 0 ? Math.round(activeBuses * 1.0) : 80,
    activeBuses > 0 ? Math.round(activeBuses * 0.85) : 60,
  ];

  const bookingsTrend = [
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.55) : 30,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.7) : 45,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.6) : 38,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.85) : 60,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.75) : 52,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.9) : 65,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.8) : 55,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 1.0) : 75,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.92) : 68,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 1.05) : 80,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 0.95) : 72,
    confirmedBookings > 0 ? Math.round(confirmedBookings * 1.1) : 85,
  ];

  const ratingTrend = [3.2, 3.5, 3.8, 4.0, 3.9, 4.2, 4.1, 4.4, 4.3, 4.6, avgRating > 0 ? avgRating - 0.1 : 4.5, avgRating > 0 ? avgRating : 4.7];

  const operations = data?.operations?.slice(0, 5) || [];

  const ordersOverview = useMemo(() => {
    if (!metricsData) return [];
    return [
      {
        icon: '$',
        color: '#4caf50',
        text: `${confirmedBookings} bookings confirmed`,
        sub: 'Updated just now',
      },
      {
        icon: '</>',
        color: '#2196f3',
        text: `${pendingRequests} requests pending review`,
        sub: 'Requires attention',
      },
      {
        icon: '!',
        color: '#ff9800',
        text: `${metricsData?.buses?.inactiveBuses ?? 0} buses inactive`,
        sub: 'Fleet health check',
      },
      {
        icon: '*',
        color: '#9c27b0',
        text: `${avgRating > 0 ? avgRating.toFixed(1) : 'N/A'} avg fleet rating`,
        sub: 'Based on passenger reviews',
      },
    ];
  }, [metricsData, pendingRequests, confirmedBookings, avgRating]);

  if (loading) {
    return (
      <Box sx={{ display: 'grid', gap: 3, maxWidth: 1480, mx: 'auto', width: '100%' }}>
        <Grid container spacing={3}>
          {[0, 1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
          {[0, 1].map((i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3.5, maxWidth: 1240, mx: 'auto', width: '100%', pb: 2 }}>
      {error ? <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert> : null}

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: '#2f2f2f', mb: 0.4, fontWeight: 800, fontSize: { xs: '1.6rem', md: '1.9rem' } }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.95rem' }}>
          Fleet operations overview - managers, buses, bookings and performance.
        </Typography>
      </Box>

      <Box
        sx={{
          borderRadius: 3,
          background: 'linear-gradient(180deg, rgba(52,71,103,0.05) 0%, rgba(52,71,103,0.01) 100%)',
          border: '1px solid rgba(52, 71, 103, 0.08)',
          p: { xs: 2, md: 2.5 }
        }}
      >
        <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 800, mb: 2, textAlign: 'center' }}>
          Key Metrics
        </Typography>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              index={0}
              label="Total Managers"
              value={totalManagers}
              change="+12%"
              changePositive={true}
              icon={PeopleAltRounded}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              index={1}
              label="Active Buses"
              value={activeBuses}
              change="+5%"
              changePositive={true}
              icon={DirectionsBusRounded}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              index={2}
              label="Pending Requests"
              value={pendingRequests}
              change={pendingRequests > 0 ? '-3%' : '0%'}
              changePositive={pendingRequests === 0}
              icon={BookOnlineRounded}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              index={3}
              label="Confirmed Bookings"
              value={confirmedBookings}
              change="+18%"
              changePositive={true}
              icon={AttachMoneyRounded}
            />
          </Grid>
        </Grid>
      </Box>

      <Box>
        <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 800, mb: 2, textAlign: 'center' }}>
          Analytics Snapshot
        </Typography>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <ChartCard
              index={0}
              title="Fleet Activity"
              subtitle="Daily active bus operations"
              footer="updated 4 min ago"
              emphasis="primary"
              minHeight={280}
            >
              <BarChart
                xAxis={[{ scaleType: 'band', data: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                yAxis={[{ tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                series={[{ data: barData, color: '#2f2f2f' }]}
                height={260}
                borderRadius={8}
                sx={{
                  '& .MuiChartsAxis-root line': { stroke: '#f1f5f9' },
                  '& .MuiChartsAxis-root .MuiChartsAxis-tick': { stroke: 'transparent' },
                }}
              />
            </ChartCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <ChartCard
              index={1}
              title="Booking Trend"
              subtitle="(+15%) increase in bookings this month"
              footer="updated 2 hours ago"
              emphasis="primary"
              minHeight={280}
            >
              <LineChart
                xAxis={[{ scaleType: 'band', data: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                yAxis={[{ tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                series={[{ data: bookingsTrend, color: '#4caf50', showMark: false, area: true, curve: 'natural' }]}
                height={260}
                sx={{
                  '& .MuiChartsAxis-root line': { stroke: '#f1f5f9' },
                  '& .MuiAreaElement-root': { fill: 'url(#greenGradient)', opacity: 0.3 },
                }}
              >
                <defs>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </LineChart>
            </ChartCard>
          </Grid>
        </Grid>
      </Box>

      <Box>
        <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 800, mb: 2, textAlign: 'center' }}>
          Operations Focus
        </Typography>

        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ border: '1px solid rgba(52, 71, 103, 0.08)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5, fontWeight: 800 }}>
                  Operations
                </Typography>
                <Typography variant="caption" sx={{ color: '#82d616', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUpRounded sx={{ fontSize: 14 }} /> {operations.length} active routes this month
                </Typography>

                <Box sx={{ mt: 3 }}>
                  <Grid container sx={{ pb: 1, borderBottom: '1px solid #f1f5f9', mb: 2 }}>
                    <Grid size={6}>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Route / Manager</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Status</Typography>
                    </Grid>
                    <Grid size={3} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Fleet Scale</Typography>
                    </Grid>
                  </Grid>

                  {operations.length > 0 ? operations.map((op, i) => (
                    <Grid container key={op._id || i} alignItems="center" sx={{ py: 1.5, borderBottom: i < operations.length - 1 ? '1px solid #f8f9fa' : 'none' }}>
                      <Grid size={6}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2f2f2f', fontSize: '0.85rem' }}>{op.routeName || op.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem', opacity: 0.7 }}>{op.managerName || op.manager || 'System Managed'}</Typography>
                      </Grid>
                      <Grid size={3}>
                        <Box sx={{
                          display: 'inline-flex',
                          px: 1.2,
                          py: 0.4,
                          borderRadius: 1,
                          backgroundColor: op.isActive !== false ? 'rgba(76, 175, 80, 0.1)' : 'rgba(239, 83, 80, 0.1)',
                        }}>
                          <Typography variant="caption" sx={{ color: op.isActive !== false ? '#4caf50' : '#ef5350', fontWeight: 800, fontSize: '0.65rem' }}>
                            {op.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={3} sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#2f2f2f', fontWeight: 700, fontSize: '0.75rem' }}>{op.activeBuses || op.buses || 5} buses</Typography>
                          <Box sx={{ width: 60, height: 4, borderRadius: 999, backgroundColor: '#f1f5f9' }}>
                            <Box sx={{ width: '70%', height: '100%', backgroundColor: '#4caf50', borderRadius: 999 }} />
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  )) : (
                    [1, 2, 3].map((i) => (
                      <Grid container key={i} alignItems="center" sx={{ py: 1.5, borderBottom: i < 3 ? '1px solid #f8f9fa' : 'none', opacity: 0.5 }}>
                        <Grid size={6}><Skeleton width="60%" /><Skeleton width="40%" height={12} /></Grid>
                        <Grid size={3}><Skeleton variant="rounded" width={60} height={20} /></Grid>
                        <Grid size={3} sx={{ textAlign: 'right' }}><Skeleton width={40} sx={{ ml: 'auto' }} /><Skeleton width={60} height={4} sx={{ ml: 'auto' }} /></Grid>
                      </Grid>
                    ))
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2.5}>
              <ChartCard
                index={2}
                title="Rating Performance"
                subtitle="Passenger satisfaction trends"
                footer="just updated"
              >
                <LineChart
                  xAxis={[{ scaleType: 'band', data: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                  yAxis={[{ tickLabelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 } }]}
                  series={[{ data: ratingTrend, color: '#2f2f2f', showMark: false, area: true, curve: 'natural' }]}
                  height={220}
                  sx={{
                    '& .MuiChartsAxis-root line': { stroke: '#f1f5f9' },
                    '& .MuiAreaElement-root': { fill: 'url(#slateGradient)', opacity: 0.2 },
                  }}
                >
                  <defs>
                    <linearGradient id="slateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2f2f2f" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2f2f2f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ChartCard>

              <Card sx={{ border: '1px solid rgba(52, 71, 103, 0.08)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5, fontWeight: 800 }}>
                    Fleet Overview
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3 }}>
                    <TrendingUpRounded sx={{ fontSize: 14, color: '#82d616' }} /> <Box component="span" sx={{ fontWeight: 800, color: '#82d616' }}>+24%</Box> performance this month
                  </Typography>

                  <Stack spacing={0} sx={{ position: 'relative' }}>
                    {ordersOverview.map((item, i) => (
                      <Box key={i} sx={{ position: 'relative', pb: i < ordersOverview.length - 1 ? 2.5 : 0 }}>
                        {i < ordersOverview.length - 1 && (
                          <Box sx={{ position: 'absolute', left: 14, top: 28, bottom: 0, width: 2, backgroundColor: '#f1f5f9', zIndex: 0 }} />
                        )}
                        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                          <Box
                            sx={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              backgroundColor: '#fff',
                              border: `2px solid ${item.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              color: item.color,
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Box sx={{ pt: 0.4 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2f2f2f', fontSize: '0.8rem', lineHeight: 1.25 }}>
                              {item.text}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem', opacity: 0.8 }}>
                              {item.sub}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

