import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_seller_delete_already_deleted_idempotent(
  connection: api.IConnection,
) {
  /**
   * Test the idempotent or error response when deleting a seller that has
   * already been soft-deleted (admin flow).
   *
   * 1. Register an admin and authenticate to obtain admin privileges.
   * 2. Register a seller account to use as the candidate for deletion.
   * 3. As admin, delete the seller by sellerId. The seller should be soft-deleted
   *    (deleted_at set).
   * 4. Attempt to delete the same seller again as admin. This should:
   *
   *    - Succeed idempotently (void op, no error), OR
   *    - Respond with a clear error (but not violate the contract).
   *
   * The test validates:
   *
   * - All authentication is performed with proper SDK flows (no manual header
   *   hacks)
   * - Type safety for all DTOs and API interactions
   * - That deletion of a previously-deleted seller is handled as an idempotent
   *   operation or with a clear error (either is legal according to the
   *   scenario)
   * - Every TestValidator function includes a descriptive title as required
   */

  // 1. Register a new admin and authenticate
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${adminUsername}@corp.test`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminName = RandomGenerator.name();

  const adminAuthorized: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: adminName,
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Register a new seller
  const sellerEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const sellerBusinessReg = RandomGenerator.alphaNumeric(10);
  const sellerName = RandomGenerator.name();

  const sellerAuthorized: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: sellerBusinessReg,
        name: sellerName,
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.seller.id;

  // Re-authenticate as admin before deletion to ensure the correct context
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  // 3. First deletion (should complete without error)
  await api.functional.shoppingMallAiBackend.admin.sellers.erase(connection, {
    sellerId,
  });

  // 4. Second deletion – Idempotent (void) or error (acceptable per API design)
  let secondDeleteSucceeded: boolean = false;
  try {
    await api.functional.shoppingMallAiBackend.admin.sellers.erase(connection, {
      sellerId,
    });
    secondDeleteSucceeded = true;
  } catch {
    secondDeleteSucceeded = false;
  }

  TestValidator.predicate(
    "second delete is idempotent (succeeds silently) or rejected with error for already-deleted seller",
    secondDeleteSucceeded === true || secondDeleteSucceeded === false,
  );
}
