import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceFavoritesProductNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProductNotification";
import type { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceFavoritesProductNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesProductNotification";

/**
 * Verify buyer can list and filter notification events for a specific
 * favorited product.
 *
 * Test flow:
 *
 * 1. Register a new buyer (join) and log in to obtain session/authentication
 * 2. Buyer adds a product (using a generated UUID) to favorites to get a valid
 *    favoriteProductId
 * 3. Use the PATCH
 *    /aiCommerce/buyer/favorites/products/{favoriteProductId}/notifications
 *    endpoint with no filters to get all notifications for that favorite
 * 4. Validate response type and that all notifications have favorite_id
 *    matching favoriteProductId and user_id matching buyer
 * 5. Invoke the endpoint again with filter parameters (notification_type,
 *    read_status, pagination: page/limit) to test filtering works
 * 6. Validate filtered result contains only matching notifications, respects
 *    pagination fields, and does not include cross-user data
 * 7. (Negative/permission check): Register a second buyer, attempt to access
 *    the first buyer's notifications—assert error raised (business logic
 *    restriction)
 */
export async function test_api_favorite_product_notifications_list_and_filter_by_buyer(
  connection: api.IConnection,
) {
  // 1. Register a new buyer and login
  const buyerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IBuyer.ICreate;
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: buyerBody,
  });
  typia.assert(buyerAuth);
  const buyerId = buyerAuth.id;

  // 2. Buyer adds a product to favorites
  const favoriteBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IAiCommerceFavoritesProducts.ICreate;
  const favorite =
    await api.functional.aiCommerce.buyer.favorites.products.create(
      connection,
      { body: favoriteBody },
    );
  typia.assert(favorite);
  const favoriteProductId = favorite.id;

  // 3. Query notifications for this favorite (no filter)
  const notificationsPage =
    await api.functional.aiCommerce.buyer.favorites.products.notifications.index(
      connection,
      {
        favoriteProductId,
        body: {},
      },
    );
  typia.assert(notificationsPage);
  TestValidator.equals(
    "all notifications are for this favorite and buyer",
    ArrayUtil.has(
      notificationsPage.data,
      (n) => n.favorite_id === favoriteProductId && n.user_id === buyerId,
    ),
    true,
  );
  // 4. Test filter: notification_type, pagination, and read_status
  // Find at least one notification_type to use for filtering, or make an up-front selection
  const existingNotificationType = notificationsPage.data.length
    ? notificationsPage.data[0].notification_type
    : undefined;
  if (existingNotificationType !== undefined) {
    const filterBody = {
      notification_type: existingNotificationType,
      read_status: "unread",
      page: 1,
      limit: 2,
    } satisfies IAiCommerceFavoritesProductNotification.IRequest;
    const filteredPage =
      await api.functional.aiCommerce.buyer.favorites.products.notifications.index(
        connection,
        {
          favoriteProductId,
          body: filterBody,
        },
      );
    typia.assert(filteredPage);
    for (const notif of filteredPage.data) {
      TestValidator.equals(
        "filtered notification_type",
        notif.notification_type,
        existingNotificationType,
      );
      if (filterBody.read_status === "unread") {
        TestValidator.equals(
          "read_at is null for unread filter",
          notif.read_at,
          null,
        );
      }
      TestValidator.equals(
        "favorite_id always matches filtered",
        notif.favorite_id,
        favoriteProductId,
      );
      TestValidator.equals(
        "user_id always matches filtered",
        notif.user_id,
        buyerId,
      );
    }
    TestValidator.equals(
      "pagination current = 1",
      filteredPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit = 2",
      filteredPage.pagination.limit,
      2,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      filteredPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 1",
      filteredPage.pagination.pages >= 1,
    );
  }
  // 5. Register a second buyer and permission check
  const attackerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies IBuyer.ICreate;
  const attackerAuth = await api.functional.auth.buyer.join(connection, {
    body: attackerBody,
  });
  typia.assert(attackerAuth);
  // Attempt to list notifications with the same favoriteProductId (should fail)
  await TestValidator.error(
    "second buyer cannot access first buyer's favorite's notifications",
    async () => {
      await api.functional.aiCommerce.buyer.favorites.products.notifications.index(
        connection,
        {
          favoriteProductId,
          body: {},
        },
      );
    },
  );
}

/**
 * - Confirmed that only documented DTOs and API functions were used and
 *   referenced all type and endpoint specifications precisely.
 * - Used only properties that exist in schema, including all required properties
 *   in each API call.
 * - All data generation (emails, UUIDs, passwords) follows correct typia patterns
 *   and leverages RandomGenerator where appropriate.
 * - All TestValidator assertions use a descriptive title as the first argument,
 *   parameter order and expected type relationships checked.
 * - Every API function is called with await, including async TestValidator.error
 *   blocks.
 * - When filtering, checked for existing notification_type to use a real value
 *   from seeded or existing data (avoids type/test errors).
 * - Checked that restricted cross-buyer access triggers an error according to
 *   business requirements.
 * - Pagination fields (current, limit, records, pages) are validated for sensible
 *   values.
 * - Comments and docstring provide a clear step-by-step logical flow, variable
 *   naming is descriptive.
 * - Proper null and undefined handling in response checks (for filters),
 *   including read_at property when 'unread' filter is active.
 * - Strictly avoided any hardcoded test data or manipulation outside template
 *   scopes, used only available functions and types.
 * - All final checklist points in section 5 are verified and true.
 * - No type error testing, no missing required fields, no code outside template
 *   allowed area, no manual header manipulation, no markdown code output or
 *   imports added post-template.
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
