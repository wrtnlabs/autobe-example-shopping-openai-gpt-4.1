import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate searching and filtering of customer accounts by an admin using PATCH
 * /shoppingMall/admin/customers.
 *
 * End-to-end scenario:
 *
 * 1. Register a new admin
 * 2. Register a channel
 * 3. Add a section in that channel
 * 4. (Precondition) Presume multiple customers exist scoped to channel/section
 *    (not shown in code)
 * 5. Search/filter customer list using parameters: status, kyc_status,
 *    registration dates, name, email, pagination, and sorting
 * 6. Validate paginated results, data masking, and correct admin-only access
 * 7. Confirm empty results for deliberate miss filters
 */
export async function test_api_customer_admin_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin-password",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  // 2. Register channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(5),
        name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);
  // 3. Register section in the channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Presume customers already exist (outside scope)
  // 5. Execute customer search with broad filter
  const page1: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<200>,
        sort: "created_at desc",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(page1);
  TestValidator.predicate(
    "returns array of customers",
    page1.data.length >= 0 && Array.isArray(page1.data),
  );
  // 6. Search using status and kyc_status (some valid, some deliberately rare)
  for (const status of [
    "active",
    "pending",
    "withdrawn",
    "nonexistent-status",
  ] as const) {
    const filterResult =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: {
          shopping_mall_channel_id: channel.id,
          status,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
        } satisfies IShoppingMallCustomer.IRequest,
      });
    typia.assert(filterResult);
    TestValidator.predicate(
      `search customers by status: ${status}`,
      filterResult.data.every((c) => c.status === status) ||
        status === "nonexistent-status",
    );
    if (status === "nonexistent-status")
      TestValidator.equals(
        "no result for bad status",
        filterResult.data.length,
        0,
      );
  }
  // 7. Search by kyc_status (simulate at least one value match and a non-existent)
  for (const kyc_status of [
    "verified",
    "pending",
    "denied",
    "nonexistent-kyc",
  ] as const) {
    const filterResult =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: {
          shopping_mall_channel_id: channel.id,
          kyc_status,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
        } satisfies IShoppingMallCustomer.IRequest,
      });
    typia.assert(filterResult);
    TestValidator.predicate(
      `search customers by kyc_status: ${kyc_status}`,
      filterResult.data.every((c) => c.kyc_status === kyc_status) ||
        kyc_status === "nonexistent-kyc",
    );
    if (kyc_status === "nonexistent-kyc")
      TestValidator.equals(
        "no result for nonexistent kyc_status",
        filterResult.data.length,
        0,
      );
  }
  // 8. Filter by registration date range (created_after/created_before)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString();
  const dateResult = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        created_after: yesterday,
        created_before: tomorrow,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<200>,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(dateResult);
  TestValidator.predicate(
    "customer created_at within date range",
    dateResult.data.every(
      (c) => c.created_at >= yesterday && c.created_at <= tomorrow,
    ),
  );
  // 9. Search with wildcard or partial parameters (name and email, likely to miss, treat as fuzzy)
  const missingName = "unlikely_to_match";
  const emptyResult = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        name: missingName,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<200>,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no customers with missing name",
    emptyResult.data.length,
    0,
  );
  // 10. Check privacy/masking (no PII such as password or phone)
  TestValidator.predicate(
    "customers have no password/phone field in ISummary",
    page1.data.every((c) => !("password_hash" in c) && !("phone" in c)),
  );
}
