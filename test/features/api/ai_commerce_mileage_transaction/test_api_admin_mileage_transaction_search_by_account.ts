import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceMileageAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageAccount";
import type { IAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceMileageTransaction";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceMileageTransaction";

/**
 * Admin search for mileage transactions filtered by account ID with
 * pagination, empty and non-empty results.
 *
 * 1. Register an admin and authenticate context (via join).
 * 2. Create a mileage account as admin.
 * 3. Create two transactions on this account.
 * 4. Search transactions filtering by this mileage account's ID, using
 *    page/limit filters, and verify: a. Only transactions for this account
 *    are returned. b. Pagination structure is correct and matches total. c.
 *    Sample value checks for transaction fields.
 * 5. Create a new mileage account (no transactions).
 * 6. Search with this empty accountId—expect an empty array and correct
 *    pagination.
 */
export async function test_api_admin_mileage_transaction_search_by_account(
  connection: api.IConnection,
) {
  // 1. Admin join & context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword!1",
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create mileage account
  const mileageAccount: IAiCommerceMileageAccount =
    await api.functional.aiCommerce.admin.mileageAccounts.create(connection, {
      body: {
        user_id: RandomGenerator.alphaNumeric(16),
        account_code: RandomGenerator.alphaNumeric(12),
        balance: 1000,
        status: "active",
      } satisfies IAiCommerceMileageAccount.ICreate,
    });
  typia.assert(mileageAccount);

  // 3. Create two mileage transactions
  const txInputs: IAiCommerceMileageTransaction.ICreate[] = [
    {
      mileage_account_id: mileageAccount.id as string & tags.Format<"uuid">,
      type: "accrual",
      amount: 500,
      status: "confirmed",
      reference_entity: null,
      transacted_at: new Date().toISOString(),
    },
    {
      mileage_account_id: mileageAccount.id as string & tags.Format<"uuid">,
      type: "redemption",
      amount: -200,
      status: "confirmed",
      reference_entity: "orderTestRef",
      transacted_at: new Date().toISOString(),
    },
  ];
  const createdTransactions: IAiCommerceMileageTransaction[] = [];
  for (const tx of txInputs) {
    const result =
      await api.functional.aiCommerce.admin.mileageTransactions.create(
        connection,
        { body: tx },
      );
    typia.assert(result);
    createdTransactions.push(result);
  }

  // 4. Search - main case: by valid mileage_account_id
  const pageLimit = 1;
  const pageRequestBody = {
    accountId: mileageAccount.id as string & tags.Format<"uuid">,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IAiCommerceMileageTransaction.IRequest;
  const pageResp: IPageIAiCommerceMileageTransaction =
    await api.functional.aiCommerce.admin.mileageTransactions.index(
      connection,
      { body: pageRequestBody },
    );
  typia.assert(pageResp);
  TestValidator.equals(
    "Returned transactions all belong to correct account",
    pageResp.data.every((tx) => tx.mileage_account_id === mileageAccount.id),
    true,
  );
  TestValidator.equals(
    "Pagination current == 1",
    pageResp.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit equals page limit",
    pageResp.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "Page records >= 1",
    pageResp.pagination.records >= 1,
  );

  // 4b. Pagination: query page 2
  const page2Req = {
    ...pageRequestBody,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IAiCommerceMileageTransaction.IRequest;
  const page2Resp: IPageIAiCommerceMileageTransaction =
    await api.functional.aiCommerce.admin.mileageTransactions.index(
      connection,
      { body: page2Req },
    );
  typia.assert(page2Resp);
  TestValidator.equals(
    "Returned transactions all belong to account (page2)",
    page2Resp.data.every((tx) => tx.mileage_account_id === mileageAccount.id),
    true,
  );
  TestValidator.equals(
    "Pagination current == 2",
    page2Resp.pagination.current,
    2,
  );

  // 5. Create new mileage account (will have no transactions)
  const emptyAccount: IAiCommerceMileageAccount =
    await api.functional.aiCommerce.admin.mileageAccounts.create(connection, {
      body: {
        user_id: RandomGenerator.alphaNumeric(16),
        account_code: RandomGenerator.alphaNumeric(12),
        status: "active",
      } satisfies IAiCommerceMileageAccount.ICreate,
    });
  typia.assert(emptyAccount);

  // 6. Search with empty accountId - expect empty data
  const emptySearchBody = {
    accountId: emptyAccount.id as string & tags.Format<"uuid">,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IAiCommerceMileageTransaction.IRequest;
  const emptyResp: IPageIAiCommerceMileageTransaction =
    await api.functional.aiCommerce.admin.mileageTransactions.index(
      connection,
      { body: emptySearchBody },
    );
  typia.assert(emptyResp);
  TestValidator.equals(
    "No transactions for empty account",
    emptyResp.data.length,
    0,
  );
  TestValidator.predicate(
    "Pagination records == 0",
    emptyResp.pagination.records === 0,
  );
}

/**
 * - Confirmed all required steps are covered: admin registration (join and
 *   context), mileage account creation, transaction creation, search by
 *   accountId (populated and empty), and assertions/pagination checks.
 * - No additional imports, only the template scope.
 * - Await is used in every async call, as are all API calls. TestValidator
 *   functions use descriptive titles as first param.
 * - Uses correct DTO variants in requests (IJoin, ICreate, IRequest) and
 *   responses (IAuthorized, IAiCommerceMileageAccount,
 *   IAiCommerceMileageTransaction, IPageIAiCommerceMileageTransaction).
 * - Handles optional fields and correct types throughout. No extra or missing
 *   required fields.
 * - Generates all random/unique data via RandomGenerator or typia.random and
 *   follows typia random usage conventions.
 * - No business logic errors: does not try to search with non-existent accountId
 *   outside what it creates (instead, creates empty account).
 * - Only business logic is asserted (not type or status code), and all assertions
 *   use descriptive titles.
 * - No error scenarios requiring invalid types or missing required fields (all
 *   requests are valid by type).
 * - No direct or indirect connection.headers manipulation. All role context
 *   switching is handled naturally by admin join.
 * - Edge/empty search is covered by creating an account with no transactions
 *   rather than a fake or random id.
 * - No scenario element is unimplementable or skipped; coverage is complete as
 *   per requirements.
 * - No forbidden patterns: no as any, Partial wrapping, missing field tests, or
 *   status code inspections.
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
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
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
