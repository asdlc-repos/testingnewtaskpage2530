import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const EMPLOYEE_IDS = ['E001', 'E002', 'E003', 'E004', 'E005'];
const MANAGER_IDS = ['M001', 'M002'];

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = userId.trim().toUpperCase();
    if (role === 'employee' && !EMPLOYEE_IDS.includes(id)) {
      setError(`Invalid employee ID. Valid IDs: ${EMPLOYEE_IDS.join(', ')}`);
      return;
    }
    if (role === 'manager' && !MANAGER_IDS.includes(id)) {
      setError(`Invalid manager ID. Valid IDs: ${MANAGER_IDS.join(', ')}`);
      return;
    }
    login(id, role);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Card sx={{ width: 400, p: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Leave Management
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to access your dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Role</FormLabel>
              <RadioGroup
                row
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as 'employee' | 'manager');
                  setUserId('');
                  setError('');
                }}
              >
                <FormControlLabel value="employee" control={<Radio />} label="Employee" />
                <FormControlLabel value="manager" control={<Radio />} label="Manager" />
              </RadioGroup>
            </FormControl>

            <TextField
              fullWidth
              label={role === 'employee' ? 'Employee ID' : 'Manager ID'}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError('');
              }}
              placeholder={role === 'employee' ? 'e.g. E001' : 'e.g. M001'}
              sx={{ mb: 2 }}
              required
            />

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {role === 'employee'
                ? `Available: ${EMPLOYEE_IDS.join(', ')}`
                : `Available: ${MANAGER_IDS.join(', ')}`}
            </Typography>

            <Button type="submit" variant="contained" fullWidth size="large">
              Sign In
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
