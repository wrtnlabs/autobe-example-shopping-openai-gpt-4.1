import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate admin seller search and list with section-filter and role
 * enforcement.
 *
 * This test covers the advanced paginated search API for sellers accessible
 * only by administrators. It ensures:
 *
 * - Only authenticated admins can access (negative: unauthenticated fails)
 * - Sellers are filterable by profile_name, status, KYC, and section
 * - Paginated results structure and business metadata are correct (section id,
 *   kyc, audit fields)
 *
 * Steps:
 *
 * 1. Register an admin and authenticate
 * 2. Create a channel (admin)
 * 3. Create a section in that channel (admin)
 * 4. Precondition: set up (simulate or hint) a seller in that section (exact
 *    seller creation API is not exposed in provided APIs, so context is created
 *    for search)
 * 5. Search sellers with section id filter by paging as the admin
 * 6. Validate the response structure: correct pagination, section linkage,
 *    kyc_status/audit fields on all records
 * 7. Validate search by profile_name, status, and kyc_status produces
 *    business-logically filtered results
 * 8. Attempt the same search with unauthenticated connection and validate access
 *    denied
 */
export async function test_api_seller_admin_search_and_list_with_section_filter(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // ---
  // 4. No direct seller creation API, so we can only search (assume factory exists in database)
  // ---

  // 5. Search sellers by section id, with page/limit
  // NOTE: We expect sellers (if any exist). Business logic is to check structure and filtering.
  const requestBySection = {
    shopping_mall_section_id: section.id,
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  };
  const resultBySection = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    { body: requestBySection },
  );
  typia.assert(resultBySection);
  TestValidator.equals(
    "result page info exists",
    typeof resultBySection.pagination,
    "object",
  );
  TestValidator.predicate(
    "seller search results array",
    Array.isArray(resultBySection.data),
  );
  // Check all sellers in results link to correct section (if present)
  for (const seller of resultBySection.data) {
    typia.assert(seller);
    TestValidator.equals(
      "seller has correct section id",
      seller.shopping_mall_section_id,
      section.id,
    );
    TestValidator.predicate(
      "seller has kyc status",
      typeof seller.kyc_status === "string" && seller.kyc_status.length > 0,
    );
    TestValidator.predicate(
      "seller has audit metadata (created_at, updated_at)",
      !!seller.created_at && !!seller.updated_at,
    );
  }

  // 6. Attempt more advanced filtering: profile_name substring, status, kyc_status
  // (simulate by using values found in prior search result, if available)
  if (resultBySection.data.length > 0) {
    const target = resultBySection.data[0];
    const profileNameFilter = target.profile_name.substring(
      0,
      Math.max(3, Math.floor(target.profile_name.length / 2)),
    );
    const statusFilter = target.status;
    const kycStatusFilter = target.kyc_status;

    const filteredReq = {
      profile_name: profileNameFilter,
      status: statusFilter,
      kyc_status: kycStatusFilter,
      shopping_mall_section_id: section.id,
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    };
    const filteredResult =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: filteredReq,
      });
    typia.assert(filteredResult);
    for (const seller of filteredResult.data) {
      typia.assert(seller);
      TestValidator.predicate(
        "seller profile name contains filter",
        seller.profile_name.includes(profileNameFilter),
      );
      TestValidator.equals(
        "seller status matches filter",
        seller.status,
        statusFilter,
      );
      TestValidator.equals(
        "seller kyc_status matches filter",
        seller.kyc_status,
        kycStatusFilter,
      );
    }
  }

  // 7. Negative test: try as unauthenticated (remove auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("denied for unauthenticated user", async () => {
    await api.functional.shoppingMall.admin.sellers.index(unauthConn, {
      body: requestBySection,
    });
  });
}
