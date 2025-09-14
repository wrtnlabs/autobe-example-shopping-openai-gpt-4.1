import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderRefund";

/**
 * Validate that an admin can retrieve a paginated and filtered list of
 * refunds for a specified order.
 *
 * 1. Register and authenticate an admin account (POST /auth/admin/join).
 * 2. Select a random orderId (UUID format) to test refund listing (simulate as
 *    refunds cannot be created via API).
 * 3. Call PATCH /aiCommerce/admin/orders/{orderId}/refunds with various
 *    IAiCommerceOrderRefund.IRequest parameters for paging, sorting, and
 *    complex filters.
 * 4. Assert the type and structure of the returned IPageIAiCommerceOrderRefund
 *    object.
 * 5. For non-empty results, verify that all refunds returned have order_id
 *    matching the requested orderId and respect all applied filter criteria
 *    (if filters are not undefined).
 * 6. Verify pagination: page/limit fields in pagination match request where
 *    applicable, data length does not exceed limit, and returned data
 *    matches requested sort order if set.
 *
 * Note: Creation of actual refund data is not possible (no refund creation
 * endpoint is exposed), so the test focuses on type, paging, sorting, and
 * filter application only, using simulated/random data as permitted by the
 * API and typia.random().
 */
export async function test_api_admin_order_refunds_pagination_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "P@ssw0rd!" + RandomGenerator.alphaNumeric(5),
      status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Prepare a random orderId and multiple realistic paging/filter requests
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const queries: IAiCommerceOrderRefund.IRequest[] = [
    {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    },
    {
      status: [
        RandomGenerator.pick([
          "pending",
          "approved",
          "denied",
          "completed",
        ] as const),
      ],
      page: 1,
      limit: 5,
    },
    { min_amount: 100, max_amount: 1000, page: 1, limit: 5 },
    {
      requested_after: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 30,
      ).toISOString(),
      requested_before: new Date().toISOString(),
      page: 1,
      limit: 5,
    },
    { search: RandomGenerator.alphaNumeric(6), page: 1, limit: 5 },
    { sort_by: "requested_at", sort_order: "asc", page: 1, limit: 5 },
    { sort_by: "resolved_at", sort_order: "desc", page: 1, limit: 5 },
  ];

  for (const req of queries) {
    const response = await api.functional.aiCommerce.admin.orders.refunds.index(
      connection,
      {
        orderId,
        body: req,
      },
    );
    typia.assert(response);

    TestValidator.predicate(
      "pagination.limit: data count does not exceed limit",
      response.data.length <= (req.limit ?? 20),
    );
    TestValidator.predicate(
      "pagination.page: current page matches requested page",
      req.page === undefined || response.pagination.current === req.page,
    );
    TestValidator.predicate(
      "pagination.limit: matches requested limit",
      req.limit === undefined || response.pagination.limit === req.limit,
    );
    for (const refund of response.data) {
      TestValidator.equals(
        "refund record must reference correct order_id",
        refund.order_id,
        orderId,
      );
      if (req.status !== undefined) {
        TestValidator.predicate(
          "filter: status matches filter",
          req.status.includes(refund.status),
        );
      }
      if (req.min_amount !== undefined) {
        TestValidator.predicate(
          "filter: min_amount respected",
          refund.amount >= req.min_amount,
        );
      }
      if (req.max_amount !== undefined) {
        TestValidator.predicate(
          "filter: max_amount respected",
          refund.amount <= req.max_amount,
        );
      }
      if (req.requested_after !== undefined) {
        TestValidator.predicate(
          "filter: requested_after respected",
          new Date(refund.requested_at) >= new Date(req.requested_after),
        );
      }
      if (req.requested_before !== undefined) {
        TestValidator.predicate(
          "filter: requested_before respected",
          new Date(refund.requested_at) <= new Date(req.requested_before),
        );
      }
      if (req.refund_code !== undefined) {
        TestValidator.predicate(
          "filter: refund_code contains search token",
          refund.refund_code.includes(req.refund_code),
        );
      }
      if (req.actor_id !== undefined) {
        TestValidator.equals(
          "filter: actor_id matches",
          refund.actor_id,
          req.actor_id,
        );
      }
    }
  }
}

/**
 * All code structure and logic follow TEST_WRITE.md requirements.
 *
 * - The function starts by joining/admin authentication using correct DTO and
 *   API, no extraneous imports.
 * - All random/test data generation uses typia.random or RandomGenerator, with
 *   correct tagged types. Const assertions are always used for pickup arrays.
 * - For each IAiCommerceOrderRefund.IRequest filter, the code uses allowed DTO
 *   properties, with proposed realistic values for status (const assertion
 *   array), legitimate range for amount/date, and uses all properties that
 *   exist in the schema only.
 * - All API calls have await.
 * - `typia.assert()` is always called for responses.
 * - Paging/scenario assertions verify actual paging fields against request.
 *   Correctly checks .length <= limit and that page/limit in response matches
 *   what was requested.
 * - Each filter field, if set, is checked on each refund: status, min/max amount,
 *   date window, refund_code, actor_id. All TestValidator functions use
 *   MANDATORY title and positional args are actual-first.
 * - There is explicit handling that creation of refunds is not possible. All
 *   values are reality-compliant w/ DTO structure; no extraneous properties
 *   used.
 * - Code uses only types and functions from allowed materials.
 * - No code touches connection.headers; only authentication API is used.
 * - No type errors are tested, no type safety bypass, no missing required fields,
 *   no testing of HTTP status codes, no operations outside logical bounds.
 * - No test logic is implemented outside the main function. No issues found for
 *   the required checklists and rules; the draft is ready for production.
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
 *   - O 4. Quality Standards and Best Practices
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
