import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * 이미 등록된 이메일 주소로 셀러를 추가 등록할 경우 중복 제약이 올바르게 동작하는지 검증합니다.
 *
 * 1. 임의의 정상 이메일로 셀러 최초 등록
 * 2. 동일 이메일로 한 번 더 등록 요청 (API는 반드시 오류 반환 → 성공 시 문제)
 * 3. 첫 등록 셀러 email과 입력 일치성 검증
 *
 * [Business purpose]
 *
 * - 메일 주소의 고유성(unique constraint) 정책 적용 안전성 검증
 * - 의도하지 않은 중복 데이터 생성/수용 방지
 * - DB에 두 건 이상 유사 셀러 생성이 되지 않음 보장
 *
 * [비고]
 *
 * - API가 리스트/검색이나 DB 검증을 직접 제공하지 않으므로 2차 검증 생략
 */
export async function test_api_aimall_backend_administrator_sellers_test_create_seller_with_duplicate_email_fails(
  connection: api.IConnection,
) {
  // 1. 임의 이메일 생성
  const email: string = typia.random<string & tags.Format<"email">>();
  // 2. 셀러 최초 정상 등록
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: "테스트상점-" + RandomGenerator.alphaNumeric(6),
    email,
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const created =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(created);
  TestValidator.equals("이메일 일치")(created.email)(email);
  // 3. 같은 이메일로 셀러 재등록: 반드시 실패해야 함
  TestValidator.error("이메일 중복 정책 위반시 오류 발생")(async () => {
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerInput,
      },
    );
  });
}
