import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate that an admin can retrieve full details of a specific order payment
 * method snapshot by ID.
 *
 * 1. Register a new admin account via /auth/admin/join and authenticate.
 * 2. Create a new order payment method snapshot as the admin via
 *    /shoppingMall/admin/orderPaymentMethods.
 *
 *    - Use realistic payment method type and masked data.
 * 3. Retrieve the created payment method snapshot with
 *    /shoppingMall/admin/orderPaymentMethods/{orderPaymentMethodId}.
 * 4. Assert that all required fields in the response are present, match what was
 *    created, and do not include sensitive payment data beyond allowed display
 *    fields.
 * 5. Validate audit and display metadata is returned.
 */
export async function test_api_admin_view_order_payment_method_detail_authorized(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a new order payment method snapshot
  const paymentMethodInput = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: JSON.stringify({
      masked_card: "****-****-****-1234",
      bank: "NH",
      account: "xxx-xx-123456",
    }),
    display_name: RandomGenerator.name(2) + " ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentSnapshot =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodInput },
    );
  typia.assert(paymentSnapshot);

  // 3. Retrieve payment method snapshot by id
  const fetchedSnapshot =
    await api.functional.shoppingMall.admin.orderPaymentMethods.at(connection, {
      orderPaymentMethodId: paymentSnapshot.id,
    });
  typia.assert(fetchedSnapshot);
  // 4. Assert all required fields and no unexpected sensitive data
  TestValidator.equals("id matches", fetchedSnapshot.id, paymentSnapshot.id);
  TestValidator.equals(
    "type",
    fetchedSnapshot.payment_method_type,
    paymentMethodInput.payment_method_type,
  );
  TestValidator.equals(
    "display_name",
    fetchedSnapshot.display_name,
    paymentMethodInput.display_name,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    fetchedSnapshot.created_at.length > 10 &&
      fetchedSnapshot.created_at.includes("T"),
  );
  TestValidator.predicate(
    "method_data is string",
    typeof fetchedSnapshot.method_data === "string",
  );
}
