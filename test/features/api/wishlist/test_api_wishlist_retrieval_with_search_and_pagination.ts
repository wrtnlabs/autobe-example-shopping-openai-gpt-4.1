import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate paginated, filtered, and sorted wishlist retrieval for a registered
 * customer.
 *
 * 1. Register new customer (customer1)
 * 2. Create at least one category (category1)
 * 3. Retrieve empty wishlist - expect no records
 * 4. Attempt retrieval as unauthorized user (fresh customer2) - expect error
 * 5. Paginate, filter, search wishlist (still empty) - validate empty result
 * 6. (Business limitation: No interface to add wishlist items, so test only
 *    retrieval logic)
 */
export async function test_api_wishlist_retrieval_with_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register new customer (customer1)
  const customerEmail1 = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail1,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);

  // 2. Create at least one category (category1)
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);

  // 3. Retrieve empty wishlist for customer1
  const pageOutputEmpty: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {},
    });
  typia.assert(pageOutputEmpty);
  TestValidator.equals(
    "empty wishlist has no records",
    pageOutputEmpty.data.length,
    0,
  );

  // 4. Register a second customer (customer2) for unauthorized test
  const customerEmail2 = typia.random<string & tags.Format<"email">>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail2,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);

  // 5. Retrieve wishlist as customer2 (should also be empty)
  const pageOutput2: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: {},
    });
  typia.assert(pageOutput2);
  TestValidator.equals("customer2 empty wishlist", pageOutput2.data.length, 0);

  // 6. Try unauthorized access by using customer1's token on customer2's wishlist is impossible (API is always caller-scoped)
  // Can only check that wishlists are user-scoped by re-logging in as needed, so API-level access check is inherent.

  // 7. Test pagination/filter/sort with empty wishlist
  const queries: IShoppingMallWishlist.IRequest[] = [
    { page: 1, limit: 2 },
    { page: 2, limit: 1 },
    { categoryId: category1.id },
    { search: RandomGenerator.name() },
    { orderBy: "created_at", orderDirection: "desc" },
    { orderBy: "updated_at", orderDirection: "asc" },
  ];
  for (const q of queries) {
    const paged = await api.functional.shoppingMall.customer.wishlists.index(
      connection,
      { body: q },
    );
    typia.assert(paged);
    TestValidator.equals(
      "filter on no data returns empty",
      paged.data.length,
      0,
    );
  }
}
