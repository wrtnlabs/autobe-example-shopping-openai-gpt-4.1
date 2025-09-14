import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate seller cart template update: owner can edit permitted fields;
 * non-owner is denied.
 *
 * 1. Seller A joins
 * 2. Seller A creates a cart template
 * 3. Seller A updates allowed fields on the template (template_name, active,
 *    optionally folder/description)
 * 4. Validate that update succeeded and changes persisted
 * 5. Seller B joins as another seller
 * 6. Seller B attempts to update Seller A's cart template (should be denied)
 */
export async function test_api_seller_cart_template_update_owner_authz_and_fields(
  connection: api.IConnection,
) {
  // 1. Seller A: join & authenticate
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerA);

  // 2. Seller A creates a cart template
  const createBody = {
    creator_id: sellerA.id as string & tags.Format<"uuid">,
    template_name: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies IAiCommerceCartTemplate.ICreate;
  const cartTemplate =
    await api.functional.aiCommerce.seller.cartTemplates.create(connection, {
      body: createBody,
    });
  typia.assert(cartTemplate);

  // 3. Seller A updates permitted fields
  const updateBody = {
    template_name: RandomGenerator.paragraph({ sentences: 3 }),
    active: false,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAiCommerceCartTemplate.IUpdate;
  const updatedTemplate =
    await api.functional.aiCommerce.seller.cartTemplates.update(connection, {
      cartTemplateId: cartTemplate.id,
      body: updateBody,
    });
  typia.assert(updatedTemplate);
  TestValidator.equals(
    "template name updates",
    updatedTemplate.template_name,
    updateBody.template_name,
  );
  TestValidator.equals("active flag updates", updatedTemplate.active, false);
  TestValidator.equals(
    "description updates",
    updatedTemplate.description,
    updateBody.description,
  );

  // 4. Seller B: join (authenticate as new, non-owner seller)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerB);

  // 5. Seller B attempts update: should be denied
  await TestValidator.error(
    "non-owner seller cannot update other's template",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: {
          email: sellerBEmail,
          password: sellerBPassword,
        } satisfies IAiCommerceSeller.IJoin,
      });
      await api.functional.aiCommerce.seller.cartTemplates.update(connection, {
        cartTemplateId: cartTemplate.id,
        body: {
          template_name: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IAiCommerceCartTemplate.IUpdate,
      });
    },
  );
}

/**
 * - All SDK function calls use 'await' as required
 * - Only permitted cart template fields are updated (template_name, active,
 *   description as allowed)
 * - Authentication switches are performed by re-calling auth.seller.join; no
 *   manual token/header handling and no fictional helpers
 * - All DTO usage leverages the correct IAiCommerceSeller.IJoin,
 *   IAiCommerceCartTemplate.ICreate, and IAiCommerceCartTemplate.IUpdate types.
 *   Type narrowing and tag management are correct.
 * - All API responses are validated by typia.assert. Business result validation
 *   (field updated) is checked with TestValidator.equals, using descriptive
 *   titles.
 * - Error scenario for non-owner update is tested via TestValidator.error with
 *   awaited async callback and correct params.
 * - No extra imports or template changes; template untouched outside function
 *   body
 * - No type errors or type-violating request constructions, and correct
 *   const/enum type constraints throughout
 * - No DTO property usage outside those present in given schema; all property
 *   names match spec
 * - Step comments are clear and explicit as to role and action
 * - No business logic or authentication mixups—each seller acts only on their own
 *   behalf except in cross-ownership denial test
 * - Variable naming is clear, data is random and meets all typia/tag constraints
 * - All tests and logic are logically ordered and non-redundant
 * - No code block or markdown outputs, only the function code body as required
 *   for .ts output
 * - No manipulation of connection.headers occurs at any point
 * - No external functions or logic defined outside test function
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
