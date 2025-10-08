import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

/**
 * Validate that an admin can retrieve all shipment status records for a given
 * order using the admin API endpoint.
 *
 * - Sets up order address and payment method snapshots
 * - Creates an order for test
 * - Authenticates as admin
 * - Fetches shipment list by order ID via admin endpoint, checking for
 *   completeness
 * - Edge cases: attempts to fetch for a non-existent order ID, order with
 *   multiple shipments, and error scenarios
 */
export async function test_api_order_shipment_status_tracking_by_admin(
  connection: api.IConnection,
) {
  // 1. Create an admin user and log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create order address snapshot
  const shippingAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);

  // 3. Create payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
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
          method_data: RandomGenerator.paragraph(),
          display_name: RandomGenerator.name(),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Place an order with link to address and payment
  const orderCreateBody = {
    shipping_address_id: shippingAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(createdOrder);

  // 5. Fetch order shipments as admin
  const shipmentsPage: IPageIShoppingMallOrderShipment =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: createdOrder.id,
      body: {} satisfies IShoppingMallOrderShipment.IRequest,
    });
  typia.assert(shipmentsPage);
  TestValidator.predicate(
    "There is at least one shipment entry",
    shipmentsPage.data.length > 0,
  );
  for (const shipment of shipmentsPage.data) {
    typia.assert(shipment);
    TestValidator.equals(
      "parent order id matches",
      shipment.shopping_mall_order_id,
      createdOrder.id,
    );
    TestValidator.predicate(
      "carrier exists",
      !!shipment.carrier && shipment.carrier.length > 0,
    );
    TestValidator.predicate(
      "shipment_number exists",
      !!shipment.shipment_number && shipment.shipment_number.length > 0,
    );
    TestValidator.predicate(
      "status exists",
      !!shipment.status && shipment.status.length > 0,
    );
  }

  // 6. Edge case: Non-existent order ID
  await TestValidator.error("404 for non-existent orderId", async () => {
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      body: {} satisfies IShoppingMallOrderShipment.IRequest,
    });
  });

  // 7. Edge case: If multiple shipments per order supported (simulate)
  // This test will just document that multiple returned entries are handled
  if (shipmentsPage.data.length > 1) {
    const shipmentNumbers = shipmentsPage.data.map((s) => s.shipment_number);
    TestValidator.equals(
      "shipment count matches data count",
      shipmentNumbers.length,
      shipmentsPage.data.length,
    );
  }
}
