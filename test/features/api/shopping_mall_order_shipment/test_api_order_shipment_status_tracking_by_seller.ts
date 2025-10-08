import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller shipment status tracking for assigned order (including
 * split/multi-shipment), and access error checks for unassigned order.
 *
 * 1. Register seller (join)
 * 2. Create shipping address snapshot (customer flow)
 * 3. Create order payment method snapshot
 * 4. Place order with created address & payment (customer flow)
 * 5. Seller retrieves shipment(s) for the order via PATCH
 *    /shoppingMall/seller/orders/{orderId}/shipments
 * 6. Validate: presence of shipments, correctness of shipment status/fields
 * 7. (Edge) If possible: place split order, ensure multiple shipments are returned
 * 8. (Security) Register another seller, who tries to query shipment for the order
 *    (should be denied or empty)
 */
export async function test_api_order_shipment_status_tracking_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Create shipping address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(6),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 3. Create order payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Place order (customer flow)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 49900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Seller queries shipment(s)
  const shipmentsPage =
    await api.functional.shoppingMall.seller.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(shipmentsPage);

  // 6. Validate shipment records
  TestValidator.predicate(
    "At least one shipment record exists",
    shipmentsPage.data.length >= 1,
  );
  for (const shipment of shipmentsPage.data) {
    typia.assert<IShoppingMallOrderShipment>(shipment);
    TestValidator.equals(
      "Shipment belongs to correct order",
      shipment.shopping_mall_order_id,
      order.id,
    );
    TestValidator.predicate(
      "Shipment status has allowed value",
      [
        "pending",
        "processing",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "returned",
        "refunded",
        "cancelled",
        "delivery_failed",
      ].includes(shipment.status),
    );
    TestValidator.predicate(
      "Shipment has carrier",
      typeof shipment.carrier === "string" && shipment.carrier.length > 0,
    );
    TestValidator.predicate(
      "Shipment has shipment_number",
      typeof shipment.shipment_number === "string" &&
        shipment.shipment_number.length > 0,
    );
  }

  // 7. Edge case: try with another seller (should be denied or no records)
  const anotherSellerEmail = typia.random<string & tags.Format<"email">>();
  const anotherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: anotherSellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(anotherSeller);

  await TestValidator.error(
    "Unauthorized seller should not access unrelated order shipments",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {},
        },
      );
    },
  );
}
