import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced product search with filter by status and seller_id.
 *
 * This test verifies the correctness of the advanced search API by creating
 * products with varying statuses ("active" and "inactive") and associating them
 * with two different sellers. After product creation, it performs a series of
 * filtered searches:
 *
 * 1. Create two unique sellers (simulated via unique seller_id values).
 * 2. For each seller, create products with both "active" and "inactive" status.
 * 3. Perform searches filtering by:
 *
 *    - Status only,
 *    - Seller_id only,
 *    - Both status and seller_id, and verify that the correct products are returned
 *         in each case.
 * 4. Validate that filtering by both constraints (status+seller_id) yields the
 *    expected result subset.
 *
 * Steps:
 *
 * 1. Generate two unique seller_id values.
 * 2. Create active/inactive products for both sellers (total of 4 products).
 * 3. Search for products with status="active" - should include only both sellers'
 *    active products.
 * 4. Search for products with status="inactive" - should include only both
 *    sellers' inactive products.
 * 5. Search for seller1's products (should return both status variants for
 *    seller1).
 * 6. Search for seller2's products
 * 7. Search for products for seller1 and status="active" - should return only
 *    seller1's active product.
 * 8. Repeat for seller2 and status="inactive".
 * 9. Validate output sets match expected product IDs for each query.
 */
export async function test_api_aimall_backend_products_test_search_products_by_status_and_seller_id(
  connection: api.IConnection,
) {
  // Step 1: Generate two unique seller IDs
  const seller1_id = typia.random<string & tags.Format<"uuid">>();
  const seller2_id = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create an arbitrary category for all products
  const category_id = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create products for both sellers with 'active' and 'inactive' status
  const seller1_active =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller1_id,
        title: "Seller1 Active",
        status: "active",
      },
    });
  typia.assert(seller1_active);
  const seller1_inactive =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller1_id,
        title: "Seller1 Inactive",
        status: "inactive",
      },
    });
  typia.assert(seller1_inactive);

  const seller2_active =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller2_id,
        title: "Seller2 Active",
        status: "active",
      },
    });
  typia.assert(seller2_active);
  const seller2_inactive =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id,
        seller_id: seller2_id,
        title: "Seller2 Inactive",
        status: "inactive",
      },
    });
  typia.assert(seller2_inactive);

  // Step 4: Search for products by status only (active)
  const search_active = await api.functional.aimall_backend.products.search(
    connection,
    { body: { status: "active" } },
  );
  typia.assert(search_active);
  const active_ids = search_active.data.map((p) => p.id);
  TestValidator.predicate(
    "status=active results contain both expected products",
  )(
    active_ids.includes(seller1_active.id) &&
      active_ids.includes(seller2_active.id),
  );
  TestValidator.predicate("status=active results do not include inactives")(
    !active_ids.includes(seller1_inactive.id) &&
      !active_ids.includes(seller2_inactive.id),
  );

  // Step 5: Search by status only (inactive)
  const search_inactive = await api.functional.aimall_backend.products.search(
    connection,
    { body: { status: "inactive" } },
  );
  typia.assert(search_inactive);
  const inactive_ids = search_inactive.data.map((p) => p.id);
  TestValidator.predicate("status=inactive contains expected inactives")(
    inactive_ids.includes(seller1_inactive.id) &&
      inactive_ids.includes(seller2_inactive.id),
  );
  TestValidator.predicate("status=inactive does not include actives")(
    !inactive_ids.includes(seller1_active.id) &&
      !inactive_ids.includes(seller2_active.id),
  );

  // Step 6: Search for all seller1's products (no status filter)
  const search_seller1 = await api.functional.aimall_backend.products.search(
    connection,
    { body: { seller_id: seller1_id } },
  );
  typia.assert(search_seller1);
  const seller1_result_ids = search_seller1.data.map((p) => p.id);
  TestValidator.predicate("all seller1's products returned")(
    seller1_result_ids.includes(seller1_active.id) &&
      seller1_result_ids.includes(seller1_inactive.id),
  );
  TestValidator.predicate("does not include seller2's products")(
    !seller1_result_ids.includes(seller2_active.id) &&
      !seller1_result_ids.includes(seller2_inactive.id),
  );

  // Step 7: Search for all seller2's products
  const search_seller2 = await api.functional.aimall_backend.products.search(
    connection,
    { body: { seller_id: seller2_id } },
  );
  typia.assert(search_seller2);
  const seller2_result_ids = search_seller2.data.map((p) => p.id);
  TestValidator.predicate("all seller2's products returned")(
    seller2_result_ids.includes(seller2_active.id) &&
      seller2_result_ids.includes(seller2_inactive.id),
  );
  TestValidator.predicate("does not include seller1's products")(
    !seller2_result_ids.includes(seller1_active.id) &&
      !seller2_result_ids.includes(seller1_inactive.id),
  );

  // Step 8: Search for seller1 && status=active
  const search_seller1_active =
    await api.functional.aimall_backend.products.search(connection, {
      body: { seller_id: seller1_id, status: "active" },
    });
  typia.assert(search_seller1_active);
  const ids = search_seller1_active.data.map((p) => p.id);
  TestValidator.equals("exact match seller1 active")(ids)([seller1_active.id]);

  // Step 9: Search for seller2 && status=inactive
  const search_seller2_inactive =
    await api.functional.aimall_backend.products.search(connection, {
      body: { seller_id: seller2_id, status: "inactive" },
    });
  typia.assert(search_seller2_inactive);
  const ids2 = search_seller2_inactive.data.map((p) => p.id);
  TestValidator.equals("exact match seller2 inactive")(ids2)([
    seller2_inactive.id,
  ]);
}
