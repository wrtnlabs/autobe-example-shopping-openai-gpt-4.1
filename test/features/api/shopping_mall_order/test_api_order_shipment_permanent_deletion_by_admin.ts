import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate permanent deletion of a shipment record from an order by admin.
 *
 * This scenario covers:
 *
 * - Creating a fresh admin account
 * - Creating a shipping address snapshot
 * - Creating a payment method snapshot
 * - Creating an order referring to both snapshots
 * - Simulating a shipment record (via random UUID)
 * - Deleting the shipment from the order as admin
 * - Attempting to delete the shipment again and confirming error All side-effects
 *   (audit logs, customer/order links, etc.) are not directly testable, so
 *   focus is on deletion logic and error branch.
 *
 * Steps:
 *
 * 1. Admin registers via /auth/admin/join
 * 2. Customer order address snapshot is created
 * 3. Payment method snapshot is created
 * 4. Order is created referencing above address and payment
 * 5. A unique random shipmentId is chosen (simulated)
 * 6. Shipment is deleted from order
 * 7. Double deletion is attempted and expects an error to be thrown
 */
export async function test_api_order_shipment_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "MySecurePassword123!",
      full_name: RandomGenerator.name(),
      // status is optional; omit for pending/active default
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create an address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: RandomGenerator.pick([
            "shipping",
            "billing",
            "both",
          ] as const),
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.pick([
            null,
            RandomGenerator.paragraph({ sentences: 1 }),
          ] as const),
          country_code: RandomGenerator.pick(["KOR", "USA", "JPN"] as const),
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.paragraph({ sentences: 1 }),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Create an order referencing above
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Simulate random shipmentId
  const shipmentId = typia.random<string & tags.Format<"uuid">>();

  // 6. Delete the shipment from the order as admin
  await api.functional.shoppingMall.admin.orders.shipments.erase(connection, {
    orderId: order.id,
    shipmentId,
  });

  // 7. Attempt to delete deleted shipment and confirm error (shipment is gone)
  await TestValidator.error(
    "deleting an already deleted/non-existent shipment should throw",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.erase(
        connection,
        {
          orderId: order.id,
          shipmentId,
        },
      );
    },
  );
}
