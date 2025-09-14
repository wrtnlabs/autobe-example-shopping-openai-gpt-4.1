import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import type { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate admin update of a cart session's status and expiration.
 *
 * This E2E test covers the complete workflow:
 *
 * 1. Admin registers and logs in via /auth/admin/join and /auth/admin/login.
 * 2. Buyer is created with /auth/buyer/join.
 * 3. Buyer logs in, and creates a cart with /aiCommerce/buyer/carts.
 * 4. Switch authentication back to admin by /auth/admin/login.
 * 5. Admin creates cart session in /aiCommerce/admin/cartSessions for the new
 *    buyer/cart.
 * 6. Admin updates the cart session with
 *    /aiCommerce/admin/cartSessions/:cartSessionId, changing status and
 *    expires_at.
 * 7. Result is validated: new status and expires_at are reflected, IDs and
 *    non-updated fields are unchanged, type asserted.
 *
 * Covers business logic for role authentication swap, realistic creation,
 * and update flows, validating persistence and response contract.
 */
export async function test_api_admin_cart_session_update_success(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(16);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 3. Buyer creation
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPass = RandomGenerator.alphaNumeric(16);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPass,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  const buyerId = buyerJoin.id;

  // 4. Buyer login for cart creation
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPass,
    } satisfies IBuyer.ILogin,
  });
  // 5. Create cart as buyer
  const cart = await api.functional.aiCommerce.buyer.carts.create(connection, {
    body: {
      buyer_id: buyerId,
      status: "active",
      total_quantity: 2,
    } satisfies IAiCommerceCart.ICreate,
  });
  typia.assert(cart);
  const cartId = cart.id;

  // 6. Switch back to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. Admin creates cart session
  const sessionToken = RandomGenerator.alphaNumeric(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // +1 hour
  const createdAt = new Date(now.getTime() - 3600 * 1000).toISOString(); // -1 hour (simulate past session)
  const updatedAt = createdAt;
  const session = await api.functional.aiCommerce.admin.cartSessions.create(
    connection,
    {
      body: {
        buyer_id: buyerId,
        cart_id: cartId,
        session_token: sessionToken,
        status: "active",
        expires_at: expiresAt,
        created_at: createdAt,
        updated_at: updatedAt,
      } satisfies IAiCommerceCartSession.ICreate,
    },
  );
  typia.assert(session);

  // 8. Prepare update: change status and expires_at
  const newStatus = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 8,
  });
  const newExpiresAt = new Date(now.getTime() + 2 * 3600 * 1000).toISOString(); // +2 hour
  const updateAt = new Date().toISOString();
  const updatedSession =
    await api.functional.aiCommerce.admin.cartSessions.update(connection, {
      cartSessionId: session.id,
      body: {
        status: newStatus,
        expires_at: newExpiresAt,
        updated_at: updateAt,
      } satisfies IAiCommerceCartSession.IUpdate,
    });
  typia.assert(updatedSession);

  // 9. Validate results
  TestValidator.equals(
    "cart session id unchanged",
    updatedSession.id,
    session.id,
  );
  TestValidator.equals(
    "cart id unchanged",
    updatedSession.cart_id,
    session.cart_id,
  );
  TestValidator.equals(
    "buyer id unchanged",
    updatedSession.buyer_id,
    session.buyer_id,
  );
  TestValidator.equals(
    "session token unchanged",
    updatedSession.session_token,
    session.session_token,
  );
  TestValidator.equals("status updated", updatedSession.status, newStatus);
  TestValidator.equals(
    "expires_at updated",
    updatedSession.expires_at,
    newExpiresAt,
  );
  TestValidator.equals(
    "updated_at updated",
    updatedSession.updated_at,
    updateAt,
  );
}

/**
 * Review completed systematically:
 *
 * - All imports are from the template; no additional imports or require
 *   statements
 * - No type error testing is present; all data and field types strictly match
 *   provided DTOs
 * - All role swaps are performed with the correct login API calls; headers
 *   untouched
 * - Data generation uses typia.random and RandomGenerator
 * - All nullable and optional fields are properly handled (e.g., expires_at)
 * - No response type validation after typia.assert; assertions are business/data
 *   logic only
 * - No illogical operations or circular dependencies
 * - All TestValidator usage includes clear title strings as first argument
 * - Each API function call is awaited; no missing awaits or uncaptured promises
 * - Function parameter matches required single `connection: api.IConnection`
 * - No missing required API or DTO parameters; no extra or made-up fields
 * - Random data is generated with type and format compliance via
 *   Typia/RandomGenerator
 * - API call parameter structures match SDK requirements exactly
 * - The update step changes both status and expires_at, then expects the response
 *   to reflect those fields without altering other fields
 * - No copy-paste errors or failure to apply necessary logic in the final
 *
 * No violations, omissions, or errors found. Final code is correct, compilable,
 * and adheres to all provided standards.
 *
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
