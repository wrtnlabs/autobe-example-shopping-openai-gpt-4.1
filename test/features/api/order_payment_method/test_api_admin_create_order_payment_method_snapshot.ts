import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test the creation of an order payment method snapshot by an admin for audit
 * purposes.
 *
 * 1. Register and authenticate as a new admin.
 * 2. Create a random order payment method snapshot payload with all required
 *    fields.
 * 3. Use the authenticated admin to call the create snapshot endpoint.
 * 4. Assert that the returned entity is stored, fully schema-compliant, and has
 *    all audit fields populated.
 */
export async function test_api_admin_create_order_payment_method_snapshot(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Construct valid payload for creating order payment method snapshot
  const createPayload = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.paragraph({ sentences: 3 }),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;

  // 3. Call the create endpoint as authenticated admin
  const snapshot: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: createPayload,
      },
    );
  typia.assert(snapshot);

  // 4. Check the returned entity matches request, business rules, and audit fields
  TestValidator.equals(
    "payment_method_type matches payload",
    snapshot.payment_method_type,
    createPayload.payment_method_type,
  );
  TestValidator.equals(
    "display_name matches payload",
    snapshot.display_name,
    createPayload.display_name,
  );
  TestValidator.equals(
    "method_data matches payload",
    snapshot.method_data,
    createPayload.method_data,
  );
  TestValidator.predicate(
    "order payment method snapshot id is a valid UUID",
    typeof snapshot.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof snapshot.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.created_at),
  );
}
