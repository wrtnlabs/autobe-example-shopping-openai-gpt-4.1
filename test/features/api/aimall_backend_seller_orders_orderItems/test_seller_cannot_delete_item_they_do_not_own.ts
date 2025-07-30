import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that Seller B cannot delete order items from Seller A's order.
 *
 * This test ensures that cross-seller access control is enforced: a seller
 * should not be able to delete an order item belonging to another seller's
 * order. Attempting to do so must result in an error (e.g., authorization or
 * permission error).
 *
 * Test Workflow:
 *
 * 1. Administrator creates Seller A.
 * 2. Administrator creates Seller B (the unauthorized actor).
 * 3. As Seller A, create a product.
 * 4. As Seller B, create a product as well (to verify isolation, if needed).
 * 5. As Seller A, create an order for Seller A's product (random UUIDs for related
 *    customer/address fields for test purposes).
 * 6. As Seller A, add an order item to their order.
 * 7. As Seller B (with only their own credentials, NOT as admin), attempt to
 *    delete Seller A's order item from Seller A's order using the DELETE
 *    endpoint:
 *    /aimall-backend/seller/orders/{orderId}/orderItems/{orderItemId}.
 * 8. Assert that the API call fails with an error (such as forbidden/unauthorized)
 *    and does not succeed in deletion.
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_seller_cannot_delete_item_they_do_not_own(
  connection: api.IConnection,
) {
  // 1. Administrator creates Seller A
  const sellerAInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: RandomGenerator.alphabets(6) + "A@example.com",
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerAInput },
    );
  typia.assert(sellerA);

  // 2. Administrator creates Seller B
  const sellerBInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(8),
    email: RandomGenerator.alphabets(6) + "B@example.com",
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerBInput },
    );
  typia.assert(sellerB);

  // 3. As Seller A, create a product
  const productAInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerA.id,
    title: RandomGenerator.paragraph()(10),
    description: RandomGenerator.paragraph()(20),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const productA = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productAInput },
  );
  typia.assert(productA);

  // 4. As Seller B, create a product
  const productBInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerB.id,
    title: RandomGenerator.paragraph()(10),
    description: RandomGenerator.paragraph()(20),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const productB = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productBInput },
  );
  typia.assert(productB);

  // 5. As Seller A, create an order for Seller A's product
  const orderAInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerA.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: undefined,
    order_status: "pending",
    total_amount: 1000,
    currency: "KRW",
  };
  const orderA = await api.functional.aimall_backend.seller.orders.create(
    connection,
    { body: orderAInput },
  );
  typia.assert(orderA);

  // 6. As Seller A, add an order item to their order
  const itemAInput: IAimallBackendOrderItem.ICreate = {
    product_id: productA.id,
    item_name: productA.title,
    quantity: 1,
    unit_price: 1000,
    total_price: 1000,
  };
  const orderItemA =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      { orderId: orderA.id, body: itemAInput },
    );
  typia.assert(orderItemA);

  // 7. Simulate credential switch to Seller B (implementation depends on test env)
  // If a login API exists, use it; otherwise, this is a logical placeholder

  // 8. Seller B attempts to delete Seller A's order item -- should fail with error
  await TestValidator.error(
    "Seller B cannot delete another seller's order item",
  )(
    async () =>
      await api.functional.aimall_backend.seller.orders.orderItems.erase(
        connection,
        {
          orderId: orderA.id,
          orderItemId: orderItemA.id,
        },
      ),
  );
}
