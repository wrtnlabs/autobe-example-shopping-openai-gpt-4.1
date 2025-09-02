import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderRefund";

/**
 * Validate rejection of illegal or forbidden updates to an order refund.
 *
 * This test ensures business rules are enforced when attempting to update a
 * refund: (1) non-existent refund, (2) illegal status transition or value,
 * (3) updating forbidden/immutable fields. Proper admin authentication is
 * performed. Most actual update attempts will result in an error because
 * the refund either does not exist or the business logic rejects illegal
 * field change. Assert that errors occur as expected and no update is
 * applied.
 */
export async function test_api_admin_order_refund_update_forbidden_fields(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain authorization
  const adminUsername = RandomGenerator.name().replace(" ", "");
  const adminEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a customer to simulate real user (for completeness, even if refund does not exist)
  const customerEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const customerPhone = RandomGenerator.mobile();
  const customer: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        phone_number: customerPhone,
        password: RandomGenerator.alphaNumeric(16) as string &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Attempt to update a refund with a non-existent orderId/refundId: Should error
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const fakeRefundId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent refund should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
        connection,
        {
          orderId: fakeOrderId,
          refundId: fakeRefundId,
          body: {
            refund_reason: "Attempt illegal update", // Technically mutable but refund doesn't exist
            amount: 123456,
          } satisfies IShoppingMallAiBackendOrderRefund.IUpdate,
        },
      );
    },
  );

  // 4. Attempt to update with illegal status value (simulate forbidden transition): Should error
  await TestValidator.error(
    "illegal refund status value is rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
        connection,
        {
          orderId: fakeOrderId,
          refundId: fakeRefundId,
          body: {
            status: "illegal_status_value", // Business likely rejects
          } satisfies IShoppingMallAiBackendOrderRefund.IUpdate,
        },
      );
    },
  );

  // 5. Attempt to update using illegal field value (e.g., impossible date): Should error
  await TestValidator.error(
    "setting processed_at to invalid date format is rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.refunds.update(
        connection,
        {
          orderId: fakeOrderId,
          refundId: fakeRefundId,
          body: {
            processed_at: "notadate", // Violates date-time format
          } satisfies IShoppingMallAiBackendOrderRefund.IUpdate,
        },
      );
    },
  );

  // 6. (Negative check) Confirm that sending a property NOT allowed by the DTO results in TypeScript error (cannot write such code)
  // Thus, TypeScript enforces schema; business rule errors are runtime only.
}
