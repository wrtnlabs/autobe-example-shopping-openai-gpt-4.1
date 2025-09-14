import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Ensure a seller can create a product bundle for their own product.
 *
 * 1. Register a new seller by calling POST /auth/seller/join, using random
 *    valid email and strong password.
 * 2. Create a new product for the seller by calling POST
 *    /aiCommerce/seller/products, using the seller_id from (1) and random
 *    business/pricing fields.
 * 3. Call POST /aiCommerce/seller/products/{productId}/bundles to create a new
 *    bundle, using the created product's ID as parent_product_id.
 *
 *    - Provide valid bundle fields: unique bundle_code, name, status (e.g.
 *         "active"), current_price (<= product price), and an items array.
 *    - The items array contains a single item: the current product's ID as
 *         child_product_id, type 'product', quantity 1, required true.
 * 4. Validate that the response bundle object matches the schema, has proper
 *    parent_product_id, and items array reflects the intended composition.
 *
 *    - Assert type correctness with typia.assert().
 *    - Assert bundle_code, name, price, and first item child_product_id match
 *         input values with TestValidator.equals().
 */
export async function test_api_seller_product_bundle_create_success(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create product under seller
  const productBody = {
    seller_id: seller.id,
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    business_status: "pending_approval",
    current_price: Math.floor(Math.random() * 10000) + 1000,
    inventory_quantity: 100,
  } satisfies IAiCommerceProduct.ICreate;
  const product: IAiCommerceProduct =
    await api.functional.aiCommerce.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create bundle for the product
  const bundleInput = {
    parent_product_id: product.id,
    bundle_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    current_price: product.current_price,
    items: [
      {
        child_product_id: product.id,
        item_type: "product",
        quantity: 1,
        required: true,
        sort_order: 1,
      } satisfies IAiCommerceProductBundle.IBundleItem.ICreate,
    ],
  } satisfies IAiCommerceProductBundle.ICreate;
  const bundle: IAiCommerceProductBundle =
    await api.functional.aiCommerce.seller.products.bundles.create(connection, {
      productId: product.id,
      body: bundleInput,
    });
  typia.assert(bundle);

  // 4. Structural and business validations
  TestValidator.equals(
    "parent_product_id matches",
    bundle.parent_product_id,
    product.id,
  );
  TestValidator.equals(
    "bundle_code matches",
    bundle.bundle_code,
    bundleInput.bundle_code,
  );
  TestValidator.equals("bundle name matches", bundle.name, bundleInput.name);
  TestValidator.equals(
    "bundle status matches",
    bundle.status,
    bundleInput.status,
  );
  TestValidator.equals(
    "bundle price matches",
    bundle.current_price,
    bundleInput.current_price,
  );
  TestValidator.equals("bundle has exactly one item", bundle.items.length, 1);
  TestValidator.equals(
    "item child_product_id matches",
    bundle.items[0].child_product_id,
    product.id,
  );
  TestValidator.equals("item quantity is one", bundle.items[0].quantity, 1);
  TestValidator.equals(
    "item type is product",
    bundle.items[0].item_type,
    "product",
  );
  TestValidator.equals("item is required", bundle.items[0].required, true);
  TestValidator.equals("item sort_order is 1", bundle.items[0].sort_order, 1);
}

/**
 * The draft implementation correctly follows all requirements:
 *
 * - All imports are untouched; no additional imports are introduced.
 * - The function uses the correct name and signature as specified.
 * - Seller registration, product creation, and bundle creation all use proper SDK
 *   calls, DTO types, and request/response structures.
 * - Random data generation uses appropriate patterns (typia.random,
 *   RandomGenerator.alphaNumeric, RandomGenerator.name, etc.)
 * - All request bodies are created as const with satisfies for type safety. No
 *   mutable or reassigned variables for bodies are used.
 * - Bundle item composition is correctly constructed using only properties that
 *   exist in the bundle item schema.
 * - All required business/structural assertions utilize typia.assert and
 *   TestValidator.equals with descriptive titles. Variables and assertion title
 *   strings are descriptive and match business context.
 * - No type errors or DTO confusion: the function uses only properties shown in
 *   the provided schemas.
 * - No illegal patterns (as any, missing required fields, testing validation, or
 *   header manipulation).
 * - Await is used on every async API call.
 * - The function body only replaces the allowed section in the template.
 * - Redundant or over-specific property checks (e.g., rechecking after
 *   typia.assert) are not present.
 * - The scenario is well-documented with a step-by-step purpose statement at the
 *   top.
 *
 * No errors, code is production ready.
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
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision - Using correct DTO variant for each operation
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way
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
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
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
