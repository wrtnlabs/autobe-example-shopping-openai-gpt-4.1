import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Test creating a shipment with an invalid (non-existent) orderId.
 *
 * This test verifies that when a seller (properly onboarded) attempts to create
 * a shipment record using a random or invalid UUID for orderId (an order that
 * does not exist), the system responds with a 404 Not Found or relevant error,
 * and does not create a shipment.
 *
 * Steps:
 *
 * 1. Register a new seller using the administrator endpoint
 * 2. Attempt to create a shipment using a random (non-existent) orderId with a
 *    valid shipment body
 * 3. Assert that an error is thrown and no shipment is created
 */
export async function test_api_aimall_backend_seller_orders_shipments_test_create_order_shipment_with_invalid_orderId(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerInput = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IAimallBackendSeller.ICreate;
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Attempt to create a shipment with a random (non-existent) orderId
  // All shipment fields except orderId are valid; orderId in path will not exist in DB
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentInput = {
    order_id: invalidOrderId,
    shipment_address_id: typia.random<string & tags.Format<"uuid">>(),
    carrier: "CJ Logistics",
    tracking_number: "FAKE1234567",
    shipment_status: "pending",
    shipped_at: null,
    delivered_at: null,
  } satisfies IAimallBackendShipment.ICreate;

  await TestValidator.error(
    "shipment creation with invalid orderId should fail",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: invalidOrderId,
        body: shipmentInput,
      },
    );
  });
}
