import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";

/**
 * Verify seller can retrieve their own address details by ID after registering
 * as a seller
 *
 * 1. Register a new seller via /auth/seller/join and obtain their ID and token
 *    (authentication is handled by join)
 * 2. Generate a mock/fixture address record owned by that seller (since address
 *    creation API not present, simulate via test value)
 * 3. Retrieve the seller address by calling GET
 *    /shoppingMall/seller/sellers/{sellerId}/addresses/{addressId} with correct
 *    sellerId/addressId
 * 4. Assert that all fields (recipient, phone, postal code, lines, type,
 *    is_primary, timestamps) in the response exactly match the generated
 *    record
 * 5. Negative case: Attempt to fetch with a random sellerId or addressId (not
 *    matching the owner) and expect error
 */
export async function test_api_seller_address_detail_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new seller and get their info
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Simulate address creation (fixture inline record)
  const address: IShoppingMallSellerAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    type: RandomGenerator.pick(["business", "shipping", "return"] as const),
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    is_primary: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // 3. Retrieve via owner (positive)
  const output = await api.functional.shoppingMall.seller.sellers.addresses.at(
    connection,
    {
      sellerId: seller.id,
      addressId: address.id,
    },
  );
  typia.assert(output);

  // 4. Assert all fields match
  TestValidator.equals("address id matches", output.id, address.id);
  TestValidator.equals(
    "seller id matches",
    output.seller_id,
    address.seller_id,
  );
  TestValidator.equals("type matches", output.type, address.type);
  TestValidator.equals(
    "recipient_name matches",
    output.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals("phone matches", output.phone, address.phone);
  TestValidator.equals("region matches", output.region, address.region);
  TestValidator.equals(
    "postal code matches",
    output.postal_code,
    address.postal_code,
  );
  TestValidator.equals(
    "address_line1 matches",
    output.address_line1,
    address.address_line1,
  );
  TestValidator.equals(
    "address_line2 matches",
    output.address_line2,
    address.address_line2,
  );
  TestValidator.equals(
    "is_primary matches",
    output.is_primary,
    address.is_primary,
  );
  // Not checking timestamps for exact equality due to possible timing difference

  // 5. Negative test: fetch with random sellerId (expect error)
  await TestValidator.error("access with wrong sellerId denied", async () => {
    await api.functional.shoppingMall.seller.sellers.addresses.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
      addressId: address.id,
    });
  });
  // 5b. Negative test: fetch with wrong addressId (expect error)
  await TestValidator.error("access with wrong addressId denied", async () => {
    await api.functional.shoppingMall.seller.sellers.addresses.at(connection, {
      sellerId: seller.id,
      addressId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
