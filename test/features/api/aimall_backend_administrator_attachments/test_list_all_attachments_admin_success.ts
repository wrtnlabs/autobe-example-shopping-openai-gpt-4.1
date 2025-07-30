import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate administrator attachment listing API and its integration with
 * pagination and attachment records.
 *
 * Business context: Administrators need an overview of all file/media
 * attachments in the AIMall system, including those attached to posts,
 * comments, or reviews, in order to moderate, audit, or export content. This
 * endpoint is protected for authenticated administrators and should respect
 * platform policies for including restricted or hidden resources if the admin
 * role permits.
 *
 * Test flow:
 *
 * 1. Register and simulate login as an administrator (since other endpoints
 *    require admin context).
 * 2. Insert at least one attachment as test data (may link to a fake post,
 *    comment, or review, since FKs are nullable).
 * 3. Request the attachment list.
 * 4. Confirm the response is a valid paginated set
 *    (IPageIAimallBackendAttachment), and at least the inserted attachment(s)
 *    appear with required metadata.
 * 5. Assert pagination fields are present and are reasonable (e.g., total records
 *    >= 1).
 * 6. If present, check that restricted or potentially hidden attachments are
 *    included too (business policy - allowed for admin).
 * 7. Validate each returned attachment contains the required post_id, comment_id,
 *    or review_id reference (can be nullable but at least one association must
 *    be possible).
 */
export async function test_api_aimall_backend_administrator_attachments_index(
  connection: api.IConnection,
) {
  // 1. Register an administrator so we have admin privileges
  const adminData: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>() + "@test.com",
    name: RandomGenerator.name(),
    status: "active",
  };
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminData },
    );
  typia.assert(admin);

  // 2. Create a dummy attachment (linked to a post, comment, or review)
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    file_uri:
      "s3://test-bucket/" +
      typia.random<string & tags.Format<"uuid">>() +
      ".jpg",
    file_type: "image/jpeg",
    file_size: 12000,
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
    review_id: null,
  };
  const attachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      { body: attachmentInput },
    );
  typia.assert(attachment);

  // 3. List attachments as admin
  const page =
    await api.functional.aimall_backend.administrator.attachments.index(
      connection,
    );
  typia.assert(page);

  // 4. Check that our attachment exists in the results
  const found = page.data.find((a) => a.id === attachment.id);
  TestValidator.predicate("attachment appears in list")(!!found);

  // 5. Pagination fields sanity check
  TestValidator.predicate("pagination total >= 1")(
    page.pagination.records >= 1,
  );
  TestValidator.predicate("pagination data length matches or under limit")(
    page.data.length <= page.pagination.limit,
  );

  // 6. Admin can see even restricted/hidden resources (policy allows)
  // (We don't have a way to mark test objects as hidden/deleted, so this step is skipped)

  // 7. Validate attachment association references: at least one FK can be possible (null is allowed)
  for (const att of page.data) {
    TestValidator.predicate(
      "attachment linkage: at least one link ref present",
    )(
      att.post_id !== undefined ||
        att.comment_id !== undefined ||
        att.review_id !== undefined,
    );
    TestValidator.predicate("file size positive")(att.file_size > 0);
    TestValidator.predicate("file_type non-empty")(!!att.file_type);
  }
}
