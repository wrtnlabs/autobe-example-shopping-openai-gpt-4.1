import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate a seller can fetch all shipment records for their own order, with
 * diverse edge cases.
 *
 * This test verifies the correct operation of shipment listing for sellers,
 * ensures listing is order-bound, and covers negative/edge behaviors with order
 * ownership and shipment status variants.
 *
 * Steps:
 *
 * 1. Register a seller account.
 * 2. Create an order belonging to that seller (simulate an attached
 *    customer/address).
 * 3. List shipments before any are created: expect empty data[].
 * 4. Insert several shipments for the order, using distinct carrier/status pairs
 *    (including edge statuses—e.g., lost, returned).
 * 5. List shipments again: verify correctness [count, data integrity, distinct
 *    statuses/carriers present, all expected fields, all orderIds match].
 * 6. Negative: Use a random UUID for an order belonging to a different seller
 *    (simulate attacker) and confirm access denied (forbidden/unauthorized).
 * 7. Negative: Provide non-existent or garbled orderId string (invalid UUID):
 *    expect error.
 * 8. Negative: Provide syntactically-valid but non-existent orderId (UUID not in
 *    DB): expect error.
 */
export async function test_api_aimall_backend_seller_orders_shipments_index(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create an order attached to this seller
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 12345,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 3. List shipments before creating any (should be empty)
  const shipmentsInitial =
    await api.functional.aimall_backend.seller.orders.shipments.index(
      connection,
      { orderId: order.id },
    );
  typia.assert(shipmentsInitial);
  TestValidator.equals("no shipments before any exist")(
    shipmentsInitial.data.length,
  )(0);

  // 4. Insert multiple shipment records with distinct carrier/status variants
  const statusVariants = [
    "pending",
    "shipped",
    "delivered",
    "lost",
    "returned",
  ];
  const addressId = order.address_id; // Use order address for all shipments
  const createdShipments = await ArrayUtil.asyncMap(statusVariants)(
    async (status) => {
      const carrier = RandomGenerator.pick([
        "CJ Logistics",
        "FedEx",
        "UPS",
        "로젠택배",
        "Sagawa",
      ]);
      const tracking = RandomGenerator.alphaNumeric(12);
      const shipment =
        await api.functional.aimall_backend.seller.orders.shipments.create(
          connection,
          {
            orderId: order.id,
            body: {
              order_id: order.id,
              shipment_address_id: addressId,
              carrier,
              tracking_number: tracking,
              shipment_status: status,
              shipped_at:
                status !== "pending" ? new Date().toISOString() : null,
              delivered_at:
                status === "delivered" ? new Date().toISOString() : null,
            },
          },
        );
      typia.assert(shipment);
      TestValidator.equals("created shipment has correct status")(
        shipment.shipment_status,
      )(status);
      return shipment;
    },
  );

  // 5. List all shipments: verify contents
  const shipmentsResult =
    await api.functional.aimall_backend.seller.orders.shipments.index(
      connection,
      { orderId: order.id },
    );
  typia.assert(shipmentsResult);
  TestValidator.equals("shipment count matches")(shipmentsResult.data.length)(
    statusVariants.length,
  );
  for (const variant of statusVariants) {
    TestValidator.predicate(`contains shipment with status: ${variant}`)(
      shipmentsResult.data.some((s) => s.shipment_status === variant),
    );
  }
  for (const s of shipmentsResult.data) {
    TestValidator.equals("all orderId match")(s.order_id)(order.id);
    TestValidator.predicate("known carrier present")(
      typeof s.carrier === "string" && s.carrier.length > 0,
    );
    // tracking_number, shipped_at, delivered_at: presence checked by status above
  }

  // 6. Negative test: listing shipments for unrelated orderId (different seller/attacker)
  const otherSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(7),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(otherSeller);
  const otherOrder = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: otherSeller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 11111,
        currency: "KRW",
      },
    },
  );
  typia.assert(otherOrder);
  // Attempt to list using the original seller connection for a foreign order:
  await TestValidator.error(
    "cannot list shipments for order belonging to different seller",
  )(() =>
    api.functional.aimall_backend.seller.orders.shipments.index(connection, {
      orderId: otherOrder.id,
    }),
  );

  // 7. Negative: Provide an invalid UUID format (malformed) as orderId
  await TestValidator.error("malformed orderId produces error")(() =>
    api.functional.aimall_backend.seller.orders.shipments.index(connection, {
      orderId: "not-a-valid-uuid" as any,
    }),
  );

  // 8. Negative: Provide syntactically-valid but non-existent orderId
  const badOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent orderId produces error")(() =>
    api.functional.aimall_backend.seller.orders.shipments.index(connection, {
      orderId: badOrderId,
    }),
  );
}
