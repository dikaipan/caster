# E2E Test Troubleshooting Guide

## Common Issues and Solutions

### 1. Database Connection Failures

#### Symptom
```
PrismaClientInitializationError: Can't reach database server at localhost:3306
```

#### Solutions

**Check MySQL Service**
```bash
# Windows
sc query MySQL80

# Start MySQL service if stopped
net start MySQL80
```

**Verify Database URL**
```bash
# Check .env file
cat .env | grep DATABASE_URL

# Test connection
mysql -h localhost -u root -p -e "SHOW DATABASES;"
```

**Create Test Database**
```sql
CREATE DATABASE IF NOT EXISTS hcm_test;
GRANT ALL PRIVILEGES ON hcm_test.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Test Data Conflicts

#### Symptom
```
Unique constraint failed on the constraint: `unique_username`
```

#### Solutions

**Ensure Unique Test Data**
```typescript
// Always use getUniqueId() for test data
const uniqueId = getUniqueId(); // Timestamp + random number
const username = `test_${uniqueId}`;
```

**Clean Up Before Tests**
```typescript
beforeAll(async () => {
    // Clean up any leftover data from previous failed tests
    await prisma.hitachiUser.deleteMany({
        where: { username: { startsWith: 'test_' } }
    });
});
```

**Check Cleanup Logic**
```typescript
afterAll(async () => {
    // Ensure cleanup runs even if tests fail
    await cleanupTestData(prisma, {
        userIds: createdUserIds,
        // ...
    });
});
```

### 3. Authentication Failures

#### Symptom
```
401 Unauthorized
Login failed: tokens.access_token is undefined
```

#### Solutions

**Verify Password Hashing**
```typescript
// Ensure password matches expected format
const password = 'Password123!'; // Must meet validation rules
const hashedPassword = await bcrypt.hash(password, 10);
```

**Check JWT Configuration**
```env
JWT_SECRET=your_test_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

**Debug Login Response**
```typescript
const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password });

console.log('Login response:', response.body);
console.log('Status:', response.status);
```

### 4. Foreign Key Constraint Errors

#### Symptom
```
Foreign key constraint failed on the field: `customer_bank_id`
```

#### Solutions

**Create Dependencies in Correct Order**
```typescript
// 1. Create organizations first
const org = await createTestOrganization(prisma, uniqueId);

// 2. Then create entities that depend on them
const machine = await createTestMachine(
    prisma,
    org.customerBank.id,  // Use created bank
    org.pengelolaOrg.id,  // Use created pengelola
    uniqueId
);
```

**Delete in Reverse Order**
```typescript
// Delete children first, then parents
await cleanupTestData(prisma, {
    ticketIds: [...],      // 1. Tickets
    cassetteIds: [...],    // 2. Cassettes
    machineIds: [...],     // 3. Machines
    userIds: [...],        // 4. Users
    pengelolaIds: [...],   // 5. Pengelola orgs
    customerBankIds: [...],// 6. Banks (last)
});
```

### 5. Test Timeouts

#### Symptom
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

#### Solutions

**Increase Timeout for Specific Test**
```typescript
it('should perform slow operation', async () => {
    // ...
}, 10000); // 10 seconds timeout
```

**Increase Global Timeout**
```javascript
// test/jest-e2e.json
{
    "testTimeout": 10000
}
```

**Optimize Test Performance**
```typescript
// Use runInBand for serial execution (slower but more stable)
npm run test:e2e -- --runInBand

// Or run specific slow test separately
npx jest --config ./test/jest-e2e.json test/slow-test.e2e-spec.ts
```

### 6. Port Already in Use

#### Symptom
```
Error: listen EADDRINUSE: address already in use :::3000
```

#### Solutions

**Kill Process on Port**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Use Different Port for Tests**
```typescript
// In test setup
const PORT = 3001; // Different from dev port
await app.listen(PORT);
```

### 7. Missing or Incorrect Test Data

#### Symptom
```
404 Not Found
Cannot read property 'id' of null
```

#### Solutions

**Verify Test Setup**
```typescript
beforeAll(async () => {
    // Log created entities
    console.log('Created bank:', customerBank.id);
    console.log('Created pengelola:', pengelolaOrg.id);
    
    // Verify entities exist
    const bank = await prisma.customerBank.findUnique({
        where: { id: customerBank.id }
    });
    expect(bank).toBeDefined();
});
```

**Check Cascading Deletes**
```prisma
// In schema.prisma
model Machine {
    customarBank CustomerBank @relation(fields: [customerBankId], references: [id], onDelete: Cascade)
}
```

### 8. Flaky Tests

#### Symptom
Tests pass sometimes and fail other times

#### Solutions

**Add Wait for Async Operations**
```typescript
// Wait for async operations to complete
await new Promise(resolve => setTimeout(resolve, 100));
```

**Use Deterministic Test Data**
```typescript
// Don't rely on random ordering
const users = await prisma.hitachiUser.findMany({
    orderBy: { createdAt: 'asc' } // Explicit ordering
});
```

**Run Tests in Band**
```bash
npm run test:e2e -- --runInBand
```

### 9. Prisma Client Not Generated

#### Symptom
```
Cannot find module '@prisma/client'
```

#### Solutions

**Generate Prisma Client**
```bash
npx prisma generate
```

**Verify Installation**
```bash
ls node_modules/@prisma/client
```

### 10. TypeScript Compilation Errors

#### Symptom
```
TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

#### Solutions

**Check Enum Values**
```typescript
// Use actual enum values from Prisma
import { HitachiUserRole, HitachiUserDepartment } from '@prisma/client';

// Correct
role: HitachiUserRole.SUPER_ADMIN

// Incorrect (if ADMIN doesn't exist)
role: HitachiUserRole.ADMIN
```

**Regenerate Prisma Client**
```bash
npx prisma generate
npm run build
```

## Getting Help

If you encounter an issue not covered here:

1. **Check Logs**: Review test output and application logs
2. **Enable Verbose Mode**: Run with `npm run test:e2e:verbose`
3. **Isolate the Test**: Run the failing test alone
4. **Check Database State**: Inspect database during test execution
5. **Review Recent Changes**: Check if schema or test setup changed
6. **Ask for Help**: Consult team members or create an issue

## Prevention Tips

1. **Always use `getUniqueId()`** for test data
2. **Always cleanup in `afterAll()`** hook
3. **Run tests locally** before pushing
4. **Use factories and helpers** for consistency
5. **Keep tests isolated** - don't depend on order
6. **Monitor CI/CD** pipeline for failures
7. **Update tests** when changing schemas or endpoints
