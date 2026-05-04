import { useEffect, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { LeaveBalance, LeaveRequest } from '../types';

function statusColor(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const employeeId = user!.id;

  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [bal, reqs] = await Promise.all([
        api.getBalance(employeeId),
        api.getRequests(employeeId),
      ]);
      setBalance(bal);
      setRequests(reqs);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(startDate) > new Date(endDate)) {
      setSubmitError('Start date must be before or equal to end date');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError('');
      await api.submitRequest(employeeId, { startDate, endDate, reason });
      setSubmitSuccess('Leave request submitted successfully!');
      setStartDate('');
      setEndDate('');
      setReason('');
      void loadData();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Leave Management — Employee: {employeeId}
          </Typography>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Sign Out
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
              </Grid>
            )}

            {/* Leave Balance */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Leave Balance</Typography>
                  <Typography variant="h3" color="primary">
                    {balance?.remainingDays ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">days remaining</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Submit Leave Request */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Submit Leave Request</Typography>
                  {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                      {submitError}
                    </Alert>
                  )}
                  {submitSuccess && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess('')}>
                      {submitSuccess}
                    </Alert>
                  )}
                  <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Start Date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="End Date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          required
                          inputProps={{ min: startDate }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Reason"
                          multiline
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          required
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={submitting}
                          startIcon={submitting ? <CircularProgress size={16} /> : null}
                        >
                          {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* My Leave Requests */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>My Leave Requests</Typography>
                  {requests.length === 0 ? (
                    <Typography color="text.secondary">No leave requests submitted yet.</Typography>
                  ) : (
                    requests.map((req) => (
                      <Box
                        key={req.id}
                        sx={{
                          p: 2,
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="body1">
                              {req.startDate} → {req.endDate}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {req.reason}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Submitted: {new Date(req.requestedAt).toLocaleString()}
                            </Typography>
                            {req.reviewedAt && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Reviewed by {req.reviewedBy} on {new Date(req.reviewedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            color={statusColor(req.status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}
