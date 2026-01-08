# E2E Testing Guide

## Overview

This guide provides comprehensive documentation for End-to-End (E2E) testing in the HCM Backend application. E2E tests verify complete workflows and API endpoints by testing the application as a whole, including database interactions.

## Test Coverage

### Current E2E Test Modules

| Module | Test File | Coverage |
|--------|-----------|----------|
| Authentication | `auth.e2e-spec.ts` | Login, refresh tokens, logout, profile |
| Users | `users.e2e-spec.ts` | CRUD operations for HitachiUser & PengelolaUser |
| Cassettes | `cassettes.e2e-spec.ts` | CRUD, QR codes, filtering, status updates |
| Machines | `machines.e2e-spec.ts` | CRUD, analytics, filtering by bank/pengelola |
| Banks | `banks.e2e-spec.ts` |  CRUD, pengelola assignments, analytics |
| Tickets | `tickets.e2e-spec.ts` | Full ticket lifecycle |
| Repairs | `repairs.e2e-spec.ts` | Complete repair workflow |
| Bank Customers | `bank-customers.e2e-spec.ts` | CRUD, statistics |
| Preventive Maintenance | `preventive-maintenance.e2e-spec.ts` | Scheduling, Assignment, Execution workflows |
| Pengelola | `pengelola.e2e-spec.ts` | Organization & User Management |
| Warranty | `warranty.e2e-spec.ts` | Configuration, Status checks |
| Analytics | `analytics.e2e-spec.ts` | Dashboard metrics verification |
| Audit | `audit.e2e-spec.ts` | Audit log retrieval and access control |
| Data Management | `data-management.e2e-spec.ts` | Database stats, backup creation, restore validation |
| Health | `health.e2e-spec.ts` | System liveness and readiness checks |
| Import | `import.e2e-spec.ts` | Bulk import (JSON/CSV) & Template downloads |

## Running E2E Tests

### Prerequisites

1. **Database Setup**: Ensure MySQL is running and accessible
2. **Environment Variables**: Configure `.env` file with test database URL
3. **Dependencies**: Run `npm install` to install all dependencies

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests for CI (with coverage, sequential execution)
npm run test:e2e:ci

# Run E2E tests in watch mode (development)
npm run test:e2e:watch

# Run E2E tests with verbose output (for debugging)
npm run test:e2e:verbose
```

### Environment Configuration

Create a `.env` file (or use `.env.test`) for E2E testing:

```env
DATABASE_URL="mysql://root:password@localhost:3306/hcm_test"
JWT_SECRET="test_jwt_secret"
JWT_REFRESH_SECRET="test_refresh_secret"
NODE_ENV="test"
```

## Writing E2E Tests

### Using Test Helpers

The project provides reusable test helpers in `test/test-helpers.ts`:

```typescript
import {
    getUniqueId,
    createTestAdminUser,
    createTestPengelolaUser,
    createTestOrganization,
    createTestMachine,
    createTestCassette,
    loginUser,
    cleanupTestData,
    setupTestApp,
} from './test-helpers';
```

### Test Structure Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import {
    getUniqueId,
    setupTestApp,
    cleanupTestData,
    // ... other helpers
} from './test-helpers';

describe('MyModule (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let uniqueId: string;
    let token: string;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await setupTestApp(moduleFixture);
        prisma = app.get(PrismaService);
        uniqueId = getUniqueId();

        // Setup test data
        // ...
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData(prisma, {
            // ... IDs to cleanup
        });
        await app.close();
    });

    describe('GET /api/v1/my-endpoint', () => {
        it('should return expected data', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/my-endpoint')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body).toHaveProperty('data');
        });
    });
});
```

### Best Practices

#### 1. Use Unique Test Data

Always use `getUniqueId()` to generate unique identifiers:

```typescript
const uniqueId = getUniqueId();
const username = `test_user_${uniqueId}`;
const bankCode = `BANK-${uniqueId}`;
```

#### 2. Proper Test Data Cleanup

Use `cleanupTestData()` helper in `afterAll()`:

```typescript
afterAll(async () => {
    await cleanupTestData(prisma, {
        ticketIds: [ticketId],
        cassetteIds: [cassetteId],
        machineIds: [machineId],
        userIds: [userId],
        pengelolaIds: [pengelolaId],
        customerBankIds: [bankId],
    });
    await app.close();
});
```

#### 3. Use Test Fixtures

Leverage predefined test fixtures from `test/test-fixtures.ts`:

```typescript
import { TEST_USERS, TEST_PASSWORD, TEST_MACHINES } from './test-fixtures';

const admin = await createTestAdminUser(prisma, uniqueId, {
    role: TEST_USERS.SUPER_ADMIN.role,
});
```

#### 4. Factory Functions

Use factory functions for common test entities:

```typescript
// Create organization structure
const org = await createTestOrganization(prisma, uniqueId, 'PREFIX');

// Create users
const admin = await createTestAdminUser(prisma, uniqueId);
const pengelola = await createTestPengelolaUser(prisma, org.pengelolaOrg.id, uniqueId);

// Login
const token = await loginUser(app, admin.user.username, TEST_PASSWORD);
```

## CI/CD Integration

### GitHub Actions Workflow

The project uses GitHub Actions for automated E2E testing. The workflow is defined in `.github/workflows/e2e-tests.yml`.

### Workflow Triggers

- **Pull Requests**: Automatically runs on PRs to `main` or `develop`
- **Push**: Runs on pushes to `main` or `develop`
- **Manual**: Can be triggered manually via workflow_dispatch

### Workflow Steps

1. **Setup**: Checkout code, setup Node.js
2. **Database**: Start MySQL service
3. **Dependencies**: Install npm packages
4. **Migrations**: Run Prisma migrations
5. **Tests**: Execute E2E tests with coverage
6. **Reports**: Upload test results and coverage reports

## Debugging E2E Tests

### Verbose Output

Run tests with verbose output to see detailed information:

```bash
npm run test:e2e:verbose
```

### Individual Test File

Run a specific test file:

```bash
npx jest --config ./test/jest-e2e.json test/auth.e2e-spec.ts
```

### Individual Test

Run a specific test:

```bash
npx jest --config ./test/jest-e2e.json -t "should login HitachiUser with valid credentials"
```

### Database State

Inspect database state during test execution:

```typescript
beforeEach(async () => {
    const users = await prisma.hitachiUser.findMany();
    console.log('Current users:', users.length);
});
```

## Common Issues

See [TEST_TROUBLESHOOTING.md](./TEST_TROUBLESHOOTING.md) for detailed troubleshooting guide.

## Coverage Reports

Coverage reports are generated when running `npm run test:e2e:ci` and saved to `backend/coverage/`.

View coverage report:

```bash
# Open coverage report in browser
start coverage/lcov-report/index.html   # Windows
open coverage/lcov-report/index.html    # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

## Contributing

When adding new modules or features:

1. Create corresponding E2E test file in `test/`
2. Follow the existing test structure pattern
3. Use test helpers and fixtures for consistency
4. Ensure proper cleanup in `afterAll()`
5. Run tests locally before pushing
6. Verify CI/CD pipeline passes

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
