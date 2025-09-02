import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";

export async function test_api_seller_verification_detail_admin_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for validating that an admin can retrieve a specific seller’s
   * verification record.
   *
   * Steps:
   *
   * 1. Register an admin account and authenticate (admin context)
   * 2. Register a new seller (for sellerId)
   * 3. Use a random or simulated preexisting verificationId
   * 4. As admin, call the verification detail endpoint with sellerId and
   *    verificationId
   * 5. Assert all compliance and evidence fields are present
   */

  // 1. Register admin and authenticate context
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", // dummy deterministic hash
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
  };
  if (Math.random() < 0.5) {
    adminInput.phone_number = RandomGenerator.mobile();
  }
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuth);

  // 2. Register seller to get a valid sellerId
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerInput,
    });
  typia.assert(sellerAuth);
  const sellerId: string & tags.Format<"uuid"> = sellerAuth.seller.id;

  // 3. Simulate/pre-existing verificationId (no creation endpoint in this suite)
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call verification detail endpoint as admin
  const verification: IShoppingMallAiBackendSellerVerification =
    await api.functional.shoppingMallAiBackend.admin.sellers.verifications.at(
      connection,
      {
        sellerId,
        verificationId,
      },
    );
  typia.assert(verification);

  // 5. Assert returned evidence fields
  TestValidator.equals(
    "response id matches request",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "response seller id matches request",
    verification.seller_id,
    sellerId,
  );
  TestValidator.predicate(
    "verification_type is non-empty string",
    typeof verification.verification_type === "string" &&
      verification.verification_type.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof verification.status === "string" && verification.status.length > 0,
  );
  TestValidator.predicate(
    "document_uri is non-empty string",
    typeof verification.document_uri === "string" &&
      verification.document_uri.length > 0,
  );
  TestValidator.predicate(
    "submitted_at is string/date-time",
    typeof verification.submitted_at === "string" &&
      verification.submitted_at.length > 0,
  );
  if (
    verification.verified_at !== null &&
    verification.verified_at !== undefined
  ) {
    TestValidator.predicate(
      "verified_at is string/date-time when present",
      typeof verification.verified_at === "string" &&
        verification.verified_at.length > 0,
    );
  }
}
