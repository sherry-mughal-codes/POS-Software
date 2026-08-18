import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Power,
  Key,
  Lock,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { userService } from '../../services/userService';
import { User, Role, CreateUserData, UpdateUserData } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';

const formatErrorMessage = (err: any): string => {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Operation failed';
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([field, msgs]) => {
        const label = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
        const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
        return `${label}: ${text}`;
      })
      .join(' | ');
  }
  return err?.message || 'Operation failed';
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { companyName } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDataScope, setNewDataScope] = useState('ALL_COMPANY');
  const [newPhone, setNewPhone] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [newSelectedRoles, setNewSelectedRoles] = useState<number[]>([]);

  // Security test state
  const [securityTestResult, setSecurityTestResult] = useState<{ status: number; message: string; timestamp: string } | null>(null);
  const [testingSecurity, setTestingSecurity] = useState(false);

  const fetchUsersAndRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        userService.getUsers(),
        userService.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const handleOpenCreateModal = () => {
    setNewUsername('');
    setNewPassword('');
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewCompany(companyName || 'ApexPOS Enterprise Store');
    setNewDataScope('ALL_COMPANY');
    setNewPhone('');
    setNewPinCode('');
    // Default to Cashier role if exists
    const cashierRole = roles.find(r => r.name === 'Cashier');
    setNewSelectedRoles(cashierRole ? [cashierRole.id] : []);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setFormError('Username and password are required.');
      return;
    }
    if (newPassword.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateUserData = {
        username: newUsername,
        password: newPassword,
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        company: newCompany || companyName || 'ApexPOS Enterprise Store',
        data_scope: newDataScope,
        phone: newPhone,
        pin_code: newPinCode,
        roles: newSelectedRoles,
      };
      await userService.createUser(payload);
      setIsCreateModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: any) {
      setFormError(formatErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (targetUser: User) => {
    setSelectedUser(targetUser);
    setNewFirstName(targetUser.first_name || '');
    setNewLastName(targetUser.last_name || '');
    setNewEmail(targetUser.email || '');
    setNewCompany(targetUser.profile?.company || companyName || 'ApexPOS Enterprise Store');
    setNewDataScope(targetUser.profile?.data_scope || 'ALL_COMPANY');
    setNewPhone(targetUser.profile?.phone || '');
    setNewPinCode(targetUser.profile?.pin_code || '');
    setNewPassword('');
    setNewSelectedRoles(targetUser.role_ids || []);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: UpdateUserData = {
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        company: newCompany,
        data_scope: newDataScope,
        phone: newPhone,
        pin_code: newPinCode,
        roles: newSelectedRoles,
      };
      if (newPassword) {
        payload.password = newPassword;
      }
      await userService.updateUser(selectedUser.id, payload);
      setIsEditModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: any) {
      setFormError(formatErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot deactivate your own logged-in account.');
      return;
    }

    try {
      await userService.toggleUserStatus(targetUser.id);
      fetchUsersAndRoles();
    } catch (err: any) {
      alert(err?.message || 'Failed to change user status.');
    }
  };

  const handleTestSecurityEnforcement = async () => {
    setTestingSecurity(true);
    try {
      await userService.getUsers();
      setSecurityTestResult({
        status: 200,
        message: 'Request Allowed: Your current role is authorized to query User Management.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setSecurityTestResult({
        status: err?.status || 403,
        message: `Backend Rejected (${err?.status || 403} Forbidden): ${err?.message || 'Permission Denied by Django.'}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setTestingSecurity(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roles.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            User Management & System Access
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Configure POS operator accounts, assign roles, and control active credentials.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={handleOpenCreateModal}
          >
            Create New User
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            loading={loading}
            onClick={fetchUsersAndRoles}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Proof Card */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.5rem',
        borderLeft: '4px solid var(--primary-500)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={22} style={{ color: 'var(--primary-400)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Two-Tier Security Verification Probe</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Test how Django REST Framework enforces permissions independently from the frontend.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {securityTestResult && (
            <Badge variant={securityTestResult.status === 200 ? 'success' : 'danger'}>
              {securityTestResult.status === 200 ? '200 OK Authorized' : `${securityTestResult.status} Forbidden`}
            </Badge>
          )}
          <Button
            variant="outline"
            icon={<Key size={14} />}
            loading={testingSecurity}
            onClick={handleTestSecurityEnforcement}
          >
            Test API Enforcement
          </Button>
        </div>
      </div>

      {/* Users Table Card */}
      <Card
        title="Registered System Users"
        subtitle={`${filteredUsers.length} active/inactive accounts`}
        icon={<Users size={20} />}
        action={
          <div style={{ width: '260px' }}>
            <Input
              type="text"
              placeholder="Search user, name, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={15} />}
            />
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner label="Fetching user accounts..." />
        ) : error ? (
          <div style={{
            padding: '1.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <XCircle size={20} />
            <div>{error}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Assigned Role(s)</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>POS PIN</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* User info */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '2.25rem',
                          height: '2.25rem',
                          borderRadius: '0.5rem',
                          backgroundColor: u.is_active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.is_active ? 'var(--primary-400)' : 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>@{u.username}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--primary-400)' }}>{u.profile?.company || 'Default Store'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '0.8125rem' }}>{u.email || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{u.profile?.phone || '—'}</div>
                    </td>

                    {/* Roles */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {u.roles.length > 0 ? (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === 'Administrator' ? 'danger' : r === 'Manager' ? 'warning' : 'info'}
                            >
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="phase">No Role</Badge>
                        )}
                      </div>
                    </td>

                    {/* POS PIN */}
                    <td style={{ padding: '1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: 'var(--bg-elevated)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.25rem',
                        color: 'var(--text-muted)',
                      }}>
                        {u.profile?.pin_code ? '••••' : 'None'}
                      </code>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          onClick={() => handleOpenEditModal(u)}
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                        >
                          Edit
                        </Button>

                        <Button
                          variant={u.is_active ? 'outline' : 'primary'}
                          icon={<Power size={13} />}
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                          style={{
                            padding: '0.375rem 0.625rem',
                            fontSize: '0.75rem',
                            color: u.is_active ? 'var(--danger)' : undefined,
                            borderColor: u.is_active ? 'var(--danger-border)' : undefined,
                          }}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New System User"
        subtitle="Provide credentials and assign functional role permissions."
      >
        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <Input
                label="Username / Login ID *"
                placeholder="e.g. abdullah_mughal"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                required
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.25rem', display: 'block' }}>
                Login ID (spaces auto-convert to underscores)
              </span>
            </div>

            <div>
              <Input
                label="Password *"
                type="password"
                placeholder="Min. 4 chars"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', marginTop: '0.25rem', display: 'block' }}>
                POS user authentication password
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="First Name"
              placeholder="Ahmed"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              placeholder="Mughal"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="operator@company.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            icon={<Mail size={16} />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Company / Store Branch *
              </label>
              <Input
                placeholder="e.g. ApexPOS Enterprise Store"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Data Scope Access *
              </label>
              <select
                value={newDataScope}
                onChange={(e) => setNewDataScope(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="ALL_COMPANY" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                  All Company Data (Full Store Access)
                </option>
                <option value="OWN_DATA" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                  Own User / Terminal Data Only (Cloud Scoped)
                </option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Phone Number"
              placeholder="+92 300 1234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              icon={<Phone size={16} />}
            />
            <Input
              label="Quick POS Unlock PIN"
              placeholder="4-digit PIN"
              maxLength={6}
              value={newPinCode}
              onChange={(e) => setNewPinCode(e.target.value)}
              icon={<Lock size={16} />}
            />
          </div>

          {/* Role selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Assigned Role(s)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {roles.map((role) => {
                const isSelected = newSelectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNewSelectedRoles(newSelectedRoles.filter((id) => id !== role.id));
                      } else {
                        setNewSelectedRoles([...newSelectedRoles, role.id]);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${isSelected ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
                      color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                    }}
                  >
                    <CheckCircle2 size={15} style={{ opacity: isSelected ? 1 : 0.2 }} />
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: @${selectedUser?.username}`}
        subtitle="Modify profile details, POS credentials, and assigned roles."
      >
        {formError && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="First Name"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            icon={<Mail size={16} />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Company / Store Branch *
              </label>
              <Input
                placeholder="e.g. ApexPOS Enterprise Store"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Data Scope Access *
              </label>
              <select
                value={newDataScope}
                onChange={(e) => setNewDataScope(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '0.375rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="ALL_COMPANY" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                  All Company Data (Full Store Access)
                </option>
                <option value="OWN_DATA" style={{ backgroundColor: 'var(--bg-sidebar)', color: '#fff' }}>
                  Own User / Terminal Data Only (Cloud Scoped)
                </option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Phone Number"
              placeholder="+92 300 1234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              icon={<Phone size={16} />}
            />
            <Input
              label="Quick POS Unlock PIN"
              maxLength={6}
              value={newPinCode}
              onChange={(e) => setNewPinCode(e.target.value)}
              icon={<Lock size={16} />}
            />
          </div>

          <Input
            label="Reset Password (Leave blank to keep current)"
            type="password"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          {/* Role selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Assigned Role(s)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {roles.map((role) => {
                const isSelected = newSelectedRoles.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNewSelectedRoles(newSelectedRoles.filter((id) => id !== role.id));
                      } else {
                        setNewSelectedRoles([...newSelectedRoles, role.id]);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${isSelected ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
                      color: isSelected ? 'var(--primary-400)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                    }}
                  >
                    <CheckCircle2 size={15} style={{ opacity: isSelected ? 1 : 0.2 }} />
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
