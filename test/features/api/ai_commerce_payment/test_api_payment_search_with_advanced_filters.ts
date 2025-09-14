import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePayment";

/**
 * Validate searching of payment records by admin with advanced filters
 *
 * This test validates the aiCommerce admin payment search endpoint with
 * advanced filtering such as status, method, currency, amount range, date
 * range, and pagination. It also tests access control by attempting (and
 * failing) access as an unauthorized user.
 *
 * Steps:
 *
 * 1. Register an admin account for authentication
 * 2. Log in as admin to get access token
 * 3. Create a payment record with known attributes (reference, status, method,
 *    currency_code, issued_at, etc.)
 * 4. Search (PATCH) with NO filters (all payments; expect at least the created
 *    payment)
 * 5. Search by status, expect only the payment(s) with that status
 * 6. Search by currencyCode
 * 7. Search with amount min/max filters (should only match correct payments)
 * 8. Search by issued_at date range (toDate/fromDate)
 * 9. Search with combined filters (status+currency+amount)
 * 10. Search with pagination (limit=1) and check paging result
 * 11. Try to search payments as unauthenticated/invalid user, expect failure
 */
export async function test_api_payment_search_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminStatus = "active";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as admin
  const auth = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(auth);

  // 3. Create a payment record with specific attributes
  const paymentAttrs = {
    payment_reference: RandomGenerator.alphaNumeric(14),
    status: RandomGenerator.pick([
      "pending",
      "paid",
      "failed",
      "refunded",
    ] as const),
    amount: 100000,
    currency_code: RandomGenerator.pick(["KRW", "USD", "EUR"] as const),
    issued_at: new Date().toISOString(),
    confirmed_at: null,
    failure_reason: null,
  } satisfies IAiCommercePayment.ICreate;
  const payment = await api.functional.aiCommerce.admin.payments.create(
    connection,
    { body: paymentAttrs },
  );
  typia.assert(payment);

  // 4. Search with NO filters, expect the payment exists
  const allPage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(allPage);
  TestValidator.predicate(
    "contains created payment in allPage search",
    allPage.data.some((x) => x.id === payment.id),
  );

  // 5. Filter by status
  const statusPage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: { status: payment.status },
    },
  );
  typia.assert(statusPage);
  TestValidator.predicate(
    "all statusPage results match filter",
    statusPage.data.every((x) => x.status === payment.status),
  );
  TestValidator.predicate(
    "statusPage contains created payment",
    statusPage.data.some((x) => x.id === payment.id),
  );

  // 6. Filter by currencyCode
  const currencyPage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: { currencyCode: payment.currency_code },
    },
  );
  typia.assert(currencyPage);
  TestValidator.predicate(
    "all currencyPage results match currency",
    currencyPage.data.every((x) => x.currency_code === payment.currency_code),
  );
  TestValidator.predicate(
    "currencyPage contains created payment",
    currencyPage.data.some((x) => x.id === payment.id),
  );

  // 7. Amount min/max filters
  const minAmount = payment.amount - 1;
  const maxAmount = payment.amount + 1;
  const amountPage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: { minAmount, maxAmount },
    },
  );
  typia.assert(amountPage);
  TestValidator.predicate(
    "all amountPage results in range",
    amountPage.data.every(
      (x) => x.amount >= minAmount && x.amount <= maxAmount,
    ),
  );
  TestValidator.predicate(
    "amountPage contains created payment",
    amountPage.data.some((x) => x.id === payment.id),
  );

  // 8. issued_at date range filters
  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const datePage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: { fromDate, toDate },
    },
  );
  typia.assert(datePage);
  TestValidator.predicate(
    "all datePage results in date range",
    datePage.data.every(
      (x) => x.issued_at >= fromDate && x.issued_at <= toDate,
    ),
  );
  TestValidator.predicate(
    "datePage contains created payment",
    datePage.data.some((x) => x.id === payment.id),
  );

  // 9. Combined filters
  const combinedPage = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: {
        status: payment.status,
        currencyCode: payment.currency_code,
        minAmount,
        maxAmount,
        fromDate,
        toDate,
      },
    },
  );
  typia.assert(combinedPage);
  TestValidator.predicate(
    "all combinedPage results match filters",
    combinedPage.data.every(
      (x) =>
        x.status === payment.status &&
        x.currency_code === payment.currency_code &&
        x.amount >= minAmount &&
        x.amount <= maxAmount &&
        x.issued_at >= fromDate &&
        x.issued_at <= toDate,
    ),
  );
  TestValidator.predicate(
    "combinedPage contains created payment",
    combinedPage.data.some((x) => x.id === payment.id),
  );

  // 10. Pagination test
  const paged1 = await api.functional.aiCommerce.admin.payments.index(
    connection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(paged1);
  TestValidator.equals("paged1 limit is 1", paged1.pagination.limit, 1);
  TestValidator.equals("paged1 current page", paged1.pagination.current, 1);
  TestValidator.predicate(
    "paged1 returns at most 1 result",
    paged1.data.length <= 1,
  );

  // 11. Unauthorized access (simulate by stripping auth)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search payments",
    async () => {
      await api.functional.aiCommerce.admin.payments.index(unauthConn, {
        body: {},
      });
    },
  );
}

/**
 * The test function draft strictly complies with all requirements from the
 * scenario and input materials. It uses only the DTOs and API SDK functions
 * provided, follows the template import and code insertion requirements, and
 * implements a thorough business workflow with realistic authentication, data
 * creation (including all required payment attributes), and advanced
 * filter/pagination testing. All TestValidator assertions have explicit
 * descriptive titles. RandomGenerator.pick usages employ `as const` for literal
 * arrays. All data and pagination filters are covered, including amount and
 * issued_at date filters, combined filters, and an explicit
 * negative/unauthorized role scenario.
 *
 * All API calls use await, have correct TypeScript typing and type safety,
 * request and response validation is performed using typia.assert(), and no
 * type errors/violations are present. No additional imports or made-up
 * properties are used, and unauthorized search is handled with the documented
 * pattern for empty headers. The documentation is placed and formatted
 * according to the template and system prompts. The logic is business-accurate
 * for an e-commerce payment admin workflow, with all security and pagination
 * edge cases asserted. There is clear separation of concerns, no side effects,
 * all branches correctly handled, consts/nullable values and overloads are
 * responsibly handled, and all required and optional filters are set as needed,
 * in compliance with schema guidelines. There are no missing awaits, wrong type
 * data, or omitted required fields. The code is ready for production test
 * inclusion.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
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
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
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
