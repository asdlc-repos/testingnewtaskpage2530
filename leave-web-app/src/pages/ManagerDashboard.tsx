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
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import type { LeaveBalance, LeaveRequest } from '../types';

function statusColor(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'warning';
}

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const managerId = user!.id;

  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [ownRequests, setOwnRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pending, bal, myReqs] = await Promise.all([
        api.getPendingRequests(managerId),
        api.getBalance(managerId).catch(() => null),
        api.getRequests(managerId).catch(() => []),
      ]);
      setPendingRequests(pending);
      setBalance(bal);
      setOwnRequests(Array.isArray(myReqs) ? myReqs : []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [managerId]);

  const handleApprove = async (requestId: string) => {
    try {
      setActioningId(requestId);
      setActionError('');
      await api.approveRequest(requestId, managerId);
      void loadData();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to approve request');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActioningId(requestId);
      setActionError('');
      await api.rejectRequest(requestId, managerId);
      void loadData();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to reject request');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Leave Management — Manager: {managerId}
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

            {/* Manager's Leave Balance */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>My Leave Balance</Typography>
                  {balance ? (
                    <>
                      <Typography variant="h3" color="primary">
                        {balance.remainingDays}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">days remaining</Typography>
                    </>
                  ) : (
                    <Typography color="text.secondary">Not available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Pending Requests Summary */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Pending Requests Summary</Typography>
                  <Typography variant="h3" color="warning.main">
                    {pendingRequests.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">requests awaiting review</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Pending Leave Requests */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Pending Leave Requests</Typography>
                  {actionError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
                      {actionError}
                    </Alert>
                  )}
                  {pendingRequests.length === 0 ? (
                    <Typography color="text.secondary">No pending requests.</Typography>
                  ) : (
                    pendingRequests.map((req) => (
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {req.employeeName || req.employeeId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {req.startDate} → {req.endDate}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {req.reason}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Requested: {new Date(req.requestedAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {actioningId === req.id ? (
                              <CircularProgress size={24} />
                            ) : (
                              <>
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<ApproveIcon />}
                                  onClick={() => void handleApprove(req.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  startIcon={<RejectIcon />}
                                  onClick={() => void handleReject(req.id)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Manager's Own Requests */}
            {ownRequests.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>My Leave Requests</Typography>
                    {ownRequests.map((req) => (
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
                            <Typography variant="body2" color="text.secondary">
                              {req.reason}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Submitted: {new Date(req.requestedAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            color={statusColor(req.status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
