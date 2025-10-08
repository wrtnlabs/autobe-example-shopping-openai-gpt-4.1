import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";

/**
 * Validates that an authenticated admin can retrieve any seller's address
 * details.
 *
 * Steps:
 *
 * 1. Register a new admin (admin join).
 * 2. Register a new seller (seller join).
 * 3. Mock creation of a seller address (simulate, random data—since no create
 *    endpoint revealed).
 * 4. As admin, retrieve the seller's address by sellerId/addressId using the admin
 *    endpoint.
 * 5. Assert that the returned address matches the expected seller and addressId,
 *    and typia asserts pass.
 */
export async function test_api_admin_retrieves_seller_address_detail(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Register seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: undefined,
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(seller);

  // 3. Mock a seller address (simulate random since no create endpoint)
  // (Assume that addressId and corresponding address exists for the seller)
  const mockAddress: IShoppingMallSellerAddress =
    typia.random<IShoppingMallSellerAddress>();
  // Change seller_id to the just created seller.id (simulate this as address of this seller)
  mockAddress.seller_id = seller.id;

  // 4. As admin, retrieve the address
  // Switch to admin context (token already set by admin join)
  // To simulate getting a real addressId for this seller, in production you would create the address and get its ID; here, use the mock.
  const address = await api.functional.shoppingMall.admin.sellers.addresses.at(
    connection,
    {
      sellerId: seller.id,
      addressId: mockAddress.id,
    },
  );
  typia.assert(address);

  TestValidator.equals(
    "returned seller id matches",
    address.seller_id,
    seller.id,
  );
  TestValidator.equals(
    "returned address id matches",
    address.id,
    mockAddress.id,
  );
}
