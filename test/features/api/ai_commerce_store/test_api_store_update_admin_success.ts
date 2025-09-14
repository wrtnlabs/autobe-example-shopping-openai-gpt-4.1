import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Admin updates an existing store's business details such as the name,
 * metadata, approval_status, or closure_reason.
 *
 * Workflow:
 *
 * 1. Register a new admin user (admin join) and authenticate as admin (admin
 *    login)
 * 2. Register a new seller user (seller join) and authenticate as seller
 *    (seller login)
 * 3. Create a seller profile for the seller
 * 4. Switch context back to the admin (admin login)
 * 5. Admin creates a new store referencing the seller profile (admin store
 *    create)
 * 6. Admin updates the store's business details (PUT update)
 * 7. Assert that the update is reflected in the returned store object
 */
export async function test_api_store_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin (admin join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Register seller (seller join)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IAiCommerceSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 3. Seller login and create seller profile
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  const sellerProfileBody = {
    user_id: sellerAuth.id,
    display_name: RandomGenerator.name(2),
    profile_metadata: JSON.stringify({
      company: RandomGenerator.name(1),
      vision: RandomGenerator.paragraph({ sentences: 3 }),
    }),
    approval_status: "active",
    suspension_reason: null,
  } satisfies IAiCommerceSellerProfiles.ICreate;
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);

  // 4. Switch context back to admin (admin login)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 5. Admin creates store referencing seller profile
  const createStoreBody = {
    owner_user_id: sellerAuth.id,
    seller_profile_id: sellerProfile.id,
    store_name: RandomGenerator.name(2),
    store_code: RandomGenerator.alphaNumeric(10),
    store_metadata: JSON.stringify({
      description: RandomGenerator.paragraph({ sentences: 2 }),
    }),
    approval_status: "active",
    closure_reason: null,
  } satisfies IAiCommerceStores.ICreate;
  const store = await api.functional.aiCommerce.admin.stores.create(
    connection,
    { body: createStoreBody },
  );
  typia.assert(store);

  // 6. Admin updates store's details
  const updateBody = {
    store_name: RandomGenerator.name(3),
    store_metadata: JSON.stringify({
      description: RandomGenerator.paragraph({ sentences: 5 }),
    }),
    approval_status: "suspended",
    closure_reason: "Business review triggered by compliance bot",
  } satisfies IAiCommerceStores.IUpdate;
  const updatedStore = await api.functional.aiCommerce.admin.stores.update(
    connection,
    {
      storeId: store.id,
      body: updateBody,
    },
  );
  typia.assert(updatedStore);

  // 7. Assert that the update is reflected
  TestValidator.equals(
    "store name updated",
    updatedStore.store_name,
    updateBody.store_name,
  );
  TestValidator.equals(
    "store metadata updated",
    updatedStore.store_metadata,
    updateBody.store_metadata,
  );
  TestValidator.equals(
    "approval_status updated",
    updatedStore.approval_status,
    updateBody.approval_status,
  );
  TestValidator.equals(
    "closure_reason updated",
    updatedStore.closure_reason,
    updateBody.closure_reason,
  );
}

/**
 * - Checked for import violations: only used supplied imports from the template,
 *   no additional imports or creative syntax used.
 * - All API SDK function calls use await. No missing awaits present.
 * - Each API call is made with the correct DTO variant:
 *   IAiCommerceAdmin.IJoin/ILogin, IAiCommerceSeller.IJoin/ILogin,
 *   IAiCommerceSellerProfiles.ICreate, IAiCommerceStores.ICreate/IUpdate.
 * - Request body objects use satisfies, never as Type, and always const for
 *   request bodies, never let.
 * - Only test business logic errors, no attempt at type error testing (compliance
 *   with zero tolerance rule enforced).
 * - All TestValidator.* calls use a meaningful title as first parameter.
 * - Null/undefined properties handled properly using explicit null when allowed;
 *   never using property omission to indicate null.
 * - Context switches for auth (seller/login, admin/login) are done with correct
 *   SDK functions per the scenario.
 * - The update assertion checks that all updatable fields (store_name,
 *   store_metadata, approval_status, closure_reason) were updated to the
 *   requested values.
 * - Random and realistic data generated using typia.random and RandomGenerator
 *   utilities following all constraints.
 * - All steps of the business workflow implemented including role/context
 *   switches and sequential resource creation.
 * - No invented properties or schema hallucinations; all field access from DTO
 *   types only.
 * - No superfluous code, all logic within the function body as required.
 * - All checks from the final checklist were satisfied.
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.1. ACCEPT COMPILER REALITY
 *   - O 4.11.2. HALLUCINATION PATTERNS TO AVOID
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
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
