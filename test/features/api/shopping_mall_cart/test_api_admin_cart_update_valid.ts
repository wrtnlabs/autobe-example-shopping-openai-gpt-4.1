import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate admin update of a customer cart, covering cross-role session,
 * metadata change, and audit.
 *
 * 1. Create a customer in a random channel and section context.
 * 2. Create an admin and admin login.
 * 3. Customer logs in and creates a cart for themselves with system-generated
 *    channel/section/source values.
 * 4. Admin logs in and updates the cart, changing channel and section, source, and
 *    status. Optionally, admin can change expiration date.
 * 5. Validate that the cart fields are updated as requested and check audit
 *    evidence (updated_at is changed, created_at is unchanged, deleted_at
 *    changed only if status was changed to deleted).
 * 6. Assert that no extraneous field changes occurred and that changes reflect
 *    requested updates only.
 */
export async function test_api_admin_cart_update_valid(
  connection: api.IConnection,
) {
  // Step 1: Create random channel/section.
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Customer registration.
  const customerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Step 3: Admin registration and login.
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 4: Customer login and cart creation.
  await api.functional.auth.customer.login(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const createSource = RandomGenerator.pick([
    "member",
    "guest",
    "migrated",
  ] as const);
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: createSource,
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart owner",
    cart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "cart channel",
    cart.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals(
    "cart section",
    cart.shopping_mall_section_id,
    sectionId,
  );
  TestValidator.equals("cart source", cart.source, createSource);

  // Step 5: Admin login again to perform cart update.
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Prepare new metadata for update.
  const newChannelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newSectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newSource = RandomGenerator.pick([
    "guest",
    "migrated",
    "member",
  ] as const);
  const newStatus = RandomGenerator.pick([
    "active",
    "expired",
    "checked_out",
    "deleted",
  ] as const);
  const newExpiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  // Step 6: Update cart as admin.
  const updateBody = {
    shopping_mall_channel_id: newChannelId,
    shopping_mall_section_id: newSectionId,
    source: newSource,
    status: newStatus,
    expires_at: newExpiresAt,
  } satisfies IShoppingMallCart.IUpdate;

  const updated: IShoppingMallCart =
    await api.functional.shoppingMall.admin.carts.update(connection, {
      cartId: cart.id,
      body: updateBody,
    });
  typia.assert(updated);
  // Step 7: Validate updates and audit evidence.
  TestValidator.equals("cart id remains the same", updated.id, cart.id);
  TestValidator.equals(
    "updated channel",
    updated.shopping_mall_channel_id,
    newChannelId,
  );
  TestValidator.equals(
    "updated section",
    updated.shopping_mall_section_id,
    newSectionId,
  );
  TestValidator.equals("updated source", updated.source, newSource);
  TestValidator.equals("updated status", updated.status, newStatus);
  TestValidator.equals("updated expiration", updated.expires_at, newExpiresAt);
  TestValidator.notEquals(
    "updated_at must change",
    updated.updated_at,
    cart.updated_at,
  );
  TestValidator.equals(
    "created_at not changed",
    updated.created_at,
    cart.created_at,
  );
  if (newStatus === "deleted") {
    TestValidator.predicate(
      "deleted_at is set when status deleted",
      updated.deleted_at !== null && updated.deleted_at !== undefined,
    );
  } else {
    TestValidator.equals(
      "deleted_at is null when not deleted",
      updated.deleted_at,
      null,
    );
  }
  // Unchanged fields (cart owner should not change)
  TestValidator.equals(
    "cart owner never changed",
    updated.shopping_mall_customer_id,
    cart.shopping_mall_customer_id,
  );
}
