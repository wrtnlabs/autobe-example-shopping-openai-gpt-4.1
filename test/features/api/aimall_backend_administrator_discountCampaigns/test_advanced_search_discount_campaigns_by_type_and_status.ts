import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IPageIAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendDiscountCampaign";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search functionality for discount campaigns by type and
 * status, including correct pagination and response filtering.
 *
 * Business context: Administrators require accurate filtering and search
 * results to efficiently manage a large and heterogenous set of discount
 * campaigns. Importantly, they must be able to filter by campaign "type"
 * ('order', 'product', etc) and lifecycle "status" ('active', 'inactive',
 * 'ended'), with robust support for pagination as the dataset scales. This
 * function checks both that expected records are included with correct filters,
 * and that extraneous (non-matching) records are never returned.
 *
 * Test Steps:
 *
 * 1. Create several campaigns covering all combinations of (type, status): for
 *    example, at least one 'order/active', one 'product/inactive', one with
 *    'status' = 'ended', and so forth.
 * 2. For each filter permutation (e.g., type='order', status='active'), issue a
 *    search request and confirm that only campaigns matching these criteria are
 *    present in the response, and that no unexpected campaigns are included.
 * 3. Confirm pagination works (e.g. limit=1, navigate through each page and verify
 *    campaigns match filters and total counts are correct)
 * 4. For negative scenarios, search with a type or status that does not match any
 *    existing campaigns and validate the response is empty
 * 5. Try invalid/edge filter values (e.g. unused type/status) and confirm no
 *    extraneous data is returned
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_advanced_search_discount_campaigns_by_type_and_status(
  connection: api.IConnection,
) {
  // 1. Create campaigns covering combinations of type and status
  const combinations = [
    { type: "order", status: "active" },
    { type: "order", status: "inactive" },
    { type: "order", status: "ended" },
    { type: "product", status: "active" },
    { type: "product", status: "inactive" },
    { type: "product", status: "ended" },
  ];
  const created: IAimallBackendDiscountCampaign[] = [];
  for (const combo of combinations) {
    const campaign =
      await api.functional.aimall_backend.administrator.discountCampaigns.create(
        connection,
        {
          body: {
            name: `Test ${combo.type} ${combo.status} ${RandomGenerator.alphabets(6)}`,
            code: `TEST${combo.type.toUpperCase()}${combo.status.toUpperCase()}${RandomGenerator.alphaNumeric(6)}`,
            type: combo.type,
            status: combo.status,
            stackable: false,
            start_at: new Date(Date.now()).toISOString(),
            end_at: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
            priority: typia.random<number & tags.Type<"int32">>(),
            description: `Test campaign for ${combo.type}/${combo.status}`,
          } satisfies IAimallBackendDiscountCampaign.ICreate,
        },
      );
    typia.assert(campaign);
    created.push(campaign);
  }

  // 2. Test all combinations with search API
  for (const combo of combinations) {
    const output =
      await api.functional.aimall_backend.administrator.discountCampaigns.search(
        connection,
        {
          body: {
            type: combo.type,
            status: combo.status,
          } satisfies IAimallBackendDiscountCampaign.IRequest,
        },
      );
    typia.assert(output);
    // All returned campaigns must match requested type/status
    for (const campaign of output.data) {
      TestValidator.equals("type matches")(campaign.type)(combo.type);
      TestValidator.equals("status matches")(campaign.status)(combo.status);
    }
    // At least one expected
    TestValidator.predicate("at least 1 result")(output.data.length >= 1);
  }

  // 3. Test pagination with limit=1
  const pagedType = "order";
  const pagedStatus = "active";
  const page1 =
    await api.functional.aimall_backend.administrator.discountCampaigns.search(
      connection,
      {
        body: {
          type: pagedType,
          status: pagedStatus,
          limit: 1,
        } satisfies IAimallBackendDiscountCampaign.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("pagination limit")(page1.pagination.limit)(1);
  TestValidator.equals("pagination current")(page1.pagination.current)(1);
  TestValidator.predicate("has data")(page1.data.length === 1);

  // If there is a second page, fetch and confirm again
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.aimall_backend.administrator.discountCampaigns.search(
        connection,
        {
          body: {
            type: pagedType,
            status: pagedStatus,
            limit: 1,
            page: 2,
          } satisfies IAimallBackendDiscountCampaign.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("pagination limit")(page2.pagination.limit)(1);
    TestValidator.equals("pagination current")(page2.pagination.current)(2);
    for (const campaign of page2.data) {
      TestValidator.equals("type matches")(campaign.type)(pagedType);
      TestValidator.equals("status matches")(campaign.status)(pagedStatus);
    }
  }

  // 4. Search with non-matching type/status (no campaign should be returned)
  const noneType = "nonexistent_type";
  const noneStatus = "nonexistent_status";
  const outputNone =
    await api.functional.aimall_backend.administrator.discountCampaigns.search(
      connection,
      {
        body: {
          type: noneType,
        } satisfies IAimallBackendDiscountCampaign.IRequest,
      },
    );
  typia.assert(outputNone);
  TestValidator.equals("no result for fictitious type")(outputNone.data.length)(
    0,
  );

  const outputNone2 =
    await api.functional.aimall_backend.administrator.discountCampaigns.search(
      connection,
      {
        body: {
          status: noneStatus,
        } satisfies IAimallBackendDiscountCampaign.IRequest,
      },
    );
  typia.assert(outputNone2);
  TestValidator.equals("no result for fictitious status")(
    outputNone2.data.length,
  )(0);

  // 5. Search with both fictitious type and status
  const outputNone3 =
    await api.functional.aimall_backend.administrator.discountCampaigns.search(
      connection,
      {
        body: {
          type: noneType,
          status: noneStatus,
        } satisfies IAimallBackendDiscountCampaign.IRequest,
      },
    );
  typia.assert(outputNone3);
  TestValidator.equals("no result for fictitious type+status")(
    outputNone3.data.length,
  )(0);
}
