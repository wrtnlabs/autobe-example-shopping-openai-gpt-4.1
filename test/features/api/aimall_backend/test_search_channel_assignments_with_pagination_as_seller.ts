import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test paginated and filtered search of seller product's channel assignments
 * (PATCH /aimall-backend/seller/products/{productId}/channelAssignments)
 *
 * This test verifies that:
 *
 * - A seller can assign a product to multiple channels
 * - The search endpoint returns paginated channel assignment data for the product
 * - Filtering and pagination behave as expected (page/limit)
 * - Search output has correct pagination metadata and includes proper assignments
 *   on each page
 *
 * Steps:
 *
 * 1. Create a seller (administrator privilege)
 * 2. Create 2+ channels (administrator)
 * 3. Create a product for seller (with valid category_id; assume random UUID if
 *    not enforced)
 * 4. Assign the product to both channels
 * 5. Perform a paginated search for channel assignments (page=1, limit=1)
 *
 *    - Expect to get only 1 assignment on the first page
 *    - Check pagination metadata is correct (1 out of 2 assignments, 2 pages, etc)
 * 6. Perform a search for page=2, limit=1 (should get the other assignment)
 * 7. (Optionally) Search with an extreme page number (e.g. page=3, limit=1) —
 *    expect empty result, correct pagination
 */
export async function test_api_aimall_backend_test_search_channel_assignments_with_pagination_as_seller(
  connection: api.IConnection,
) {
  // 1. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(2),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create two channels
  const channelA =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.paragraph()(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channelA);
  const channelB =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.paragraph()(),
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channelB);

  // 3. Create a product for the seller (with random category)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Assign product to both channels
  const assignmentA =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channelA.id,
          assigned_at: new Date().toISOString(),
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignmentA);
  const assignmentB =
    await api.functional.aimall_backend.seller.products.channelAssignments.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          channel_id: channelB.id,
          assigned_at: new Date().toISOString(),
        } satisfies IAimallBackendChannelAssignment.ICreate,
      },
    );
  typia.assert(assignmentB);

  // 5. Search for assignments page=1, limit=1
  const page1 =
    await api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination.current")(page1.pagination.current)(1);
  TestValidator.equals("pagination.limit")(page1.pagination.limit)(1);
  TestValidator.equals("pagination.records")(page1.pagination.records)(2);
  TestValidator.equals("pagination.pages")(page1.pagination.pages)(2);
  TestValidator.equals("assignments count")(page1.data.length)(1);
  // Result must contain either assignmentA or assignmentB
  TestValidator.predicate("assignment is valid")(
    page1.data[0].id === assignmentA.id || page1.data[0].id === assignmentB.id,
  );

  // 6. Search for assignments page=2, limit=1
  const page2 =
    await api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 1,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("pagination.current")(page2.pagination.current)(2);
  TestValidator.equals("pagination.limit")(page2.pagination.limit)(1);
  TestValidator.equals("pagination.records")(page2.pagination.records)(2);
  TestValidator.equals("pagination.pages")(page2.pagination.pages)(2);
  TestValidator.equals("assignments count")(page2.data.length)(1);
  // The assignment on the second page must be the other one
  TestValidator.notEquals("page2 assignment not same as page1")(
    page2.data[0].id,
  )(page1.data[0].id);
  TestValidator.predicate("assignment is valid")(
    page2.data[0].id === assignmentA.id || page2.data[0].id === assignmentB.id,
  );

  // 7. Search with out-of-bounds page (page=3)
  const page3 =
    await api.functional.aimall_backend.seller.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 3,
          limit: 1,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("pagination.current")(page3.pagination.current)(3);
  TestValidator.equals("pagination.pages")(page3.pagination.pages)(2);
  TestValidator.equals("no assignments on page 3")(page3.data.length)(0);
}
