import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, Check, RefreshCw } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { userService } from '../../services/userService';
import { Role, Permission } from '../../types/auth';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [activePermIds, setActivePermIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        userService.getRoles(),
        userService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0 && selectedRoleId === null) {
        setSelectedRoleId(rolesData[0].id);
        setActivePermIds(rolesData[0].permissions.map((p) => p.id));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load roles and permissions.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

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

  const handleSaveRole = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setError(null);
    try {
      await userService.updateRole(selectedRoleId, activePermIds);
      setSaveSuccess(true);
      // Refresh roles
      const updatedRoles = await userService.getRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      setError(err?.message || 'Failed to save role permissions.');
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Group permissions by category
  const categorizedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    let category = 'System & Core';
    if (perm.codename.includes('pos') || perm.codename.includes('sale') || perm.codename.includes('drawer') || perm.codename.includes('register') || perm.codename.includes('discount')) {
      category = 'POS & Register Operations';
    } else if (perm.codename.includes('product') || perm.codename.includes('stock') || perm.codename.includes('cost')) {
      category = 'Products & Inventory';
    } else if (perm.codename.includes('user') || perm.codename.includes('role') || perm.codename.includes('audit')) {
      category = 'User Access & Security';
    } else if (perm.codename.includes('purchase') || perm.codename.includes('financial') || perm.codename.includes('report')) {
      category = 'Purchasing & Financial Reports';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Roles & Permission Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Define role boundaries, assign granular capabilities, and enforce least-privilege security.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RefreshCw size={16} />}
          loading={loading}
          onClick={fetchData}
        >
          Refresh Roles
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading permission matrix..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Roles Selector List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 0.5rem' }}>
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
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? 'var(--primary-400)' : 'var(--text-main)' }}>
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
              subtitle={`Grant or revoke specific business operations for ${selectedRole.name}`}
              icon={<ShieldCheck size={20} />}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {saveSuccess && (
                    <Badge variant="success">Saved Successfully</Badge>
                  )}
                  <Button
                    variant="primary"
                    loading={saving}
                    onClick={handleSaveRole}
                  >
                    Save Changes
                  </Button>
                </div>
              }
            >
              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  fontSize: '0.8125rem',
                  marginBottom: '1.25rem',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(categorizedPermissions).map(([category, perms]) => (
                  <div key={category} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-400)', marginBottom: '0.75rem' }}>
                      {category}
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '0.625rem',
                    }}>
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
                            <div style={{
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
                            }}>
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
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
