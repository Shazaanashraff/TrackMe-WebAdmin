import { Box, Card, CardContent, Divider, FormControlLabel, Switch, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

const settingSuggestions = [
  {
    title: 'Access & Security',
    items: [
      'Enforce password rotation every 90 days for managers.',
      'Configure optional MFA for privileged admin accounts.',
      'Set automatic session expiry with activity-based renewal.'
    ]
  },
  {
    title: 'Operations Alerts',
    items: [
      'Trigger alerts when any bus rating drops below 3.5.',
      'Notify super admin when manager cancellation rate exceeds threshold.',
      'Raise maintenance escalations for buses inactive > 48 hours.'
    ]
  },
  {
    title: 'Governance',
    items: [
      'Enable audit logging for manager CRUD and status changes.',
      'Publish monthly manager performance snapshots automatically.',
      'Define data retention for booking and review histories.'
    ]
  }
];

export function SettingsPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 0.8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#344767' }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: '#67748e' }}>
          Configure security and operational guardrails for your admin workspace.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {[
          { label: 'Security Policies', value: 3 },
          { label: 'Active Alerts', value: 2 },
          { label: 'Governance Rules', value: 3 },
          { label: 'Recommended Actions', value: 9 },
        ].map((item) => (
          <Grid key={item.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" sx={{ color: '#67748e', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ color: '#344767', fontWeight: 800, mt: 0.8 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 0.6, fontWeight: 800 }}>Super Admin Controls</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Recommended operational controls for a production-grade platform.
              </Typography>

              <Box sx={{ display: 'grid', gap: 1 }}>
                <FormControlLabel control={<Switch defaultChecked />} label="Enable manager audit trail" />
                <FormControlLabel control={<Switch defaultChecked />} label="Low-rating real-time alerts" />
                <FormControlLabel control={<Switch />} label="Mandatory MFA for managers" />
                <FormControlLabel control={<Switch defaultChecked />} label="Weekly operations digest" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ backgroundColor: 'background.paper', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 800 }}>Settings Suggestions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Suggested policies to improve reliability, compliance, and security posture.
              </Typography>
              {settingSuggestions.map((section, index) => (
                <Box key={section.title} sx={{ mb: index < settingSuggestions.length - 1 ? 2 : 0 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.8, fontWeight: 800, color: '#344767' }}>{section.title}</Typography>
                  {section.items.map((item) => (
                    <Typography key={item} variant="body2" color="text.secondary" sx={{ mb: 0.6 }}>
                      - {item}
                    </Typography>
                  ))}
                  {index < settingSuggestions.length - 1 ? <Divider sx={{ mt: 1.5 }} /> : null}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
