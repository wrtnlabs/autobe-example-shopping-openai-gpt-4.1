import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 고객이 본인 게시글 첨부파일에 대해 파일타입/생성일 등 고급 검색 조건으로 검색 필터가 정상 동작하는지 검증합니다.
 *
 * [비즈니스 컨텍스트 및 테스트 목적]
 *
 * - 실제 고객이 게시글에 이미지, 문서 등 다양한 타입의 첨부파일을 여러 건 업로드한 후, file_type, created_at, 페이징 등
 *   다양한 파라미터로 첨부파일 목록을 검색하는 사용 시나리오를 점검합니다.
 * - 검색 결과가 필터링 조건 및 페이지네이션에 정확히 부합하는지 확인합니다.
 *
 * [테스트 프로세스]
 *
 * 1. 고객 권한으로 게시글을 신규 생성합니다.
 * 2. 게시글에 다양한 타입(image/jpeg, image/png, application/pdf 등) 첨부파일을 업로드합니다.
 * 3. File_type 조건으로 이미지 첨부파일만 조회 및 검증합니다.
 * 4. Created_at(생성일) 범위 파라미터로 조회 및 검증합니다.
 * 5. Limit 파라미터로 페이지네이션 동작을 검증합니다.
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_search_post_attachments_with_filters_as_customer(
  connection: api.IConnection,
) {
  // 1. 고객 게시글 생성
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "첨부파일 필터링 테스트 게시글",
        body: "첨부파일 고급검색 기능 점검을 위한 본문 내용",
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. 이미지, 문서 등 다양한 첨부파일 업로드
  const attachments = await Promise.all([
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: "s3://bucket/uuid1.jpg",
          file_type: "image/jpeg",
          file_size: 100000,
        },
      },
    ),
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: "s3://bucket/uuid2.png",
          file_type: "image/png",
          file_size: 85000,
        },
      },
    ),
    api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: "s3://bucket/uuid3.pdf",
          file_type: "application/pdf",
          file_size: 50000,
        },
      },
    ),
  ]);
  attachments.forEach((att) => typia.assert(att));

  // 3. file_type 조건(예: image/jpeg) 첨부파일 검색 및 검증
  const imageFilterRes =
    await api.functional.aimall_backend.customer.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_type: "image/jpeg",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(imageFilterRes);
  TestValidator.predicate("file_type = image/jpeg만 포함됨")(
    imageFilterRes.data.every((att) => att.file_type === "image/jpeg"),
  );
  TestValidator.equals("image/jpeg 파일은 1건만 존재")(
    imageFilterRes.pagination.records,
  )(1);

  // 4. created_at 필터(시점을 정확히 맞춰서 조회)
  const pdfAttachment = attachments.find(
    (att) => att.file_type === "application/pdf",
  );
  if (pdfAttachment) {
    const dateRangeRes =
      await api.functional.aimall_backend.customer.posts.attachments.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            created_from: pdfAttachment.created_at,
            created_to: pdfAttachment.created_at,
            limit: 10,
            page: 1,
          },
        },
      );
    typia.assert(dateRangeRes);
    TestValidator.predicate("created_at이 지정값과 일치하는 파일만 반환")(
      dateRangeRes.data.every(
        (att) => att.created_at === pdfAttachment.created_at,
      ),
    );
  }

  // 5. 페이징 검증(limit=1)
  const pagingRes =
    await api.functional.aimall_backend.customer.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(pagingRes);
  TestValidator.equals("limit=1 정상 동작 확인")(pagingRes.data.length)(1);
  TestValidator.equals("page=1 정상 동작 확인")(pagingRes.pagination.current)(
    1,
  );
}
