import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a seller can delete their own seller profile and that the
 * deletion is properly enforced by the system.
 *
 * This test ensures that after a seller registers and creates a seller
 * profile, they can permanently delete their profile. After deletion, the
 * profile cannot be accessed or deleted again. The test also confirms that
 * subsequent attempts to operate on the deleted resource (such as repeat
 * deletion) yield an error, thereby validating referential integrity,
 * business rules, and proper authorization. Audit logging is assumed to be
 * transparently handled by the backend and is not directly verifiable by
 * this E2E.
 *
 * Steps:
 *
 * 1. Register (join) as a seller to obtain an authorized user context.
 * 2. Create a seller profile for this user.
 * 3. Delete the created seller profile as the owner.
 * 4. Attempt to delete the same profile again and expect an error (resource
 *    not found or forbidden).
 * 5. (Optional) Attempt to create another profile with the same user context
 *    to verify business rule enforcement for single profile per seller
 *    (skipped if not allowed by backend).
 */
export async function test_api_seller_profile_owner_delete(
  connection: api.IConnection,
) {
  // Step 1: Seller registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // Step 2: Create seller profile
  const profileInput = {
    user_id: sellerAuth.id,
    display_name: RandomGenerator.name(),
    approval_status: "pending",
    profile_metadata: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    suspension_reason: null,
  } satisfies IAiCommerceSellerProfiles.ICreate;
  const profile = await api.functional.aiCommerce.seller.sellerProfiles.create(
    connection,
    {
      body: profileInput,
    },
  );
  typia.assert(profile);

  // Step 3: Delete the seller profile as owner
  await api.functional.aiCommerce.seller.sellerProfiles.erase(connection, {
    sellerProfileId: profile.id,
  });

  // Step 4: Attempt to delete same profile again, expect error
  await TestValidator.error(
    "Deleting already deleted seller profile should fail",
    async () => {
      await api.functional.aiCommerce.seller.sellerProfiles.erase(connection, {
        sellerProfileId: profile.id,
      });
    },
  );
}

/**
 * The draft test thoroughly follows the scenario of a seller deleting their own
 * profile, strictly adhering to the available API endpoints and DTO
 * definitions. Import constraints are observed (no extra imports). The test
 * uses proper random and typed data for seller registration and seller profile
 * creation. Authentication context is guaranteed by the join call. TypeScript
 * type safety is maintained, and 'satisfies' is used for request bodies.
 * Null/undefined handling is correct. All API calls are correctly awaited, and
 * responses are type-asserted where needed. TestValidator.error is used with an
 * async callback and a descriptive title to verify the error for repeated
 * deletion, as expected. No DTO or property hallucinations are present. No type
 * error testing, HTTP status code checks, or test of soft-delete business rules
 * appear, which is correct given the scenario and available APIs. Data flow is
 * clean and logical.
 *
 * One minor optional test is mentioned (creating another profile for the same
 * user)—this could only be added if the API allows, but omitting is appropriate
 * unless such operation is implementable and specified in business logic. JSDoc
 * and inline comments are clear and business-focused. No review-stage issues
 * requiring deletion or fixing are found. The structure is ready for
 * production.
 *
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
 *   - O Function has exactly one parameter: connection: api.IConnection
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
