import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validates that a shopping mall admin can perform soft deletion on any order,
 * irrespective of the order's originator. This test covers the sequence: admin
 * registration & login, customer registration & login, cart creation, admin
 * creates an order via that cart, another admin performs a soft delete, and key
 * compliance aspects are checked (deleted_at, no hard delete, business rule
 * enforcement, and audit/evidence trace as possible).
 *
 * 1. Register admin1 (primary admin, will create order)
 * 2. Authenticate as admin1
 * 3. Register a customer and authenticate
 * 4. Create a cart for the customer
 * 5. Switch to admin1; create an order in admin context using the cart
 * 6. Register and authenticate admin2 (secondary admin, will delete order)
 * 7. As admin2, soft-delete the order (should be permitted and succeed)
 * 8. If possible, query the deleted order and verify that deleted_at is populated
 *    (soft delete)
 * 9. Attempt to delete same order again as admin2; should error (already deleted)
 * 10. (Optional) Create a "finalized" order (locked state), attempt deletion as
 *     admin; should fail per business rules
 * 11. Verify that all responses conform to IShoppingMallOrder and audit evidence
 *     (if exposable)
 */
export async function test_api_order_admin_soft_delete_compliance_enforcement(
  connection: api.IConnection,
) {
  // Register first admin (admin1)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: "admin1password",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin1);

  // Register customer and create cart
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      email: customerEmail,
      password: "customerpass",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: customer.shopping_mall_channel_id,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Switch to admin1 context and create an order
  await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: "admin1password",
      name: admin1.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItemPrice = 35000;
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: orderItemPrice,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_id: productId,
        shopping_mall_seller_id: sellerId,
        quantity: 1,
        unit_price: orderItemPrice,
        final_price: orderItemPrice,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        delivery_status: "prepared",
        delivery_attempts: 0,
      } satisfies IShoppingMallDelivery.ICreate,
    ],
    payments: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        status: "pending",
        amount: orderItemPrice,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // Register and authenticate a second admin (admin2, deleter)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: "admin2password",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin2);

  // Soft delete order as admin2
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderId: order.id,
  });
  // The erase returns void, but let's attempt minimal validation pattern

  // Optionally, if order fetch API existed, we could fetch and verify deleted_at is set
  // Since we cannot fetch, we must trust that erase succeeded by no error thrown

  // Attempt to delete again - should error
  await TestValidator.error(
    "second soft delete should fail (already deleted)",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderId: order.id,
      });
    },
  );

  // (Optional) Attempt to delete a finalized order if API/status allowed (omitted for lack of status manipulation API)
  // If such status transitions are needed, this would require more API access
}
