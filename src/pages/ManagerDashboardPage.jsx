import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Card, CardContent, Grid, Skeleton, Stack, Typography, Button
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { motion } from 'framer-motion';
import {
  DirectionsBusRounded,
  BookOnlineRounded,
  AttachMoneyRounded,
  HourglassEmptyRounded,
  TrendingUpRounded,
  AccessTimeRounded,
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
        borderRadius: 2,
        boxShadow: '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
        border: 'none',
        backgroundColor: '#fff',
        height: '100%',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-2px)' }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#6b7280',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: '#2f2f2f',
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: changePositive ? '#82d616' : '#ea0606',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                }}
              >
                {change}
              </Typography>
            </Stack>
          </Box>
          <Box
            sx={{
              width: 45,
              height: 45,
              borderRadius: '0.75rem',
              background: 'linear-gradient(310deg, #161616 0%, #4a4a4a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.12)',
              flexShrink: 0
            }}
          >
            <Icon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardPage({ refreshSignal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getManagerDashboard();
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshSignal]);

  const totalBuses = data?.fleet?.totalBuses || 0;
  const activeBuses = data?.fleet?.activeBuses || 0;
  const pendingReqs = data?.pendingRequests || 0;
  const confirmed = data?.bookings?.confirmedBookings || 0;
  const cancelled = data?.bookings?.cancelledBookings || 0;
  const revenue = data?.bookings?.totalRevenue || 0;

  const bookingTrend = [
    Math.max(0, confirmed - 20),
    Math.max(0, confirmed - 15),
    Math.max(0, confirmed - 10),
    Math.max(0, confirmed - 5),
    confirmed,
    confirmed + 2,
    confirmed + 5,
    confirmed + 8,
    confirmed + 12,
    confirmed + 15,
    confirmed + 18,
    confirmed + 22
  ];

  const recentActivity = [
    { icon: '$', color: '#82d616', text: `Revenue: ₹${Number(revenue).toLocaleString()}`, sub: 'Total booking earnings' },
    { icon: '✓', color: '#17c1e8', text: `${confirmed} bookings confirmed`, sub: 'Passenger journeys completed' },
    { icon: '!', color: '#fbcf33', text: `${pendingReqs} requests pending`, sub: 'Requires your approval' },
    { icon: '✗', color: '#ea0606', text: `${cancelled} bookings cancelled`, sub: 'Refund or dispute pending' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Grid container spacing={3}>
          {[0,1,2,3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={340} sx={{ borderRadius: 2 }} /></Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {error ? <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>{error}</Alert> : null}

      {/* Row 1: 4 Stat Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard index={0} label="Total Buses" value={totalBuses} change="+0%" changePositive={true} icon={DirectionsBusRounded} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard index={1} label="Active Buses" value={activeBuses} change={`${totalBuses > 0 ? Math.round(activeBuses / totalBuses * 100) : 0}%`} changePositive={activeBuses > 0} icon={DirectionsBusRounded} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard index={2} label="Pending Requests" value={pendingReqs} change={pendingReqs > 0 ? "Action" : "Clear"} changePositive={pendingReqs === 0} icon={HourglassEmptyRounded} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard index={3} label="Total Revenue" value={`₹${(revenue/1000).toFixed(1)}k`} change="+12%" changePositive={true} icon={AttachMoneyRounded} />
        </Grid>
      </Grid>

      {/* Row 2: Analytics Hub & Recent Events */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5 }}>
                 Bookings Trend
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 3 }}>
                Monthly confirmed performance overview
              </Typography>
              <LineChart
                xAxis={[{ scaleType: 'band', data: ['J','F','M','A','M','J','J','A','S','O','N','D'], tickLabelStyle: { fontSize: 10, fill: '#9ca3af', fontWeight: 700 } }]}
                yAxis={[{ tickLabelStyle: { fontSize: 10, fill: '#9ca3af', fontWeight: 700 } }]}
                series={[{ data: bookingTrend, color: '#82d616', showMark: false, area: true, curve: 'natural' }]}
                height={260}
                sx={{
                    '& .MuiChartsAxis-root line': { stroke: '#f8f9fa' },
                    '& .MuiAreaElement-root': { fill: 'url(#greenGradient3)', opacity: 0.5 },
                }}
              >
                <defs>
                    <linearGradient id="greenGradient3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82d616" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#82d616" stopOpacity={0}/>
                    </linearGradient>
                </defs>
              </LineChart>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5 }}>
                Recent Activities
              </Typography>
              <Typography variant="caption" sx={{ color: '#82d616', display: 'flex', alignItems: 'center', gap: 0.5, mb: 4 }}>
                <TrendingUpRounded sx={{ fontSize: 14 }} /> Performance is peaking this week
              </Typography>

              <Stack spacing={0} sx={{ position: 'relative' }}>
                {recentActivity.map((item, i) => (
                  <Box key={i} sx={{ position: 'relative', pb: i < recentActivity.length - 1 ? 4 : 0 }}>
                    {i < recentActivity.length - 1 && (
                      <Box sx={{ position: 'absolute', left: 14, top: 32, bottom: 0, width: 2, backgroundColor: '#f1f5f9' }} />
                    )}
                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                      <Box sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          border: `2px solid ${item.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.75rem',
                          color: item.color,
                        }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 900 }}>{item.icon}</Typography>
                      </Box>
                      <Box sx={{ pt: 0.5 }}>
                        <Typography variant="body2" sx={{ color: '#2f2f2f', lineHeight: 1.2 }}>{item.text}</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280', opacity: 0.8, textTransform: 'none', letterSpacing: 0 }}>{item.sub}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3: Fleet Distribution & Operations Table */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
           <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5 }}>
                Fleet Distribution
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 3 }}>
                Active vs available capacity
              </Typography>
              <BarChart
                xAxis={[{ scaleType: 'band', data: ['Active', 'Idle', 'Maint'], tickLabelStyle: { fontSize: 10, fill: '#9ca3af', fontWeight: 700 } }]}
                series={[{ data: [activeBuses, totalBuses - activeBuses, 2], color: '#2f2f2f' }]}
                height={220}
                borderRadius={4}
                sx={{
                    '& .MuiChartsAxis-root line': { stroke: '#f8f9fa' },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <Box sx={{ p: 3, pb: 0 }}>
              <Typography variant="subtitle1" sx={{ color: '#2f2f2f', mb: 0.5 }}>
                Recent Operations
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 2 }}>
                High priority tasks requiring review
              </Typography>
            </Box>
            
            <Box sx={{ mt: 1 }}>
                <Grid container sx={{ px: 3, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Grid size={4}><Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>TASK / BUS ID</Typography></Grid>
                  <Grid size={3}><Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>ASSIGNED</Typography></Grid>
                  <Grid size={3}><Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>STATUS</Typography></Grid>
                  <Grid size={2} sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem' }}>ACTION</Typography></Grid>
                </Grid>

                {[
                  { id: 'BUS-4021', task: 'Route Expansion', assigned: '2m ago', status: 'Pending', color: '#fbcf33' },
                  { id: 'BUS-8821', task: 'Maintenance Check', assigned: '1h ago', status: 'Alert', color: '#ea0606' },
                  { id: 'BUS-1102', task: 'Schedule Change', assigned: '3h ago', status: 'Review', color: '#17c1e8' },
                  { id: 'BUS-5531', task: 'Driver Swap', assigned: '5h ago', status: 'Pending', color: '#fbcf33' },
                ].map((row, i) => (
                  <Grid container key={i} sx={{ px: 3, py: 1.5, borderBottom: i < 3 ? '1px solid #f8f9fa' : 'none' }} alignItems="center">
                    <Grid size={4}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#2f2f2f', fontSize: '0.8rem' }}>{row.id}</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.7rem' }}>{row.task}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Typography variant="caption" sx={{ color: '#2f2f2f', fontWeight: 500 }}>{row.assigned}</Typography>
                    </Grid>
                    <Grid size={3}>
                      <Box sx={{ display: 'inline-flex', px: 1, py: 0.2, borderRadius: 1, border: `1px solid ${row.color}`, color: row.color, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        {row.status}
                      </Box>
                    </Grid>
                    <Grid size={2} sx={{ textAlign: 'right' }}>
                       <Typography sx={{ color: '#2f2f2f', fontWeight: 900, cursor: 'pointer', fontSize: 18 }}>...</Typography>
                    </Grid>
                  </Grid>
                ))}
            </Box>
            <Box sx={{ p: 2, textAlign: 'center' }}>
               <Button variant="text" sx={{ color: '#2f2f2f', fontWeight: 800, fontSize: '0.7rem' }}>View All Operations</Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

