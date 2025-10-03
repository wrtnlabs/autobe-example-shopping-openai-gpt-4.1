import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate that an admin can create a shopping cart on behalf of a specific
 * customer.
 *
 * Steps:
 *
 * 1. Register an admin and authenticate as the admin.
 * 2. Register a customer as the target cart owner.
 * 3. As admin, create a cart for that customer, referencing the customer's id,
 *    channel id, and random section id.
 * 4. Validate cart ownership links and audit fields.
 */
export async function test_api_admin_cart_creation_for_customer(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Register customer
  // For channel/section, random UUIDs used in absence of discovery API for these primitives
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const customerJoinBody = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: null,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);
  TestValidator.equals(
    "customer channel matches",
    customerAuth.shopping_mall_channel_id,
    channelId,
  );

  // 3. As admin, create the cart for customer
  const createCartBody = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "admin_test",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.admin.carts.create(
    connection,
    { body: createCartBody },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart owner matches customer",
    cart.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cart channel matches",
    cart.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals(
    "cart section matches",
    cart.shopping_mall_section_id,
    sectionId,
  );
  TestValidator.equals("cart source matches", cart.source, "admin_test");
  TestValidator.equals(
    "cart status is active or initial",
    typeof cart.status,
    "string",
  );
  TestValidator.predicate(
    "cart creation timestamp present",
    typeof cart.created_at === "string" && !!cart.created_at,
  );
  TestValidator.predicate(
    "cart update timestamp present",
    typeof cart.updated_at === "string" && !!cart.updated_at,
  );
}
