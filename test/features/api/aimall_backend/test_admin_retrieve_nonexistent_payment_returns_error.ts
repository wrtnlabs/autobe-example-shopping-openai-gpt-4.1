import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate error handling when retrieving payment details with an invalid or
 * unrelated paymentId as an administrator.
 *
 * Business rules require that payment details can only be accessed if the
 * paymentId exists and is associated with the specified orderId. The API must
 * reject fetch attempts with random, non-existent UUIDs, or with paymentIds not
 * tied to the orderId by responding with an error (not found or referential
 * violation).
 *
 * Test Steps:
 *
 * 1. Create an administrator account with valid permission_id and status.
 * 2. Create a seller (required for order context).
 * 3. Create a valid customer order that references this seller.
 * 4. Attempt to retrieve payment details via GET
 *    /aimall-backend/administrator/orders/{orderId}/payments/{paymentId}: a)
 *    With a random UUID as paymentId (not present in DB). b) With a valid but
 *    unrelated UUID (another order's id) as paymentId. Both cases must result
 *    in error and not return a payment record.
 * 5. Assert that the API returns errors in each negative retrieval case using
 *    TestValidator.error.
 */
export async function test_api_aimall_backend_test_admin_retrieve_nonexistent_payment_returns_error(
  connection: api.IConnection,
) {
  // 1. Create administrator
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Create a valid customer order with this seller
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 100000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 4a. Attempt to retrieve with a non-existent paymentId
  TestValidator.error("Non-existent paymentId should return error")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.payments.at(
        connection,
        {
          orderId: order.id,
          paymentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4b. Attempt to retrieve with a mismatched paymentId (use another unrelated order's UUID)
  const otherOrder = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 150000,
        currency: "KRW",
      },
    },
  );
  typia.assert(otherOrder);

  TestValidator.error("Mismatched paymentId for orderId should return error")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.payments.at(
        connection,
        {
          orderId: order.id,
          paymentId: otherOrder.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
