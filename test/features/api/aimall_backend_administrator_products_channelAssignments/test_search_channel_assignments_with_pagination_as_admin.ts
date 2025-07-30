import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannelAssignment";
import type { IPageIAimallBackendChannelAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannelAssignment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching and paginating channel assignments for a product (Admin)
 *
 * Validates the end-to-end workflow for an administrator searching channel
 * assignments with pagination for a given product:
 *
 * 1. Create a product (setup)
 * 2. Create several channels (setup)
 * 3. Assign the product to multiple channels
 * 4. Use the search endpoint with pagination to list channel assignments
 * 5. Check that pagination metadata and data match the expected assignments
 */
export async function test_api_aimall_backend_administrator_products_channelAssignments_test_search_channel_assignments_with_pagination_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a product (with valid references)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create several channels
  const channels = await ArrayUtil.asyncRepeat(5)(async () => {
    const channel =
      await api.functional.aimall_backend.administrator.channels.create(
        connection,
        {
          body: {
            code: RandomGenerator.alphaNumeric(6),
            name: RandomGenerator.name(),
            enabled: true,
          } satisfies IAimallBackendChannel.ICreate,
        },
      );
    typia.assert(channel);
    return channel;
  });

  // 3. Assign product to ALL channels
  const assignments: IAimallBackendChannelAssignment[] = [];
  for (const channel of channels) {
    const assignment =
      await api.functional.aimall_backend.administrator.products.channelAssignments.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            channel_id: channel.id,
            assigned_at: new Date().toISOString(),
          } satisfies IAimallBackendChannelAssignment.ICreate,
        },
      );
    typia.assert(assignment);
    assignments.push(assignment);
  }

  // 4. Search channel assignments with pagination (page 1, limit 2)
  const searchPage1 =
    await api.functional.aimall_backend.administrator.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(searchPage1);
  TestValidator.equals("pagination current page")(
    searchPage1.pagination.current,
  )(1);
  TestValidator.equals("pagination limit")(searchPage1.pagination.limit)(2);
  TestValidator.equals("data length")(searchPage1.data.length)(2);
  TestValidator.equals("total records")(searchPage1.pagination.records)(
    assignments.length,
  );
  TestValidator.predicate("result data matches assignments")(
    assignments.some((a) => searchPage1.data.some((d) => d.id === a.id)),
  );

  // 5. Search next page (page 2, limit 2)
  const searchPage2 =
    await api.functional.aimall_backend.administrator.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(searchPage2);
  TestValidator.equals("pagination current page")(
    searchPage2.pagination.current,
  )(2);
  TestValidator.equals("pagination limit")(searchPage2.pagination.limit)(2);
  TestValidator.equals("data length, page 2")(searchPage2.data.length)(2);
  TestValidator.equals("total records")(searchPage2.pagination.records)(
    assignments.length,
  );

  // 6. Search with a limit larger than assignments
  const searchAll =
    await api.functional.aimall_backend.administrator.products.channelAssignments.search(
      connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IAimallBackendChannelAssignment.IRequest,
      },
    );
  typia.assert(searchAll);
  TestValidator.equals("pagination current page")(searchAll.pagination.current)(
    1,
  );
  TestValidator.equals("pagination limit")(searchAll.pagination.limit)(10);
  TestValidator.equals("data length, all assignments")(searchAll.data.length)(
    assignments.length,
  );
  TestValidator.equals("total records")(searchAll.pagination.records)(
    assignments.length,
  );
  // Ensure all assignment ids are present
  const assignmentIds = assignments.map((a) => a.id);
  TestValidator.predicate("all created assignments found")(
    searchAll.data.every((d) => assignmentIds.includes(d.id)),
  );
}
