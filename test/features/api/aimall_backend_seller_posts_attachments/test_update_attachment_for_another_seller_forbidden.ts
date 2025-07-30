import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * 다른 셀러가 소유한 게시글의 첨부파일 메타데이터를 수정 시도할 때 권한 오류(Forbidden/Unauthorized)가 발생하는지 검증
 *
 * [비즈니스 목적]
 *
 * - 셀러 A가 게시글 및 첨부파일을 등록하면 셀러 B는 해당 첨부파일의 메타데이터를 수정할 수 없어야 한다. (자원 소유자만 수정 가능함을
 *   검증)
 *
 * [테스트 흐름]
 *
 * 1. Seller A(소유자) 계정 생성
 * 2. Seller B(권한 없는 타인) 계정 생성
 * 3. Seller A 계정으로 게시글 생성
 * 4. Seller A 계정으로 첨부파일 등록
 * 5. Seller B 계정으로 첨부파일 메타데이터 수정 시도
 * 6. 반드시 권한 오류가 발생하는지 TestValidator.error로 검증
 *
 * [유의사항] 실제 환경에서는 셀러 계정별로 별도 인증API 및 connection 토큰 스위칭이 필요하나, 본 테스트 코드는 인증API
 * 미제공 상황에서 connection이 단일 컨텍스트로 가정함. 인증API가 제공될 경우 각 셀러별로 connection 분리 및 인증 후
 * 테스트 구조화 필요.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_update_attachment_for_another_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Seller A(소유자) 계정 생성
  const sellerAInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerAInput },
    );
  typia.assert(sellerA);

  // 2. Seller B(권한 없는 타인) 계정 생성
  const sellerBInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerBInput },
    );
  typia.assert(sellerB);

  // 3. Seller A 계정으로 게시글 생성
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 4. Seller A 계정으로 첨부파일 등록
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    file_uri: "s3://test-bucket/" + RandomGenerator.alphaNumeric(20),
    file_type: "image/jpeg",
    file_size: 123456,
  };
  const attachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 5. Seller B 계정으로 첨부파일 메타데이터 수정 시도
  // 실제 인증API 미제공으로 계정 전환 불가한 상황임을 감안하고 connection 단일 사용
  await TestValidator.error(
    "타인이 소유한 첨부파일 메타데이터 수정 시도는 반드시 Forbidden/Unauthorized 에러를 내야 한다",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_type: "image/png",
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });
}
