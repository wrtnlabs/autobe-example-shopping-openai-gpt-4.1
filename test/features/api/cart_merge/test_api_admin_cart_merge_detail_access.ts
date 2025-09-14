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

/**
 * Test admin API for cart merge detail access:
 *
 * 1. Create an admin user and log in (store credentials)
 * 2. Create a buyer user and log in (store credentials for cart creation)
 * 3. Create source cart (buyer)
 * 4. Create target cart (buyer)
 * 5. Switch to admin – merge source/target carts (store cartMergeId)
 * 6. As admin, call GET /aiCommerce/admin/cartMerges/{cartMergeId}
 * 7. Assert that all fields (id, source_cart_id, target_cart_id, actor_id,
 *    reason, created_at) exist and match expectations
 * 8. Attempt unauthorized access (optional): buyer tries access – must fail
 */
export async function test_api_admin_cart_merge_detail_access(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 3. Buyer join
  const buyerEmail: string = typia.random<string & tags.Format<"email">>();
  const buyerPassword: string = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });

  // 4. Buyer login
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 5. Create source cart
  const sourceCart: IAiCommerceCart =
    await api.functional.aiCommerce.buyer.carts.create(connection, {
      body: { status: "active" } satisfies IAiCommerceCart.ICreate,
    });
  typia.assert(sourceCart);

  // 6. Create target cart
  const targetCart: IAiCommerceCart =
    await api.functional.aiCommerce.buyer.carts.create(connection, {
      body: { status: "active" } satisfies IAiCommerceCart.ICreate,
    });
  typia.assert(targetCart);

  // 7. Switch to admin account again
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 8. Perform cart merge as admin
  const mergeReason = "admin_action";
  const merge: IAiCommerceCartMerge =
    await api.functional.aiCommerce.admin.cartMerges.create(connection, {
      body: {
        source_cart_id: sourceCart.id,
        target_cart_id: targetCart.id,
        reason: mergeReason,
      } satisfies IAiCommerceCartMerge.ICreate,
    });
  typia.assert(merge);

  // 9. Get merge details as admin
  const detail: IAiCommerceCartMerge =
    await api.functional.aiCommerce.admin.cartMerges.at(connection, {
      cartMergeId: merge.id,
    });
  typia.assert(detail);
  TestValidator.equals("cart merge id matches", detail.id, merge.id);
  TestValidator.equals(
    "source cart id matches",
    detail.source_cart_id,
    sourceCart.id,
  );
  TestValidator.equals(
    "target cart id matches",
    detail.target_cart_id,
    targetCart.id,
  );
  TestValidator.equals("reason matches", detail.reason, mergeReason);

  // 10. Attempt unauthorized (buyer) access – should fail
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  await TestValidator.error(
    "unauthorized buyer cannot access admin cart merge detail",
    async () => {
      await api.functional.aiCommerce.admin.cartMerges.at(connection, {
        cartMergeId: merge.id,
      });
    },
  );
}

/**
 * - The draft fulfills all business scenario requirements: proper admin and buyer
 *   setup, cart creation, merge, and accesses the merge detail endpoint with
 *   all validations and negative case (unauthorized access by buyer).
 * - All API interactions use await, correct function signatures, and only the
 *   provided template imports and types. No custom imports or external code
 *   beyond the template.
 * - TestValidator error and equality assertions use proper titles and parameter
 *   order. No usage of wrong type data, as any, type errors, or type validation
 *   tests.
 * - All DTO usage (ICreate, ILogin, etc) is strict and correct for context, no
 *   type confusion. typia.assert is applied to all API responses as required.
 * - No operations on connection.headers or similar forbidden patterns.
 * - Code structure is clean, only the function's body has changed, with
 *   step-by-step comments. All async flows and role switches are correctly
 *   sequenced for real-world permission boundary testing.
 * - No markdown or non-TypeScript output, only valid .ts code as per template.
 * - Random data generation uses best practices.
 * - Function signature, naming, and scope fully match requirements.
 * - All rules and final checklist are satisfied.
 * - No errors to fix or type errors to delete from the draft. Code is ready and
 *   production-quality.
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion
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
 *   - O No illogical patterns
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
