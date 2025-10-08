import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";

/**
 * Validate seller address list and advanced filtering/pagination by
 * authenticated seller.
 *
 * 1. Register seller and obtain token
 * 2. Attempt various address list queries: (a) all addresses, (b) filter by
 *    address type, recipient_name, region, postal code, is_primary, (c) sort
 *    variations, (d) normal pagination, (e) page number beyond result count
 * 3. Try an unsupported filter and confirm no unexpected error
 * 4. Register second seller, try listing first's addresses (should fail)
 * 5. Register admin and confirm admin can access seller addresses
 */
export async function test_api_seller_address_list_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 2. Seller: View all own addresses (no filter)
  const allAddresses =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: {},
      },
    );
  typia.assert(allAddresses);
  TestValidator.predicate(
    "seller address list non-empty after join",
    allAddresses.data.length >= 1,
  );
  TestValidator.equals(
    "seller_id match in every address",
    allAddresses.data.every((a) => a.seller_id === sellerJoin.id),
    true,
  );

  // 3. Seller: Filtering by type & recipient_name
  const addressTypes = ["business", "shipping", "return"] as const;
  for (const type of addressTypes) {
    const filtered =
      await api.functional.shoppingMall.seller.sellers.addresses.index(
        connection,
        {
          sellerId: sellerJoin.id,
          body: { type },
        },
      );
    typia.assert(filtered);
    TestValidator.equals(
      `all type '${type}'`,
      filtered.data.every((a) => a.type === type),
      true,
    );
  }
  if (allAddresses.data.length > 0) {
    const sample = allAddresses.data[0];
    const regionFiltered =
      await api.functional.shoppingMall.seller.sellers.addresses.index(
        connection,
        {
          sellerId: sellerJoin.id,
          body: { region: sample.region },
        },
      );
    typia.assert(regionFiltered);
    TestValidator.predicate(
      "region filter returns some result",
      regionFiltered.data.length >= 1,
    );
    TestValidator.equals(
      "region filter exact matches",
      regionFiltered.data.every((a) => a.region === sample.region),
      true,
    );
    const nameFiltered =
      await api.functional.shoppingMall.seller.sellers.addresses.index(
        connection,
        {
          sellerId: sellerJoin.id,
          body: {
            recipient_name: sample.recipient_name.slice(
              0,
              Math.max(1, Math.floor(sample.recipient_name.length / 2)),
            ),
          },
        },
      );
    typia.assert(nameFiltered);
    TestValidator.predicate(
      "recipient_name substring filter returns match",
      nameFiltered.data.some((a) =>
        a.recipient_name.includes(sample.recipient_name.slice(0, 2)),
      ),
    );
  }

  // 4. Pagination: limit/sort_by/sort_order
  const paginated =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_order: "asc",
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "limit == page length (if addresses exist)",
    paginated.data.length,
    Math.min(paginated.pagination.limit, allAddresses.data.length),
  );

  const overPage =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: {
          page: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(overPage);
  TestValidator.equals("page past data - empty", overPage.data.length, 0);

  // 5. Seller: unsupported filter (should do nothing, safely handled by backend)
  const unsupported =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: { fakeFilter: "doesnotexist" } as any,
      },
    );
  typia.assert(unsupported);
  TestValidator.equals(
    "unsupported filter ignored (equal to unfiltered count)",
    unsupported.data.length,
    allAddresses.data.length,
  );

  // 6. Register a second seller
  const sellerJoin2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin2);

  // 7. Second seller attempts to view first seller's addresses (expect auth error)
  await TestValidator.error("unauthorized seller access denied", async () => {
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: {},
      },
    );
  });

  // 8. Register admin and confirm admin can access seller addresses
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(2),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // As admin, confirm can query addresses
  const adminAddresses =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerJoin.id,
        body: {},
      },
    );
  typia.assert(adminAddresses);
  TestValidator.equals(
    "admin gets seller addresses",
    adminAddresses.data.length,
    allAddresses.data.length,
  );
}
