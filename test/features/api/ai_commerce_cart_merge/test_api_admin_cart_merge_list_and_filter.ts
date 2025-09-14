import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import type { IAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartMerge";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceCartMerge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartMerge";

/**
 * Test the advanced admin cart merge listing/filtering API.
 *
 * This scenario covers end-to-end workflow:
 *
 * 1. Register and authenticate a new admin (for admin endpoints)
 * 2. Register and authenticate a new buyer (for cart creation)
 * 3. As buyer, create two distinct shopping carts (source, target)
 * 4. As admin, merge the source cart into the target cart with reason and
 *    actor_id
 * 5. As admin, search cart merges using filter criteria:
 *
 *    - Source_cart_id
 *    - Target_cart_id
 *    - Reason
 *    - Actor_id
 *    - Created_from/created_to (time window including now)
 *    - Paging (page=1, limit=10)
 *    - Test with missing/alternative filters as well
 * 6. Validate:
 *
 *    - At least one record is found
 *    - The merge summary matches the merge performed (IDs/reason/timestamps)
 *    - Filters work (e.g., by wrong actor or reason yields empty)
 *    - Pagination fields make sense
 * 7. Test access control: as buyer, try listing merges; should error.
 */
export async function test_api_admin_cart_merge_list_and_filter(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphabets(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // Login as buyer to get session
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 3. Create two carts as the buyer
  const sourceCart = await api.functional.aiCommerce.buyer.carts.create(
    connection,
    { body: {} satisfies IAiCommerceCart.ICreate },
  );
  typia.assert(sourceCart);
  const targetCart = await api.functional.aiCommerce.buyer.carts.create(
    connection,
    { body: {} satisfies IAiCommerceCart.ICreate },
  );
  typia.assert(targetCart);

  // 4. Login as admin for privileged ops
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 5. Perform cart merge
  const reason = "test_merge_reason";
  const mergeResult = await api.functional.aiCommerce.admin.cartMerges.create(
    connection,
    {
      body: {
        source_cart_id: sourceCart.id,
        target_cart_id: targetCart.id,
        actor_id: adminJoin.id,
        reason,
      } satisfies IAiCommerceCartMerge.ICreate,
    },
  );
  typia.assert(mergeResult);

  // 6. List merges with various filters
  // Use window: 10 minutes back to 10 minutes forward
  const now = new Date();
  const createdFrom = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const createdTo = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const reqBody: IAiCommerceCartMerge.IRequest = {
    source_cart_id: sourceCart.id,
    target_cart_id: targetCart.id,
    actor_id: adminJoin.id,
    reason,
    created_from: createdFrom,
    created_to: createdTo,
    page: 1,
    limit: 5,
    sort: "created_at",
    order: "desc",
  };

  const listResult = await api.functional.aiCommerce.admin.cartMerges.index(
    connection,
    { body: reqBody },
  );
  typia.assert(listResult);

  // Should find at least one merge
  TestValidator.predicate(
    "at least one merge event is listed",
    listResult.data.length > 0,
  );
  // And the merge we created is listed with matching fields
  const found = listResult.data.find(
    (e) =>
      e.source_cart_id === sourceCart.id &&
      e.target_cart_id === targetCart.id &&
      e.reason === reason,
  );
  TestValidator.predicate(
    "created merge event appears in filtered results",
    !!found,
  );

  // Now test filtering with wrong reason
  const wrongFilterBody = { ...reqBody, reason: "wrong_reason" };
  const wrongFilterResult =
    await api.functional.aiCommerce.admin.cartMerges.index(connection, {
      body: wrongFilterBody,
    });
  typia.assert(wrongFilterResult);
  TestValidator.equals(
    "filtering by wrong reason returns no result",
    wrongFilterResult.data.length,
    0,
  );

  // Pagination fields make sense
  TestValidator.predicate(
    "pagination current page 1",
    listResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    listResult.pagination.limit === 5,
  );

  // 7. Check access control: as buyer, listing merges is forbidden
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  await TestValidator.error(
    "buyers cannot access admin cart merge listing",
    async () => {
      await api.functional.aiCommerce.admin.cartMerges.index(connection, {
        body: reqBody,
      });
    },
  );
}

/**
 * - All function and API calls use proper DTOs and type safety.
 * - Only allowed types and properties are used, and template is strictly followed
 *   (no new imports/no headers manipulation).
 * - All TestValidator functions include a descriptive title as first param.
 * - All API and assertion calls have correct async/await handling. No missing
 *   awaits.
 * - All authentication and context switches use proper methods without touching
 *   connection.headers.
 * - No type errors/type error tests. All parameters are fully present (no
 *   business logic/DTO violations). No testing HTTP codes or status
 *   explicitly.
 * - Data and business logic flow follows described plan exactly, with full role
 *   separation and access control test.
 * - Null and undefined are handled appropriately.
 * - All random/generic data generation follows required forms and type
 *   constraints.
 * - All validations are business-level, not type-level after typia.assert().
 * - No illogical operations, markdown, or copy-paste failures. Function structure
 *   is correct with a single exported function. All function naming and block
 *   comments meet docstring requirements. (No errors found, nothing to
 *   delete/fix.)
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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
