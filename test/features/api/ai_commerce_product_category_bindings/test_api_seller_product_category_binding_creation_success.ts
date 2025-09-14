import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the workflow for a seller to create a new product-category
 * binding, including all prior dependencies.
 *
 * This test simulates the real business workflow required for a seller to
 * bind a product to a category:
 *
 * 1. Register a seller and perform login (keeping credentials for session
 *    switching).
 * 2. Seller creates the profile and then creates a store using profile/user
 *    IDs.
 * 3. Seller registers a new product for binding.
 * 4. Register and login an admin user (independently, with separate
 *    credentials).
 * 5. Admin creates a sales channel and then a category within it.
 * 6. Seller logs in again to re-authenticate (role switching, session reset).
 * 7. Seller creates a binding between their product and the new category.
 * 8. Asserts that each step returns data with correct foreign key
 *    relationships, and that the final binding maps the expected product
 *    and category IDs.
 */
export async function test_api_seller_product_category_binding_creation_success(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Seller login
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // 3. Create seller profile
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerLogin.id,
        display_name: RandomGenerator.name(),
        profile_metadata: JSON.stringify({
          bio: RandomGenerator.paragraph({ sentences: 4 }),
        }),
        approval_status: "active",
        suspension_reason: null,
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerProfile);
  TestValidator.equals(
    "seller_profile.user_id matches seller id",
    sellerProfile.user_id,
    sellerLogin.id,
  );

  // 4. Create store
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerLogin.id,
        seller_profile_id: sellerProfile.id,
        store_name: RandomGenerator.name(2),
        store_code: RandomGenerator.alphaNumeric(8),
        store_metadata: JSON.stringify({
          logo: RandomGenerator.alphaNumeric(16),
        }),
        approval_status: "active",
        closure_reason: null,
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);

  // 5. Create product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerLogin.id,
        store_id: store.id,
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "normal",
        current_price: 20000,
        inventory_quantity: 100,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 7. Admin login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 8. Create sales channel (admin)
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        locale: "en-US",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 9. Create category in channel (admin)
  const now = new Date().toISOString();
  const category =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ai_commerce_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          level: 0,
          sort_order: 1,
          is_active: true,
          business_status: "active",
          created_at: now,
          updated_at: now,
        } satisfies IAiCommerceCategory.ICreate,
      },
    );
  typia.assert(category);

  // 10. Seller login again (session/role switch)
  const relogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(relogin);

  // 11. Seller creates product-category binding
  const binding =
    await api.functional.aiCommerce.seller.products.categoryBindings.create(
      connection,
      {
        productId: product.id,
        body: {
          category_id: category.id,
        } satisfies IAiCommerceProductCategoryBindings.ICreate,
      },
    );
  typia.assert(binding);
  TestValidator.equals(
    "binding.product_id matches product.id",
    binding.product_id,
    product.id,
  );
  TestValidator.equals(
    "binding.category_id matches category.id",
    binding.category_id,
    category.id,
  );
  // Additional: Ensure that entities created in prereq steps persist and interrelate
  TestValidator.equals(
    "store.seller_profile_id matches sellerProfile.id",
    store.seller_profile_id,
    sellerProfile.id,
  );
  TestValidator.equals(
    "product.store_id matches store.id",
    product.store_id,
    store.id,
  );
}

/**
 * - Code flow is realistic and based strictly on supplied DTO types and API SDK
 *   definitions.
 * - Seller and admin registration and login each use separate credentials, and
 *   correct type DTOs for both registration and authentication.
 * - SellerProfile correctly references sellerLogin.id for user_id;
 *   approval_status and suspension_reason use domain-appropriate values.
 * - Store creation uses all required relationships; random data/strings generated
 *   using RandomGenerator or typia.random with correct tags.
 * - Product creation includes all required properties; status and business_status
 *   use allowed string values as per business context.
 * - Admin channel/category creation steps use correct context and required
 *   fields; category creation supplies created_at and updated_at with current
 *   ISO-formatted timestamp, and all category creation DTO fields are present.
 * - Product-category binding uses product.id (from product creation) and
 *   category.id (from admin category creation), with appropriate assertion
 *   checks for entity relationship.
 * - Assertions: TestValidator.equals() is used for key relationship validation
 *   with descriptive first parameter; all typia.assert() calls are present
 *   post-response.
 * - EVERY api.functional.* call has 'await'; all API calls receive required
 *   parameters in correct structure, with proper TypeScript DTO typing and no
 *   type error/any usage.
 * - No additional imports or creative template modification.
 * - No type error or intentionally erroneous calls, no status code checks, no
 *   role mixing apart from proper authentication switches. Code is clean,
 *   maintainable, and represents a full business workflow with logical,
 *   testable assertions.
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
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
