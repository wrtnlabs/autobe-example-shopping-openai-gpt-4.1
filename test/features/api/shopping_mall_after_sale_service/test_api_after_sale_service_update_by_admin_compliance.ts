import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin update of after-sales service records for compliance, dispute,
 * and operational audit.
 *
 * 1. Register an admin.
 * 2. Create a customer shopping cart (as order basis).
 * 3. Create an order as admin, referencing the cart and realistic order data.
 * 4. Register a delivery for the order under customer context.
 * 5. Create an after-sales service linked to the order (by admin): e.g. a
 *    return/exchange case with a compliance-relevant reason.
 * 6. Update the after-sales service as admin: change status (e.g. from 'requested'
 *    → 'processing', add an audit note).
 * 7. Validate the after-sales service record reflects updates (status, audit/note,
 *    timestamp/new snapshot, etc).
 * 8. Try forbidden update scenarios: e.g. changing to an invalid status, or
 *    updating a completed/cancelled case, confirm error handling.
 */
export async function test_api_after_sale_service_update_by_admin_compliance(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admintest123!",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create customer cart
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
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

  // 3. Create order (admin)
  const orderItemProductId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSellerId = typia.random<string & tags.Format<"uuid">>();
  const orderCreation: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 50000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: "",
        shopping_mall_product_id: orderItemProductId,
        shopping_mall_seller_id: orderItemSellerId,
        quantity: 1 satisfies number & tags.Type<"int32">,
        unit_price: 50000,
        final_price: 50000,
        status: "ordered",
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    deliveries: [],
    payments: [
      {
        shopping_mall_order_id: "",
        shopping_mall_customer_id: customerId,
        payment_type: "card",
        status: "paid",
        amount: 50000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      } satisfies IShoppingMallPayment.ICreate,
    ],
  };
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreation },
  );
  typia.assert(order);

  // 4. Register order delivery
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          address_snapshot: RandomGenerator.paragraph(),
          delivery_status: "prepared",
          delivery_attempts: 0 as number & tags.Type<"int32">,
        } satisfies IShoppingMallDelivery.ICreate,
      },
    );
  typia.assert(delivery);

  // 5. Create after-sales service for the order (admin)
  const afterSaleCreate: IShoppingMallAfterSaleService.ICreate = {
    case_type: "exchange",
    shopping_mall_delivery_id: delivery.id,
    reason: "Damaged item received",
    evidence_snapshot: "Initial evidence uploaded",
    resolution_message: null,
  };
  const afterSale =
    await api.functional.shoppingMall.admin.orders.afterSaleServices.create(
      connection,
      { orderId: order.id, body: afterSaleCreate },
    );
  typia.assert(afterSale);

  // 6. Update after-sales service as admin: move status to 'processing', add resolution message
  const afterSaleUpdate: IShoppingMallAfterSaleService.IUpdate = {
    status: "processing",
    resolution_message: "Case reviewed and is under compliance check.",
  };
  const afterSaleUpdated =
    await api.functional.shoppingMall.admin.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
        body: afterSaleUpdate,
      },
    );
  typia.assert(afterSaleUpdated);
  TestValidator.equals("status updated", afterSaleUpdated.status, "processing");
  TestValidator.equals(
    "resolution added",
    afterSaleUpdated.resolution_message,
    afterSaleUpdate.resolution_message,
  );

  // 7. Negative/forbidden update scenario: attempt bad status transition (e.g. set status to non-existent value)
  await TestValidator.error("invalid status update should fail", async () => {
    await api.functional.shoppingMall.admin.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
        body: {
          status: "not_a_real_status",
        } satisfies IShoppingMallAfterSaleService.IUpdate,
      },
    );
  });

  // 8. Negative/forbidden update: mark completed then try to update (simulate completed scenario)
  const completed =
    await api.functional.shoppingMall.admin.orders.afterSaleServices.update(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
        body: {
          status: "completed",
        } satisfies IShoppingMallAfterSaleService.IUpdate,
      },
    );
  typia.assert(completed);
  await TestValidator.error(
    "updating after completed status should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.afterSaleServices.update(
        connection,
        {
          orderId: order.id,
          afterSaleServiceId: afterSale.id,
          body: {
            reason: "Attempt to modify after completion",
          } satisfies IShoppingMallAfterSaleService.IUpdate,
        },
      );
    },
  );
}
