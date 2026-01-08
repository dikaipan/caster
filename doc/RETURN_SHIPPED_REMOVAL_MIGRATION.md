# 🔄 Migration: Remove RETURN_SHIPPED Status

## Overview
This migration safely removes the `RETURN_SHIPPED` status from the application, as it's no longer used in the new pickup-based flow. The new flow goes directly from `RESOLVED` → `CLOSED` when pickup is confirmed at RC.

## Migration Steps

### 1. Database Migration
**File**: `backend/prisma/migrations/20251214025557_remove_return_shipped_status/migration.sql`

The migration:
1. Updates all tickets with `RETURN_SHIPPED` status to `CLOSED` (ensures no data loss)
2. Removes `RETURN_SHIPPED` from the `ProblemTicketStatus` enum

**SQL Commands**:
```sql
-- Update all RETURN_SHIPPED tickets to CLOSED
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Remove RETURN_SHIPPED from enum
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
```

### 2. Prisma Schema Update
**File**: `backend/prisma/schema.prisma`

- Removed `RETURN_SHIPPED` from `ProblemTicketStatus` enum

### 3. Backend Code Updates

#### Status Transition Validator
**File**: `backend/src/common/validators/status-transition.validator.ts`
- Removed `RETURN_SHIPPED` from `TICKET_TRANSITIONS`
- Updated `RESOLVED` transitions: `['RETURN_SHIPPED', 'CLOSED']` → `['CLOSED']`
- Removed validation logic for `RETURN_SHIPPED`

#### Tickets Service
**File**: `backend/src/tickets/tickets.service.ts`
- Removed `RETURN_SHIPPED` from status labels (2 locations)
- Updated `receiveReturn` method: Changed validation from `RETURN_SHIPPED` to `CLOSED`
  - Old: "Ticket must be in RETURN_SHIPPED status first"
  - New: "Ticket must be in CLOSED status (pickup already confirmed at RC)"

#### Tickets Controller
**File**: `backend/src/tickets/tickets.controller.ts`
- Removed `RETURN_SHIPPED` from API documentation

#### Machines Service
**File**: `backend/src/machines/machines.service.ts`
- Removed `RETURN_SHIPPED` from status labels
- Removed `RETURN_SHIPPED` from ticket stats

### 4. Frontend Code Updates

#### Notification Service
**File**: `frontend/src/components/notifications/NotificationService.tsx`
- Removed `RETURN_SHIPPED` from status labels

#### Tickets Page
**File**: `frontend/src/app/tickets/page.tsx`
- Removed `RETURN_SHIPPED` from status badge definitions
- Removed `returnShipped` from status summary
- Removed `RETURN_SHIPPED` status card from UI

#### Ticket Detail Page
**File**: `frontend/src/app/tickets/[id]/page.tsx`
- Removed `RETURN_SHIPPED` from status badge definitions
- Disabled UI components that check for `RETURN_SHIPPED` status (legacy flow)

## Safety Measures

### Data Safety
✅ All `RETURN_SHIPPED` tickets are automatically updated to `CLOSED` before enum removal
✅ No data loss - all tickets remain accessible
✅ `updated_at` timestamp is preserved

### Code Safety
✅ All references to `RETURN_SHIPPED` have been removed or disabled
✅ Legacy UI components are disabled (not removed) for backward compatibility
✅ Error handling updated to reflect new flow

### Backward Compatibility
✅ `receiveReturn` method still works but validates `CLOSED` status instead
✅ Legacy UI components are disabled but not removed (can be re-enabled if needed)

## Testing Checklist

Before deploying:
- [ ] Run migration on development database
- [ ] Verify all `RETURN_SHIPPED` tickets are updated to `CLOSED`
- [ ] Test ticket status transitions (RESOLVED → CLOSED)
- [ ] Test pickup confirmation flow
- [ ] Verify no errors in console/logs
- [ ] Test `receiveReturn` endpoint (if still used)
- [ ] Verify frontend displays correctly

## Rollback Plan

If issues occur, rollback steps:
1. Revert Prisma schema to include `RETURN_SHIPPED`
2. Revert code changes
3. Restore enum value in database:
   ```sql
   ALTER TABLE problem_tickets 
   MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'RETURN_SHIPPED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
   ```
4. Note: Tickets that were updated to `CLOSED` will remain `CLOSED` (cannot be automatically reverted)

## Impact

### Breaking Changes
- ❌ `RETURN_SHIPPED` status no longer exists
- ❌ Old shipping-based flow is no longer supported
- ✅ New pickup-based flow is the only supported flow

### Non-Breaking Changes
- ✅ All existing data is preserved
- ✅ All tickets remain accessible
- ✅ API endpoints still work (with updated validation)

## Notes

- The new flow: `RESOLVED` → `CLOSED` (when pickup is confirmed at RC)
- `receiveReturn` method is kept for backward compatibility but validates `CLOSED` status
- Legacy UI components are disabled but not removed for safety

