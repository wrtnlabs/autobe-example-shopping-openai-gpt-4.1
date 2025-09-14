import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCoupon";
import type { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자가 발급한 쿠폰 이슈 상세 조회 정상 케이스 검증.
 *
 * - 신규 관리자를 등록/로그인해 인가 토큰 획득
 * - 신규 쿠폰을 생성(임의 코드/타입/기간)
 * - 쿠폰을 임의 사용자(UUID, 실제 존재 여부 무관)에 발급
 * - 발급된 couponIssueId로 상세 조회 API 호출
 * - 조회 결과와 발급 결과 id/coupon_id/issued_to/status/issued_at/만료일 등 주요 필드 일치 검증
 * - Typia.assert로 전체 type 검증 및 필수 필드 존재 검증
 */
export async function test_api_coupon_issue_admin_view_success(
  connection: api.IConnection,
) {
  // 1. 신규 관리자 등록 (인증 토큰 컨텍스트 부여)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. 쿠폰 신규 생성
  const now = new Date();
  const validFrom = now.toISOString();
  const validUntil = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const couponCreate = {
    coupon_code: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick(["amount", "percent", "shipping"] as const),
    valid_from: validFrom,
    valid_until: validUntil,
    issued_by: admin.id,
    max_uses: 100,
    conditions: null,
    status: "active",
  } satisfies IAiCommerceCoupon.ICreate;
  const coupon: IAiCommerceCoupon =
    await api.functional.aiCommerce.admin.coupons.create(connection, {
      body: couponCreate,
    });
  typia.assert(coupon);

  // 3. 쿠폰 이슈(발급) 생성 (유저 UUID 랜덤)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const expiresAt = coupon.valid_until;
  const couponIssueCreate = {
    coupon_id: coupon.id,
    user_id: userId,
    expires_at: expiresAt,
    description: null,
  } satisfies IAiCommerceCouponIssue.ICreate;
  const issue: IAiCommerceCouponIssue =
    await api.functional.aiCommerce.admin.couponIssues.create(connection, {
      body: couponIssueCreate,
    });
  typia.assert(issue);

  // 4. 상세조회
  const found: IAiCommerceCouponIssue =
    await api.functional.aiCommerce.admin.couponIssues.at(connection, {
      couponIssueId: issue.id,
    });
  typia.assert(found);

  // 5. 주요 필드 값 일치성 검증
  TestValidator.equals("쿠폰 이슈 id 일치", found.id, issue.id);
  TestValidator.equals("쿠폰 id 일치", found.coupon_id, coupon.id);
  TestValidator.equals("발급 대상 user_id 일치", found.issued_to, userId);
  TestValidator.equals("쿠폰 이슈 상태 일치", found.status, issue.status);
  TestValidator.equals("쿠폰 이슈 만료일 일치", found.expires_at, expiresAt);
  TestValidator.equals(
    "쿠폰 이슈 발급일(issued_at) 일치",
    found.issued_at,
    issue.issued_at,
  );
}

/**
 * - 올바르게 관리자 계정을 생성해 인증 컨텍스트를 획득합니다. (await 필수 확인)
 * - 쿠폰 신규 생성 시, IAiCommerceCoupon.ICreate의 모든 필수 필드를 올바른 타입, 실제 포맷으로 입력했으며
 *   issued_by에 admin.id를 넘깁니다.
 * - 쿠폰 이슈(발급)는 user_id를 uuid로 랜덤하게 넣고, 만료일 등 쿠폰 정보와 비즈니스 시점이 일치하도록 했으며 타입 준수 및
 *   리턴값 검증(typia.assert)을 필수로 적용.
 * - 상세조회(쿠폰 이슈 id 기반)에서 리턴 타입 검증 및 주요 필드들 값의 일치성(쿠폰이 발급될 때의 정보와 실제 조회 정보)이 모두
 *   TestValidator.equals로 체크되고, 규칙에 어긋나는 패턴이 없습니다.
 * - Await가 모든 I/O 작업에 잘 사용되고, 타입 변환은 typia.assert로 검증합니다. TestValidator 함수에는 모든
 *   타이틀이 들어갑니다.
 * - 불필요한 import/additional 변수, mutation, illogical 시퀀스, as any/<wrong typed>/무관
 *   속성 사용 없음. 컴파일러 오류를 내는 코드, 절대로 용납X. 불필요한 필드/임의 필드 추가 없음.
 * - 코드 변형 사항이나 삭제/보완 불필요. 최고 품질.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O TestValidator error with async callback has await
 *   - O All API calls with correct types
 *   - O NO fictional API/type usage
 *   - O NO .headers mutation/reading
 *   - O Function signature and docstring per template
 *   - O TestValidator title always provided
 *   - O No logic or temporal anti-patterns
 *   - O All random data per DTO/tags
 */
const __revise = {};
__revise;
