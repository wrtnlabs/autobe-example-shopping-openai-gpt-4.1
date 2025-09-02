import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_seller_update_success(
  connection: api.IConnection,
) {
  /**
   * Test successful update of a seller's business details by an admin.
   *
   * Business context:
   *
   * - Only admin users may update core seller attributes, including business
   *   registration, name, and email.
   * - This scenario tests the update privilege and persistence for success path
   *   only.
   *
   * Steps:
   *
   * 1. Register admin account (sets admin authentication context)
   * 2. Register seller account (acquires sellerId and baseline data)
   * 3. As admin, update mutable seller fields (name &
   *    business_registration_number)
   * 4. Validate returned seller: correct id, updated fields, and unchanged
   *    integrity fields
   */

  // 1. Register admin account and set authentication context
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Register seller account under admin context
  const sellerJoinInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuth);
  const sellerId: string = sellerAuth.seller.id;

  // 3. Update seller's name and business_registration_number as admin
  const updateInput: IShoppingMallAiBackendSeller.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    business_registration_number: RandomGenerator.alphaNumeric(12),
  };
  const updated: IShoppingMallAiBackendSeller =
    await api.functional.shoppingMallAiBackend.admin.sellers.update(
      connection,
      {
        sellerId: sellerId,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Validate that fields are updated and id/other fields retained
  TestValidator.equals(
    "seller id should remain constant after update",
    updated.id,
    sellerId,
  );
  TestValidator.equals(
    "seller name should update",
    updated.name,
    updateInput.name,
  );
  TestValidator.equals(
    "business_registration_number should update",
    updated.business_registration_number,
    updateInput.business_registration_number,
  );
  TestValidator.equals(
    "seller email remains the same (not updated)",
    updated.email,
    sellerJoinInput.email,
  );
  TestValidator.equals(
    "is_verified remains unchanged",
    updated.is_verified,
    sellerAuth.seller.is_verified,
  );
  TestValidator.equals(
    "is_active remains unchanged",
    updated.is_active,
    sellerAuth.seller.is_active,
  );
  TestValidator.predicate(
    "deleted_at should not be set for active accounts",
    !updated.deleted_at,
  );
}
