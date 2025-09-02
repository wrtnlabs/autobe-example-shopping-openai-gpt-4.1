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

export async function test_api_customer_order_refund_update_by_owner_success_and_failures(
  connection: api.IConnection,
) {
  /**
   * E2E test for updating an order refund by the owning customer, covering all
   * major business and error flows.
   *
   * This test validates that:
   *
   * - A customer can update their own refund record for an order.
   * - The update is properly reflected in the refund entity.
   * - Error scenarios such as invalid input, unauthorized update by other
   *   customer, or attempts to update a locked/completed refund are handled
   *   correctly.
   *
   * Steps:
   *
   * 1. Register two test customers: primary (owner), and secondary (non-owner).
   * 2. As the primary customer, create an order.
   * 3. As the primary customer, create a refund for that order.
   * 4. Update the refund (with a new reason, valid status etc.), then verify the
   *    update took effect.
   * 5. NEGATIVE: Attempt to update with business-invalid fields (e.g., negative
   *    values, illegal status).
   * 6. NEGATIVE: Attempt to update the refund record with a different (non-owner)
   *    user: should be forbidden.
   * 7. NEGATIVE: Attempt to update a refund in a locked/immutable state (e.g.,
   *    status 'completed').
   */

  // -- Step 1: Register owner and non-owner customers --
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPhone = RandomGenerator.mobile();
  const ownerPassword = RandomGenerator.alphaNumeric(12);
  const ownerName = RandomGenerator.name();
  const ownerNickname = RandomGenerator.name();
  const joinOwner = await api.functional.auth.customer.join(connection, {
    body: {
      email: ownerEmail,
      phone_number: ownerPhone,
      password: ownerPassword,
      name: ownerName,
      nickname: ownerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOwner);
  const ownerId = joinOwner.customer.id;

  const nonOwnerEmail = typia.random<string & tags.Format<"email">>();
  const nonOwnerPhone = RandomGenerator.mobile();
  const nonOwnerPassword = RandomGenerator.alphaNumeric(12);
  const nonOwnerName = RandomGenerator.name();
  const nonOwnerNickname = RandomGenerator.name();
  const joinNonOwner = await api.functional.auth.customer.join(connection, {
    body: {
      email: nonOwnerEmail,
      phone_number: nonOwnerPhone,
      password: nonOwnerPassword,
      name: nonOwnerName,
      nickname: nonOwnerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinNonOwner);
  const nonOwnerId = joinNonOwner.customer.id;

  // -- Step 2: As owner, create an order (must be authenticated as owner) --
  await api.functional.auth.customer.join(connection, {
    body: {
      email: ownerEmail,
      phone_number: ownerPhone,
      password: ownerPassword,
      name: ownerName,
      nickname: ownerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  const orderCreateInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: ownerId,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 9900,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
  };
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: orderCreateInput,
      },
    );
  typia.assert(order);
  const orderId = order.id;

  // -- Step 3: As owner, create a refund for that order (via refunds.index as index also supports creation) --
  const refundReason = "상품 불량으로 인한 환불 요청";
  const refundType = "full";
  const refundAmount = 9900;
  const refundInput = {
    refund_reason: refundReason,
    refund_type: refundType,
    amount: refundAmount,
    currency: "KRW",
    status: "requested",
  } satisfies IShoppingMallAiBackendOrderRefund.IUpdate;
  // Patch/index endpoint is used for creation in this scenario
  const refundPage =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
      connection,
      {
        orderId,
        body: {},
      },
    );
  typia.assert(refundPage);

  // Normally we'd receive the refundId from creation, but since .index lists, we simulate as if we get/refresh (for now pick the first refund or simulate creation separately if API adjusts)
  let refundId: string;
  if (refundPage.data.length > 0) {
    refundId = refundPage.data[0].id;
  } else {
    // Simulate creating a new refund by patching with our input and then listing again
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
      connection,
      {
        orderId,
        refundId: typia.random<string & tags.Format<"uuid">>(),
        body: refundInput,
      },
    );
    const refundPageAfter =
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.index(
        connection,
        {
          orderId,
          body: {},
        },
      );
    typia.assert(refundPageAfter);
    refundId = refundPageAfter.data[0].id;
  }

  // -- Step 4: Update refund (success case) --
  const newReason = RandomGenerator.paragraph({ sentences: 3 });
  const newStatus = "approved";
  const updateInput: IShoppingMallAiBackendOrderRefund.IUpdate = {
    refund_reason: newReason,
    status: newStatus,
  };
  const updatedRefund =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
      connection,
      {
        orderId,
        refundId,
        body: updateInput,
      },
    );
  typia.assert(updatedRefund);
  TestValidator.equals(
    "updated refund reason applied",
    updatedRefund.refund_reason,
    newReason,
  );
  TestValidator.equals(
    "updated refund status applied",
    updatedRefund.status,
    newStatus,
  );

  // -- Step 5: Negative - invalid update input (illegal status value) --
  const invalidUpdate: IShoppingMallAiBackendOrderRefund.IUpdate = {
    status: "not-a-valid-status",
  };
  await TestValidator.error("invalid status should fail", async () => {
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
      connection,
      {
        orderId,
        refundId,
        body: invalidUpdate,
      },
    );
  });

  // -- Step 6: Negative - update by non-owner (switch auth to non-owner) --
  await api.functional.auth.customer.join(connection, {
    body: {
      email: nonOwnerEmail,
      phone_number: nonOwnerPhone,
      password: nonOwnerPassword,
      name: nonOwnerName,
      nickname: nonOwnerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  await TestValidator.error(
    "non-owner cannot update another customer's refund",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
        connection,
        {
          orderId,
          refundId,
          body: {
            refund_reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );

  // -- Step 7: Negative - update if refund is locked (simulate by updating to 'completed' and then try again) --
  await api.functional.auth.customer.join(connection, {
    body: {
      email: ownerEmail,
      phone_number: ownerPhone,
      password: ownerPassword,
      name: ownerName,
      nickname: ownerNickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  const lockedInput: IShoppingMallAiBackendOrderRefund.IUpdate = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  const lockedRefund =
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
      connection,
      {
        orderId,
        refundId,
        body: lockedInput,
      },
    );
  typia.assert(lockedRefund);
  await TestValidator.error("cannot update locked refund", async () => {
    await api.functional.shoppingMallAiBackend.customer.orders.refunds.update(
      connection,
      {
        orderId,
        refundId,
        body: {
          refund_reason: "Trying to change after completed.",
        },
      },
    );
  });
}
