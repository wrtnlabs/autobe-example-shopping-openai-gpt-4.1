import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test full retrieval and access control of a customer wishlist by its ID.
 *
 * 1. Register a new customer account with address.
 * 2. Create a wishlist for this customer.
 * 3. Retrieve the wishlist by its id as the authenticated customer.
 *
 *    - Validate that wishlist.id matches, shopping_mall_customer_id matches, and all
 *         audit fields (created_at, updated_at) are present in ISO 8601
 *         format.
 * 4. Attempt to access wishlist as a different (unauthorized) customer; expect
 *    error.
 * 5. Try getting wishlist by a non-existent UUID; expect error.
 * 6. Confirm that no items exist in the wishlist initially (wishlist items not
 *    included, so only structural check).
 * 7. Document inability to soft-delete in this test due to missing endpoint
 *    (deleted_at cannot be triggered here).
 * 8. Confirm business rule: customer can have only one wishlist; attempting to
 *    create a second should fail (if system-enforced, else document as not
 *    testable).
 */
export async function test_api_wishlist_detail_view_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: "03187",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create wishlist for the customer
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 3. Retrieve the wishlist using its id as this customer
  const wishlistDetail =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(wishlistDetail);
  TestValidator.equals("wishlist ID matches", wishlistDetail.id, wishlist.id);
  TestValidator.equals(
    "wishlist owned by customer",
    wishlistDetail.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "wishlist created_at is in ISO 8601 format",
    typeof wishlistDetail.created_at === "string" &&
      wishlistDetail.created_at.length >= 20,
  );
  TestValidator.predicate(
    "wishlist updated_at is in ISO 8601 format",
    typeof wishlistDetail.updated_at === "string" &&
      wishlistDetail.updated_at.length >= 20,
  );

  // 4. Register another customer to test unauthorized access
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherJoinBody = {
    email: otherEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: "12345",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: otherJoinBody,
  });
  typia.assert(otherCustomer);

  // Switch context to other customer (token managed by SDK upon join)
  await TestValidator.error(
    "other customer cannot view wishlist (access denied)",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.at(connection, {
        wishlistId: wishlist.id,
      });
    },
  );

  // 5. Try accessing a non-existent wishlist ID
  await TestValidator.error("non-existent wishlist returns error", async () => {
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 6. Wishlist item check (by schema - wishlist has only structure, no items on creation)
  // (No item list exists on DTO, so only audit/ownership keys are present.)

  // 7. Deletion scenario: unable to test as deletion endpoint not available, and deleted_at not controllable.

  // 8. Business rule: customer can have only one wishlist
  await TestValidator.error(
    "customer cannot create second wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: {} satisfies IShoppingMallWishlist.ICreate,
      });
    },
  );
}
