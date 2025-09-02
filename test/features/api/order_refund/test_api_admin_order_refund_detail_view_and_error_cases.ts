import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import type { EOrderRefundStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderRefundStatus";
import type { IPageIShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Admin refund detail view for a specific order refund, with error and
 * permission cases
 *
 * This test covers the scenario where an admin views the details of a
 * specific refund associated with a customer order. The following steps
 * validate business logic, authorization, and data integrity across
 * multiple roles and failure scenarios:
 *
 * 1. Register and authenticate an admin user.
 * 2. Register and authenticate a customer user.
 * 3. As the customer, create a new order.
 * 4. As the customer, create at least one refund for the order.
 * 5. As the admin, fetch the refund detail using admin endpoint and validate
 *    correctness.
 * 6. Error scenarios: try invalid orderId, invalid refundId, and attempt to
 *    access as a non-admin (which should be forbidden).
 */
export async function test_api_admin_order_refund_detail_view_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = RandomGenerator.alphaNumeric(6) + "@adminmall.com";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // For e2e, assume backend hash is acceptable
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 2. Register and authenticate a customer
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerEmail = RandomGenerator.alphaNumeric(7) + "@mail.com";
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Customer login for API session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      password: customerPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  // 4. Customer creates an order
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerJoin.customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(10),
          status: "pending",
          total_amount: 7000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Customer lists (and presumes) refunds for the order
  const refundPage =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(refundPage);
  const refund =
    refundPage.data && refundPage.data.length > 0 ? refundPage.data[0] : null;
  TestValidator.predicate(
    "At least one refund created for the order",
    !!refund,
  );
  typia.assert(refund!);
  // 6. Admin login to get admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  // 7. Success: admin fetches refund detail
  const fetchedRefund =
    await api.functional.shoppingMallAiBackend.admin.orders.refunds.at(
      connection,
      {
        orderId: order.id,
        refundId: typia.assert(refund!.id!),
      },
    );
  typia.assert(fetchedRefund);
  TestValidator.equals(
    "Refund record returned matches refundId",
    fetchedRefund.id,
    refund!.id,
  );
  TestValidator.equals(
    "Refund.orderId matches",
    fetchedRefund.shopping_mall_ai_backend_order_id,
    order.id,
  );
  TestValidator.predicate(
    "Refund properties correctly populated",
    typeof fetchedRefund.amount === "number" &&
      !!fetchedRefund.status &&
      !!fetchedRefund.currency,
  );
  // 8. Error: invalid orderId
  await TestValidator.error("Invalid orderId should be rejected", async () => {
    await api.functional.shoppingMallAiBackend.admin.orders.refunds.at(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        refundId: typia.assert(refund!.id!),
      },
    );
  });
  // 9. Error: invalid refundId
  await TestValidator.error(
    "Nonexistent refundId should be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.at(
        connection,
        {
          orderId: order.id,
          refundId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 10. Permission error: customer attempts access as non-admin
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail as string & tags.Format<"email">,
      password: customerPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  await TestValidator.error(
    "Customer should not access admin refund detail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.at(
        connection,
        {
          orderId: order.id,
          refundId: typia.assert(refund!.id!),
        },
      );
    },
  );
}
