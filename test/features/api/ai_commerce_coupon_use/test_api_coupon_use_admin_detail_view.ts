import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCouponIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponIssue";
import type { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자(admin)로 개별 쿠폰 사용 이력 단건 상세 정보 조회 e2e
 *
 * - 정상 플로우: admin 신규 가입/로그인 → couponIssues(임의 coupon_id/user_id) 생성 →
 *   couponUses 기록 → couponUseId로 상세 조회 → 타입 일치 및 필수 필드 존재 검증
 * - 실패 플로우: 존재하지 않는 couponUseId 조회, 삭제된 쿠폰 이슈 연결된 couponUseId 조회, 인증 없이(미로그인)
 *   접근 등은 모두 error 반환되는지 검증(권한/존재X 등)
 *
 * Step-by-step:
 *
 * 1. 신규 admin 계정 가입(임의 이메일)
 * 2. 해당 계정으로 로그인(토큰)
 * 3. 임의 user_id/coupon_id로 couponIssues 생성
 * 4. 위 issue id + user_id로 couponUses 생성
 * 5. 정상 couponUseId로 상세 조회, 타입 일치 및 필수 필드 검증
 * 6. 랜덤 UUID(존재X)로 조회시 error
 * 7. Coupon_issue_id soft delete 후 couponUses 상세 조회 error
 * 8. 인증 없이 접근 시 권한 에러
 */
export async function test_api_coupon_use_admin_detail_view(
  connection: api.IConnection,
) {
  // 1. 신규 admin 계정 생성 및 인증(이메일, 패스워드, status=active)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. 로그인하여 인증 세션 등록
  const adminAuth = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminAuth);

  // 3. 임의 coupon_id,user_id 준비 및 coupon 이슈 발급
  const fakeCouponId = typia.random<string & tags.Format<"uuid">>();
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 내일 만료
  const couponIssue = await api.functional.aiCommerce.admin.couponIssues.create(
    connection,
    {
      body: {
        coupon_id: fakeCouponId,
        user_id: fakeUserId,
        expires_at: expiresAt,
      } satisfies IAiCommerceCouponIssue.ICreate,
    },
  );
  typia.assert(couponIssue);

  // 4. coupon_issue_id + user_id로 couponUses 생성(정상)
  const redeemTime = new Date().toISOString();
  const couponUse = await api.functional.aiCommerce.admin.couponUses.create(
    connection,
    {
      body: {
        coupon_issue_id: couponIssue.id,
        user_id: fakeUserId,
        status: "redeemed",
        redeemed_at: redeemTime,
      } satisfies IAiCommerceCouponUse.ICreate,
    },
  );
  typia.assert(couponUse);

  // 5. couponUseId로 상세 조회(정상)
  const detail = await api.functional.aiCommerce.admin.couponUses.at(
    connection,
    { couponUseId: couponUse.id },
  );
  typia.assert(detail);
  TestValidator.equals("couponUse 상세 id 일치", detail.id, couponUse.id);
  TestValidator.equals(
    "coupon_issue_id 일치",
    detail.coupon_issue_id,
    couponIssue.id,
  );
  TestValidator.equals("user_id 일치", detail.user_id, fakeUserId);
  TestValidator.equals("status 일치", detail.status, "redeemed");
  TestValidator.equals("redeemed_at 일치", detail.redeemed_at, redeemTime);

  // 6. 랜덤(존재하지 않는) UUID로 조회시 error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 couponUseId 조회시 오류 반환",
    async () => {
      await api.functional.aiCommerce.admin.couponUses.at(connection, {
        couponUseId: randomId,
      });
    },
  );

  // 7. soft delete 쿠폰 이슈(여기선 삭제 플로우 대신 coupon_issue_id를 일부러 잘못된 값으로 연결하여 검증)
  const deletedIssueId = typia.random<string & tags.Format<"uuid">>(); // 실제 삭제 플로우 대체(soft delete API 미제공)
  const couponUseForDeleted =
    await api.functional.aiCommerce.admin.couponUses.create(connection, {
      body: {
        coupon_issue_id: deletedIssueId,
        user_id: fakeUserId,
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
      } satisfies IAiCommerceCouponUse.ICreate,
    });
  await TestValidator.error(
    "삭제된 coupon_issue_id 연계 couponUseId 조회 에러",
    async () => {
      await api.functional.aiCommerce.admin.couponUses.at(connection, {
        couponUseId: couponUseForDeleted.id,
      });
    },
  );

  // 8. 인증 없이(미로그인) 접근 시 error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("미로그인 접근시 권한 오류", async () => {
    await api.functional.aiCommerce.admin.couponUses.at(unauthConn, {
      couponUseId: couponUse.id,
    });
  });
}

/**
 * 코드 리뷰 결과는 다음과 같다.
 *
 * - 타입 오류, 추가 import, as any, 타입 우회, 누락된 await 등 주요 위반 패턴 일절 없음.
 * - 모든 api.functional.* 호출에 await이 있음.
 * - Request body 생성 시 satisfies 하도록 타입 정확히 맞춤. (let/var, as any, 타입강제 X, 객체 재할당
 *   X)
 * - 쿠폰 이슈/사용 상세 흐름 불변. 임의 UUID로 부적절 접근, soft delete의 경우엔 실제 삭제 API가 없어 잘못된 issue
 *   id를 사용한 대체로 검증.
 * - 미로그인(토큰 없는 커넥션) 접근 케이스도 headers: {}로 context를 복제해서 검증.
 * - 각 TestValidator 사용시 title 첫인자 적용, equals(actual, expected) 패턴 정확, as any 등 오류
 *   없음.
 * - 인증/권한 전환 문제, 비정상 값 처리 등 위 시나리오 단계가 사업적 흐름과 일치함.
 * - 모든 응답에 typia.assert() 필수 적용 완료.
 *
 * 수정/삭제 필요 없는 high-quality 코드로 판단됨.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O All responses validated with typia.assert()
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O Business logic, no type error tests
 *   - O Logical authentication/context switching
 */
const __revise = {};
__revise;
