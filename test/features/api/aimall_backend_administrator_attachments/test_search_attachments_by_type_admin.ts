import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Verify that an administrator can search for attachments by file
 * type.
 *
 * This test confirms that:
 *
 * - The admin can filter attachments by file_type (e.g., images only)
 * - The response includes only records matching the queried type and omits others
 * - Pagination fields are correct and consistent
 * - Result set contains correct and complete data
 *
 * Steps:
 *
 * 1. Register an administrator as a dependency for permissions
 * 2. Insert at least two distinct attachments (different file_type: e.g., image
 *    and document)
 * 3. Search for attachments by file_type=image/png
 * 4. Validate: all returned records have file_type=image/png and omit others
 * 5. Confirm the expected image is present and unrelated doc is absent in results
 * 6. Check pagination returns correct page, size, and result boundaries
 */
export async function test_api_aimall_backend_administrator_attachments_test_search_attachments_by_type_admin(
  connection: api.IConnection,
) {
  // 1. Register an administrator
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(admin);

  // 2. Insert two attachments: image and document
  const imageType = "image/png";
  const documentType = "application/pdf";
  const imageAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: null,
          review_id: null,
          file_uri: "s3://bucket/test-image.png",
          file_type: imageType,
          file_size: 123456,
        },
      },
    );
  typia.assert(imageAttachment);

  const docAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: null,
          comment_id: null,
          review_id: null,
          file_uri: "s3://bucket/test-doc.pdf",
          file_type: documentType,
          file_size: 654321,
        },
      },
    );
  typia.assert(docAttachment);

  // 3. Admin searches for attachments by file_type=image/png
  const searchResult =
    await api.functional.aimall_backend.administrator.attachments.search(
      connection,
      {
        body: {
          file_type: imageType,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(searchResult);

  // 4. Verify all results have correct type, no unrelated docs
  TestValidator.predicate("all files are images")(
    searchResult.data.every((att) => att.file_type === imageType),
  );
  TestValidator.predicate("no documents returned")(
    !searchResult.data.some((att) => att.file_type === documentType),
  );

  // 5. Confirm searched-for image included, unrelated doc excluded
  TestValidator.predicate("expected image in result")(
    searchResult.data.some((att) => att.id === imageAttachment.id),
  );
  TestValidator.predicate("expected doc absent")(
    !searchResult.data.some((att) => att.id === docAttachment.id),
  );

  // 6. Check page/pagination correctness
  TestValidator.equals("current page")(searchResult.pagination.current)(1);
  TestValidator.equals("limit (page size)")(searchResult.pagination.limit)(10);
}
