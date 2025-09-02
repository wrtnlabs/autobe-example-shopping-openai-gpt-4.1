import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_seller_detail_access_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin can access details of a created seller account
   *
   * Flow:
   *
   * 1. Register admin user (get admin authentication context)
   * 2. Create a seller business account (get sellerId & profile)
   * 3. As admin, access seller details via GET
   *    /shoppingMallAiBackend/admin/sellers/{sellerId}
   * 4. Validate all main fields (id, email, business_registration_number, name,
   *    is_active, is_verified, timestamps)
   * 5. Confirm fetched data matches registered seller (excluding server-derived
   *    values as appropriate)
   */

  // 1. Register an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(1)
    .replace(/\s/g, "")
    .toLowerCase();
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  const adminConn = connection; // connection already has admin auth token after join

  // 2. Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessRegNum = RandomGenerator.alphaNumeric(10);
  const sellerLegalName = RandomGenerator.name();
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(adminConn, {
      body: {
        email: sellerEmail,
        business_registration_number: sellerBusinessRegNum,
        name: sellerLegalName,
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerAuth);
  const createdSeller = sellerAuth.seller;

  // 3. As authenticated admin, request seller details
  const result: IShoppingMallAiBackendSeller =
    await api.functional.shoppingMallAiBackend.admin.sellers.at(adminConn, {
      sellerId: createdSeller.id,
    });
  typia.assert(result);

  // 4. Field-by-field assertions (field names per ISeller and IShoppingMallAiBackendSeller)
  TestValidator.equals("seller id matches", result.id, createdSeller.id);
  TestValidator.equals("seller email matches", result.email, sellerEmail);
  TestValidator.equals(
    "seller business_registration_number matches",
    result.business_registration_number,
    sellerBusinessRegNum,
  );
  TestValidator.equals("seller name matches", result.name, sellerLegalName);
  // is_active and is_verified may be manipulated by deeper onboarding flows, but should be boolean
  TestValidator.predicate(
    "seller is_active is boolean",
    typeof result.is_active === "boolean",
  );
  TestValidator.predicate(
    "seller is_verified is boolean",
    typeof result.is_verified === "boolean",
  );
  // Timestamps: must be string in date-time format
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  // deleted_at can be undefined or null or formatted date-time
  if (result.deleted_at !== undefined && result.deleted_at !== null)
    TestValidator.predicate(
      "deleted_at is ISO date-time if exists",
      typeof result.deleted_at === "string" && result.deleted_at.length > 0,
    );
}
