import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 고객이 첨부파일 업로드 시 필수값 누락에 대한 유효성 검증 테스트
 *
 * 커뮤니티 게시글(post)을 작성한 뒤,
 *
 * - 첨부파일 생성 요청에서 file_uri, file_type 등 필수 입력값을 일부러 빠뜨려 보낸다.
 * - API가 유효성 검사(HttpError)로 거부하는지 TestValidator.error()로 검증한다.
 * - 스키마 구조와 비즈니스 입력 강제성 보장 확인 용도
 *
 * 1. (선행) 정상 게시글 1개 생성
 * 2. File_uri 누락, file_type 누락, 모든 필수값 누락 등 다양한 body 케이스로 첨부파일 생성 시도
 * 3. 각 케이스에서 모두 반드시 유효성 오류가 발생함을 확인(TestValidator.error())
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_create_attachment_for_post_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. 선행: 커뮤니티 게시글 생성
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2-1. 첨부파일 본문에서 file_uri 누락 (file_type 등은 입력)
  await TestValidator.error("첨부파일 file_uri 누락시 유효성 오류")(() =>
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          file_type: "image/png",
          file_size: 2048,
        } as any, // 타입 강제 우회 없이 유효성 체크 맞추기 위한 머신 코드
      },
    ),
  );

  // 2-2. 첨부파일 본문에서 file_type 누락 (file_uri 등은 입력)
  await TestValidator.error("첨부파일 file_type 누락시 유효성 오류")(() =>
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          file_uri: "s3://bucket/test.png",
          file_size: 2048,
        } as any,
      },
    ),
  );

  // 2-3. 첨부파일 모든 필수값 누락
  await TestValidator.error("첨부파일 모든 필수 필드 누락시 유효성 오류")(() =>
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {} as any,
      },
    ),
  );
}
