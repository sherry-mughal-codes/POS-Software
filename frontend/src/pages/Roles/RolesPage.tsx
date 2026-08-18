import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Check,
  RefreshCw,
  Plus,
  Building,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { userService } from '../../services/userService';
import { Role, Permission, User } from '../../types/auth';
import { useSettings } from '../../context/SettingsContext';

export const RolesPage: React.FC = () => {
  const { companyName } = useSettings();
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'user_scopes'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [activePermIds, setActivePermIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Create Role Modal state
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRolePermIds, setNewRolePermIds] = useState<number[]>([]);
  const [creatingRole, setCreatingRole] = useState<boolean>(false);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);

  // User Scope & Multi-Company state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userCompany, setUserCompany] = useState<string>(companyName || 'ApexPOS Enterprise Store');
  const [userDataScope, setUserDataScope] = useState<string>('ALL_COMPANY');
  const [userSelectedRoles, setUserSelectedRoles] = useState<number[]>([]);
  const [savingUserScope, setSavingUserScope] = useState<boolean>(false);
  const [userScopeSuccess, setUserScopeSuccess] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData, usersData] = await Promise.all([
        userService.getRoles(),
        userService.getPermissions(),
        userService.getUsers(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      setUsers(usersData);

      if (rolesData.length > 0 && selectedRoleId === null) {
        setSelectedRoleId(rolesData[0].id);
        setActivePermIds(rolesData[0].permissions.map((p) => p.id));
      }

      if (usersData.length > 0 && selectedUserId === null) {
        const firstUser = usersData[0];
        setSelectedUserId(firstUser.id);
        setUserCompany(firstUser.profile?.company || 'ApexPOS Enterprise Store');
        setUserDataScope(firstUser.profile?.data_scope || 'ALL_COMPANY');
        setUserSelectedRoles(firstUser.role_ids || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, selectedUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setActivePermIds(role.permissions.map((p) => p.id));
    setSaveSuccess(false);
  };

  const handleTogglePermission = (permId: number) => {
    if (activePermIds.includes(permId)) {
      setActivePermIds(activePermIds.filter((id) => id !== permId));
    } else {
      setActivePermIds([...activePermIds, permId]);
    }
    setSaveSuccess(false);
  };

  // Toggle all permissions within a specific category
  const handleToggleCategoryPermissions = (perms: Permission[], selectAll: boolean) => {
    const categoryIds = perms.map((p) => p.id);
    if (selectAll) {
      const merged = Array.from(new Set([...activePermIds, ...categoryIds]));
      setActivePermIds(merged);
    } else {
      setActivePermIds(activePermIds.filter((id) => !categoryIds.includes(id)));
    }
    setSaveSuccess(false);
  };

  const handleToggleNewRoleCategoryPermissions = (perms: Permission[], selectAll: boolean) => {
    const categoryIds = perms.map((p) => p.id);
    if (selectAll) {
      const merged = Array.from(new Set([...newRolePermIds, ...categoryIds]));
      setNewRolePermIds(merged);
    } else {
      setNewRolePermIds(newRolePermIds.filter((id) => !categoryIds.includes(id)));
    }
  };

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setError(null);
    try {
      await userService.updateRole(selectedRoleId, activePermIds);
      setSaveSuccess(true);
      const updatedRoles = await userService.getRoles();
      setRoles(updatedRoles);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save role permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setCreateRoleError('Please provide a role name.');
      return;
    }
    setCreatingRole(true);
    setCreateRoleError(null);
    try {
      const created = await userService.createRole({
        name: newRoleName.trim(),
        permission_ids: newRolePermIds,
      });
      const updatedRoles = await userService.getRoles();
      setRoles(updatedRoles);
      setSelectedRoleId(created.id);
      setActivePermIds(newRolePermIds);
      setIsCreateRoleModalOpen(false);
      setNewRoleName('');
      setNewRolePermIds([]);
    } catch (err: any) {
      setCreateRoleError(err?.message || 'Failed to create role.');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSelectUser = (u: User) => {
    setSelectedUserId(u.id);
    setUserCompany(u.profile?.company || 'ApexPOS Enterprise Store');
    setUserDataScope(u.profile?.data_scope || 'ALL_COMPANY');
    setUserSelectedRoles(u.role_ids || []);
    setUserScopeSuccess(false);
  };

  const handleSaveUserScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSavingUserScope(true);
    setError(null);
    try {
      await userService.updateUser(selectedUserId, {
        company: userCompany,
        data_scope: userDataScope,
        roles: userSelectedRoles,
      });
      setUserScopeSuccess(true);
      const updatedUsers = await userService.getUsers();
      setUsers(updatedUsers);
      setTimeout(() => setUserScopeSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update user company scope.');
    } finally {
      setSavingUserScope(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const selectedUserObj = users.find((u) => u.id === selectedUserId);

  // Group permissions by category
  const categorizedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    let category = 'System & Core';
    if (
      perm.codename.includes('pos') ||
      perm.codename.includes('sale') ||
      perm.codename.includes('drawer') ||
      perm.codename.includes('register') ||
      perm.codename.includes('discount')
    ) {
      category = 'POS & Register Operations';
    } else if (
      perm.codename.includes('product') ||
      perm.codename.includes('stock') ||
      perm.codename.includes('cost') ||
      perm.codename.includes('inventory')
    ) {
      category = 'Products & Inventory';
    } else if (
      perm.codename.includes('user') ||
      perm.codename.includes('role') ||
      perm.codename.includes('audit')
    ) {
      category = 'User Access & Security';
    } else if (
      perm.codename.includes('purchase') ||
      perm.codename.includes('payable') ||
      perm.codename.includes('supplier')
    ) {
      category = 'Purchasing & Payables';
    } else if (
      perm.codename.includes('customer') ||
      perm.codename.includes('receivable') ||
      perm.codename.includes('financial') ||
      perm.codename.includes('report') ||
      perm.codename.includes('account')
    ) {
      category = 'Financial & Accounting Reports';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Roles, Permissions & Company Scopes
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Define custom role capabilities, toggle module permissions with one click, and scope cloud tenant access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeSubTab === 'roles' && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setNewRoleName('');
                setNewRolePermIds([]);
                setCreateRoleError(null);
                setIsCreateRoleModalOpen(true);
              }}
            >
              Create New Role
            </Button>
          )}

          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            loading={loading}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          onClick={() => setActiveSubTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'roles' ? 'var(--primary-500)' : 'transparent',
            color: activeSubTab === 'roles' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={16} />
          Role Permission Matrix
        </button>

        <button
          onClick={() => setActiveSubTab('user_scopes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeSubTab === 'user_scopes' ? 'var(--primary-500)' : 'transparent',
            color: activeSubTab === 'user_scopes' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Building size={16} />
          Set User Company & Data Scope
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading roles and permissions configuration..." />
      ) : activeSubTab === 'roles' ? (
        /* TAB 1: Role Permissions Matrix */
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Roles Selector List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 0.5rem',
              }}
            >
              Configured Roles ({roles.length})
            </div>

            {roles.map((role) => {
              const isSelected = selectedRoleId === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary-400)' : 'var(--border-subtle)',
                    backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.08)' : undefined,
                    boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.15)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? 'var(--primary-400)' : 'var(--text-main)', margin: 0 }}>
                      {role.name}
                    </h4>
                    <Badge variant={role.name === 'Administrator' ? 'danger' : role.name === 'Manager' ? 'warning' : 'info'}>
                      {role.permissions.length} perms
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Users size={14} />
                    <span>{role.user_count} assigned user{role.user_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permissions Matrix for Selected Role */}
          {selectedRole && (
            <Card
              title={`${selectedRole.name} Permissions`}
              subtitle={`Grant or revoke capabilities for ${selectedRole.name} with module-level master checkboxes.`}
              icon={<ShieldCheck size={20} />}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {saveSuccess && <Badge variant="success">Saved Successfully</Badge>}
                  <Button variant="primary" loading={saving} onClick={handleSaveRole}>
                    Save Changes
                  </Button>
                </div>
              }
            >
              {error && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger)',
                    fontSize: '0.8125rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(categorizedPermissions).map(([category, perms]) => {
                  const categoryIds = perms.map((p) => p.id);
                  const isAllCategorySelected = categoryIds.length > 0 && categoryIds.every((id) => activePermIds.includes(id));
                  const isSomeCategorySelected = categoryIds.some((id) => activePermIds.includes(id)) && !isAllCategorySelected;

                  return (
                    <div key={category} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
                      {/* Module Header with Master Toggle */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-400)', margin: 0 }}>
                          {category}
                        </h4>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAllCategorySelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeCategorySelected;
                            }}
                            onChange={(e) => handleToggleCategoryPermissions(perms, e.target.checked)}
                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                          />
                          <span>
                            {isAllCategorySelected ? 'Uncheck All' : 'Select All'} ({perms.length})
                          </span>
                        </label>
                      </div>

                      {/* Permission Items */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: '0.625rem',
                        }}
                      >
                        {perms.map((perm) => {
                          const isGranted = activePermIds.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => handleTogglePermission(perm.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                padding: '0.625rem 0.875rem',
                                borderRadius: '0.5rem',
                                backgroundColor: isGranted ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-elevated)',
                                border: `1px solid ${isGranted ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '1.25rem',
                                  height: '1.25rem',
                                  borderRadius: '0.25rem',
                                  backgroundColor: isGranted ? 'var(--primary-500)' : 'transparent',
                                  border: `1px solid ${isGranted ? 'var(--primary-500)' : 'var(--border-medium)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  flexShrink: 0,
                                }}
                              >
                                {isGranted && <Check size={12} />}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: isGranted ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  {perm.name}
                                </span>
                                <code style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>
                                  {perm.codename}
                                </code>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* TAB 2: User Company & Data Scope */
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* User Selector List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 0.5rem',
              }}
            >
              Operator Accounts ({users.length})
            </div>

            {users.map((u) => {
              const isSelected = selectedUserId === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary-400)' : 'var(--border-subtle)',
                    backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.08)' : undefined,
                    boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.15)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: isSelected ? 'var(--primary-400)' : 'var(--text-main)', margin: 0 }}>
                      {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}
                    </h4>
                    <Badge variant={u.is_superuser ? 'danger' : u.roles[0] === 'Manager' ? 'warning' : 'info'}>
                      {u.roles[0] || 'User'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--primary-400)', marginTop: '0.25rem' }}>
                    {u.profile?.company || 'Default Store'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Scope Configuration Card */}
          {selectedUserObj && (
            <Card
              title={`Company Scope & Data Isolation: @${selectedUserObj.username}`}
              subtitle="Scope this user's data access and company branch affiliation for multi-tenant and cloud operations."
              icon={<Building size={20} />}
            >
              {userScopeSuccess && (
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '0.5rem',
                    color: 'var(--success)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>User company affiliation and data scope saved successfully.</span>
                </div>
              )}

              <form onSubmit={handleSaveUserScope} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Assigned Company / Store Branch *
                    </label>
                    <Input
                      value={userCompany}
                      onChange={(e) => setUserCompany(e.target.value)}
                      placeholder="e.g. ApexPOS Enterprise Store, Branch 2"
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Assigns user transactions and activity to this branch/company tenant.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                      Data Scope Visibility Boundary *
                    </label>
                    <select
                      value={userDataScope}
                      onChange={(e) => setUserDataScope(e.target.value)}
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      In multi-user cloud mode, restricts visibility to only transactions recorded by this operator.
                    </span>
                  </div>
                </div>

                {/* Role selection for this user */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Assigned Role(s) for @{selectedUserObj.username}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    {roles.map((role) => {
                      const isAssigned = userSelectedRoles.includes(role.id);
                      return (
                        <div
                          key={role.id}
                          onClick={() => {
                            if (isAssigned) {
                              setUserSelectedRoles(userSelectedRoles.filter((id) => id !== role.id));
                            } else {
                              setUserSelectedRoles([...userSelectedRoles, role.id]);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 0.875rem',
                            borderRadius: '0.5rem',
                            border: `1px solid ${isAssigned ? 'var(--primary-500)' : 'var(--border-subtle)'}`,
                            backgroundColor: isAssigned ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-elevated)',
                            color: isAssigned ? 'var(--primary-400)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <CheckCircle2 size={16} style={{ opacity: isAssigned ? 1 : 0.2 }} />
                          <span style={{ fontWeight: 600 }}>{role.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <Button type="submit" variant="primary" icon={<Save size={16} />} loading={savingUserScope}>
                    Save User Scope & Roles
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* Modal: Create New Role */}
      <Modal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        title="Create New Custom Role"
        subtitle="Define a custom authorization role with granular module permissions."
        maxWidth="680px"
      >
        {createRoleError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
            }}
          >
            {createRoleError}
          </div>
        )}

        <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
              Role Name *
            </label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g. Store Supervisor, Inventory Auditor, Shift Lead"
              required
            />
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingRight: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Select Role Permissions by Module:
            </div>

            {Object.entries(categorizedPermissions).map(([category, perms]) => {
              const categoryIds = perms.map((p) => p.id);
              const isAllSelected = categoryIds.length > 0 && categoryIds.every((id) => newRolePermIds.includes(id));

              return (
                <div key={category} style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-elevated)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-400)' }}>
                      {category}
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleToggleNewRoleCategoryPermissions(perms, e.target.checked)}
                        style={{ width: '0.9rem', height: '0.9rem', cursor: 'pointer' }}
                      />
                      <span>Select All ({perms.length})</span>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {perms.map((p) => {
                      const checked = newRolePermIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '0.375rem',
                            backgroundColor: checked ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: checked ? 'var(--text-main)' : 'var(--text-muted)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setNewRolePermIds(newRolePermIds.filter((id) => id !== p.id));
                              } else {
                                setNewRolePermIds([...newRolePermIds, p.id]);
                              }
                            }}
                            style={{ width: '0.9rem', height: '0.9rem', cursor: 'pointer' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsCreateRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creatingRole}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
