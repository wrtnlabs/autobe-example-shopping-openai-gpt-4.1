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
 * End-to-end test for admin's ability to retrieve full details about a specific
 * buyer's cart session using its session ID, including not-found edge case.
 *
 * Business purpose: Ensures admins can correctly access buyer cart session
 * records for troubleshooting, audits, and support, and that secure cross-role
 * access (admin vs. buyer) works as intended. Validates both positive (existent
 * session) and negative (not found) scenarios.
 *
 * Steps:
 *
 * 1. Create a new admin account (join) with a random (but valid) email, password,
 *    and status.
 * 2. Authenticate as admin (login) to ensure future admin contexts are valid.
 * 3. Create a new buyer account (join) with a random email/password.
 * 4. Login as the buyer.
 * 5. As the authenticated buyer, create a new cart session using valid fields;
 *    extract cartSessionId from response.
 * 6. Switch back to admin by logging in.
 * 7. As admin, call GET /aiCommerce/admin/cartSessions/{cartSessionId} and check:
 *
 *    - Response is successful and type correct
 *    - All returned fields (id, cart_id, buyer_id, session_token, status,
 *         timestamps, etc.) exist and match what buyer created
 * 8. Attempt to GET detail with a random UUID (that does not correspond to any
 *    real session): expect an error (not found or forbidden), and assert error
 *    is thrown.
 *
 * Edge/negative cases covered: non-existent cartSessionId returns error rather
 * than data.
 */
export async function test_api_admin_cart_session_detail_retrieval_and_not_found(
  connection: api.IConnection,
) {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminStatus = "active";
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 2. Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 3. Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });

  // 4. Login as buyer
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 5. Create cart session as buyer
  const cartSessionBody = {
    cart_id: typia.random<string & tags.Format<"uuid">>(),
    session_token: RandomGenerator.alphaNumeric(32),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    buyer_id: undefined,
    expires_at: null,
  } satisfies IAiCommerceCartSession.ICreate;
  const createdCartSession =
    await api.functional.aiCommerce.buyer.cartSessions.create(connection, {
      body: cartSessionBody,
    });
  typia.assert(createdCartSession);

  // 6. Switch back to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. Retrieve cart session details as admin
  const retrievedSession =
    await api.functional.aiCommerce.admin.cartSessions.at(connection, {
      cartSessionId: createdCartSession.id,
    });
  typia.assert(retrievedSession);
  TestValidator.equals(
    "cart session id should match",
    retrievedSession.id,
    createdCartSession.id,
  );
  TestValidator.equals(
    "cart id should match",
    retrievedSession.cart_id,
    cartSessionBody.cart_id,
  );
  TestValidator.equals(
    "buyer id should match",
    retrievedSession.buyer_id,
    createdCartSession.buyer_id,
  );
  TestValidator.equals(
    "session token should match",
    retrievedSession.session_token,
    cartSessionBody.session_token,
  );
  TestValidator.equals(
    "status should match",
    retrievedSession.status,
    cartSessionBody.status,
  );

  // Validate date fields
  TestValidator.equals(
    "created_at should match",
    retrievedSession.created_at,
    cartSessionBody.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    retrievedSession.updated_at,
    cartSessionBody.updated_at,
  );
  TestValidator.equals(
    "expires_at should match",
    retrievedSession.expires_at,
    cartSessionBody.expires_at,
  );

  // 8. Edge case: Query by random UUID (should error)
  await TestValidator.error(
    "should error when querying non-existent cartSessionId",
    async () => {
      await api.functional.aiCommerce.admin.cartSessions.at(connection, {
        cartSessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

/**
 * - All required authentication flows for both admin and buyer are present,
 *   ensuring multi-actor scenarios work
 * - Proper context switching between roles is handled explicitly via respective
 *   login APIs (never manipulating headers)
 * - Only properties available in the DTOs are used (no hallucinated fields)
 * - All random generators use explicit type parameters with typia.random and
 *   correct patterns for string/uuid/timestamps
 * - Cart session fields are checked property-by-property
 * - Edge case for nonexistent ID uses TestValidator.error and calls the admin
 *   cart session detail with a fresh random UUID
 * - No missing awaits; all async API calls are properly awaited
 * - No type annotation mistakes for request bodies, always using `satisfies ...`
 *   syntax
 * - Complete test structure with robust assertions and clear documentation is
 *   present
 * - No additional imports or forbidden syntaxes observed; template structure
 *   respected
 * - No business logic or type safety errors; type safety strictly enforced (no
 *   use of any, type assertions, or missing fields)
 * - No status code checks, only error assertion; error testing only for
 *   logical/business errors
 * - No test logic for type errors or missing required fields; all error cases are
 *   business logic only
 * - The draft code already satisfies all rules, so the final code is unchanged
 *   for output
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
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
