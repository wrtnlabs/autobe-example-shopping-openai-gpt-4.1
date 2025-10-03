import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate the update workflow of after-sales service requests (customer role)
 * end-to-end.
 *
 * This test covers the join, cart/order, delivery, after-sales service
 * creation, and update happy path. It also validates error scenarios:
 * unauthorized update (other customer), editing a resolved after-sale case,
 * invalid status transition.
 *
 * Steps:
 *
 * 1. Register a new customer and acquire authentication.
 * 2. Create a cart for this customer (scoped to random channel/section).
 * 3. Submit an admin-backed order creation referencing that cart, with valid
 *    required order fields and a basic order item, payment, delivery.
 * 4. Register delivery for the order as the customer.
 * 5. Initiate an after-sales service request (e.g., case_type: 'return' or
 *    'refund') using valid reason and (optionally) a snapshot string.
 * 6. Update after-sales service with additional reason/message/evidence to
 *    simulate escalation or evidence upload.
 * 7. Assert that the after-sales service updates are persisted (reason, evidence,
 *    etc.) and that snapshot/audit logic occurred (updated_at changed,
 *    evidence_snapshot set, etc.).
 * 8. Attempt to update as another unauthorized customer (should fail: forbidden).
 * 9. Attempt to update after resolving the after-sales service (change status to
 *    e.g. 'approved', then try to update again; should fail if backend enforces
 *    that edits to finalized cases are not allowed).
 */
export async function test_api_after_sale_service_update_by_customer_workflow(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const joinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create cart for customer
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member", // Example source
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);

  // 3. Place order via admin endpoint (simulate checkout-and-finish)
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Placeholder; real backend likely ignores/overwrites
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        status: "ordered",
      },
    ],
    deliveries: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Will be fixed by backend
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph({ sentences: 6 }),
        delivery_status: "prepared",
        delivery_attempts: 0,
      },
    ],
    payments: [
      {
        shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Placeholder
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        status: "paid",
        amount: 10000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 4. Register delivery for order
  const deliveryBody = {
    shopping_mall_order_id: order.id,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph({ sentences: 6 }),
    delivery_status: "prepared",
    delivery_attempts: 1,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: deliveryBody,
      },
    );
  typia.assert(delivery);

  // 5. Create after-sale service request
  const afterSaleBody = {
    case_type: RandomGenerator.pick(["return", "exchange", "refund"] as const),
    shopping_mall_delivery_id: delivery.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    evidence_snapshot: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: afterSaleBody,
      },
    );
  typia.assert(afterSale);

  // 6. Update after-sales service (happy path)
  const updateBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    evidence_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
    resolution_message: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallAfterSaleService.IUpdate;
  const updated =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "after-sales update reason persists",
    updated.reason,
    updateBody.reason,
  );
  TestValidator.equals(
    "after-sales update evidence persists",
    updated.evidence_snapshot,
    updateBody.evidence_snapshot,
  );
  TestValidator.equals(
    "after-sales update resolution_message persists",
    updated.resolution_message,
    updateBody.resolution_message,
  );
  TestValidator.notEquals(
    "updated_at changes on update",
    updated.updated_at,
    afterSale.updated_at,
  );

  // 7. Unauthorized customer cannot update: create 2nd customer
  const joinBody2 = {
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: joinBody2,
  });
  typia.assert(customer2);
  await TestValidator.error(
    "unauthorized customer cannot update after-sale service",
    async () => {
      await api.functional.shoppingMall.customer.orders.afterSaleServices.update(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: afterSale.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );

  // 8. Cannot update after 'resolution' (if enforced by backend): set status to 'approved' then try update
  const finalized =
    await api.functional.shoppingMall.customer.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
        body: { status: "approved" },
      },
    );
  typia.assert(finalized);
  await TestValidator.error(
    "cannot edit finalized after-sale service",
    async () => {
      await api.functional.shoppingMall.customer.orders.afterSaleServices.update(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: afterSale.id,
          body: {
            resolution_message: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}
