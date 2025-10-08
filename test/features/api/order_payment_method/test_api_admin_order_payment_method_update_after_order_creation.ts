import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate admin update of an order payment method snapshot.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin.
 * 2. Create payment method snapshot for order.
 * 3. Update the snapshot as admin, providing new values.
 * 4. Validate the response reflects new values.
 * 5. Ensure unauthenticated update attempt is rejected.
 */
export async function test_api_admin_order_payment_method_update_after_order_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create payment method snapshot for order
  const createInput = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const created =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 3. Update the snapshot as admin, providing new values
  const updateInput = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(20),
    display_name:
      createInput.display_name + " (corrected)" || "Corrected Display Name",
  } satisfies IShoppingMallOrderPaymentMethod.IUpdate;

  const updated =
    await api.functional.shoppingMall.admin.orderPaymentMethods.update(
      connection,
      {
        orderPaymentMethodId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Validate the response reflects new values
  TestValidator.equals(
    "payment_method_type updated",
    updated.payment_method_type,
    updateInput.payment_method_type,
  );
  TestValidator.equals(
    "method_data updated",
    updated.method_data,
    updateInput.method_data,
  );
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    updateInput.display_name,
  );

  // 5. Ensure unauthenticated update attempt is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update without admin should fail", async () => {
    await api.functional.shoppingMall.admin.orderPaymentMethods.update(
      unauthConn,
      {
        orderPaymentMethodId: created.id,
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(25),
          display_name: "Unauth attempted update",
        } satisfies IShoppingMallOrderPaymentMethod.IUpdate,
      },
    );
  });
}
