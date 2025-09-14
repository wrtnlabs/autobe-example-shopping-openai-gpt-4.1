import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates the seller's ability to update a cancellation request for their own
 * order.
 *
 * This test covers a full workflow:
 *
 * 1. Seller registers and authenticates.
 * 2. Seller creates a store and product.
 * 3. Buyer registers, authenticates, and places an order.
 * 4. Buyer creates a cancellation request on the order.
 * 5. Seller logs in and updates the cancellation (success: allowed transition,
 *    error: invalid/finalized).
 */
export async function test_api_seller_order_cancellation_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;

  // 2. Seller creates a store
  const storeCode = RandomGenerator.alphaNumeric(8);
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerId,
        seller_profile_id: typia.random<string & tags.Format<"uuid">>(),
        store_name: RandomGenerator.paragraph({ sentences: 2 }),
        store_code: storeCode,
        approval_status: "active",
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(store);
  const storeId = store.id;

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerId,
        store_id: storeId,
        product_code: productCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "pending_approval",
        current_price: 9990,
        inventory_quantity: 5,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Buyer registers & authenticates
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(10);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  const buyerId = buyerJoin.id;

  // 5. Buyer creates an order
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerId,
        channel_id: typia.random<string & tags.Format<"uuid">>(),
        order_code: RandomGenerator.alphaNumeric(12),
        status: "created",
        total_price: product.current_price,
        currency: "KRW",
        address_snapshot_id: addressId,
        ai_commerce_order_items: [
          {
            product_variant_id: product.id satisfies string as string,
            item_code: RandomGenerator.alphaNumeric(8),
            name: product.name,
            quantity: 1,
            unit_price: product.current_price,
            total_price: product.current_price,
          },
        ] satisfies IAiCommerceOrderItem.ICreate[],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderId = order.id;

  // 6. Buyer requests cancellation
  const cancellation =
    await api.functional.aiCommerce.buyer.orders.cancellations.create(
      connection,
      {
        orderId: orderId,
        body: {
          reason: "Changed mind",
          status: "requested",
        } satisfies IAiCommerceOrderCancellation.ICreate,
      },
    );
  typia.assert(cancellation);
  const cancellationId = cancellation.id;

  // 7. Seller logs back in before update
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 8. Seller updates cancellation: success scenario
  const updatedCancellation =
    await api.functional.aiCommerce.seller.orders.cancellations.update(
      connection,
      {
        orderId: orderId,
        cancellationId: cancellationId,
        body: {
          status: "approved",
          reason: "Refund acceptable. Processing.",
        } satisfies IAiCommerceOrderCancellation.IUpdate,
      },
    );
  typia.assert(updatedCancellation);
  TestValidator.equals(
    "Updated status to approved",
    updatedCancellation.status,
    "approved",
  );
  TestValidator.equals(
    "Updated reason reflected",
    updatedCancellation.reason,
    "Refund acceptable. Processing.",
  );

  // 9. Attempt update with invalid status (e.g., finalized/cannot be transitioned)
  await TestValidator.error(
    "Cannot update already approved/finalized cancellation",
    async () => {
      await api.functional.aiCommerce.seller.orders.cancellations.update(
        connection,
        {
          orderId: orderId,
          cancellationId: cancellationId,
          body: {
            status: "requested",
          } satisfies IAiCommerceOrderCancellation.IUpdate,
        },
      );
    },
  );
}

/**
 * - All 'api.functional.*' calls use 'await'.
 * - No additional imports or import hacks.
 * - Proper TypeScript strict type safety for request/response types (uses
 *   'satisfies' for request bodies and no 'as any').
 * - No wrong type validation or attempts to pass missing required fields. Error
 *   scenarios test business rules (state transitions) only.
 * - TestValidator calls all have descriptive titles as first parameter.
 * - No logical or sequence mistakes (flow: seller join → store/product → buyer
 *   join → order → cancel → seller approve/update → error update).
 * - For status/role values, string literals used that match patterns ("active",
 *   "pending_approval", etc).
 * - All typia.random/RandomGenerator patterns and null/undefined handling
 *   consistent and correct.
 * - Final code is compliant with all mandatory rules.
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
 *   - O 4. Quality Standards and Best Practices
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
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback is awaited
 *   - O Compilation error scenarios skipped
 *   - O No DTO confusion (ICreate vs base, etc)
 *   - O CRITICAL: Only template imports used
 *   - O All TestValidator have descriptive titles
 */
const __revise = {};
__revise;
