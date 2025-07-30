import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that adding an order item with a non-existent productId fails.
 *
 * This test ensures the API correctly enforces foreign key constraints such
 * that order items referencing invalid products cannot be created, and
 * validation errors are properly surfaced to the client. This prevents orders
 * being corrupted with phantom products.
 *
 * Test steps:
 *
 * 1. Create a test seller (since orders must belong to a seller)
 * 2. Create a legitimate order for the seller (with valid customer, address, etc.)
 * 3. Attempt to add an order item with a random (non-existent) productId
 *
 *    - Use a valid UUID (ensure format passes) but deliberately does not exist in
 *         product catalog
 * 4. Confirm API call rejects the request with a foreign key error
 *
 *    - Should throw or return an error indicating invalid productId
 * 5. Assert that no order item is created/returned
 *
 * This test validates critical data integrity rules for the order item append
 * endpoint.
 */
export async function test_api_aimall_backend_seller_orders_test_add_order_item_with_invalid_product_id_fails(
  connection: api.IConnection,
) {
  // 1. Create a test seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a legitimate order for the seller (use random but valid customerId/addressId)
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 3. Attempt to add an order item with a non-existent productId (foreign key violation)
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  const orderItemInput: IAimallBackendOrderItem.ICreate = {
    product_id: invalidProductId, // intentionally fake/nonexistent
    item_name: "InvalidProductTestItem",
    quantity: 1,
    unit_price: 9999,
    total_price: 9999,
  };
  // 4. Confirm the API rejects the request with validation error
  await TestValidator.error(
    "Adding order item with invalid productId should fail",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemInput,
      },
    );
  });
}
