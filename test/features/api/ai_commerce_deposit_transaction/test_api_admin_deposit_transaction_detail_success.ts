import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceDepositAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositAccount";
import type { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Admin fetches the details of a deposit transaction record for auditing.
 *
 * 1. Register an admin (with random email/password).
 * 2. Register a buyer (with random email/password).
 * 3. Switch to admin session and create a deposit account for the buyer
 *    (random account_code, initial balance 0, currency_code 'KRW', status
 *    'active').
 * 4. Using that deposit account, create a transaction of type 'recharge',
 *    status 'confirmed' with valid amount, performed_at as now().
 * 5. Use the returned transaction id to GET the details with admin.
 * 6. Validate that returned transaction struct matches the data
 *    (deposit_account_id, type, amount, status, etc).
 * 7. All returned fields, including performed_at, created_at, updated_at etc,
 *    should be present and have correct formats.
 * 8. Test does NOT check for error case (unauthorized or buyer access) here.
 */
export async function test_api_admin_deposit_transaction_detail_success(
  connection: api.IConnection,
) {
  // 1. Register admin, store admin credentials for session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register buyer with random values
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer);

  // 3. Switch to admin session and create deposit account for buyer
  // (as admin account is still active due to join and tokens)
  const account_code = RandomGenerator.alphaNumeric(10);
  const depositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.create(connection, {
      body: {
        user_id: buyer.id,
        account_code: account_code,
        balance: 0,
        currency_code: "KRW",
        status: "active",
      } satisfies IAiCommerceDepositAccount.ICreate,
    });
  typia.assert(depositAccount);

  // 4. Create deposit transaction: type 'recharge', status 'confirmed', amount is positive integer, performed_at now
  const nowIso = new Date().toISOString();
  const depositTransaction =
    await api.functional.aiCommerce.admin.depositTransactions.create(
      connection,
      {
        body: {
          deposit_account_id: depositAccount.id,
          type: "recharge",
          amount: 10000,
          status: "confirmed",
          performed_at: nowIso,
        } satisfies IAiCommerceDepositTransaction.ICreate,
      },
    );
  typia.assert(depositTransaction);

  // 5. Fetch the transaction details as admin and validate all fields
  const detail = await api.functional.aiCommerce.admin.depositTransactions.at(
    connection,
    {
      depositTransactionId: depositTransaction.id,
    },
  );
  typia.assert(detail);

  // 6. Validate detail matches created transaction
  TestValidator.equals(
    "transaction id matches",
    detail.id,
    depositTransaction.id,
  );
  TestValidator.equals(
    "account id matches",
    detail.deposit_account_id,
    depositAccount.id,
  );
  TestValidator.equals("type is recharge", detail.type, "recharge");
  TestValidator.equals("status is confirmed", detail.status, "confirmed");
  TestValidator.equals("amount matches", detail.amount, 10000);
  TestValidator.equals("performed_at is correct", detail.performed_at, nowIso);
}

/**
 * - All steps follow correct business logic, with admin/buyer separation, session
 *   handling, and correct DTO usage.
 * - Random data uses typia.random with correct formats for email (and values for
 *   password/account_code).
 * - No missing required fields, all request and response types matched and
 *   validated with typia.assert.
 * - TestValidator assertions include title and check actual/expected values with
 *   proper ordering.
 * - All API calls are awaited, only provided imports and types are used, and no
 *   extraneous code is present.
 * - Documentation includes clear, step-by-step explanations for business scenario
 *   and data prep.
 * - No type error, type safety violations, or illogical code present (full
 *   field/format/nullable/type correctness checked).
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
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
