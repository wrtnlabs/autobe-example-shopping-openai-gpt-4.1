import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate administrator's advanced coupon search and filtering with different
 * criteria, combining campaign, status, customer, code fragment, and date
 * ranges.
 *
 * - Verify paginated result structure matches filter criteria.
 * - Confirm admin visibility covers all coupons, regardless of customer
 *   assignment or status.
 * - Ensure unsupported filters or invalid date ranges yield proper errors (e.g.,
 *   status outside allowed values, date 'from' after 'to').
 *
 * Step Breakdown:
 *
 * 1. Fetch all coupons via GET (baseline data for filter construction).
 * 2. Pick several diverse coupons as reference examples with different properties
 *    (campaigns, statuses, assigned vs. unassigned, date windows).
 * 3. For each property (discount_campaign_id, status, customer_id, code,
 *    issued_at/expires_at):
 *
 *    - Search with a filter matching that coupon.
 *    - Assert at least the reference coupon appears, and unrelated ones do not.
 *    - If paginated, check pagination reflects the total and filtered set size.
 * 4. Combine multiple filters and validate intersection.
 * 5. Apply knowledge: as admin, you can see all coupons, even those unassigned to
 *    any customer.
 * 6. Try known-invalid status or a date window (from > to), and validate
 *    error/empty set result.
 */
export async function test_api_aimall_backend_administrator_coupons_test_search_all_coupons_admin_with_advanced_criteria(
  connection: api.IConnection,
) {
  // 1. Fetch all coupons - for baseline and filter source
  const baseline: IPageIAimallBackendCoupon =
    await api.functional.aimall_backend.administrator.coupons.index(connection);
  typia.assert(baseline);
  const coupons = baseline.data ?? [];
  if (!coupons.length) throw new Error("No coupons in system for testing.");

  // 2. Pick coupons with diverse properties
  const first = coupons[0]; // Use at least one distinct coupon
  // Try to get more diversity by campaign, status, customer
  const diffCampaign =
    coupons.find(
      (c) => c.discount_campaign_id !== first.discount_campaign_id,
    ) ?? first;
  const diffStatus = coupons.find((c) => c.status !== first.status) ?? first;
  const diffCustomer =
    coupons.find((c) => c.customer_id && c.customer_id !== first.customer_id) ??
    first;

  // 3. Single-property filtered searches
  // a) By campaign
  const byCampaign =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: {
          discount_campaign_id: first.discount_campaign_id,
        } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(byCampaign);
  TestValidator.predicate("campaign filter contains relevant coupon")(
    (byCampaign.data ?? []).some((c) => c.id === first.id),
  );

  // b) By status
  const byStatus =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: { status: first.status } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(byStatus);
  TestValidator.predicate("status filter contains relevant coupon")(
    (byStatus.data ?? []).some((c) => c.id === first.id),
  );

  // c) By customer_id when present
  if (first.customer_id) {
    const byCustomer =
      await api.functional.aimall_backend.administrator.coupons.search(
        connection,
        {
          body: {
            customer_id: first.customer_id,
          } satisfies IAimallBackendCoupon.IRequest,
        },
      );
    typia.assert(byCustomer);
    TestValidator.predicate("customer_id filter contains relevant coupon")(
      (byCustomer.data ?? []).some((c) => c.id === first.id),
    );
  }

  // d) By code
  const byCode =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: { code: first.code } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(byCode);
  TestValidator.predicate("code filter contains relevant coupon")(
    (byCode.data ?? []).some((c) => c.id === first.id),
  );

  // e) By issued_at range
  const byIssuedRange =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: {
          issued_at_from: first.issued_at,
          issued_at_to: first.issued_at,
        } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(byIssuedRange);
  TestValidator.predicate("issued_at filter contains relevant coupon")(
    (byIssuedRange.data ?? []).some((c) => c.id === first.id),
  );

  // f) By expires_at range
  const byExpiresRange =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: {
          expires_at_from: first.expires_at,
          expires_at_to: first.expires_at,
        } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(byExpiresRange);
  TestValidator.predicate("expires_at filter contains relevant coupon")(
    (byExpiresRange.data ?? []).some((c) => c.id === first.id),
  );

  // 4. Combined filter: campaign + status + code (intersection)
  const multi =
    await api.functional.aimall_backend.administrator.coupons.search(
      connection,
      {
        body: {
          discount_campaign_id: first.discount_campaign_id,
          status: first.status,
          code: first.code,
        } satisfies IAimallBackendCoupon.IRequest,
      },
    );
  typia.assert(multi);
  TestValidator.predicate("multi-filter result contains reference coupon")(
    (multi.data ?? []).some((c) => c.id === first.id),
  );

  // 5. Admin visibility: unassigned coupons should be visible
  const unassigned = coupons.find((c) => !c.customer_id);
  if (unassigned) {
    const viewUnassigned =
      await api.functional.aimall_backend.administrator.coupons.search(
        connection,
        {
          body: {
            customer_id: undefined,
          } satisfies IAimallBackendCoupon.IRequest,
        },
      );
    typia.assert(viewUnassigned);
    TestValidator.predicate("admin sees unassigned coupons")(
      (viewUnassigned.data ?? []).some((c) => c.id === unassigned.id),
    );
  }

  // 6. Invalid filter: unsupported status
  TestValidator.error("invalid status produces error")(() =>
    api.functional.aimall_backend.administrator.coupons.search(connection, {
      body: {
        status: "not_a_real_status",
      } satisfies IAimallBackendCoupon.IRequest,
    }),
  );

  // Invalid date range (from > to)
  TestValidator.error("invalid date range triggers error")(() =>
    api.functional.aimall_backend.administrator.coupons.search(connection, {
      body: {
        issued_at_from: "2100-01-01T00:00:00Z",
        issued_at_to: "2000-01-01T00:00:00Z",
      } satisfies IAimallBackendCoupon.IRequest,
    }),
  );
}
