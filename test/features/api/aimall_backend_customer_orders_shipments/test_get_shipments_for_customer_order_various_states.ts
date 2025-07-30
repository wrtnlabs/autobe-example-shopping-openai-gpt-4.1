import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate that customers can retrieve shipment records for their own orders
 * and receives correct details for each shipment.
 *
 * This test ensures the API serializes and exposes all relevant fulfillment
 * event data properly, handles edge cases, and enforces access controls as
 * follows:
 *
 * 1. Create a customer (user A)
 * 2. Place an order as customer A
 * 3. For case (1): Immediately query shipments for this order – should be empty
 * 4. Add a shipment in 'pending' status via admin API to this order
 * 5. Add a shipment in 'shipped' status (with tracking, shipped_at)
 * 6. Add a shipment in 'delivered' status (with tracking, shipped_at,
 *    delivered_at)
 * 7. Add a shipment in 'cancelled' status (simulate business logic, varying
 *    carrier fields as fits)
 * 8. As customer A, query shipments for the order – get all added records, all
 *    properties correctly serialized (carrier, tracking_number, status,
 *    timestamps, etc)
 * 9. For each record in the response, check that status, carrier and timestamp
 *    fields match the ones submitted.
 * 10. For case (3): Create a second customer (user B) and attempt to retrieve
 *     shipments for A's order—should get access denied error
 * 11. For case (4): Attempt to retrieve shipments with a random (nonexistent) UUID
 *     as orderId—should get error (e.g., order not found or 404/403)
 */
export async function test_api_aimall_backend_customer_orders_shipments_test_get_shipments_for_customer_order_various_states(
  connection: api.IConnection,
) {
  // 1. Create customer A
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPhone = RandomGenerator.mobile();
  const customerA: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerAEmail,
        phone: customerAPhone,
        // password_hash not required/exposed in E2E
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Place an order as customer A
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customerA.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 15000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 3. (Case 1) Query shipments for this order immediately (should be empty)
  const initialShipments =
    await api.functional.aimall_backend.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(initialShipments);
  TestValidator.equals("shipments should be empty initially")(
    initialShipments.data.length,
  )(0);

  // 4-7. Add various shipment records via admin API (simulate all status cases)
  const carriers = ["CJ Logistics", "FedEx", "UPS", "EMS"];
  const now = new Date();
  const pendingShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: carriers[0],
          tracking_number: null,
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(pendingShipment);

  const shippedShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: carriers[1],
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipment_status: "shipped",
          shipped_at: now.toISOString(),
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shippedShipment);

  const deliveredShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: carriers[2],
          tracking_number: RandomGenerator.alphaNumeric(14),
          shipment_status: "delivered",
          shipped_at: now.toISOString(),
          delivered_at: new Date(
            now.getTime() + 1000 * 60 * 60 * 24,
          ).toISOString(),
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(deliveredShipment);

  const cancelledShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: carriers[3],
          tracking_number: null,
          shipment_status: "cancelled",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(cancelledShipment);

  // 8. As customer A, query again - should get all records, check data
  const result =
    await api.functional.aimall_backend.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(result);
  TestValidator.equals("number of shipments")(result.data.length)(4);

  const expectedShipments = [
    pendingShipment,
    shippedShipment,
    deliveredShipment,
    cancelledShipment,
  ];
  for (const expected of expectedShipments) {
    const found = result.data.find((s) => s.id === expected.id);
    TestValidator.predicate(`shipment ${expected.shipment_status} present`)(
      !!found,
    );
    if (found) {
      TestValidator.equals(`carrier for ${expected.shipment_status}`)(
        found.carrier,
      )(expected.carrier);
      TestValidator.equals(`status for ${expected.shipment_status}`)(
        found.shipment_status,
      )(expected.shipment_status);
      TestValidator.equals(`tracking_number for ${expected.shipment_status}`)(
        found.tracking_number,
      )(expected.tracking_number);
      TestValidator.equals(`shipped_at for ${expected.shipment_status}`)(
        found.shipped_at,
      )(expected.shipped_at);
      TestValidator.equals(`delivered_at for ${expected.shipment_status}`)(
        found.delivered_at,
      )(expected.delivered_at);
    }
  }

  // 10. (Case 3) Create second customer (user B) and try to access A's order shipments (should access denied)
  const customerB: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerB);

  // (Simulation) Attempt fetch as customer B (simulate login/auth switch) and get error
  // In this template, no login switch function, but error expected
  TestValidator.error("non-owner customer fetches another's order shipments")(
    async () => {
      await api.functional.aimall_backend.customer.orders.shipments.index(
        connection,
        { orderId: order.id },
      );
    },
  );

  // 11. (Case 4) Try invalid (nonexistent) orderId – should get error (order not found or forbidden)
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("fetch non-existent orderId shipments should fail")(
    async () => {
      await api.functional.aimall_backend.customer.orders.shipments.index(
        connection,
        {
          orderId: invalidOrderId,
        },
      );
    },
  );
}
