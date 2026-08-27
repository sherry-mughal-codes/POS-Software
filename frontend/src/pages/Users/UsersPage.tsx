import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  CheckCircle2,
  Check,
  Edit2,
  Power,
  Phone,
  Mail,
  Building,
  AlertCircle,
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
import { useToast } from '../../context/ToastContext';
import { formatErrorMessage } from '../../utils/formatError';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
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
  const [newSelectedRoles, setNewSelectedRoles] = useState<number[]>([]);

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
      showWarning('You cannot deactivate your own logged-in account.', 'Action Restricted');
      return;
    }

    try {
      await userService.toggleUserStatus(targetUser.id);
      showSuccess(`User ${targetUser.username} status updated.`, 'User Status');
      fetchUsersAndRoles();
    } catch (err: any) {
      showError(err?.message || 'Failed to change user status.', 'User Update Error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Compact Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            User Management
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Button
            variant="primary"
            icon={<UserPlus size={14} />}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={handleOpenCreateModal}
          >
            Create New User
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw size={13} />}
            loading={loading}
            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
            onClick={fetchUsersAndRoles}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Table Card */}
      <Card
        title="Registered System Users"
        icon={<Users size={16} />}
        action={
          <div style={{ width: '220px' }}>
            <Input
              type="text"
              placeholder="Search user, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={13} />}
            />
          </div>
        }
      >
        {loading ? (
          <LoadingSpinner label="Fetching user accounts..." />
        ) : error ? (
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            color: 'var(--danger)',
            fontSize: '0.875rem',
          }}>
            <div>{error}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>User</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Assigned Role(s)</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.45rem 0.6rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
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
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '1.75rem',
                          height: '1.75rem',
                          borderRadius: '0.375rem',
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

                    {/* Status */}
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem' }}>
                        <Button
                          variant="outline"
                          icon={<Edit2 size={13} />}
                          onClick={() => handleOpenEditModal(u)}
                          style={{ padding: '0.3rem 0.45rem', fontSize: '0.75rem' }}
                          title="Edit User"
                        />

                        <Button
                          variant={u.is_active ? 'outline' : 'primary'}
                          icon={<Power size={13} />}
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                          style={{
                            padding: '0.3rem 0.45rem',
                            fontSize: '0.75rem',
                            color: u.is_active ? 'var(--warning)' : 'var(--success)',
                            borderColor: u.is_active ? 'var(--warning-border)' : 'var(--success-border)',
                          }}
                          title={u.is_active ? 'Deactivate User' : 'Activate User'}
                        />
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

          <Input
            label="Phone Number"
            placeholder="+92 300 1234567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            icon={<Phone size={16} />}
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
                      padding: '0.625rem 0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary-500)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-elevated)',
                      color: isSelected ? 'var(--primary-400)' : 'var(--text-main)',
                      fontSize: '0.8125rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <span>{role.name}</span>
                    {isSelected && <Check size={14} style={{ color: 'var(--primary-400)' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              icon={<UserCheck size={16} />}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: @${selectedUser?.username}`}
        maxWidth="580px"
      >
        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div>{formError}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="First Name"
              placeholder="First name"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              placeholder="Last name"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="user@enterprise.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            icon={<Mail size={16} />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Company / Branch Assigned"
              placeholder="Store branch name"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              icon={<Building size={16} />}
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                Data Scope
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

          <Input
            label="Phone Number"
            placeholder="+92 300 1234567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            icon={<Phone size={16} />}
          />

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
