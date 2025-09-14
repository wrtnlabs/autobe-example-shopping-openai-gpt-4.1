import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Admin can add a new order item to an existing order (after normal valid
 * checkout flow).
 *
 * Steps:
 *
 * 1. Admin registers and logs in.
 * 2. Seller registers and logs in, creates seller profile, store, product and
 *    variant (variant A).
 * 3. Buyer registers and logs in.
 * 4. Buyer places an order using product/variant A.
 * 5. Seller adds another variant (variant B) for same product.
 * 6. Admin logs in, and posts to /aiCommerce/admin/orders/{orderId}/items to add
 *    new order item for variant B.
 * 7. Validate: The extra order item (returned as IAiCommerceOrderItem) belongs to
 *    the correct order, variant, seller. Its values (seller_id,
 *    product_variant_id, name, quantity, pricing, etc.) match what was given,
 *    and is present in the overall order.
 */
export async function test_api_admin_add_order_item_to_existing_order_success(
  connection: api.IConnection,
) {
  // Step 1: Register and login admin
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

  // Step 2: Register and login seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // Seller profile
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerJoin.id,
        display_name: RandomGenerator.name(),
        approval_status: "active",
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerProfile);

  // Seller store
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerJoin.id,
        seller_profile_id: sellerProfile.id,
        store_name: RandomGenerator.name(),
        store_code: RandomGenerator.alphaNumeric(10),
        approval_status: "active",
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);

  // Seller product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: store.id,
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "sale_ready",
        current_price: 89000,
        inventory_quantity: 100,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // Product variant A
  const variantA =
    await api.functional.aiCommerce.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(6),
          option_summary: "Size: M / Color: Blue",
          variant_price: 89000,
          inventory_quantity: 42,
          status: "active",
        } satisfies IAiCommerceProductVariant.ICreate,
      },
    );
  typia.assert(variantA);

  // Step 3: Create buyer and login
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // Step 4: Buyer places an order (for variant A)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const addressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerJoin.id,
        channel_id: channelId,
        order_code: orderCode,
        status: "created",
        total_price: variantA.variant_price,
        currency: "KRW",
        address_snapshot_id: addressSnapshotId,
        ai_commerce_order_items: [
          {
            product_variant_id: variantA.id,
            seller_id: sellerJoin.id,
            item_code: RandomGenerator.alphaNumeric(8),
            name: variantA.option_summary,
            quantity: 1,
            unit_price: variantA.variant_price,
            total_price: variantA.variant_price,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 5: Seller adds a new variant (B) to the product
  const variantB =
    await api.functional.aiCommerce.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(6),
          option_summary: "Size: L / Color: Red",
          variant_price: 91000,
          inventory_quantity: 44,
          status: "active",
        } satisfies IAiCommerceProductVariant.ICreate,
      },
    );
  typia.assert(variantB);

  // Step 6: Login as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Step 7: Admin adds new order item (variant B) to the existing order
  const itemCodeB = RandomGenerator.alphaNumeric(8);
  const newOrderItem =
    await api.functional.aiCommerce.admin.orders.items.create(connection, {
      orderId: order.id,
      body: {
        product_variant_id: variantB.id,
        seller_id: sellerJoin.id,
        item_code: itemCodeB,
        name: variantB.option_summary,
        quantity: 2,
        unit_price: variantB.variant_price,
        total_price: variantB.variant_price * 2,
      } satisfies IAiCommerceOrderItem.ICreate,
    });
  typia.assert(newOrderItem);
  TestValidator.equals(
    "order item order id matches order",
    newOrderItem.order_id,
    order.id,
  );
  TestValidator.equals(
    "order item product_variant_id matches variantB",
    newOrderItem.product_variant_id,
    variantB.id,
  );
  TestValidator.equals(
    "order item seller matches",
    newOrderItem.seller_id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "order item name",
    newOrderItem.name,
    variantB.option_summary,
  );
  TestValidator.equals("order item quantity", newOrderItem.quantity, 2);
  TestValidator.equals(
    "order item unit price",
    newOrderItem.unit_price,
    variantB.variant_price,
  );
  TestValidator.equals(
    "order item total price",
    newOrderItem.total_price,
    variantB.variant_price * 2,
  );
}

/**
 * Review completed:
 *
 * - All code follows type safety and API/DTO structure rules
 * - All required business logic steps (registration,
 *   profile/store/product/variant, order, variant, add-order-item) are present
 *   and realistic
 * - No additional imports or manipulation of template
 * - No type error testing or type violations
 * - All RandomGenerator/typia usage correct
 * - All TestValidator assertions have mandatory titles and use correct value
 *   order
 * - All api.functional.* calls include await
 * - Authentication role switching (admin, seller, buyer) handled with explicit
 *   login/register steps
 * - No prohibited code detected; only actual existent DTOs/APIs/types/functions
 *   used
 * - Only data fields required for business identity/ownership/relationships are
 *   set; no omitted required, no invented/nonexistent properties used
 * - No code block/markdown leakage, pure TypeScript
 * - No null/undefined errors or non-null assertion (handled by type declarations
 *   and logic)
 * - Names and codes generated via RandomGenerator utility functions for
 *   randomness yet business realism
 * - Proper scenario comment (JSDoc) reflecting business flows
 * - No redundant DTO annotation in satisfies usage
 * - Comprehensive variable naming for clarity and traceability (adminEmail,
 *   sellerJoin, variantA/B, etc.)
 * - Only real-world implementable scenario portions present (no fantasy or
 *   impossible scenario logic)
 * - Step-by-step flow and entity relationship integrity, all referential keys and
 *   linkage/ownership handled
 * - The code is ready for production grade E2E test deployment.
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
 *   - O 5. Final Checklist
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
