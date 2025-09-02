import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";

export async function test_api_seller_profile_update_success(
  connection: api.IConnection,
) {
  /**
   * Scenario: Authenticated seller successfully updates their own profile
   * fields.
   *
   * Flow:
   *
   * 1. Register and authenticate a new seller to get sellerId and session token
   * 2. Prepare new profile fields: display_name, contact_phone, contact_email,
   *    address, and description (all optional and updatable)
   * 3. Update the seller's profile via PUT endpoint using authenticated context
   * 4. Assert that updated profile fields are stored and returned by the API
   * 5. Confirm the seller_id is unchanged after update
   */

  // 1. Register seller (join & auto-authenticate context)
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.seller.id;

  // 2. Prepare updatable profile fields
  const profileUpdate = {
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    contact_phone: RandomGenerator.mobile(),
    contact_email: typia.random<string & tags.Format<"email">>(),
    address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 8,
      wordMax: 12,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 6,
      wordMax: 15,
    }),
  } satisfies IShoppingMallAiBackendSellerProfile.IUpdate;

  // 3. Perform the profile update
  const updatedProfile =
    await api.functional.shoppingMallAiBackend.seller.sellers.profile.update(
      connection,
      {
        sellerId: sellerId,
        body: profileUpdate,
      },
    );
  typia.assert(updatedProfile);

  // 4. Validate that all fields are correctly stored and returned
  TestValidator.equals(
    "seller display_name updated",
    updatedProfile.display_name,
    profileUpdate.display_name,
  );
  TestValidator.equals(
    "seller contact_phone updated",
    updatedProfile.contact_phone,
    profileUpdate.contact_phone,
  );
  TestValidator.equals(
    "seller contact_email updated",
    updatedProfile.contact_email,
    profileUpdate.contact_email,
  );
  TestValidator.equals(
    "seller address updated",
    updatedProfile.address,
    profileUpdate.address,
  );
  TestValidator.equals(
    "seller description updated",
    updatedProfile.description,
    profileUpdate.description,
  );
  TestValidator.equals(
    "seller_id remains unchanged",
    updatedProfile.seller_id,
    sellerId,
  );
}
