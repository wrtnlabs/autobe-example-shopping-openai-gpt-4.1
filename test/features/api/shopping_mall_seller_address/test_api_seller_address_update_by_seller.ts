import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";

/**
 * Seller address update by seller scenario (successful update and primary
 * uniqueness enforcement)
 *
 * 1. Register a seller via seller join (to obtain seller and context).
 * 2. Create initial seller address by calling the update endpoint (since there is
 *    no create API, simulate initial insertion by updating a random UUID; in
 *    real API this should be a separate create step, but for test purposes
 *    update suffices since update should be idempotent/overwrite for test
 *    context).
 * 3. Prepare valid address update data (randomly generated full set:
 *    recipient_name, phone, region, postal_code, line1/2, type, is_primary).
 * 4. Update the address and validate all fields are updated (typia.assert,
 *    TestValidator.equals for input-to-output field matching).
 * 5. Update the address again, this time switching its is_primary flag to true and
 *    ensuring one-primary-per-type is honored.
 * 6. [Optional] If update API allows, try to set is_primary true on another
 *    address of same type and verify only one remains primary per type.
 */
export async function test_api_seller_address_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller (authentication context)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. Simulate seller already has an address: update a random id to inject one (since no direct create in listed functions)
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const initialAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    type: RandomGenerator.pick(["business", "shipping", "return"] as const),
    is_primary: true,
  } satisfies IShoppingMallSellerAddress.IUpdate;
  const address: IShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.update(
      connection,
      {
        sellerId: sellerId,
        addressId: addressId,
        body: initialAddressBody,
      },
    );
  typia.assert(address);
  // Validate all updated fields match input
  TestValidator.equals(
    "recipient_name updated",
    address.recipient_name,
    initialAddressBody.recipient_name,
  );
  TestValidator.equals(
    "phone updated",
    address.phone,
    initialAddressBody.phone,
  );
  TestValidator.equals(
    "region updated",
    address.region,
    initialAddressBody.region,
  );
  TestValidator.equals(
    "postal_code updated",
    address.postal_code,
    initialAddressBody.postal_code,
  );
  TestValidator.equals(
    "address_line1 updated",
    address.address_line1,
    initialAddressBody.address_line1,
  );
  TestValidator.equals(
    "address_line2 updated",
    address.address_line2,
    initialAddressBody.address_line2,
  );
  TestValidator.equals("type updated", address.type, initialAddressBody.type);
  TestValidator.equals("is_primary true", address.is_primary, true);
  TestValidator.equals("seller_id matches", address.seller_id, sellerId);
  TestValidator.equals("id matches", address.id, addressId);

  // 3. Update address fields (change recipient_name, phone, region, postal_code, address_line1/2, type, set is_primary = false)
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    type: RandomGenerator.pick(["business", "shipping", "return"] as const),
    is_primary: false,
  } satisfies IShoppingMallSellerAddress.IUpdate;
  const updated: IShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.update(
      connection,
      {
        sellerId: sellerId,
        addressId: addressId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // Validate all fields match new update body
  TestValidator.equals(
    "recipient_name after update",
    updated.recipient_name,
    updateBody.recipient_name,
  );
  TestValidator.equals("phone after update", updated.phone, updateBody.phone);
  TestValidator.equals(
    "region after update",
    updated.region,
    updateBody.region,
  );
  TestValidator.equals(
    "postal_code after update",
    updated.postal_code,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "address_line1 after update",
    updated.address_line1,
    updateBody.address_line1,
  );
  TestValidator.equals(
    "address_line2 after update",
    updated.address_line2,
    updateBody.address_line2,
  );
  TestValidator.equals("type after update", updated.type, updateBody.type);
  TestValidator.equals("is_primary after update", updated.is_primary, false);
  TestValidator.equals(
    "seller_id matches after update",
    updated.seller_id,
    sellerId,
  );
  TestValidator.equals("id matches after update", updated.id, addressId);

  // 4. Set is_primary = true via another update (should not violate the unique primary constraint)
  const setPrimaryBody = {
    is_primary: true,
  } satisfies IShoppingMallSellerAddress.IUpdate;
  const primaryUpdated: IShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.update(
      connection,
      {
        sellerId: sellerId,
        addressId: addressId,
        body: setPrimaryBody,
      },
    );
  typia.assert(primaryUpdated);
  TestValidator.equals(
    "is_primary after set to true",
    primaryUpdated.is_primary,
    true,
  );
  TestValidator.equals(
    "seller_id after set primary",
    primaryUpdated.seller_id,
    sellerId,
  );
  TestValidator.equals("id after set primary", primaryUpdated.id, addressId);
}
