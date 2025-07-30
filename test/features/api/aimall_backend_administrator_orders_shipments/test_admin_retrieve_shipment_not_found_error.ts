import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate error handling when retrieving a shipment detail with a valid
 * orderId but a non-existent or deleted shipmentId as an administrator.
 *
 * This test ensures that when an administrator attempts to fetch shipment
 * details using a valid orderId but a shipmentId that does not exist or has
 * been deleted, the system returns a proper error (such as 404 Not Found) and
 * does not leak any sensitive implementation details.
 *
 * Steps:
 *
 * 1. Register an administrator.
 * 2. Register a customer.
 * 3. Create an order for the customer (randomly generated seller_id and address_id
 *    are used due to lack of seller/address entity creation APIs).
 * 4. Attempt to retrieve a shipment by using the orderId from the created order,
 *    and a random UUID as shipmentId that is guaranteed not to exist in the
 *    system.
 * 5. Confirm that an error is raised (such as 404 Not Found), and ensure there is
 *    no sensitive system information leakage in the error response.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_admin_retrieve_shipment_not_found_error(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 3. Create a customer order (mock seller_id and address_id as random UUIDs)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Use a non-existent shipmentId to check 404 or proper error is returned
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should raise NotFound error for non-existent shipmentId",
  )(async () => {
    await api.functional.aimall_backend.administrator.orders.shipments.at(
      connection,
      {
        orderId: order.id,
        shipmentId: nonExistentShipmentId,
      },
    );
  });
}
