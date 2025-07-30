import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate error response when seller requests details for an invalid
 * shipmentId.
 *
 * This test ensures that the system correctly prevents a seller from viewing
 * shipment detail records that are either not present (do not exist) or not
 * associated with the order. There should be no information leakage and the
 * correct error (e.g. 404 not found) is returned.
 *
 * - Register a seller (via admin onboarding API)
 * - Register a customer
 * - Create an order as the customer (needs seller_id and address_id)
 * - Try to access a shipment record for this order, but supply a shipmentId that
 *   does not exist (random UUID not linked to any shipment nor this order)
 * - Confirm error is 404 or business-appropriate (no details from other
 *   orders/leakage)
 */
export async function test_api_aimall_backend_test_seller_view_shipment_detail_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller_email = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(12),
          email: seller_email,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register customer
  const customer_email = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer_email,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create an order (simulate a valid address_id since no address creation API available)
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(), // Simulate address_id
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 4. Request a shipment with a random shipmentId (guaranteed to be unlinked/not found)
  await TestValidator.error("Seller receives not found for random shipmentId")(
    async () => {
      await api.functional.aimall_backend.seller.orders.shipments.at(
        connection,
        {
          orderId: order.id,
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
