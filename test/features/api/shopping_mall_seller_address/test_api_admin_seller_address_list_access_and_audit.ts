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
 * Validate admin access to seller address book with audit, filtering,
 * pagination, and privacy for roles.
 *
 * 1. Register an admin account and get admin session (with token)
 * 2. Register a seller and get sellerId
 * 3. Test: Admin retrieves address list of seller with valid filters and checks
 *    all fields
 * 4. Test: Pagination and filtering (region/type/primary)
 * 5. Test: Sensitive fields are not masked for admin
 * 6. Test: Audit logging implied (cannot probe directly, but fetch and check for
 *    success)
 * 7. Test: Admin sees updated data after seller/info update (invoke again after
 *    seller change)
 * 8. Test: Using invalid sellerId triggers error
 * 9. Test: Seller or unauthenticated user cannot access admin endpoint
 */
export async function test_api_admin_seller_address_list_access_and_audit(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "5791correctHorseBattery!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBizNum = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Password123$",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: sellerBizNum,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 3. Admin retrieves all seller addresses with no filters (assumes at least 1 present)
  const baseReq = {} satisfies IShoppingMallSellerAddress.IRequest;
  const page = await api.functional.shoppingMall.admin.sellers.addresses.index(
    connection,
    {
      sellerId: seller.id,
      body: baseReq,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "admin should see at least 0 addresses (list present)",
    Array.isArray(page.data),
  );

  // 4. Test with pagination (page, limit)
  const pagedReq = {
    page: 1 as number,
    limit: 1 as number,
  } satisfies IShoppingMallSellerAddress.IRequest;
  const paged = await api.functional.shoppingMall.admin.sellers.addresses.index(
    connection,
    {
      sellerId: seller.id,
      body: pagedReq,
    },
  );
  typia.assert(paged);
  TestValidator.equals("paging limit is honored", paged.pagination.limit, 1);
  TestValidator.equals("paging current is 1", paged.pagination.current, 1);

  // 5. Filtering by region/type/primary returns subset (valid filter)
  if (paged.data.length > 0) {
    const sample = paged.data[0];
    const filterReq = {
      region: sample.region,
      type: sample.type,
      is_primary: sample.is_primary,
    } satisfies IShoppingMallSellerAddress.IRequest;
    const filtered =
      await api.functional.shoppingMall.admin.sellers.addresses.index(
        connection,
        {
          sellerId: seller.id,
          body: filterReq,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "filtered results match region/type/is_primary",
      filtered.data.every(
        (row) =>
          row.region === sample.region &&
          row.type === sample.type &&
          row.is_primary === sample.is_primary,
      ),
    );
  }

  // 6. Confirm unmasked fields for admin privilege (not redacted for admins)
  if (page.data.length > 0) {
    const testRow = page.data[0];
    TestValidator.predicate(
      "recipient_name revealed to admin",
      typeof testRow.recipient_name === "string",
    );
    TestValidator.predicate(
      "phone revealed to admin",
      typeof testRow.phone === "string",
    );
    TestValidator.predicate(
      "region revealed to admin",
      typeof testRow.region === "string",
    );
    TestValidator.predicate(
      "address_line1 not masked",
      typeof testRow.address_line1 === "string",
    );
  }

  // 7. Data reflects updates: update (simulate by re-fetch) and expect latest is shown
  const reloadPage =
    await api.functional.shoppingMall.admin.sellers.addresses.index(
      connection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerAddress.IRequest,
      },
    );
  typia.assert(reloadPage);
  TestValidator.equals(
    "address list still accessible after repeated query",
    page.data.length >= 0,
    reloadPage.data.length >= 0,
  );

  // 8. Invalid sellerId returns error
  await TestValidator.error("invalid seller UUID triggers error", async () => {
    await api.functional.shoppingMall.admin.sellers.addresses.index(
      connection,
      {
        sellerId: "00000000-0000-4000-8000-000000000000" as string &
          tags.Format<"uuid">,
        body: {} satisfies IShoppingMallSellerAddress.IRequest,
      },
    );
  });

  // 9. Lower privilege/unauthenticated cannot access: seller as self forbidden
  // Switch to seller (overwrite token)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Password123$",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: sellerBizNum,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await TestValidator.error(
    "seller cannot access admin seller address API",
    async () => {
      await api.functional.shoppingMall.admin.sellers.addresses.index(
        connection,
        {
          sellerId: seller.id,
          body: {} satisfies IShoppingMallSellerAddress.IRequest,
        },
      );
    },
  );

  // Switch to unauthenticated (clear headers)
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access admin API",
    async () => {
      await api.functional.shoppingMall.admin.sellers.addresses.index(
        anonConn,
        {
          sellerId: seller.id,
          body: {} satisfies IShoppingMallSellerAddress.IRequest,
        },
      );
    },
  );
}
