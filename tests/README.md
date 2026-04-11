# AMBC Club RLS Test Suite

Comprehensive test suite to verify Row Level Security (RLS) policies and authentication workflows.

## 📋 Test Coverage

### 1. **Authentication Tests** (`auth.test.ts`)
- ✅ Sign in with valid credentials
- ✅ Sign in rejection for invalid credentials
- ✅ Session management (create/destroy)
- ✅ User role identification (admin vs member)

### 2. **Members Table RLS** (`members.test.ts`)
- ✅ SELECT: Members can view all profiles
- ✅ SELECT: Unauthenticated users blocked
- ✅ UPDATE: Members can update own profile
- ✅ UPDATE: Members cannot update others
- ✅ UPDATE: Admins can update any member
- ✅ INSERT: Admins can create members
- ✅ INSERT: Regular members blocked
- ✅ DELETE: Admins can delete members
- ✅ DELETE: Regular members blocked

### 3. **Chat Tables RLS** (`chat.test.ts`)
- ✅ Chat rooms: Create, view, delete
- ✅ Chat messages: Send, view, delete (participant checks)
- ✅ Participant verification
- ✅ Cross-user message deletion prevention

### 4. **Mini Blok RLS** (`mini-blok.test.ts`)
- ✅ Mini Blok: Create, update, delete (owner checks)
- ✅ Collaborators: Add, remove (owner + self-removal)
- ✅ Share tokens: Create, delete (owner checks)
- ✅ Admin override capabilities

### 5. **Admin Access** (`admin-access.test.ts`)
- ✅ Admin-only tables (8 tables verified)
- ✅ Admin override on member-owned data
- ✅ Regular member blocked from admin operations

### 6. **Unauthorized Access** (`unauthorized-access.test.ts`)
- ✅ Unauthenticated user blocking (read/write)
- ✅ SQL injection protection
- ✅ RLS silent blocking verification

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest dotenv
```

### 2. Environment Variables
Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional for admin operations
```

### 3. Create Test Users (First Time)
Test users are automatically created on first run:
- **Admin**: `test-admin@ambc.test` / `TestAdmin123!`
- **Member**: `test-member@ambc.test` / `TestMember123!`
- **Member2**: `test-member2@ambc.test` / `TestMember2123!`

## 📦 Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- auth.test.ts
npm test -- members.test.ts
npm test -- chat.test.ts
npm test -- mini-blok.test.ts
npm test -- admin-access.test.ts
npm test -- unauthorized-access.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Verbose Output
```bash
npm test -- --verbose
```

## 🔍 Test Structure

Each test file follows this pattern:

```typescript
describe("Feature Tests", () => {
  beforeAll(async () => {
    await globalSetup();        // Create test users
    await createTestData();     // Create test records
  });

  afterAll(async () => {
    await cleanupTestData();    // Clean up test records
    await globalTeardown();     // Optional: Remove test users
  });

  beforeEach(async () => {
    await signOut();            // Ensure clean state between tests
  });

  describe("Specific Functionality", () => {
    it("should do something", async () => {
      await signInAs("admin");  // Sign in as specific user
      // ... test logic ...
      await signOut();          // Clean up session
    });
  });
});
```

## 📊 Test Results

### Expected Results
All tests should **PASS** with the optimized RLS policies:
- ✅ Authentication works correctly
- ✅ RLS policies enforce proper access control
- ✅ Admin overrides work as expected
- ✅ Unauthorized access is blocked
- ✅ SQL injection attempts are prevented

### Failed Tests
If tests fail, check:
1. **Database Schema**: Run `get_database_schema` to verify tables/columns exist
2. **RLS Policies**: Verify policies are created correctly
3. **Test User Setup**: Check test users exist in `auth.users` and `members` tables
4. **Environment Variables**: Ensure `.env.local` has correct Supabase credentials

## 🛠️ Troubleshooting

### Issue: Test users not created
**Solution**: Run tests once to auto-create users, or manually create via Supabase dashboard.

### Issue: RLS blocking all operations
**Solution**: Verify RLS policies match the optimized versions. Check policy definitions with:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
```

### Issue: Tests timeout
**Solution**: Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000, // 60 seconds
```

### Issue: "Missing environment variables"
**Solution**: Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials.

## 📝 Adding New Tests

1. Create a new test file in `tests/` directory
2. Import helpers from `./setup`
3. Follow the existing test structure
4. Use `signInAs()` to switch between user roles
5. Always clean up created data in `afterAll()`
6. Run tests to verify they pass

Example:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { supabase, signInAs, signOut, globalSetup, globalTeardown } from "./setup";

describe("My New Feature Tests", () => {
  beforeAll(async () => {
    await globalSetup();
  });

  afterAll(async () => {
    await globalTeardown();
  });

  it("should test something", async () => {
    await signInAs("member");
    
    const { data, error } = await supabase
      .from("my_table")
      .select("*");
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    
    await signOut();
  });
});
```

## 🎯 Best Practices

1. **Always sign out** after each test to prevent state leakage
2. **Use beforeEach** to ensure clean state between tests
3. **Clean up test data** in `afterAll()` to prevent accumulation
4. **Test both positive and negative cases** (allowed + blocked operations)
5. **Use descriptive test names** that explain the expected behavior
6. **Verify error messages** for blocked operations
7. **Test edge cases** (null values, missing fields, etc.)

## 📈 Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 🔐 Security Notes

- Test users have predictable credentials - **DO NOT use in production**
- Service role key has full database access - **Keep it secret**
- Tests run against your actual Supabase project - **Use a development/staging instance**
- Test data is created and (optionally) cleaned up automatically

## 📚 Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Jest Guide](https://jestjs.io/docs/getting-started#via-ts-jest)
- [Supabase Auth Testing](https://supabase.com/docs/guides/auth/testing)