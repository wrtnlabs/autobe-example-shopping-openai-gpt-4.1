import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validates that a new customer can create a wishlist once (and only once)
 * right after registration.
 *
 * 1. Register (join) a new customer with unique info and initial address.
 * 2. With the authenticated connection, create an empty wishlist for this
 *    customer.
 * 3. Confirm that the wishlist is owned by the correct customer and audit fields
 *    are present.
 * 4. Attempt to create a second wishlist and confirm that it is rejected per
 *    business logic.
 */
export async function test_api_customer_wishlist_creation_new_user(
  connection: api.IConnection,
) {
  // 1. Register (join) a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 4,
        wordMax: 12,
      }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 8,
        wordMax: 15,
      }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);
  // 2. Create an empty wishlist for this customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {},
    });
  typia.assert(wishlist);
  TestValidator.equals(
    "wishlist owner id matches customer id",
    wishlist.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals("wishlist id is uuid", typeof wishlist.id, "string");
  TestValidator.predicate(
    "wishlist created_at present",
    typeof wishlist.created_at === "string" && !!wishlist.created_at,
  );
  TestValidator.predicate(
    "wishlist updated_at present",
    typeof wishlist.updated_at === "string" && !!wishlist.updated_at,
  );
  // 3. Attempt to create a second wishlist for the same customer and expect an error
  await TestValidator.error(
    "Creating a second wishlist for same customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {},
      });
    },
  );
}
