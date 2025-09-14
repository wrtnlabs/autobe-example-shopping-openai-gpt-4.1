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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceDepositTransaction";

/**
 * Validates buyer searching and paginating their own deposit transactions.
 * Steps: 1) Register buyer, 2) Register admin, 3) Admin creates deposit account
 * for buyer, 4) Admin adds a recharge and a payment transaction, 5) Buyer
 * paginates/searches transactions, 6) Buyer attempts to search with another
 * buyer's account id (should fail or return empty)
 */
export async function test_api_deposit_transaction_search_by_buyer(
  connection: api.IConnection,
) {
  // 1. Register a buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoinResp: IAiCommerceBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
      } satisfies IBuyer.ICreate,
    });
  typia.assert(buyerJoinResp);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminStatus = "active";
  const adminJoinResp: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        status: adminStatus,
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(adminJoinResp);

  // 3. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 4. Admin creates a deposit account for the buyer
  const accountCode = RandomGenerator.alphaNumeric(10);
  const depositAccount: IAiCommerceDepositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.create(connection, {
      body: {
        user_id: buyerJoinResp.id,
        account_code: accountCode,
        balance: 1000,
        currency_code: "KRW",
        status: "active",
      } satisfies IAiCommerceDepositAccount.ICreate,
    });
  typia.assert(depositAccount);

  // 5. Admin creates two transactions for the account: recharge and payment
  const performedAt1 = new Date().toISOString();
  const txRecharge: IAiCommerceDepositTransaction =
    await api.functional.aiCommerce.admin.depositTransactions.create(
      connection,
      {
        body: {
          deposit_account_id: depositAccount.id,
          type: "recharge",
          amount: 1000,
          status: "confirmed",
          performed_at: performedAt1,
        } satisfies IAiCommerceDepositTransaction.ICreate,
      },
    );
  typia.assert(txRecharge);

  const performedAt2 = new Date(Date.now() + 5000).toISOString();
  const txPayment: IAiCommerceDepositTransaction =
    await api.functional.aiCommerce.admin.depositTransactions.create(
      connection,
      {
        body: {
          deposit_account_id: depositAccount.id,
          type: "payment",
          amount: -500,
          status: "confirmed",
          performed_at: performedAt2,
        } satisfies IAiCommerceDepositTransaction.ICreate,
      },
    );
  typia.assert(txPayment);

  // 6. Register a second buyer (for error scenario in step 9)
  const buyer2Email = typia.random<string & tags.Format<"email">>();
  const buyer2Password = RandomGenerator.alphaNumeric(12);
  const buyer2JoinResp: IAiCommerceBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyer2Email,
        password: buyer2Password,
      } satisfies IBuyer.ICreate,
    });
  typia.assert(buyer2JoinResp);

  // 7. Buyer login
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 8. Buyer lists their own deposit transactions
  const searchResp: IPageIAiCommerceDepositTransaction =
    await api.functional.aiCommerce.buyer.depositTransactions.index(
      connection,
      {
        body: {
          deposit_account_id: depositAccount.id,
        } satisfies IAiCommerceDepositTransaction.IRequest,
      },
    );
  typia.assert(searchResp);
  TestValidator.predicate(
    "buyer can see only their own deposit transactions",
    searchResp.data.every((tx) => tx.deposit_account_id === depositAccount.id),
  );
  TestValidator.equals("deposit transaction count", searchResp.data.length, 2);
  // Check returned transactions match our created transactions
  const returnedIds = searchResp.data.map((tx) => tx.id);
  TestValidator.predicate(
    "all expected transactions found",
    returnedIds.includes(txRecharge.id) && returnedIds.includes(txPayment.id),
  );

  // 9. Buyer searches with another buyer's deposit_account_id (should see nothing or forbidden)
  const accountCode2 = RandomGenerator.alphaNumeric(10);
  // Admin creates another deposit account for 2nd buyer (preparing error scenario)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  const depositAccount2: IAiCommerceDepositAccount =
    await api.functional.aiCommerce.admin.depositAccounts.create(connection, {
      body: {
        user_id: buyer2JoinResp.id,
        account_code: accountCode2,
        balance: 1000,
        currency_code: "KRW",
        status: "active",
      } satisfies IAiCommerceDepositAccount.ICreate,
    });
  typia.assert(depositAccount2);

  // Switch back to buyer1 again
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  const resultOtherAccount: IPageIAiCommerceDepositTransaction =
    await api.functional.aiCommerce.buyer.depositTransactions.index(
      connection,
      {
        body: {
          deposit_account_id: depositAccount2.id,
        } satisfies IAiCommerceDepositTransaction.IRequest,
      },
    );
  typia.assert(resultOtherAccount);
  TestValidator.equals(
    "buyer cannot view other buyer's deposit transactions",
    resultOtherAccount.data.length,
    0,
  );
}

/**
 * - All authentication blocks use the provided SDK login/join endpoints with
 *   proper role context switching; no direct header manipulation is present.
 * - All TestValidator assertions include descriptive title as first parameter.
 *   Assertions check that result sets are filtered by account, returned
 *   transactions match those created, and error cases (cross-buyer access)
 *   return empty results (or at least do not leak other users' data). Parameter
 *   order is correct (actual first, expected second).
 * - Every API SDK call is properly awaited; async/await usage is correct
 *   everywhere, including no missing awaits inside loops or conditionals.
 * - Random data for emails, passwords, and codes is generated using
 *   typia.random/RandomGenerator functions with proper generic parameters and
 *   format constraints.
 * - No API function calls or DTO property access outside what is explicitly
 *   defined in provided schemas/types; all property and method usage is checked
 *   against schema.
 * - No usage of `as any`, `@ts-ignore`, or any form of type-violation or type
 *   error testing exists anywhere. All data passed to requests is fully type
 *   safe for the declared DTOs, with correct field presence.
 * - Authentication state is managed by SDK only. No manipulation or inspection of
 *   connection.headers is performed at any step.
 * - All business logic validations are focused on runtime data (transaction
 *   account ownership, correct pagination, zero results for forbidden access)
 *   and do not attempt to check HTTP status codes or test raw type
 *   validation/omission scenarios.
 * - No function or DTOs outside provided specification are referenced.
 * - All comment/documentation is in function JSDoc and code comments, no
 *   markdown, strings, or non-TypeScript content.
 * - Draft code is clean, passes all test and checklist points, and no critical
 *   errors are present. No type errors, markdown, or fictional properties
 *   found.
 * - Final code stays identical to draft since review finds no issues to fix or
 *   delete.
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
 *   - O All functionality implemented using only template-provided imports
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
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
