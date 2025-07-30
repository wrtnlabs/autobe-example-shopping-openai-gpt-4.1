import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validates the administrator's ability to retrieve all shipment records for
 * any order, including across different sellers and customers.
 *
 * This test covers:
 *
 * 1. Creating at least two orders (with distinct customer_id/seller_id/address_id)
 *    as administrator
 * 2. Provisioning a mix of shipments (delivered, pending) for one order, none for
 *    the other
 * 3. Listing shipments for both orders: data match (carriers, statuses,
 *    shipment/delivery time), empty result for no-shipments order
 * 4. Proper error handling for non-existent orderId (404)
 * 5. (Optional) Access control - can be extended if non-admin/account context APIs
 *    are available
 */
export async function test_api_aimall_backend_administrator_orders_shipments_index(
  connection: api.IConnection,
) {
  // 1. Create two orders with unique, realistic IDs
  const order1 =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-1001`,
          order_status: "pending",
          total_amount: 20000,
          currency: "KRW",
        },
      },
    );
  typia.assert(order1);

  const order2 =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_number: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-2001`,
          order_status: "paid",
          total_amount: 45000,
          currency: "KRW",
        },
      },
    );
  typia.assert(order2);

  // 2. Create two different shipments for order1 (one delivered, one pending), zero for order2
  const shipment1 =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order1.id,
        body: {
          order_id: order1.id,
          shipment_address_id: order1.address_id,
          carrier: "CJ Logistics",
          tracking_number: "123456789KOR1",
          shipment_status: "delivered",
          shipped_at: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          delivered_at: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(shipment1);

  const shipment2 =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order1.id,
        body: {
          order_id: order1.id,
          shipment_address_id: order1.address_id,
          carrier: "FedEx",
          tracking_number: "FEDEX09876",
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        },
      },
    );
  typia.assert(shipment2);

  // 3. List shipments for order1 (should contain shipment1 and shipment2)
  const shipments1 =
    await api.functional.aimall_backend.administrator.orders.shipments.index(
      connection,
      { orderId: order1.id },
    );
  typia.assert(shipments1);
  TestValidator.equals("Two shipments for order1")(shipments1.data.length)(2);
  const carriers = shipments1.data.map((s) => s.carrier);
  TestValidator.predicate("Both carriers present: CJ Logistics and FedEx")(
    carriers.includes("CJ Logistics") && carriers.includes("FedEx"),
  );
  const delivered = shipments1.data.find(
    (s) => s.shipment_status === "delivered",
  );
  TestValidator.predicate("Delivered shipment has delivered_at set")(
    !!delivered && delivered.delivered_at != null,
  );

  // 4. List shipments for order2 (should be empty)
  const shipments2 =
    await api.functional.aimall_backend.administrator.orders.shipments.index(
      connection,
      { orderId: order2.id },
    );
  typia.assert(shipments2);
  TestValidator.equals("No shipments for order2")(shipments2.data.length)(0);

  // 5. Non-existent orderId: get 404
  await TestValidator.error("404 error for invalid orderId")(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.index(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 6. (Optional future extension: permission/403 test if role/user API is added)
}
