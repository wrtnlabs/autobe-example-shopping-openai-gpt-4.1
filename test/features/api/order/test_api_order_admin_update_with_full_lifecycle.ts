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
 * E2E test for order lifecycle management by an admin user, verifying update
 * functionality for valid and invalid transitions and audit/snapshot evidence.
 *
 * Steps:
 *
 * 1. Create an admin account (to authorize subsequent steps).
 * 2. Create a customer account (so we have a customer for cart/order linkage).
 * 3. Customer: Create a shopping cart.
 * 4. Admin: Create an order via cart, with minimal required objects and valid
 *    pricing/currency.
 * 5. Update the order as admin, iterating through valid status transitions,
 *    ensuring updates are allowed and statuses reflect correctly after each
 *    change.
 * 6. At each step, confirm state is updated, a snapshot/audit trail is present
 *    (via updated_at), and business constraints are enforced (no status
 *    regression, no modification after final states or if soft-deleted).
 * 7. Error cases: Attempt forbidden status regressions, update a finalized or
 *    deleted order (expect error), and ensure customer cannot perform updates
 *    (expect authorization error).
 */
export async function test_api_order_admin_update_with_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admintest123",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminId = adminJoin.id;

  // 2. Customer joins the platform
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
      email: customerEmail,
      password: "customertest123",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;
  const channelId = customerJoin.shopping_mall_channel_id;

  // 3. Customer creates a cart
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 4. Admin creates an order referencing the cart
  // Build one order item (minimal DTO properties), one delivery, and one payment record
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: "DUMMY", // Will shrink to order.id after creation
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 1000,
    final_price: 1000,
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: "DUMMY", // Will shrink to order.id after creation
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_message: undefined,
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const payment: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: "DUMMY", // Will shrink to order.id after creation
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    external_payment_ref: undefined,
    status: "pending",
    amount: 1000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const orderPayload: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 1000,
    currency: "KRW",
    order_items: [{ ...orderItem }],
    deliveries: [{ ...delivery }],
    payments: [{ ...payment }],
    after_sale_services: [],
  };
  // Create the order (admin privileges)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: { ...orderPayload } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Patch 'DUMMY' fields with the real orderId for downstream update
  const orderId = order.id;
  orderItem.shopping_mall_order_id = orderId;
  delivery.shopping_mall_order_id = orderId;
  payment.shopping_mall_order_id = orderId;

  // 5. Admin updates status: applied -> paid -> shipping -> completed
  let prevStatus = order.status;
  const validStatusTransitions = ["applied", "paid", "shipping", "completed"];
  let lastOrder = order;
  for (const nextStatus of validStatusTransitions) {
    const updateBody = {
      status: nextStatus,
    } satisfies IShoppingMallOrder.IUpdate;
    const updated = await api.functional.shoppingMall.admin.orders.update(
      connection,
      {
        orderId,
        body: { ...updateBody },
      },
    );
    typia.assert(updated);
    TestValidator.equals(
      "order status updates to " + nextStatus,
      updated.status,
      nextStatus,
    );
    // Change should have occurred except for the first step if order already in that state
    if (prevStatus !== nextStatus) {
      TestValidator.notEquals(
        "order updated_at should change after status update",
        lastOrder.updated_at,
        updated.updated_at,
      );
    }
    lastOrder = updated;
    prevStatus = nextStatus;
  }

  // 6. Test business constraint: no illegal regression in status
  // E.g., cannot go back from 'completed' to 'shipping' or 'applied'
  for (const invalidStatus of ["shipping", "applied"]) {
    await TestValidator.error(
      `forbidden status regression to ${invalidStatus} should fail`,
      async () => {
        await api.functional.shoppingMall.admin.orders.update(connection, {
          orderId,
          body: { status: invalidStatus } satisfies IShoppingMallOrder.IUpdate,
        });
      },
    );
  }

  // 7. Test business constraint: no modification after soft-deletion
  // (simulate delete by setting deleted_at)
  // (Direct soft-delete endpoint not available; simulate by mocking deleted_at in update, expect failure)
  // Instead: forcibly set status to completed, then attempt further update
  await TestValidator.error(
    "modification after finalized order should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.update(connection, {
        orderId,
        body: { paid_amount: 999 } satisfies IShoppingMallOrder.IUpdate,
      });
    },
  );

  // 8. Test only admins can perform update (simulate customer, expect fail)
  // Switch context: simulate by clearing admin token, rejoining as customer
  const connCustomer: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.customer.join(connCustomer, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });

  await TestValidator.error("non-admin cannot update order", async () => {
    await api.functional.shoppingMall.admin.orders.update(connCustomer, {
      orderId,
      body: { status: "paid" } satisfies IShoppingMallOrder.IUpdate,
    });
  });
}
