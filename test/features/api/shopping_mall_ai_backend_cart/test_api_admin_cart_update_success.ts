import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";

export async function test_api_admin_cart_update_success(
  connection: api.IConnection,
) {
  /**
   * Validates that admin can update a shopping cart via
   * /shoppingMallAiBackend/admin/carts/{cartId}.
   *
   * 1. Registers an admin account and authenticates the session context using
   *    admin/join, generating realistic and unique admin credentials.
   * 2. As this admin, creates a cart with "active" status, simulating a guest cart
   *    (customer/session IDs set to null). Initial note is set.
   * 3. Updates the cart's status to "submitted" and overwrites the note via the
   *    admin update endpoint. Asserts that the returned cart object reflects
   *    these changes and that audit fields (updated_at) are updated as
   *    expected.
   * 4. Attempts to update the cart with a non-admin context (connection.headers
   *    cleared), and asserts that the operation fails (permission enforcement
   *    tested).
   */
  // 1. Register a new admin and authenticate
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Assume hash already processed
  const adminCreate = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: RandomGenerator.name(),
    email: adminEmail,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Create a cart as admin
  const cartCreate = {
    cart_token: RandomGenerator.alphaNumeric(12),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 2 }),
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_customer_session_id: null,
    expires_at: null,
    last_merged_at: null,
  } satisfies IShoppingMallAiBackendCart.ICreate;
  const createdCart =
    await api.functional.shoppingMallAiBackend.admin.carts.create(connection, {
      body: cartCreate,
    });
  typia.assert(createdCart);
  TestValidator.equals(
    "cart status is initially active",
    createdCart.status,
    "active",
  );
  TestValidator.equals(
    "note is set as expected",
    createdCart.note,
    cartCreate.note,
  );
  const originalUpdatedAt = createdCart.updated_at;

  // 3. Update the cart's status and note as admin
  const cartUpdate = {
    status: "submitted",
    note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAiBackendCart.IUpdate;
  const updatedCart =
    await api.functional.shoppingMallAiBackend.admin.carts.update(connection, {
      cartId: createdCart.id,
      body: cartUpdate,
    });
  typia.assert(updatedCart);
  TestValidator.equals(
    "cart status updated to submitted",
    updatedCart.status,
    "submitted",
  );
  TestValidator.equals(
    "note field updated in cart",
    updatedCart.note,
    cartUpdate.note,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedCart.updated_at,
    originalUpdatedAt,
  );

  // 4. Negative scenario: try update with a non-admin context (expect failure)
  const nonAdminConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin user cannot update admin cart",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.update(
        nonAdminConnection,
        {
          cartId: createdCart.id,
          body: {
            status: "active",
          } satisfies IShoppingMallAiBackendCart.IUpdate,
        },
      );
    },
  );
}
