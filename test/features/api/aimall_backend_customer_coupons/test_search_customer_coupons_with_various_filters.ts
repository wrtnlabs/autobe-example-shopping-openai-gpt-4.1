import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test searching customer coupons with various advanced filters and access
 * constraints.
 *
 * 1. Retrieve the current list of coupons for the authenticated customer (setup
 *    base dataset).
 * 2. Attempt search with no filter (should match the same data as index call).
 * 3. Search by exact coupon code and check for correct result (should find 0 or 1
 *    records).
 * 4. Search by a status value present among the user's coupons (e.g., 'issued',
 *    'redeemed', or 'expired'); validate all results have the same status and
 *    are assigned to customer.
 * 5. Search by a coupon's campaign association (discount_campaign_id) and check
 *    that only related coupons are returned (and only those belonging to the
 *    customer).
 * 6. Search using issuance date range that includes some coupons; verify that only
 *    matching coupons in range are returned.
 * 7. Search using expiry date range that excludes all coupons; expect 0 results.
 * 8. Attempt searching coupons using another (random) customer's ID - ensure no
 *    coupons are returned or access denied (test protection against
 *    unauthorized access).
 */
export async function test_api_aimall_backend_customer_coupons_test_search_customer_coupons_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Retrieve base coupon dataset
  const base: IPageIAimallBackendCoupon =
    await api.functional.aimall_backend.customer.coupons.index(connection);
  typia.assert(base);
  const coupons = base.data ?? [];
  const customerIds = [
    ...new Set(coupons.map((c) => c.customer_id).filter(Boolean)),
  ];

  // 2. Search no filter (should match index)
  const noFilter: IPageIAimallBackendCoupon =
    await api.functional.aimall_backend.customer.coupons.search(connection, {
      body: {} satisfies IAimallBackendCoupon.IRequest,
    });
  typia.assert(noFilter);
  TestValidator.equals("all coupons with no filter")(
    noFilter.data?.length ?? 0,
  )(coupons.length);

  // 3. Search by exact coupon code (if any)
  if (coupons.length > 0) {
    const sampleCoupon = coupons[0];
    const resByCode: IPageIAimallBackendCoupon =
      await api.functional.aimall_backend.customer.coupons.search(connection, {
        body: {
          code: sampleCoupon.code,
        } satisfies IAimallBackendCoupon.IRequest,
      });
    typia.assert(resByCode);
    if ((resByCode.data?.length ?? 0) > 0) {
      TestValidator.predicate("all results match code")(
        !!resByCode.data &&
          resByCode.data.every(
            (c) =>
              c.code === sampleCoupon.code &&
              c.customer_id === sampleCoupon.customer_id,
          ),
      );
    }
  }

  // 4. Search by a status value among coupons
  const statuses = [...new Set(coupons.map((c) => c.status))];
  if (statuses.length > 0) {
    const sampleStatus = statuses[0];
    const resByStatus: IPageIAimallBackendCoupon =
      await api.functional.aimall_backend.customer.coupons.search(connection, {
        body: { status: sampleStatus } satisfies IAimallBackendCoupon.IRequest,
      });
    typia.assert(resByStatus);
    if ((resByStatus.data?.length ?? 0) > 0) {
      TestValidator.predicate("all results match status")(
        !!resByStatus.data &&
          resByStatus.data.every((c) => c.status === sampleStatus),
      );
      TestValidator.predicate("all belong to customer")(
        !!resByStatus.data &&
          resByStatus.data.every((c) => customerIds.includes(c.customer_id!)),
      );
    }
  }

  // 5. Search by campaign association (discount_campaign_id)
  const campaignIds = [...new Set(coupons.map((c) => c.discount_campaign_id))];
  if (campaignIds.length > 0) {
    const campaignId = campaignIds[0];
    const resByCampaign: IPageIAimallBackendCoupon =
      await api.functional.aimall_backend.customer.coupons.search(connection, {
        body: {
          discount_campaign_id: campaignId,
        } satisfies IAimallBackendCoupon.IRequest,
      });
    typia.assert(resByCampaign);
    if ((resByCampaign.data?.length ?? 0) > 0) {
      TestValidator.predicate("all results belong to campaign")(
        !!resByCampaign.data &&
          resByCampaign.data.every(
            (c) => c.discount_campaign_id === campaignId,
          ),
      );
      TestValidator.predicate("all belong to customer")(
        !!resByCampaign.data &&
          resByCampaign.data.every((c) => customerIds.includes(c.customer_id!)),
      );
    }
  }

  // 6. Search by issuance date range (issued_at)
  if (coupons.length > 0) {
    const sorted = [...coupons].sort(
      (a, b) =>
        new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime(),
    );
    const start = sorted[0].issued_at;
    const end = sorted[sorted.length - 1].issued_at;
    const resByIssueRange: IPageIAimallBackendCoupon =
      await api.functional.aimall_backend.customer.coupons.search(connection, {
        body: {
          issued_at_from: start,
          issued_at_to: end,
        } satisfies IAimallBackendCoupon.IRequest,
      });
    typia.assert(resByIssueRange);
    if ((resByIssueRange.data?.length ?? 0) > 0) {
      TestValidator.predicate("results within date range")(
        !!resByIssueRange.data &&
          resByIssueRange.data.every(
            (c) => c.issued_at >= start && c.issued_at <= end,
          ),
      );
    }
  }

  // 7. Search by expiry date range that excludes all coupons (future only)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const resByExpiryRange: IPageIAimallBackendCoupon =
    await api.functional.aimall_backend.customer.coupons.search(connection, {
      body: {
        expires_at_from: futureDate,
        expires_at_to: futureDate,
      } satisfies IAimallBackendCoupon.IRequest,
    });
  typia.assert(resByExpiryRange);
  TestValidator.equals("no coupons in future expiry range")(
    resByExpiryRange.data?.length ?? 0,
  )(0);

  // 8. Attempt unauthorized access using a different customer ID
  const bogusCustomerId = typia.random<string & tags.Format<"uuid">>();
  const resByOtherCustomer: IPageIAimallBackendCoupon =
    await api.functional.aimall_backend.customer.coupons.search(connection, {
      body: {
        customer_id: bogusCustomerId,
      } satisfies IAimallBackendCoupon.IRequest,
    });
  typia.assert(resByOtherCustomer);
  TestValidator.equals("no unauthorized coupons returned")(
    resByOtherCustomer.data?.length ?? 0,
  )(0);
}
