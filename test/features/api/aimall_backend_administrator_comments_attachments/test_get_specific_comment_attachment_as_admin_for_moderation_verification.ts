import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 관리자 콘텐츠 모더레이션(심사/검열) 기능의 검증
 *
 * - 일반 고객 계정으로 댓글을 생성한다.
 * - 고객으로 해당 댓글에 첨부파일을 업로드한다.
 * - 관리자로 권한 전환 후, 해당 댓글/첨부파일의 ID로 첨부파일 메타데이터를 조회한다.
 * - 모든 필드가 올바르게 존재하며 연결(참조)이 맞는지 검증한다.
 * - 커버리지: 생성·업로드·어드민 권한·조회·데이터 참조 무결성
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_get_specific_comment_attachment_as_admin_for_moderation_verification(
  connection: api.IConnection,
) {
  // 1. 고객 계정으로 댓글 생성 (post_id/review_id/parent_id 랜덤 케이스)
  const commentBody: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
    post_id: typia.random<string & tags.Format<"uuid">>(),
    review_id: null, // post 기반 댓글
    parent_id: null,
  };
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);

  // 2. 해당 댓글에 첨부파일 업로드
  const attachmentBody: IAimallBackendAttachment.ICreate = {
    comment_id: comment.id,
    post_id: comment.post_id ?? null,
    review_id: comment.review_id ?? null,
    file_uri: `s3://bucket/${comment.id}/${Date.now()}`,
    file_type: "image/png",
    file_size: 1024,
  };
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      { commentId: comment.id, body: attachmentBody },
    );
  typia.assert(attachment);

  // 3. (가정: 관리자 권한 연결 제공됨) 관리자로 해당 첨부파일 조회 요청
  const output =
    await api.functional.aimall_backend.administrator.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(output);

  // 4. 주요 필드와 참조 무결성 검증
  TestValidator.equals("Attachment ID matches")(output.id)(attachment.id);
  TestValidator.equals("Linked to correct comment")(output.comment_id)(
    comment.id,
  );
  TestValidator.equals("File URI matches")(output.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("File type matches")(output.file_type)(
    attachment.file_type,
  );
  TestValidator.equals("File size matches")(output.file_size)(
    attachment.file_size,
  );
  TestValidator.equals("Post ID consistent")(output.post_id)(
    comment.post_id ?? null,
  );
  TestValidator.equals("Review ID consistent")(output.review_id)(
    comment.review_id ?? null,
  );
}
