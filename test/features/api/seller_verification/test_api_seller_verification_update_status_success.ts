import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";

export async function test_api_seller_verification_update_status_success(
  connection: api.IConnection,
) {
  /** 1. Create an admin account and set its authentication context */
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.name(1);
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);
  // The connection is now authenticated as admin

  /** 2. Create a seller account and capture the sellerId */
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const businessRegistrationNumber: string = RandomGenerator.alphaNumeric(10);
  const sellerName: string = RandomGenerator.name();
  const sellerAuth: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: businessRegistrationNumber,
        name: sellerName,
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(sellerAuth);
  const sellerId: string = sellerAuth.seller.id;

  /** 3. Generate a plausible (random) verificationId */
  const verificationId: string = typia.random<string & tags.Format<"uuid">>();

  /**
   * 4. Restore admin authentication context (the previous join switched to seller
   *    token)
   */
  await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: admin.admin.name, // Use previously assigned admin name for robustness
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });

  /** 5. Prepare the update payload using allowed DTO fields */
  const statusOptions = ["approved", "rejected", "pending"] as const;
  const verificationTypeOptions = [
    "identity",
    "business_license",
    "bank_account",
    "KYC",
  ] as const;
  const updateBody: IShoppingMallAiBackendSellerVerification.IUpdate = {
    status: RandomGenerator.pick(statusOptions),
    document_uri: `https://files.example.com/evidence/${RandomGenerator.alphaNumeric(16)}`,
    verification_type: RandomGenerator.pick(verificationTypeOptions),
    verified_at: new Date().toISOString(),
  };

  /** 6. Perform the update operation as admin */
  const result: IShoppingMallAiBackendSellerVerification =
    await api.functional.shoppingMallAiBackend.admin.sellers.verifications.update(
      connection,
      {
        sellerId,
        verificationId,
        body: updateBody,
      },
    );
  typia.assert(result);

  /** 7. Validate the relevant fields from the response against the request */
  TestValidator.equals("verification id matches", result.id, verificationId);
  TestValidator.equals("seller id matches", result.seller_id, sellerId);
  TestValidator.equals("update status", result.status, updateBody.status);
  TestValidator.equals(
    "update document_uri",
    result.document_uri,
    updateBody.document_uri,
  );
  TestValidator.equals(
    "update verification_type",
    result.verification_type,
    updateBody.verification_type,
  );
  TestValidator.equals(
    "update verified_at",
    result.verified_at,
    updateBody.verified_at,
  );
  TestValidator.predicate(
    "submitted_at present",
    typeof result.submitted_at === "string" && result.submitted_at.length > 0,
  );
}
