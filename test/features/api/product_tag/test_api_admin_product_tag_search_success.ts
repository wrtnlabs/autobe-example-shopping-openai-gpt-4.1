import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductTag";
import type { IPageIShoppingMallAiBackendProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_tag_search_success(
  connection: api.IConnection,
) {
  /**
   * Test successful product tag list retrieval by admin, with filtering &
   * pagination.
   *
   * 1. Register a new admin with unique username & email
   * 2. Create several product tags with a predictable common substring in tag_name
   * 3. Query the list with a filter (substring match, limit=3 for pagination)
   * 4. Validate: all returned tags contain the substring, are not soft deleted,
   *    pagination metadata is correct, and returned tags are from the created
   *    set
   */

  // 1. Admin registration for authentication
  const uniqueSeed = RandomGenerator.alphaNumeric(10);
  const adminRes = await api.functional.auth.admin.join(connection, {
    body: {
      username: "testadmin_" + uniqueSeed,
      password_hash: RandomGenerator.alphaNumeric(24),
      name: "Admin " + RandomGenerator.name(1),
      email: `${uniqueSeed}@example.com`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRes);

  // 2. Bulk product tag creation: each tag_name contains 'FilterX' for test filtering
  const commonSubstr = "FilterX";
  const tagsToCreate = ArrayUtil.repeat(7, (i) => ({
    tag_name: `${commonSubstr}_Tag_${i + 1}_${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 7 })}`,
    tag_code: `CODE${uniqueSeed}_${i + 1}`,
  }));
  const createdTags: IShoppingMallAiBackendProductTag[] = [];
  for (const input of tagsToCreate) {
    const tag =
      await api.functional.shoppingMallAiBackend.admin.productTags.create(
        connection,
        { body: input },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }

  // 3. Soft-delete simulation skipped (no SDK support).

  // 4. Search for tags with substring matching, set limit=3 for paginated result
  const resp =
    await api.functional.shoppingMallAiBackend.admin.productTags.index(
      connection,
      {
        body: {
          tag_name: commonSubstr, // substring match filter
          deleted: false, // Only non-deleted
          limit: 3,
          page: 1,
          order_by: "created_at",
          sort: "asc",
        } satisfies IShoppingMallAiBackendProductTag.IRequest,
      },
    );
  typia.assert(resp);

  // 5. Assert all returned tags match substring and are not soft-deleted, pagination is correct
  TestValidator.predicate(
    "all listed tags contain filter term and are active",
    resp.data.every(
      (tag) =>
        tag.tag_name.includes(commonSubstr) &&
        (tag.deleted_at === null || tag.deleted_at === undefined),
    ),
  );
  TestValidator.predicate("length should be <= limit", resp.data.length <= 3);
  TestValidator.equals(
    "pagination.current is first page",
    resp.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit matches request",
    resp.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "no tag is soft-deleted",
    resp.data.every(
      (tag) => tag.deleted_at === null || tag.deleted_at === undefined,
    ),
  );
  // Confirm all returned tags were among those created (by tag_code)
  const createdCodes = createdTags.map((t) => t.tag_code);
  TestValidator.predicate(
    "all returned tags were created in this test",
    resp.data.every((tag) => createdCodes.includes(tag.tag_code)),
  );
}
