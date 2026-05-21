import { Card, CardContent, Typography } from '@mui/material';

export function ManagerSettingsPage() {
  return (
    <Card sx={{ border: '1px solid rgba(100, 116, 139, 0.24)', maxWidth: 700 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>Manager Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Profile editing and organization-level settings will be expanded in the next increment.
        </Typography>
      </CardContent>
    </Card>
  );
}
