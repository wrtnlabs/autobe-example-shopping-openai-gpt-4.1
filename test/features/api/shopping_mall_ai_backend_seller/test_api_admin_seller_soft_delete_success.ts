import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

/**
 * E2E test that an admin can soft-delete (mark as deleted) a seller account
 * via the admin erase endpoint.
 *
 * Business workflow validated:
 *
 * 1. Register and authenticate a new admin (setup of admin session in
 *    connection context).
 * 2. Register a new seller to obtain test sellerId.
 * 3. Ensure connection Authorization is set for admin (privileged context) to
 *    allow erase operation.
 * 4. Perform the erase (soft delete) of the seller account as admin.
 * 5. Document limitation: cannot verify deleted_at or active status due to
 *    absence of any seller detail/query endpoint; correct operation is
 *    inferred by absence of errors from erase API call.
 */
export async function test_api_admin_seller_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulated hash
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    phone_number: null,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Register a new seller (in their own context)
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: `${RandomGenerator.alphaNumeric(10)}@seller.com`,
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 3. Switch Authorization back to admin for privileged erase operation
  connection.headers ??= {};
  connection.headers.Authorization = adminAuth.token.access;

  // 4. Perform the admin-only erase (soft-delete) for the given sellerId
  await api.functional.shoppingMallAiBackend.admin.sellers.erase(connection, {
    sellerId: sellerAuth.seller.id,
  });
  // 5. No further verification possible as there is no seller detail/query endpoint. Test is successful if no error thrown above.
}
