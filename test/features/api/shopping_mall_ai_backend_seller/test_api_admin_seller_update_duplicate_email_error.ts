import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

/**
 * Verify that admin is prevented from updating a seller's email to a value
 * used by another seller (uniqueness constraint).
 *
 * Tests the backoffice admin update endpoint for enforcing unique seller
 * emails:
 *
 * 1. Creates an admin account for authentication (required for all admin
 *    endpoints).
 * 2. Registers seller1 with a unique email.
 * 3. Registers seller2 with a different unique email.
 * 4. Using admin, attempts to update seller2's email to that of seller1.
 * 5. The system must reject the update (conflict or validation error),
 *    confirming email uniqueness constraint is enforced.
 * 6. The test PASSES if an error is thrown and FAILS if the update is allowed.
 */
export async function test_api_admin_seller_update_duplicate_email_error(
  connection: api.IConnection,
) {
  // 1. Create admin for authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin-test.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const adminCreate = {
    username: adminUsername,
    password_hash: passwordHash,
    name: RandomGenerator.name(),
    email: adminEmail,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Create first seller account (seller1)
  const seller1Email = `${RandomGenerator.alphaNumeric(10)}@seller-test.com`;
  const seller1BizNum = RandomGenerator.alphaNumeric(13);
  const seller1Create = {
    email: seller1Email,
    business_registration_number: seller1BizNum,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const seller1Auth = await api.functional.auth.seller.join(connection, {
    body: seller1Create,
  });
  typia.assert(seller1Auth);

  // 3. Create second seller account (seller2)
  const seller2Email = `${RandomGenerator.alphaNumeric(10)}@seller-test.com`;
  const seller2BizNum = RandomGenerator.alphaNumeric(13);
  const seller2Create = {
    email: seller2Email,
    business_registration_number: seller2BizNum,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const seller2Auth = await api.functional.auth.seller.join(connection, {
    body: seller2Create,
  });
  typia.assert(seller2Auth);

  // 4. Attempt to update seller2's email to that of seller1 using admin context
  await TestValidator.error(
    "admin cannot update seller's email to another's email (conflict expected)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.update(
        connection,
        {
          sellerId: seller2Auth.seller.id,
          body: {
            email: seller1Auth.seller.email,
          } satisfies IShoppingMallAiBackendSeller.IUpdate,
        },
      );
    },
  );
}
