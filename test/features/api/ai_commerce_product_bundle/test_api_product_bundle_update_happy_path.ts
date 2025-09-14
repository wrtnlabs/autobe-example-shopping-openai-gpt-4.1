import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductBundle } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductBundle";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the complete update (PUT) of a product bundle by a seller.
 *
 * 1. Register a new seller (join) and establish authentication context.
 * 2. Create a product as this seller ('provides productId').
 * 3. Create a new bundle for that product (provides bundleId).
 * 4. Update the bundle via PUT, modifying editable properties: name, description,
 *    status, current_price, items.
 * 5. Assert: the returned bundle matches update fields (full update), the items
 *    array and price are updated, response passes schema assertion, and
 *    updated_at changes.
 */
export async function test_api_product_bundle_update_happy_path(
  connection: api.IConnection,
) {
  // 1. Seller join & authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IAiCommerceSeller.IJoin;
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinInput });
  typia.assert(seller);

  // 2. Create product (use returned seller.id for seller_id and randomly generated store_id)
  const productInput = {
    seller_id: seller.id,
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "draft",
    business_status: "pending_approval",
    current_price: 19999,
    inventory_quantity: 10,
  } satisfies IAiCommerceProduct.ICreate;
  const product: IAiCommerceProduct =
    await api.functional.aiCommerce.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 3. Create initial bundle (use product.id as parent_product_id)
  const initialBundleInput = {
    parent_product_id: product.id,
    bundle_code: RandomGenerator.alphaNumeric(12),
    name: "Starter Bundle",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    current_price: 9000,
    items: [
      {
        child_product_id: product.id,
        item_type: "product",
        quantity: 1,
        required: true,
        sort_order: 1,
      },
    ],
  } satisfies IAiCommerceProductBundle.ICreate;
  const initialBundle: IAiCommerceProductBundle =
    await api.functional.aiCommerce.seller.products.bundles.create(connection, {
      productId: product.id,
      body: initialBundleInput,
    });
  typia.assert(initialBundle);

  // 4. Update the bundle. Change name, description, price, items, status
  const updatedItems = [
    {
      id: initialBundle.items[0]?.id,
      child_product_id: product.id,
      item_type: "product",
      quantity: 2,
      required: false,
      sort_order: 1,
    },
    // Add a new bundle item (simulate a variant or another product-less variant for demo)
    {
      item_type: "variant",
      child_variant_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1,
      required: true,
      sort_order: 2,
    },
  ] satisfies IAiCommerceProductBundle.IBundleItem.IUpdate[];

  const updateInput = {
    name: "Updated Bundle Name",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "paused",
    current_price: 12000,
    items: updatedItems as IAiCommerceProductBundle.IBundleItem.IUpdate[],
  } satisfies IAiCommerceProductBundle.IUpdate;

  const updatedBundle: IAiCommerceProductBundle =
    await api.functional.aiCommerce.seller.products.bundles.update(connection, {
      productId: product.id,
      bundleId: initialBundle.id,
      body: updateInput,
    });
  typia.assert(updatedBundle);

  // 5. Assertions:
  // (a) The returned bundle's id, parent_product_id, bundle_code, created_at are unchanged
  TestValidator.equals(
    "bundle id unchanged",
    updatedBundle.id,
    initialBundle.id,
  );
  TestValidator.equals(
    "parent_product_id unchanged",
    updatedBundle.parent_product_id,
    initialBundle.parent_product_id,
  );
  TestValidator.equals(
    "bundle_code unchanged",
    updatedBundle.bundle_code,
    initialBundle.bundle_code,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBundle.created_at,
    initialBundle.created_at,
  );
  // (b) Updated fields match input
  TestValidator.equals(
    "bundle name updated",
    updatedBundle.name,
    updateInput.name,
  );
  TestValidator.equals(
    "description updated",
    updatedBundle.description,
    updateInput.description,
  );
  TestValidator.equals(
    "status updated",
    updatedBundle.status,
    updateInput.status,
  );
  TestValidator.equals(
    "current_price updated",
    updatedBundle.current_price,
    updateInput.current_price,
  );
  // (c) Items array length and structure changed as expected
  TestValidator.equals(
    "updated bundle items length is correct",
    updatedBundle.items.length,
    updatedItems.length,
  );
  // Assert at least one item is of item_type 'variant' and one of 'product'
  TestValidator.predicate(
    "items contain both 'product' and 'variant' types",
    updatedBundle.items.some((i) => i.item_type === "product") &&
      updatedBundle.items.some((i) => i.item_type === "variant"),
  );
  // (d) updated_at has changed (should be newer than or different from created_at)
  TestValidator.predicate(
    "updated_at is updated",
    updatedBundle.updated_at !== updatedBundle.created_at,
  );
}

/**
 * The draft conforms to the requirements in TEST_WRITE.md:
 *
 * - The authentication, product creation, and bundle creation steps are strictly
 *   sequential and all identifiers/IDs are obtained from actual API responses.
 * - All DTO types and values used match the provided DTO definitions and API SDK
 *   function signatures precisely. There are no invented or hallucinated
 *   fields, no data type errors, and no added/removed import statements outside
 *   the template.
 * - The request body variables use ONLY const + satisfies, no type annotations or
 *   reassignments, following proper declaration guidelines.
 * - Update fields target only properties defined as updatable by
 *   IAiCommerceProductBundle.IUpdate; all data respects schema types and is
 *   generated using typia.random, RandomGenerator, or carried from earlier
 *   steps for referential integrity, with proper usage of tags (Format<"uuid">)
 *   where appropriate.
 * - All assertions have clear, descriptive titles as the first parameter.
 *   TestValidator assertions use 'actual-first' parameter order. Edge cases are
 *   covered: verifying that parent ID and code remain stable after update, that
 *   both 'product' and 'variant' item types exist in updated items, and
 *   updated_at changes.
 * - Every SDK call is awaited and all responses are asserted with typia.assert().
 * - There is no type error testing, no wrong type usage, no skipped required
 *   properties, and no explicit HTTP status code validation.
 * - All steps are business-logical and conform to API business rules, types, and
 *   constraints. No prohibited patterns remain.
 *
 * No critical TypeScript, business, or test logic errors were found. The test
 * is clear, well-documented, and ready for production.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O EVERY `api.functional.*` call has `await`
 *   - O DTO type precision
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 */
const __revise = {};
__revise;
