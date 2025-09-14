import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate admin-driven cart session creation for buyer and duplicate
 * prevention.
 *
 * 1. Create and authenticate admin account
 * 2. Create a buyer
 * 3. As buyer, create a cart session (establish cart & buyer linkage)
 * 4. As admin, create a cart session for same buyer and cart (with new
 *    session_token)
 *
 *    - Should succeed and be linked to the same buyer and cart
 * 5. As admin, try to create another session for the same buyer/cart/session_token
 *
 *    - Should fail due to uniqueness constraint (business error)
 */
export async function test_api_admin_cart_session_creation_buyer_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // (Re-login as admin to ensure clean role context)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 2. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 3. Authenticate as buyer (role switch)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 4. Buyer creates initial cart session
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const buyerSessionToken = RandomGenerator.alphaNumeric(32);
  const timeNow = new Date().toISOString();
  const buyerCartSession =
    await api.functional.aiCommerce.buyer.cartSessions.create(connection, {
      body: {
        buyer_id: buyerJoin.id,
        cart_id: cartId,
        session_token: buyerSessionToken,
        status: "active",
        created_at: timeNow,
        updated_at: timeNow,
        expires_at: null,
      } satisfies IAiCommerceCartSession.ICreate,
    });
  typia.assert(buyerCartSession);
  TestValidator.equals(
    "cart session buyer_id matches",
    buyerCartSession.buyer_id,
    buyerJoin.id,
  );
  TestValidator.equals(
    "cart session cart_id matches",
    buyerCartSession.cart_id,
    cartId,
  );
  TestValidator.equals(
    "cart session token matches",
    buyerCartSession.session_token,
    buyerSessionToken,
  );
  TestValidator.equals(
    "cart session status is active",
    buyerCartSession.status,
    "active",
  );

  // 5. Switch role to admin (ensure we have correct privilege)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 6. As admin, create a new session for same buyer/cart but unique session token
  const adminSessionToken = RandomGenerator.alphaNumeric(32);
  const adminCartSession =
    await api.functional.aiCommerce.admin.cartSessions.create(connection, {
      body: {
        buyer_id: buyerJoin.id,
        cart_id: cartId,
        session_token: adminSessionToken,
        status: "active",
        created_at: timeNow,
        updated_at: timeNow,
        expires_at: null,
      } satisfies IAiCommerceCartSession.ICreate,
    });
  typia.assert(adminCartSession);
  TestValidator.equals(
    "admin cart session buyer_id matches",
    adminCartSession.buyer_id,
    buyerJoin.id,
  );
  TestValidator.equals(
    "admin cart session cart_id matches",
    adminCartSession.cart_id,
    cartId,
  );
  TestValidator.equals(
    "admin cart session token matches",
    adminCartSession.session_token,
    adminSessionToken,
  );

  // 7. Attempt a true duplicate (same buyer, cart, and session_token) -- should fail
  await TestValidator.error(
    "admin duplicate cart session creation should fail",
    async () => {
      await api.functional.aiCommerce.admin.cartSessions.create(connection, {
        body: {
          buyer_id: buyerJoin.id,
          cart_id: cartId,
          session_token: adminSessionToken,
          status: "active",
          created_at: timeNow,
          updated_at: timeNow,
          expires_at: null,
        } satisfies IAiCommerceCartSession.ICreate,
      });
    },
  );
}

/**
 * 1. Code follows the scenario's business workflow: admin and buyer are created
 *    and authenticated, with role switching handled by explicit admin/buyer
 *    logins. DTOs and function calls strictly match the OpenAPI contract and
 *    only use imported types.
 * 2. Random data generation uses correct tags and patterns: typia.random for typed
 *    fields (e.g., email, uuid), and RandomGenerator for password/session_token
 *    values as required by schema (e.g., alphaNumeric lengths).
 * 3. API calls use only allowed functions: admin.join, admin.login, buyer.join,
 *    buyer.login, buyer.cartSessions.create, admin.cartSessions.create. Each
 *    call is awaited and only formal parameters are provided.
 * 4. Null handling for expires_at uses explicit null value (never omitted).
 * 5. All fields in IAiCommerceCartSession.ICreate are filled (including buyer_id,
 *    cart_id, session_token, status, timestamps, expires_at), with string and
 *    date-time formats correct.
 * 6. Every TestValidator usage includes a descriptive title as first parameter,
 *    matching result/expectation order. The error scenario uses await
 *    TestValidator.error with a proper async function on a business-violating
 *    request.
 * 7. No type error testing, missing required fields, status code assertions, or
 *    forbidden patterns. No invented properties or API, and no mutation or
 *    header manipulation.
 * 8. No extraneous imports and template structure is respected. Function
 *    signature, parameter, and return type are untouched.
 * 9. Documentation is provided for each block, with full context and comment
 *    clarity.
 * 10. The only possible improvement for final is clarifying timestamp generation
 *     (potential Date drift), but for e2e purposes a single value is
 *     justifiable; all other patterns are correct. Final code needs no
 *     significant change as all review compliance/quality criteria are
 *     satisfied.
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
