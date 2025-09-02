import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";

export async function test_api_order_delivery_update_success_and_not_found(
  connection: api.IConnection,
) {
  /**
   * Test that a seller can successfully update an order's delivery tracking
   * info, and that an error is returned when attempting to update a deliveryId
   * not found or not belonging to the seller's order.
   *
   * Steps:
   *
   * 1. Onboard and authenticate a new seller using the join endpoint (creates
   *    seller and sets authentication context).
   * 2. Generate random order and delivery UUIDs (no creation/listing endpoints
   *    available for orders/deliveries).
   * 3. Attempt to update a delivery with a random but valid tracking number,
   *    delivery status, and logistics provider.
   *
   *    - Expect a success response and verify all returned fields match inputs as
   *         far as possible.
   * 4. Attempt to update a non-existent deliveryId (random UUID different from
   *    previous),
   *
   *    - Expect an error (not found or forbidden), validating error handling.
   *
   * NOTE: Because creation APIs are not available, all UUIDs and data are
   * generated randomly for flow validation.
   */

  // 1. Onboard and authenticate seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const authorized = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(authorized);

  // 2. Generate random orderId and deliveryId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const deliveryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update body
  const updateBody: IShoppingMallAiBackendOrderDelivery.IUpdate = {
    delivery_status: RandomGenerator.pick([
      "ready",
      "in_progress",
      "shipped",
      "complete",
      "failed",
      "returned",
    ] as const),
    logistics_provider: RandomGenerator.name(1),
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
    delivered_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    delivery_notes: RandomGenerator.paragraph({ sentences: 4 }),
  };
  // 4. Attempt successful update
  const delivery =
    await api.functional.shoppingMallAiBackend.seller.orders.deliveries.update(
      connection,
      {
        orderId,
        deliveryId,
        body: updateBody,
      },
    );
  typia.assert(delivery);
  TestValidator.equals(
    "delivery orderId matches",
    delivery.shopping_mall_ai_backend_order_id,
    orderId,
  );
  TestValidator.equals("delivery id matches", delivery.id, deliveryId);
  TestValidator.equals(
    "delivery status updated",
    delivery.delivery_status,
    updateBody.delivery_status,
  );
  TestValidator.equals(
    "logistics provider updated",
    delivery.logistics_provider,
    updateBody.logistics_provider,
  );
  TestValidator.equals(
    "tracking number updated",
    delivery.tracking_number,
    updateBody.tracking_number,
  );
  TestValidator.equals(
    "delivery notes updated",
    delivery.delivery_notes,
    updateBody.delivery_notes,
  );

  // 5. Attempt to update with a bogus deliveryId
  const otherDeliveryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent delivery should error",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.orders.deliveries.update(
        connection,
        {
          orderId,
          deliveryId: otherDeliveryId,
          body: updateBody,
        },
      );
    },
  );
}
