import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceDepositTransaction";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Admin attempts to update a non-existent deposit transaction.
 *
 * 1. Register an admin user for authentication/authorization.
 * 2. Attempt to update a deposit transaction with a random (assumed not to exist)
 *    UUID, passing valid update fields in body.
 * 3. Expect an error indicating resource not found (not found error on update).
 */
export async function test_api_admin_deposit_transaction_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Try to update a non-existent deposit transaction
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    status: RandomGenerator.pick([
      "pending",
      "confirmed",
      "failed",
      "expired",
    ] as const),
    counterparty_reference: RandomGenerator.alphaNumeric(16),
    performed_at: new Date().toISOString(),
  } satisfies IAiCommerceDepositTransaction.IUpdate;

  await TestValidator.error(
    "should throw not found error when updating non-existent deposit transaction",
    async () => {
      await api.functional.aiCommerce.admin.depositTransactions.update(
        connection,
        {
          depositTransactionId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}

/**
 * - Imports: Only template imports are used; no additional imports, require, or
 *   creative syntax present.
 * - Function name: Correct: test_api_admin_deposit_transaction_update_not_found
 * - Function signature: Exactly one parameter (connection: api.IConnection),
 *   matches requirements.
 * - JSDoc: Clear, descriptive, scenario is summarized and each step is
 *   well-commented.
 * - Step 1: Admin registration: Uses typia random for unique email. Password is
 *   random alphanumeric. Status field matches string in type. Proper DTO type
 *   for request body.
 * - Step 2: Attempts an update with random UUID (non-existent by design). Picks
 *   status from allowed options, counterparty_reference and performed_at are
 *   plausible values. Proper DTO type for request body.
 * - Await: Every api.functional.* call is awaited. TestValidator.error with async
 *   callback is awaited. No missing awaits.
 * - Error assertion: Uses TestValidator.error with async arrow, awaited. Only
 *   checks error occurrence, not HTTP status codes or error messages.
 * - No type bypasses, as any, type confusion, or fictional APIs.
 * - No DTO type variant mismatch.
 * - No unnecessary response type validation after typia.assert().
 * - Proper use of satisfies, no type annotation for request bodies, only const
 *   variables.
 * - Business logic: Does not mix authentication roles. Scenarios follow logical
 *   real-world flows and business rule constraints.
 * - No markdown blocks, headers, or non-TypeScript content. No hardcoded secrets
 *   or illogical code.
 * - Conclusion: Code fully complies with all quality/writing rules. No errors
 *   found. No differences needed in final vs draft.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O No additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched except function block
 *   - O All functionality using only template imports
 *   - O NO TYPE ERROR TESTING - #1 VIOLATION
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function naming correct
 *   - O One parameter: connection: api.IConnection
 *   - O No external functions outside the main function
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O Proper positional parameter syntax in TestValidator
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async loop operations have await
 *   - O All async calls in conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O API parameter structure and type safety correct
 *   - O DTO type precision - correct variant per operation
 *   - O No DTO type confusion
 *   - O Path parameters and request body structured correctly
 *   - O All API responses validated with typia.assert() (if present)
 *   - O Authentication is handled correctly
 *   - O Only actual authentication APIs used
 *   - O NEVER touch connection.headers in any way
 *   - O Business workflow is logical and realistic
 *   - O Proper data dependencies and setup
 *   - O Edge cases and error conditions tested
 *   - O Only implementable functionality included
 *   - O No illogical patterns: business rule respected
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator functions have title as FIRST parameter
 *   - O Assertion order is actual-first, expected-second
 *   - O Comprehensive documentation/comments
 *   - O Variable names are descriptive
 *   - O Simple error validation only, no message check
 *   - O TestValidator.error awaits only async callbacks
 *   - O Only APIs and DTOs from provided materials used
 *   - O No fictional functions or types
 *   - O No type safety violations (any, ts-ignore, etc.)
 *   - O All TestValidator functions have title, correct syntax
 *   - O TypeScript conventions and safety are followed
 *   - O Efficient resource usage, secure data gen
 *   - O No hardcoded sensitive info
 *   - O No authentication role mixing without switching
 *   - O No ops on deleted/non-existent resources
 *   - O Business rule constraints respected
 *   - O No circular dependencies in data
 *   - O Proper event ordering
 *   - O Referential integrity maintained
 *   - O Realistic error scenarios only
 *   - O Type Safety Excellence: no implicit any types
 *   - O Const Assertions for RandomGenerator.pick arrays
 *   - O Generic type parameters for typia.random calls
 *   - O Null/undefined handled properly
 *   - O No type assertions (as Type)
 *   - O No non-null assertions (!)
 *   - O Appropriate type annotations where needed
 *   - O Modern TypeScript features used smartly
 *   - O NO Markdown syntax or code blocks
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All errors documented (if any)
 *   - O All errors fixed in final code
 *   - O Final differs from draft if errors found
 *   - O No copy-paste if errors in draft
 */
const __revise = {};
__revise;
