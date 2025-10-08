import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * E2E test for deleting an order payment method snapshot as admin, covering
 * referential integrity and authorization logic.
 *
 * This test covers:
 *
 * 1. Admin account registration and authentication.
 * 2. Creation of a new order payment method snapshot as the admin.
 * 3. Successful hard-delete of the payment method snapshot (not referenced by
 *    orders/payments).
 * 4. Attempt to delete the same snapshot again (should return error, not
 *    found/constraint failure).
 * 5. Attempt to delete as unauthenticated user (should fail with auth error).
 *    "Active use" protection (snapshot referenced by active orders or payments)
 *    is not tested due to lack of order/payment setup in current DTO/API
 *    context.
 */
export async function test_api_admin_order_payment_method_delete_with_referential_integrity(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin to get a valid access token
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // Step 2: Create a new order payment method snapshot as the admin
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.paragraph({ sentences: 3 }),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 3: Delete the payment method snapshot as the authenticated admin
  await api.functional.shoppingMall.admin.orderPaymentMethods.erase(
    connection,
    {
      orderPaymentMethodId: paymentMethod.id,
    },
  );

  // Step 4: Attempt to delete the same payment method again, expect error
  await TestValidator.error(
    "deleting already-deleted payment method should fail",
    async () => {
      await api.functional.shoppingMall.admin.orderPaymentMethods.erase(
        connection,
        {
          orderPaymentMethodId: paymentMethod.id,
        },
      );
    },
  );

  // Step 5: Attempt to delete as unauthenticated (no Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deleting with unauthenticated connection should fail",
    async () => {
      await api.functional.shoppingMall.admin.orderPaymentMethods.erase(
        unauthConn,
        {
          orderPaymentMethodId: paymentMethod.id,
        },
      );
    },
  );
}
