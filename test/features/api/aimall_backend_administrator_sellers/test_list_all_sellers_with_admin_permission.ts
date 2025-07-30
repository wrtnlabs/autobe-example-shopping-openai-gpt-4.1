import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test administrator's ability to retrieve a paginated list of sellers.
 *
 * This test ensures that an authenticated administrator can fetch the seller
 * list (GET /aimall-backend/administrator/sellers), and that pagination and
 * returned data match the contract.
 *
 * Steps performed:
 *
 * 1. Create a small number of test sellers to ensure the list endpoint returns
 *    meaningful data.
 * 2. Create a large number of sellers to exceed a typical page size and test
 *    pagination.
 * 3. Retrieve the seller list as an admin, using the list endpoint.
 * 4. Validate pagination metadata: current page, limit, total records, and total
 *    pages.
 * 5. Ensure that seller objects and pagination objects fully match the DTO schema.
 * 6. Confirm at least all sellers from the small set are present in the returned
 *    list (by email).
 *
 * This verifies both the normal and paginated-list paths for the endpoint.
 */
export async function test_api_aimall_backend_administrator_sellers_index(
  connection: api.IConnection,
) {
  // 1. Create small number of test sellers
  const sellerInputsSmall = ArrayUtil.repeat(3)(
    () =>
      ({
        business_name: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile(),
        status: "approved",
      }) satisfies IAimallBackendSeller.ICreate,
  );
  const createdSellersSmall = await ArrayUtil.asyncMap(sellerInputsSmall)(
    async (input) => {
      const seller =
        await api.functional.aimall_backend.administrator.sellers.create(
          connection,
          { body: input },
        );
      typia.assert(seller);
      return seller;
    },
  );

  // 2. Create a large number of sellers to ensure pagination
  const sellerInputsLarge = ArrayUtil.repeat(60)(
    () =>
      ({
        business_name: RandomGenerator.alphabets(20),
        email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile(),
        status: "pending",
      }) satisfies IAimallBackendSeller.ICreate,
  );
  const createdSellersLarge = await ArrayUtil.asyncMap(sellerInputsLarge)(
    async (input) => {
      const seller =
        await api.functional.aimall_backend.administrator.sellers.create(
          connection,
          { body: input },
        );
      typia.assert(seller);
      return seller;
    },
  );

  // 3. Retrieve paginated list of sellers
  const output =
    await api.functional.aimall_backend.administrator.sellers.index(connection);
  typia.assert(output);

  // 4. Validate pagination fields
  const page = output.pagination;
  TestValidator.predicate("valid current page")(
    typeof page.current === "number" && page.current >= 1,
  );
  TestValidator.predicate("valid limit")(
    typeof page.limit === "number" && page.limit >= 1,
  );
  TestValidator.predicate("records non-negative")(
    typeof page.records === "number" && page.records >= 0,
  );
  TestValidator.predicate("pages non-negative")(
    typeof page.pages === "number" && page.pages >= 1,
  );

  // 5. Validate schema for returned sellers
  output.data.forEach((seller) => typia.assert(seller));

  // 6. Check that all small-set test sellers appear in the list (by email)
  for (const testSeller of createdSellersSmall) {
    const found = output.data.some(
      (seller) => seller.email === testSeller.email,
    );
    TestValidator.predicate("test seller should be present")(found);
  }
}
