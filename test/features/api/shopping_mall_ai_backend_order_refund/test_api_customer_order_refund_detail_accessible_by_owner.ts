import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";
import type { EOrderRefundStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/EOrderRefundStatus";
import type { IPageIShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_order_refund_detail_accessible_by_owner(
  connection: api.IConnection,
) {
  /**
   * E2E validation that a customer can access their own refund detail.
   *
   * Flow:
   *
   * 1. Register Customer A (owner) and authenticate
   * 2. Create an order as Customer A
   * 3. List refunds for the order (simulate creation via listing, as creation
   *    endpoint is unavailable)
   * 4. Fetch refund detail as the owner and check content
   * 5. Try accessing with a non-existent refundId (error expected)
   * 6. Register Customer B and try to access A's refund (forbidden error)
   * 7. If refund is deleted (deleted_at set), access is forbidden
   */

  // 1. Register Customer A and authenticate
  const customerAData: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAAuth = await api.functional.auth.customer.join(connection, {
    body: customerAData,
  });
  typia.assert(customerAAuth);

  // 2. Create a new order for Customer A
  const orderData: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customerAAuth.customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    code: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: 50000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
  };
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderData },
    );
  typia.assert(order);
  TestValidator.equals(
    "order customer ID matches owner",
    order.shopping_mall_ai_backend_customer_id,
    customerAAuth.customer.id,
  );

  // 3. List refunds for this order (simulate creation, since no refund creation endpoint is provided)
  const refundPage =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
      connection,
      {
        orderId: order.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(refundPage);
  let refund: IShoppingMallAiBackendOrderRefund | undefined;
  if (refundPage.data && refundPage.data.length > 0) {
    refund = refundPage.data[0];
  } else {
    throw new Error(
      "Refund creation endpoint is not present; cannot proceed with refund detail test.",
    );
  }
  typia.assert(refund);

  // 4. Fetch refund detail as the owner and check key fields.
  const refundDetail =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.at(
      connection,
      {
        orderId: order.id,
        refundId: refund.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(refundDetail);
  TestValidator.equals("refund detail ID", refundDetail.id, refund.id);
  TestValidator.equals(
    "refund detail order ID",
    refundDetail.shopping_mall_ai_backend_order_id,
    order.id,
  );
  TestValidator.predicate(
    "refund amount should be positive",
    refundDetail.amount > 0,
  );
  TestValidator.equals(
    "refund currency",
    refundDetail.currency,
    order.currency,
  );

  // 5. Error: Try accessing a non-existent refundId for the order
  await TestValidator.error("error on non-existent refundId", async () => {
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.at(
      connection,
      {
        orderId: order.id,
        refundId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 6. Register Customer B, switch context, and try to access refund created by A
  const customerBData: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  // Save current auth for Customer A
  const previousAuthA = connection.headers?.Authorization;
  const customerBAuth = await api.functional.auth.customer.join(connection, {
    body: customerBData,
  });
  typia.assert(customerBAuth);
  // Now context is of Customer B
  await TestValidator.error(
    "forbidden: Customer B must not access refund of A",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.at(
        connection,
        {
          orderId: order.id,
          refundId: refund!.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // Restore authentication as Customer A if needed
  if (previousAuthA) {
    connection.headers ??= {};
    connection.headers.Authorization = previousAuthA;
  }

  // 7. If deleted, access to deleted refund is forbidden
  if (
    refundDetail.deleted_at !== undefined &&
    refundDetail.deleted_at !== null
  ) {
    await TestValidator.error(
      "forbidden: deleted refund detail should not be accessible",
      async () => {
        await api.functional.shoppingMallAiBackend.customer.orders.refunds.at(
          connection,
          {
            orderId: order.id,
            refundId: refundDetail.id as string & tags.Format<"uuid">,
          },
        );
      },
    );
  }
}
