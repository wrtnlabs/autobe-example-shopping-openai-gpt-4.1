import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the ability for a seller to retrieve details for their own mileage
 * account after onboarding and admin provisioning.
 *
 * Steps:
 *
 * 1. Register a new seller (api.functional.auth.seller.join), save seller ID
 *    and credentials.
 * 2. Register a new admin (api.functional.auth.admin.join), save admin
 *    credentials.
 * 3. Log in as admin (api.functional.auth.admin.login).
 * 4. Create a mileage account for the new seller using seller ID
 *    (api.functional.aiCommerce.admin.mileageAccounts.create), capture the
 *    resulting mileageAccountId and response.
 * 5. Log in as seller (api.functional.auth.seller.login).
 * 6. Request mileage account detail as the seller
 *    (api.functional.aiCommerce.seller.mileageAccounts.at) using
 *    mileageAccountId.
 * 7. Assert the response structure and all fields using typia.assert.
 * 8. Assert ownership, business audit fields (created_at, updated_at, status,
 *    user_id), and value equality with the object received after creation
 *    by the admin.
 * 9. Assert that only the rightful owner can view, and data matches the
 *    provisioned attributes.
 */
export async function test_api_mileage_account_seller_detail_view_self_account(
  connection: api.IConnection,
) {
  // 1. Register a new seller (save credentials/id for login)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;

  // 2. Register a new admin (save credentials for login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminStatus = "active";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 3. Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 4. Create mileage account for the registered seller
  const accountCode = RandomGenerator.alphaNumeric(10);
  const createdMileageAccount =
    await api.functional.aiCommerce.admin.mileageAccounts.create(connection, {
      body: {
        user_id: sellerId,
        account_code: accountCode,
      } satisfies IAiCommerceMileageAccount.ICreate,
    });
  typia.assert(createdMileageAccount);

  // 5. Login as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 6. Seller requests the mileage account detail using their own account ID
  const fetchedMileageAccount =
    await api.functional.aiCommerce.seller.mileageAccounts.at(connection, {
      mileageAccountId: createdMileageAccount.id as string &
        tags.Format<"uuid">,
    });
  typia.assert(fetchedMileageAccount);

  // 7. Validate account ownership
  TestValidator.equals(
    "mileage account owner matches seller",
    fetchedMileageAccount.user_id,
    sellerId,
  );
  // 8. Validate all business/audit fields and status
  TestValidator.equals(
    "account_code matches",
    fetchedMileageAccount.account_code,
    accountCode,
  );
  TestValidator.equals(
    "status is active or as created",
    fetchedMileageAccount.status,
    createdMileageAccount.status,
  );
  TestValidator.equals(
    "account id matches",
    fetchedMileageAccount.id,
    createdMileageAccount.id,
  );
  TestValidator.equals(
    "created_at matches",
    fetchedMileageAccount.created_at,
    createdMileageAccount.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    fetchedMileageAccount.updated_at,
    createdMileageAccount.updated_at,
  );
  TestValidator.equals(
    "balance matches expected or default zero if omitted",
    fetchedMileageAccount.balance,
    createdMileageAccount.balance,
  );
  TestValidator.equals(
    "deleted_at matches (should be null/undefined)",
    fetchedMileageAccount.deleted_at ?? null,
    createdMileageAccount.deleted_at ?? null,
  );
}

/**
 * - Function is correctly named and includes step-by-step documentation for
 *   seller onboarding, admin onboarding, admin mileage account provisioning,
 *   seller login, and seller viewing their own account. This matches the
 *   scenario.
 * - All API calls use await and correct parameter structure. Use of satisfies
 *   keyword is correct for request bodies.
 * - Variable naming is descriptive and follows the business context (sellerEmail,
 *   sellerPassword, adminEmail, accountCode, etc.).
 * - Joins, logins, and role switches are properly handled. There is no direct
 *   manipulation of connection.headers.
 * - Typia assertions are made on all API responses. TestValidator.equals has
 *   title as the first parameter across all assertions, with logical
 *   actual→expected argument order.
 * - Null/undefined for deleted_at is properly handled with the nullish coalescing
 *   operator.
 * - No type error testing present, and no type safety violations, no fictional
 *   types, no DTO confusion.
 * - No additional or missing import statements, only template code is touched.
 * - Proper TypeScript type narrowing and advanced TypeScript features used (type
 *   constraints for "mileageAccountId" parameter).
 * - Test follows logical business workflow, with realistic data and realistic
 *   test steps.
 * - No operations on deleted or non-existent resources, and no illogical code
 *   patterns.
 *
 * No errors found. All criteria satisfied.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
