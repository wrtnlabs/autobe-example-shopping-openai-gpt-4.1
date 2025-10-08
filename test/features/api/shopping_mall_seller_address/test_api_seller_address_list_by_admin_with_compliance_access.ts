import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAddress";

/**
 * Validate admin retrieval of seller's address list with compliance access.
 *
 * Steps:
 *
 * 1. Register a seller (record sellerId)
 * 2. Register an admin and switch context to admin
 * 3. As admin, query the seller's address list via the admin address endpoint
 *    (with limit, filters, sorting).
 * 4. Check that returned addresses belong to the seller; sensitive fields are
 *    present and correct.
 * 5. Check pagination and filter results
 * 6. Try an excessive limit (>100) and expect runtime error
 * 7. Try invalid sellerId (random UUID) and expect error
 * 8. Try querying a non-existent seller's address list (unused UUID) and expect
 *    empty data but valid page.
 */
export async function test_api_seller_address_list_by_admin_with_compliance_access(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain their UUID
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(13),
    kyc_document_uri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(sellerAuth);
  const sellerId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(sellerAuth.id);

  // 2. Register an admin and switch context
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);

  // 3. As admin, retrieve the seller's addresses with default pagination (limit 20)
  const defaultList: IPageIShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerId,
        body: {}, // no filter, default pagination
      },
    );
  typia.assert(defaultList);
  TestValidator.predicate(
    "all addresses belong to correct seller",
    defaultList.data.every((addr) => addr.seller_id === sellerId),
  );
  TestValidator.predicate(
    "address list exposes admin-visible sensitive fields",
    defaultList.data.every(
      (addr) =>
        typeof addr.recipient_name === "string" &&
        typeof addr.phone === "string" &&
        typeof addr.address_line1 === "string",
    ),
  );

  // 4. As admin, retrieve the seller's addresses with explicit filters/sorting/pagination
  const pagedList: IPageIShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at",
          sort_order: "asc",
          type: undefined,
          region: undefined,
          postal_code: undefined,
          recipient_name: undefined,
          is_primary: undefined,
        },
      },
    );
  typia.assert(pagedList);
  TestValidator.equals(
    "paging results use requested limit",
    pagedList.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "addresses still belong to seller",
    pagedList.data.every((a) => a.seller_id === sellerId),
  );

  // 5. As admin, use region substring filter (if region is available)
  if (pagedList.data.length > 0) {
    const regionFilter = pagedList.data[0].region.substring(0, 3);
    const filtered: IPageIShoppingMallSellerAddress =
      await api.functional.shoppingMall.seller.sellers.addresses.index(
        connection,
        {
          sellerId: sellerId,
          body: {
            region: regionFilter,
          },
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered results match region substring",
      filtered.data.every((a) => a.region.includes(regionFilter)),
    );
  }

  // 6. Attempt excessive page size, expect error
  await TestValidator.error("limit over 100 triggers error", async () => {
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: sellerId,
        body: {
          limit: 200 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  });

  // 7. Invalid sellerId (random uuid), expect error
  await TestValidator.error(
    "invalid sellerId (random UUID) triggers error",
    async () => {
      await api.functional.shoppingMall.seller.sellers.addresses.index(
        connection,
        {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 8. Non-existent seller UUID (not registered), expect valid but empty list
  const unusedSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyList: IPageIShoppingMallSellerAddress =
    await api.functional.shoppingMall.seller.sellers.addresses.index(
      connection,
      {
        sellerId: unusedSellerId,
        body: {},
      },
    );
  typia.assert(emptyList);
  TestValidator.equals(
    "empty list for non-existent seller",
    emptyList.data,
    [],
  );
}
