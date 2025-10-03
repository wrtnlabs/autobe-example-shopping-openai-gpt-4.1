import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Assess admin's authority to logically delete any shipment associated with an
 * order, enforcing compliance, audit, and rollback requirements.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin using admin/join.
 * 2. Create a new order as admin, providing necessary nested items, payment, and
 *    delivery structure.
 * 3. Register a shipment batch for the order via the shipment creation endpoint.
 * 4. Soft delete the shipment as admin and ensure the operation completes without
 *    error.
 * 5. (Optional) Attempt to soft delete a shipment that is not allowed to be
 *    deleted (simulate delivered status, expect error).
 * 6. Optionally, re-fetch or check shipment via the underlying data or by trying
 *    to delete again to ensure deleted_at is set, proving logical deletion.
 */
export async function test_api_order_shipment_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Create a new order as admin
  const orderBody = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    order_type: "normal",
    total_amount: 100000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: "TBD", // Will replace after order creation
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1,
        unit_price: 100000,
        final_price: 100000,
        status: "ordered",
      },
    ],
    deliveries: [
      {
        shopping_mall_order_id: "TBD",
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        address_snapshot: RandomGenerator.paragraph(),
        delivery_status: "prepared",
        delivery_attempts: 0,
      },
    ],
    payments: [
      {
        shopping_mall_order_id: "TBD",
        shopping_mall_customer_id: "TBD",
        payment_type: "card",
        status: "pending",
        amount: 100000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  // Patch items with order ID after order is created
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Patch order_associated ids in items and others
  const orderId = order.id;

  // 3. Register a shipment batch for the order
  const shipmentBody = {
    shopping_mall_order_id: orderId,
    shopping_mall_seller_id:
      order.order_items && order.order_items.length > 0
        ? order.order_items[0].shopping_mall_seller_id
        : typia.random<string & tags.Format<"uuid">>(),
    shipment_code: RandomGenerator.alphaNumeric(16),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId,
        body: shipmentBody,
      },
    );
  typia.assert(shipment);

  // 4. Soft delete the shipment as admin
  await api.functional.shoppingMall.admin.orders.shipments.erase(connection, {
    orderId,
    shipmentId: shipment.id,
  });

  // 5. Attempt to soft delete again (should error as already logically deleted)
  await TestValidator.error(
    "Deleting an already soft-deleted shipment should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.erase(
        connection,
        {
          orderId,
          shipmentId: shipment.id,
        },
      );
    },
  );
  // Additional checks for immutability or delivered status could be created if business logic is discoverable.
}
