import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";
import type { IPageIAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin advanced shipment search: filtering, pagination, and access
 * control.
 *
 * This test covers:
 *
 * 1. Admin can create orders and shipments with various properties.
 * 2. PATCH search can filter shipments by status.
 * 3. Search can filter by carrier (case-insensitive match).
 * 4. Date-range filters for shipped_at work as expected.
 * 5. Pagination/limit/page are respected and correctly segment data.
 * 6. Invalid status and pagination params return an error.
 * 7. Orders with no shipments return an empty result set. (Note: Non-admin role
 *    access is not tested due to lack of login/auth API for other roles.)
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_admin_search_and_paginate_order_shipments_by_criteria_and_access_control(
  connection: api.IConnection,
) {
  // 1. Admin creates multiple orders
  const ORDERS_COUNT = 2;
  const orders: IAimallBackendOrder[] = [];
  for (let i = 0; i < ORDERS_COUNT; ++i) {
    const order =
      await api.functional.aimall_backend.administrator.orders.create(
        connection,
        {
          body: {
            customer_id: typia.random<string & tags.Format<"uuid">>(),
            seller_id: typia.random<string & tags.Format<"uuid">>(),
            address_id: typia.random<string & tags.Format<"uuid">>(),
            order_status: "pending",
            total_amount: 10000 * (i + 1),
            currency: "KRW",
          } satisfies IAimallBackendOrder.ICreate,
        },
      );
    typia.assert(order);
    orders.push(order);
  }

  // 2. Add diverse shipments to the first order
  const SHIPMENTS_DATA = [
    {
      carrier: "CJ Logistics",
      shipment_status: "pending",
      shipped_at: "2025-07-01T08:00:00.000Z",
      delivered_at: null,
    },
    {
      carrier: "cj logistics",
      shipment_status: "shipped",
      shipped_at: "2025-07-02T12:00:00.000Z",
      delivered_at: null,
    },
    {
      carrier: "FedEx",
      shipment_status: "delivered",
      shipped_at: "2025-07-03T20:00:00.000Z",
      delivered_at: "2025-07-04T10:00:00.000Z",
    },
    {
      carrier: "UPS",
      shipment_status: "pending",
      shipped_at: "2025-07-01T09:00:00.000Z",
      delivered_at: null,
    },
  ];
  const createdShipments: IAimallBackendShipment[] = [];
  for (const shipData of SHIPMENTS_DATA) {
    const shipment =
      await api.functional.aimall_backend.administrator.orders.shipments.create(
        connection,
        {
          orderId: orders[0].id,
          body: {
            order_id: orders[0].id,
            shipment_address_id: typia.random<string & tags.Format<"uuid">>(),
            carrier: shipData.carrier,
            shipment_status: shipData.shipment_status,
            shipped_at: shipData.shipped_at,
            delivered_at: shipData.delivered_at ?? null,
          } satisfies IAimallBackendShipment.ICreate,
        },
      );
    typia.assert(shipment);
    createdShipments.push(shipment);
  }

  // 3. Filter by status: Only retrieve 'pending' status shipments for the order
  const statusFilterReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    shipment_status: "pending",
  };
  const statusSearchRes =
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: statusFilterReq,
      },
    );
  typia.assert(statusSearchRes);
  TestValidator.predicate("all shipment_status are 'pending'")(
    statusSearchRes.data.every(
      (s) => s.shipment_status.toLowerCase() === "pending",
    ),
  );

  // 4. Filter by carrier: Case-insensitive matching for 'cj logistics'
  const carrierFilterReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    carrier: "cj logistics",
  };
  const carrierSearchRes =
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: carrierFilterReq,
      },
    );
  typia.assert(carrierSearchRes);
  TestValidator.predicate("all carriers are (case-insensitive) 'cj logistics'")(
    carrierSearchRes.data.every(
      (s) => s.carrier.toLowerCase() === "cj logistics",
    ),
  );

  // 5. Date-range filter for shipped_at
  const dateFilterReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    shipped_from: "2025-07-02T00:00:00.000Z",
    shipped_to: "2025-07-03T23:59:59.999Z",
  };
  const dateSearchRes =
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: dateFilterReq,
      },
    );
  typia.assert(dateSearchRes);
  TestValidator.predicate("shipped_at within range")(
    dateSearchRes.data.every(
      (s) =>
        typeof s.shipped_at === "string" &&
        s.shipped_at >= dateFilterReq.shipped_from! &&
        s.shipped_at <= dateFilterReq.shipped_to!,
    ),
  );

  // 6. Pagination and limit
  const PAGINATION_LIMIT = 2;
  const pagReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    limit: PAGINATION_LIMIT,
    page: 1,
  };
  const pagRes =
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: pagReq,
      },
    );
  typia.assert(pagRes);
  TestValidator.equals("page limit respected")(pagRes.data.length)(
    PAGINATION_LIMIT,
  );
  TestValidator.equals("page metadata matches")(pagRes.pagination.current)(1);
  TestValidator.equals("limit metadata matches")(pagRes.pagination.limit)(
    PAGINATION_LIMIT,
  );

  // 7. Error: invalid status parameter
  const invalidStatusReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    shipment_status: "not_a_real_status",
  };
  await TestValidator.error("invalid status is rejected")(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: invalidStatusReq,
      },
    );
  });

  // 8. Error: invalid page (out of bounds)
  const highPageReq: IAimallBackendShipment.IRequest = {
    order_id: orders[0].id,
    page: 99999,
    limit: 1,
  };
  await TestValidator.error("out of bounds page is rejected")(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[0].id,
        body: highPageReq,
      },
    );
  });

  // 9. Search on order with no shipments returns empty data
  const emptyShipReq: IAimallBackendShipment.IRequest = {
    order_id: orders[1].id,
  };
  const emptyRes =
    await api.functional.aimall_backend.administrator.orders.shipments.search(
      connection,
      {
        orderId: orders[1].id,
        body: emptyShipReq,
      },
    );
  typia.assert(emptyRes);
  TestValidator.equals("no shipments for order")(emptyRes.data.length)(0);
}
