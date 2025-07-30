import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test updating an order by a seller with valid authority.
 *
 * This test validates that a seller can successfully update their own order (as
 * the owner), modifying only fields allowed by business rules. The update must
 * succeed and return the updated order with changes reflected.
 *
 * Implementation Steps:
 *
 * 1. Register a seller using the administrator onboarding endpoint.
 * 2. Create a product and link it to the above seller.
 * 3. Create an order for the seller. (address/customer/seller linkage done via DTO
 *    random generation.)
 * 4. Prepare an update DTO modifying updatable fields (e.g., status, total_amount,
 *    currency).
 * 5. Call the seller order update API with the orderId and update payload.
 * 6. Assert the returned order matches the update request for relevant fields and
 *    retains unmodified values for other fields.
 * 7. Confirm the seller is the owner by matching seller_id before/after.
 */
export async function test_api_aimall_backend_seller_orders_test_update_order_by_seller_with_valid_authority(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerCreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerCreate },
    );
  typia.assert(seller);

  // 2. Create a product by this seller
  const productCreate: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(8),
    description: RandomGenerator.content()(1)(2),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productCreate },
  );
  typia.assert(product);

  // 3. Create an order for the seller
  const orderCreate: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: undefined,
    order_status: "pending",
    total_amount: 57000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);

  // 4. Prepare an update DTO modifying updatable fields (status, total_amount, currency)
  const newStatus = "paid";
  const newTotal = order.total_amount + 1000;
  const updateDto: IAimallBackendOrder.IUpdate = {
    order_status: newStatus,
    total_amount: newTotal,
    currency: order.currency,
    updated_at: new Date().toISOString(),
  };
  // 5. Call update API
  const updated = await api.functional.aimall_backend.seller.orders.update(
    connection,
    {
      orderId: order.id,
      body: updateDto,
    },
  );
  typia.assert(updated);

  // 6. Validate updated fields and ownership
  TestValidator.equals("order id kept")(updated.id)(order.id);
  TestValidator.equals("order status updated")(updated.order_status)(newStatus);
  TestValidator.equals("order total updated")(updated.total_amount)(newTotal);
  TestValidator.equals("order currency kept")(updated.currency)(order.currency);
  TestValidator.equals("seller ownership retained")(updated.seller_id)(
    seller.id,
  );
}
