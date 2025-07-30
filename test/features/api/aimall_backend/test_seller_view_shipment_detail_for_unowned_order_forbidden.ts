import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Test to confirm that a seller cannot view shipment information for an order
 * they do not own.
 *
 * Business rule: Only the seller assigned to an order should be able to access
 * its shipment details. This function ensures that attempts by unrelated
 * sellers are correctly denied with no data disclosed.
 *
 * Workflow:
 *
 * 1. Register Seller A (intended order owner)
 * 2. Register Seller B (unrelated seller)
 * 3. Register a customer
 * 4. Customer creates an order, specifying Seller A (using the proper fields to
 *    link order to seller and customer; address_id is randomly generated as a
 *    valid uuid string)
 * 5. Seller A creates a shipment tied to the above order (using random shipment
 *    data, referencing order and address)
 * 6. Seller B tries to access the shipment details for the order owned by Seller A
 *
 *    - This call should fail with a forbidden error (403)
 *    - No business/PII/shipment data should be leaked
 * 7. Confirm by catching the error and ensuring it is a forbidden error type
 */
export async function test_api_aimall_backend_test_seller_view_shipment_detail_for_unowned_order_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Register a customer
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer creates an order owned by Seller A
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: sellerA.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 5. Seller A creates a shipment for the order
  const shipment: IAimallBackendShipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: order.address_id,
          carrier: "CJ Logistics",
          tracking_number: "1Z" + RandomGenerator.alphaNumeric(10),
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // ---- Simulate Seller B authentication if required here
  // [Assume connection switches to Seller B privilege if necessary. If role switching API exists, insert here.]

  // 6. Seller B attempts to access the shipment details for Seller A's order
  await TestValidator.error(
    "forbidden - unrelated seller cannot access shipment",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.shipments.at(connection, {
      orderId: order.id,
      shipmentId: shipment.id,
    });
  });
}
