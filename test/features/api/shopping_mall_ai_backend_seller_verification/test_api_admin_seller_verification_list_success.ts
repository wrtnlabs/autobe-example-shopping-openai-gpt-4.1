import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";
import type { IPageIShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSellerVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_seller_verification_list_success(
  connection: api.IConnection,
) {
  /**
   * Validate the ability for an authenticated admin to list all verification
   * records for a seller.
   *
   * Test Steps:
   *
   * 1. Register (join) a new admin account and authenticate - ensures the admin
   *    context is active.
   * 2. Register (join) a new seller, resulting in a valid sellerId for which
   *    verifications will be listed.
   * 3. Using the admin authorization (admin tokens set in connection), call the
   *    admin seller verifications list endpoint for this sellerId, with random
   *    pagination/filter parameters supported by the IRequest DTO scheme.
   * 4. Assert the response matches the
   *    IPageIShoppingMallAiBackendSellerVerification structure, including
   *    proper pagination fields and an array of verification records (which may
   *    be empty if no public API for seeding verifications exists yet).
   * 5. (If/when APIs allowing creation of verifications as fixture/seed become
   *    available, extend the test to assert the expected seed/fixture data
   *    appears in the response.)
   */

  // Step 1: Register and authenticate admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  // Step 2: Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const businessNum: string = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: businessNum,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(seller);
  // Step 3: As admin, list seller verifications
  const requestDto: IShoppingMallAiBackendSellerVerification.IRequest = {
    status: RandomGenerator.pick([
      "submitted",
      "approved",
      "rejected",
    ] as const),
    verification_type: RandomGenerator.pick([
      "identity",
      "business_license",
      "bank_account",
      "AML",
      "KYC",
    ] as const),
    // created_at_from and created_at_to are optional; omit unless want to explicitly test their handling
    page: 1,
    limit: 10,
  };
  const verificationsPage: IPageIShoppingMallAiBackendSellerVerification =
    await api.functional.shoppingMallAiBackend.admin.sellers.verifications.index(
      connection,
      {
        sellerId: seller.seller.id,
        body: requestDto,
      },
    );
  typia.assert(verificationsPage);
  TestValidator.predicate(
    "pagination object exists",
    !!verificationsPage.pagination,
  );
  TestValidator.predicate(
    "data array is present",
    Array.isArray(verificationsPage.data),
  );
  TestValidator.equals(
    "page size matches limit",
    verificationsPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    verificationsPage.pagination.current,
    1,
  );
}
