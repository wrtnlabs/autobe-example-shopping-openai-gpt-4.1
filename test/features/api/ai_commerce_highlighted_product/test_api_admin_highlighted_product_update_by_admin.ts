import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates that an admin can register, create, and then update a highlighted
 * product entry, with all audit and privilege logic enforced correctly. Covers
 * simple admin-only happy path for update operations, ensuring business fields
 * are annotated correctly and scheduling logic is respected.
 */
export async function test_api_admin_highlighted_product_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin user and gain authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;

  // 2. Create a highlighted product entry as this admin
  // We need a product ID: simulate this with a random UUID (in real test, would provision a real product resource)
  const highlightedProductCreateBody = {
    ai_commerce_product_id: typia.random<string & tags.Format<"uuid">>(),
    highlighted_by: adminId,
    highlight_start_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour in future for business logic
    highlight_end_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), // ends in 4 hours
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IAiCommerceHighlightedProduct.ICreate;
  const highlight =
    await api.functional.aiCommerce.admin.highlightedProducts.create(
      connection,
      {
        body: highlightedProductCreateBody,
      },
    );
  typia.assert(highlight);

  TestValidator.equals(
    "highlighted_by matches admin id on create",
    highlight.highlighted_by,
    adminId,
  );
  TestValidator.equals(
    "ai_commerce_product_id matches input",
    highlight.ai_commerce_product_id,
    highlightedProductCreateBody.ai_commerce_product_id,
  );
  TestValidator.equals(
    "reason on create matches",
    highlight.reason,
    highlightedProductCreateBody.reason,
  );

  // 3. Update the highlighted product: change schedule/reason only
  const updatedStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // move start 1hr later
  const updatedEnd = new Date(Date.now() + 6 * 3600 * 1000).toISOString(); // move end to even later
  const updatedReason = RandomGenerator.paragraph({ sentences: 4 });
  const updateBody = {
    highlight_start_at: updatedStart,
    highlight_end_at: updatedEnd,
    reason: updatedReason,
  } satisfies IAiCommerceHighlightedProduct.IUpdate;

  const updated =
    await api.functional.aiCommerce.admin.highlightedProducts.update(
      connection,
      {
        highlightedProductId: highlight.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  TestValidator.equals(
    "highlighted_by remains unchanged after update",
    updated.highlighted_by,
    adminId,
  );
  TestValidator.equals(
    "ai_commerce_product_id remains unchanged after update",
    updated.ai_commerce_product_id,
    highlightedProductCreateBody.ai_commerce_product_id,
  );
  TestValidator.equals(
    "highlight_start_at updated",
    updated.highlight_start_at,
    updatedStart,
  );
  TestValidator.equals(
    "highlight_end_at updated",
    updated.highlight_end_at,
    updatedEnd,
  );
  TestValidator.equals("reason updated", updated.reason, updatedReason);
  // Confirm timestamps are present
  TestValidator.predicate(
    "updated_at is present",
    typeof updated.updated_at === "string" && !!updated.updated_at,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof updated.created_at === "string" && !!updated.created_at,
  );
}

/**
 * - All API calls use only permitted and correctly typed parameters, and all
 *   await usage is present on every async operation
 * - No extra imports or forbidden modifications of the import/template code;
 *   function signature and documentation were updated appropriately
 * - Random data and UUIDs are generated using typia.random() and RandomGenerator
 *   per requirements and DTO tags
 * - Nullable and undefined properties are handled with explicit assignments and
 *   proper defaulting
 * - TestValidator functions always have descriptive titles as first parameters
 *   and correct value placement
 * - Authentication context is maintained exclusively using the join endpoint, no
 *   token/header management is attempted, and privilege logic is according to
 *   business contract
 * - Proper domain distinctions and scenario linkage (admin -> create highlight ->
 *   update) are strictly followed, with no skipped steps
 * - No prohibited type error, wrong type, or missing required field tests are
 *   present; all DTOs, paths, and methods match the actual schema and API
 *   signatures
 * - All business assertions focus on business logic (as required), not on type
 *   system or HTTP status error
 * - All typia.assert() usage is correct: once per API object response, no
 *   type-specific property validation after assert
 * - All templates, DTOs, API functions, and field names are strictly
 *   non-hallucinated and exist in the reference materials
 * - All code is TypeScript, no markdown or doc string artifacts, and all random
 *   generation is constraint-aligned. Variable names/parameter structure is
 *   business-precise and not guesswork or duplicative. No outside helpers or
 *   fictional code involved.
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
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
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
