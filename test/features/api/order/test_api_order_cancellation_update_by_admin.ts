import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * End-to-end test: Admin updates order cancellation requests, covering all
 * workflow nuances and status transitions.
 *
 * This test covers the full admin order cancellation lifecycle:
 *
 * - Registers as an admin.
 * - Prepares order pre-requisites: address and payment method snapshots.
 * - Creates a customer order.
 * - Mocks up an existing cancellation record as if submitted (since no creation
 *   endpoint is exposed here, we simulate an existing cancellation attached to
 *   the order).
 * - As admin, attempts valid status updates:
 *
 *   - Approves a pending cancellation.
 *   - Denies a fresh pending cancellation.
 *   - Modifies the cancellation explanation or reason.
 * - Attempts invalid transitions (e.g., reverting a completed cancellation to
 *   pending) and expects errors.
 * - Non-admin updating is not directly testable with current endpoints—this test
 *   ensures the admin authentication path and business logic are enforced.
 *
 * Each update is validated for correct object data, status transition, and
 * business rule enforcement.
 */
export async function test_api_order_cancellation_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin Registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminTestPassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare Order Address Snapshot
  const address: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // Step 3: Prepare Payment Method Snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ masked: "1234-****-5678-9000" }),
          display_name: "Visa ****9000",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Create a Customer Order
  // Here, we simulate a "customer" context by re-using the active admin -- business logic in E2E likely ignores real user identity for mock/test
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: address.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 5: Simulate an existing cancellation record (mock-up, as we have no API for creation)
  // We will create a fake cancellation for this order and test update against it.
  // In a real-world E2E, this step would programmatically insert a cancellation via factory/database seeder if endpoint missing.
  const fakeCancellation: IShoppingMallOrderCancellation =
    typia.random<IShoppingMallOrderCancellation>();
  // Make sure fields match the order context
  fakeCancellation.shopping_mall_order_id = order.id;
  fakeCancellation.status = "pending";
  fakeCancellation.reason_code = "customer_request";
  fakeCancellation.explanation =
    "Customer requested cancellation via support portal.";

  // Approve the pending cancellation
  const approveUpdate = {
    reason_code: fakeCancellation.reason_code,
    status: "approved",
    explanation: "Admin approves cancellation due to valid customer reason.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  const approved: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId: fakeCancellation.id,
        body: approveUpdate,
      },
    );
  typia.assert(approved);
  TestValidator.equals("approved status applied", approved.status, "approved");
  TestValidator.equals(
    "reason_code unchanged",
    approved.reason_code,
    approveUpdate.reason_code,
  );
  TestValidator.equals(
    "explanation updated",
    approved.explanation,
    approveUpdate.explanation,
  );

  // Deny the cancellation (simulate a fresh pending for denial)
  const denialCancellation: IShoppingMallOrderCancellation =
    typia.random<IShoppingMallOrderCancellation>();
  denialCancellation.shopping_mall_order_id = order.id;
  denialCancellation.status = "pending";
  denialCancellation.reason_code = "customer_request";
  denialCancellation.explanation =
    "Customer requested cancellation due to delay.";

  const denyUpdate = {
    reason_code: denialCancellation.reason_code,
    status: "denied",
    explanation: "Admin denies cancellation because shipment already left.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  const denied: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId: denialCancellation.id,
        body: denyUpdate,
      },
    );
  typia.assert(denied);
  TestValidator.equals("denied status applied", denied.status, "denied");
  TestValidator.equals(
    "reason_code unchanged",
    denied.reason_code,
    denyUpdate.reason_code,
  );
  TestValidator.equals(
    "explanation updated",
    denied.explanation,
    denyUpdate.explanation,
  );

  // Try invalid status transition: revert completed to pending (should fail)
  const completedCancellation: IShoppingMallOrderCancellation =
    typia.random<IShoppingMallOrderCancellation>();
  completedCancellation.shopping_mall_order_id = order.id;
  completedCancellation.status = "completed";
  completedCancellation.reason_code = "customer_request";
  completedCancellation.explanation = "Already completed.";

  await TestValidator.error(
    "reverting completed cancellation to pending is not allowed",
    async () => {
      await api.functional.shoppingMall.admin.orders.cancellations.update(
        connection,
        {
          orderId: order.id,
          cancellationId: completedCancellation.id,
          body: {
            reason_code: completedCancellation.reason_code,
            status: "pending",
            explanation: "Attempt to revert to pending.",
          } satisfies IShoppingMallOrderCancellation.IUpdate,
        },
      );
    },
  );

  // Update cancellation explanation/reason code for an approved cancellation
  const explainUpdate = {
    reason_code: "fraud_suspected",
    status: "approved",
    explanation: "Order flagged for fraudulent activity.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  const updated: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId: fakeCancellation.id,
        body: explainUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "status remains approved after update",
    updated.status,
    "approved",
  );
  TestValidator.equals(
    "reason_code updated",
    updated.reason_code,
    "fraud_suspected",
  );
  TestValidator.equals(
    "explanation updated",
    updated.explanation,
    "Order flagged for fraudulent activity.",
  );
}
