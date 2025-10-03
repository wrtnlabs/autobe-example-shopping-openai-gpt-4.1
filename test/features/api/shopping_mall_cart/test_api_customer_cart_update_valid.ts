import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the process of updating shopping cart metadata as a customer.
 *
 * This test covers the full business flow:
 *
 * 1. Customer registration (join). Created with channel, email, password, name,
 *    phone (optional).
 * 2. Customer creates a shopping cart in a given channel/section (ICreate DTO,
 *    initial 'source' set).
 * 3. Customer updates the cart via PUT: modifes cart metadata fields such as
 *    status (to 'active'), section ID (store context switch), or source string
 *    (migration/rectification), using IUpdate DTO. Business emphasis is on
 *    status changing (e.g. reactivation) and audit compliance.
 * 4. Test validates:
 *
 *    - Metadata update is reflected in the IShoppingMallCart response
 *    - Ownership and integrity fields unchanged
 *    - Created_at does not change; updated_at does
 *    - New values for changed fields match update DTO
 *    - Timestamps and IDs are well-formed
 *    - All response types are verified with typia.assert()
 */
export async function test_api_customer_cart_update_valid(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerJoin = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(customer);

  // 2. Cart creation
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cartCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreate },
  );
  typia.assert(cart);

  // Snapshot of created_at for audit check
  const createdAt = cart.created_at;
  const originalSectionId = cart.shopping_mall_section_id;

  // 3. Update cart metadata: switch section and reactivate status
  const newSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateDto = {
    shopping_mall_section_id: newSectionId,
    status: "active",
    source: "migration",
  } satisfies IShoppingMallCart.IUpdate;

  const updated = await api.functional.shoppingMall.customer.carts.update(
    connection,
    { cartId: cart.id, body: updateDto },
  );
  typia.assert(updated);

  // 4. Assertions: business and audit logic
  TestValidator.equals("cart id must not change", updated.id, cart.id);
  TestValidator.equals(
    "customer id must not change",
    updated.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "channel id must not change",
    updated.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.notEquals(
    "section id should be updated",
    updated.shopping_mall_section_id,
    originalSectionId,
  );
  TestValidator.equals(
    "section id is the requested new one",
    updated.shopping_mall_section_id,
    newSectionId,
  );
  TestValidator.equals("status is updated", updated.status, "active");
  TestValidator.equals("source is updated", updated.source, "migration");
  TestValidator.equals(
    "created_at does not change",
    updated.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at must be changed",
    updated.updated_at,
    createdAt,
  );
  TestValidator.predicate(
    "updated_at > created_at",
    updated.updated_at > createdAt,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updated.deleted_at,
    cart.deleted_at,
  );
  TestValidator.predicate(
    "id is uuid",
    typeof updated.id === "string" && updated.id.length >= 32,
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof updated.created_at === "string" && updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof updated.updated_at === "string" && updated.updated_at.length > 0,
  );
}
