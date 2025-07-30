import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 테스트: 파일 크기 제한을 초과하는 첨부파일을 댓글에 업로드 시도시 거부 동작 검증
 *
 * 시나리오:
 *
 * - 파일 크기가 정책상 허용 최대치(예: 1GB 이상)를 넘을 경우
 * - 댓글에 첨부파일 업로드가 거부되고 에러가 발생해야 하며, 첨부가 연결되지 않아야 한다
 *
 * 절차:
 *
 * 1. 게시글을 작성 (테스트용 댓글의 상위 엔티티 생성)
 * 2. 해당 게시글에 댓글 등록
 * 3. 댓글에 대해 (파일 크기가 과도하게 큰) 첨부파일 업로드 시도
 * 4. 업로드는 파일 사이즈 초과로 인해 거부되어야 하며, 에러가 발생해야 한다
 * 5. (선택) 첨부파일 리스트 API가 제공된다면 첨부가 실제로 저장되지 않았음을 추가 검증 가능
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_create_attachment_comment_exceeds_file_size_limit(
  connection: api.IConnection,
) {
  // 1. 게시글 생성
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(5),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. 댓글 등록
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(2),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. 파일 크기가 정책상 제한을 크게 초과(1GB, 1073741824 bytes)하는 첨부파일 생성 DTO
  const largeAttachment = {
    comment_id: comment.id,
    file_uri: "s3://mock-bucket/large-file.dat",
    file_type: "application/octet-stream",
    file_size: 1073741824,
  } satisfies IAimallBackendAttachment.ICreate;

  // 4. 첨부파일 업로드 시도시 파일 사이즈 초과로 인해 오류 발생 기대
  await TestValidator.error("파일 크기 제한 초과 첨부 업로드 거부되어야 함")(
    () =>
      api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: largeAttachment,
        },
      ),
  );

  // 5. (선택) 첨부파일 리스트 API가 있다면, 실제로 첨부가 연결되지 않았는지 추가 체크 가능
}
