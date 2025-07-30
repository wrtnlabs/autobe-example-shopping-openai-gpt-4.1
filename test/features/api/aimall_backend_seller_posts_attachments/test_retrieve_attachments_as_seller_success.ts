import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Seller can retrieve all attachments for their own post and see correct
 * metadata.
 *
 * Business scenario:
 *
 * - Seller creates a new community post.
 * - Seller uploads attachments (images/files) to their post.
 * - Seller fetches the list of attachments for the post and should see all files
 *   they added, with correct metadata.
 *
 * This verifies:
 *
 * 1. Seller can create post and upload attachments
 * 2. Seller can successfully get all of their own post attachments
 * 3. All upload metadata (file_uri, file_type, file_size, timestamps, etc) is
 *    present and matches
 * 4. The response contains ONLY attachments for this post (no data leakage)
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_retrieve_attachments_as_seller_success(
  connection: api.IConnection,
) {
  // 1. Seller creates a new post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()()(30),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Seller uploads multiple attachments to the new post
  const attachmentsToCreate = ArrayUtil.repeat(2)(
    () =>
      ({
        post_id: post.id,
        comment_id: null,
        review_id: null,
        file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        file_type: "image/jpeg",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1024> &
            tags.Maximum<2097152>
        >(),
      }) satisfies IAimallBackendAttachment.ICreate,
  );
  const uploadedAttachments: IAimallBackendAttachment[] = [];
  for (const toCreate of attachmentsToCreate) {
    const uploaded =
      await api.functional.aimall_backend.seller.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: toCreate,
        },
      );
    typia.assert(uploaded);
    uploadedAttachments.push(uploaded);
  }

  // 3. Seller gets list of all attachments for their post
  const resp =
    await api.functional.aimall_backend.seller.posts.attachments.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(resp);

  // 4. Assert all created attachments appear, with correct metadata
  for (const created of uploadedAttachments) {
    const found = resp.data.find((a) => a.id === created.id);
    TestValidator.predicate(`Attachment ${created.id} present in response`)(
      !!found,
    );
    if (found) {
      TestValidator.equals("post_id matches")(found.post_id)(created.post_id);
      TestValidator.equals("file_uri matches")(found.file_uri)(
        created.file_uri,
      );
      TestValidator.equals("file_type matches")(found.file_type)(
        created.file_type,
      );
      TestValidator.equals("file_size matches")(found.file_size)(
        created.file_size,
      );
    }
  }

  // 5. Assert no unauthorized/foreign post attachments present
  for (const att of resp.data) {
    TestValidator.equals("Attachment belongs to post")(att.post_id)(post.id);
  }
}
