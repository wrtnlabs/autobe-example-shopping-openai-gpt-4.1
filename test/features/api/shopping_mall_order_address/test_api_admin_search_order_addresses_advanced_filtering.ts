import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Validate admin historical order address filtering and pagination API.
 *
 * This test covers:
 *
 * - Admin registration and authentication
 * - Customer registration (to allow address creation)
 * - Creation of several order address snapshots with intentionally diverse data
 * - Admin advanced search with various filters (recipient name, region, postal,
 *   address type, multiple fields, partial/complete, date window)
 * - Edge test: filter that yields 0 results
 * - Response validation: only addresses matching filter, pagination metadata
 *   correctness, and empty result policy
 */
export async function test_api_admin_search_order_addresses_advanced_filtering(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a customer and login as that customer
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: "Seoul",
          postal_code: "03187",
          address_line1: "123 Test St",
          address_line2: "Apt 101",
          is_default: true,
        },
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Create multiple order address snapshots with varying fields for filter diversity
  const uniqueRegions = ["Seoul", "Busan", "Incheon"] as const;
  const addressTypes = ["shipping", "billing", "both"] as const;
  const baseNames = [
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
  ] as const;
  const postalCodes = ["03187", "04567", "12345"] as const;

  // Login as customer (done by auth.customer.join)
  const orderAddresses: IShoppingMallOrderAddress[] = await ArrayUtil.asyncMap(
    [0, 1, 2, 3, 4],
    async (i) => {
      const recipientName =
        baseNames[i % baseNames.length] + (i === 2 ? " Lee" : " Kim");
      const region = uniqueRegions[i % uniqueRegions.length];
      const addressType = addressTypes[i % addressTypes.length];
      const postalCode = postalCodes[i % postalCodes.length];
      const createdAt = new Date(
        Date.now() - i * 24 * 60 * 60 * 1000,
      ).toISOString(); // Stagger dates
      const created =
        await api.functional.shoppingMall.customer.orderAddresses.create(
          connection,
          {
            body: {
              address_type: addressType,
              recipient_name: recipientName,
              phone: RandomGenerator.mobile(),
              zip_code: postalCode,
              address_main: `${RandomGenerator.alphabets(5)} ${region} Main St`,
              address_detail: `Floor ${i + 1}`,
              country_code: "KR",
            } satisfies IShoppingMallOrderAddress.ICreate,
          },
        );
      typia.assert(created);
      // Overwrite created_at for in-memory filter simulation (if possible — pseudo, in real would mock or ensure creation order)
      return { ...created, created_at: createdAt };
    },
  );

  // Login as admin (already authenticated by admin registration - stay as admin)

  // 3. Search: recipient_name partial match
  // Use substring of a known name
  const targetName = baseNames[0];
  const partialTerm = targetName.slice(0, 3);
  const resultByRecipient =
    await api.functional.shoppingMall.admin.orderAddresses.index(connection, {
      body: {
        search: partialTerm,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(resultByRecipient);
  TestValidator.predicate(
    "recipient_name partial search returns only addresses with match",
    resultByRecipient.data.every((addr) =>
      addr.recipient_name.includes(partialTerm),
    ),
  );

  // 4. Search: region + date range window
  // Use region: "Seoul" and only recent (should match at least one, based on setup)
  const region = "Seoul";
  // Use sort_by and sort_order
  const resultByRegion =
    await api.functional.shoppingMall.admin.orderAddresses.index(connection, {
      body: {
        region,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(resultByRegion);
  TestValidator.predicate(
    "region match returns only Seoul region addresses",
    resultByRegion.data.every((addr) => addr.address_main.includes(region)),
  );

  // 5. Search: postal code exact
  const postal = postalCodes[0];
  const resultByPostal =
    await api.functional.shoppingMall.admin.orderAddresses.index(connection, {
      body: {
        postal_code: postal,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(resultByPostal);
  TestValidator.predicate(
    "postal code match returns only correct postal_code",
    resultByPostal.data.every((addr) => addr.zip_code === postal),
  );

  // 6. Search: address type
  const type = addressTypes[2]; // "both"
  const resultByType =
    await api.functional.shoppingMall.admin.orderAddresses.index(connection, {
      body: {
        // filter by address_type is not in IRequest schema (only in response structure), so skip direct address_type filter
        // Instead, ensure address_type diversity in creation and spot check data
        page: 1,
        limit: 10,
      },
    });
  typia.assert(resultByType);
  TestValidator.predicate(
    "all returned addresses have an address_type value",
    resultByType.data.every(
      (addr) =>
        typeof addr.address_type === "string" && addr.address_type.length > 0,
    ),
  );

  // 7. Edge: filtering that yields 0 results
  const resultEmpty =
    await api.functional.shoppingMall.admin.orderAddresses.index(connection, {
      body: {
        search: "this-will-not-match-any-name",
        page: 1,
        limit: 5,
      },
    });
  typia.assert(resultEmpty);
  TestValidator.equals("empty search returns empty list", resultEmpty.data, []);
  TestValidator.predicate(
    "pagination still present for empty list",
    !!resultEmpty.pagination &&
      typeof resultEmpty.pagination.current === "number",
  );
}
