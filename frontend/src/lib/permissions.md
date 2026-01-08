# Permission System Documentation

## Overview

This document describes the centralized permission system used throughout the application. **Always use the utility functions from `@/lib/permissions` instead of inline permission checks** to ensure consistency and security.

## User Types

The system has three main user types:

1. **HITACHI** - Internal Hitachi users (Repair Center staff)
2. **PENGELOLA** - Vendor/Manager users
3. **BANK** - Customer Bank users (read-only)

## Roles

### Hitachi Roles
- `SUPER_ADMIN` - Full system access
- `RC_MANAGER` - Repair Center Manager
- `RC_STAFF` - Repair Center Staff

### Pengelola Roles
- `ADMIN` - Can manage pengelola users
- `SUPERVISOR` - Supervisor level

### Bank Roles
- `VIEWER` - Read-only access

## Permission Functions

### Basic User Type Checks

```typescript
import { isHitachiUser, isPengelolaUser, isBankUser } from '@/lib/permissions';

// Check user type
if (isHitachiUser(user)) { ... }
if (isPengelolaUser(user)) { ... }
if (isBankUser(user)) { ... }
```

### Role Checks

```typescript
import { isSuperAdmin, isRCManager, isRCStaff, isPengelolaAdmin } from '@/lib/permissions';

// Check specific roles
if (isSuperAdmin(user)) { ... }        // Hitachi SUPER_ADMIN only
if (isRCManager(user)) { ... }          // Hitachi RC_MANAGER only
if (isRCStaff(user)) { ... }            // Hitachi RC_STAFF only
if (isPengelolaAdmin(user)) { ... }     // Pengelola ADMIN only
```

### Admin Access

```typescript
import { isAdmin } from '@/lib/permissions';

// Check if user has admin access
// Returns true only for Hitachi SUPER_ADMIN or RC_MANAGER
// IMPORTANT: Pengelola ADMIN is NOT considered admin for system-wide features
if (isAdmin(user)) { ... }
```

### Feature-Specific Permissions

```typescript
import { 
  canManageHitachiUsers,
  canManagePengelolaUsers,
  canAccessAdminSettings,
  canAccessRepairCenter,
  canViewAuditLogs
} from '@/lib/permissions';

// Check specific permissions
if (canManageHitachiUsers(user)) { ... }      // Only Hitachi SUPER_ADMIN
if (canManagePengelolaUsers(user)) { ... }    // Hitachi SUPER_ADMIN or Pengelola ADMIN
if (canAccessAdminSettings(user)) { ... }     // Hitachi SUPER_ADMIN or RC_MANAGER
if (canAccessRepairCenter(user)) { ... }      // Any Hitachi user
if (canViewAuditLogs(user)) { ... }           // Only Hitachi SUPER_ADMIN
```

## Important Rules

### ❌ DO NOT

1. **Don't check role alone without userType:**
   ```typescript
   // ❌ WRONG - Pengelola ADMIN would pass this check
   if (user?.role === 'SUPER_ADMIN') { ... }
   ```

2. **Don't use inline permission checks:**
   ```typescript
   // ❌ WRONG - Inconsistent and error-prone
   if (user?.userType === 'HITACHI' && user?.role === 'SUPER_ADMIN') { ... }
   ```

3. **Don't assume Pengelola ADMIN has system admin access:**
   ```typescript
   // ❌ WRONG - Pengelola ADMIN is NOT system admin
   const isAdmin = user?.role === 'ADMIN';
   ```

### ✅ DO

1. **Always use permission utilities:**
   ```typescript
   // ✅ CORRECT - Centralized and consistent
   import { isAdmin } from '@/lib/permissions';
   if (isAdmin(user)) { ... }
   ```

2. **Use feature-specific permission functions:**
   ```typescript
   // ✅ CORRECT - Clear intent
   import { canAccessAdminSettings } from '@/lib/permissions';
   if (canAccessAdminSettings(user)) { ... }
   ```

3. **Check both userType and role when needed:**
   ```typescript
   // ✅ CORRECT - Using utility function that checks both
   import { isSuperAdmin } from '@/lib/permissions';
   if (isSuperAdmin(user)) { ... }  // Checks userType === 'HITACHI' AND role === 'SUPER_ADMIN'
   ```

## Settings Page Access

- **All users**: Can access Profile and Security tabs
- **Hitachi Admin** (SUPER_ADMIN, RC_MANAGER): Can access all admin tabs (Users, Banks, Vendors, Assignments, Data, SLA)
- **Pengelola users**: Only Profile and Security
- **Bank users**: Only Profile and Security

## Examples

### Example 1: Settings Page

```typescript
import { isAdmin } from '@/lib/permissions';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const canAccessAdmin = isAdmin(user);
  
  return (
    <>
      <TabsTrigger value="profile">Profile</TabsTrigger>
      <TabsTrigger value="security">Security</TabsTrigger>
      {canAccessAdmin && (
        <>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          {/* ... other admin tabs */}
        </>
      )}
    </>
  );
}
```

### Example 2: Sidebar Menu

```typescript
import { isSuperAdmin, isHitachiUser } from '@/lib/permissions';

const menuItems = items.filter(item => {
  if (item.adminOnly && !isSuperAdmin(user)) return false;
  if (item.hitachiOnly && !isHitachiUser(user)) return false;
  return true;
});
```

### Example 3: Conditional Rendering

```typescript
import { canManageHitachiUsers } from '@/lib/permissions';

{canManageHitachiUsers(user) && (
  <Button onClick={handleCreateHitachiUser}>
    Create Hitachi User
  </Button>
)}
```

## Migration Guide

If you find inline permission checks in the codebase, migrate them to use the utility functions:

```typescript
// Before
const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'RC_MANAGER';
const isHitachi = user?.userType === 'HITACHI';

// After
import { isAdmin, isHitachiUser } from '@/lib/permissions';
const canAccessAdmin = isAdmin(user);
const isHitachi = isHitachiUser(user);
```

## Security Notes

1. **Frontend permission checks are for UX only** - Always validate permissions on the backend
2. **Never trust client-side checks** - Backend must enforce all permissions
3. **Permission utilities prevent common mistakes** - Using them reduces security vulnerabilities
4. **Consistent checks** - All permission logic is centralized, making it easier to audit and maintain

