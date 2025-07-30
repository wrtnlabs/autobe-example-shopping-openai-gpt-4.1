import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced search and pagination on attachments for a seller's post
 * with filters (file_type, file_size, paging).
 *
 * Business context:
 *
 * - Authenticated sellers should be able to search and page through their post's
 *   attachments using advanced filters.
 * - Ensures only permitted attachments are returned that match the requested
 *   criteria, and metadata is paginated per API contract.
 *
 * Steps:
 *
 * 1. Create a post (POST /aimall-backend/seller/posts)
 * 2. Upload multiple attachments to the post (POST
 *    /aimall-backend/seller/posts/{postId}/attachments), with mixed file_type
 *    and file_size
 * 3. Search by file_type filter: check only those with matching type are returned,
 *    and pagination meta is present
 * 4. Search by file_size_min filter: all results must have size >= min
 * 5. Search with pagination: request 2nd page with limit, meta must match
 */
export async function test_api_aimall_backend_seller_posts_attachments_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a post as seller
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload multiple attachments with different file_types and file_sizes
  const fileTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "audio/mpeg",
  ];
  const attachments: IAimallBackendAttachment[] = await ArrayUtil.asyncRepeat(
    7,
  )(async () => {
    const file_type = RandomGenerator.pick(fileTypes);
    const file_size = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<40960>
    >(); // 1KB ~ 40KB
    const a =
      await api.functional.aimall_backend.seller.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}`,
            file_type,
            file_size,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    typia.assert(a);
    return a;
  });

  // 3. Search/filter by file_type
  const targetType = attachments[0].file_type;
  const typeResult =
    await api.functional.aimall_backend.seller.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          file_type: targetType,
          limit: 5,
          page: 1,
        },
      },
    );
  typia.assert(typeResult);
  for (const att of typeResult.data)
    TestValidator.equals("filtered by file_type")(att.file_type)(targetType);
  TestValidator.predicate("pagination meta present")(
    typeof typeResult.pagination.limit === "number",
  );

  // 4. Search/filter by file_size_min
  const minSize = Math.min(...attachments.map((a) => a.file_size));
  const sizeResult =
    await api.functional.aimall_backend.seller.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          file_size_min: minSize,
        },
      },
    );
  typia.assert(sizeResult);
  for (const att of sizeResult.data)
    TestValidator.predicate("file_size >= min")(att.file_size >= minSize);

  // 5. Search paginated results: limit=3, page=2
  const paged =
    await api.functional.aimall_backend.seller.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          limit: 3,
          page: 2,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination.limit=3")(paged.pagination.limit)(3);
  TestValidator.equals("pagination.page=2")(paged.pagination.current)(2);
}
