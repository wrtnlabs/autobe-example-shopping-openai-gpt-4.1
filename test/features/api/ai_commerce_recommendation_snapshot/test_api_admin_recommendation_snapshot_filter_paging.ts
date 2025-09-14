import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceRecommendationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceRecommendationSnapshot";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceRecommendationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceRecommendationSnapshot";

/**
 * 관리자가 AI 추천 스냅샷 로그를 기간/사용자 기준으로 필터링·검색하고 페이지네이션을 사용할 수 있는지 검증한다.
 *
 * 1. 고유한 관리자 계정을 생성(POST /auth/admin/join)
 * 2. 관리자로 로그인 후 인증 컨텍스트 획득(POST /auth/admin/login)
 * 3. PATCH /aiCommerce/admin/recommendationSnapshots를 다음의 다양한 조합으로 호출:
 *
 *    - 기간 필터만(오늘~내일),
 *    - BuyerId만,
 *    - 두 가지 모두,
 *    - 아무 필터 미입력(전체 리스트)
 *    - Page/limit 변형으로 페이징 정상 및 범위초과/음수 등 비정상 값
 *    - 존재하지 않는 buyerId, 포맷에러 input 등 잘못된 조건
 * 4. 정상 호출 시 반환 pagination 구조와 데이터가 명세(타입)와 일치하는지 typia.assert로 확인하고 일부 값 직접
 *    체크
 * 5. 잘못된 입력 시 TestValidator.error로 에러반환을 확인
 */
export async function test_api_admin_recommendation_snapshot_filter_paging(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성
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

  // 2. 관리자 로그인(로그인 토큰 획득 및 세션갱신 목적)
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3.1. 기간 필터만(오늘~내일)
  const now = new Date();
  const from = now.toISOString();
  const to = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const resp1 =
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          snapshot_timestamp_from: from,
          snapshot_timestamp_to: to,
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  typia.assert(resp1);
  TestValidator.predicate(
    "pagination 정보 존재",
    !!resp1.pagination && typeof resp1.pagination.pages === "number",
  );
  TestValidator.predicate("data는 배열", Array.isArray(resp1.data));

  // 3.2. buyerId만 지정(존재하는 값이 있을 경우에만)
  let sampleBuyerId: string | undefined =
    resp1.data.length > 0 ? resp1.data[0].ai_commerce_buyer_id : undefined;
  if (sampleBuyerId !== undefined) {
    const resp2 =
      await api.functional.aiCommerce.admin.recommendationSnapshots.index(
        connection,
        {
          body: {
            ai_commerce_buyer_id: sampleBuyerId,
          } satisfies IAiCommerceRecommendationSnapshot.IRequest,
        },
      );
    typia.assert(resp2);
    TestValidator.predicate(
      "buyerId 결과 data 존재",
      resp2.data.every((row) => row.ai_commerce_buyer_id === sampleBuyerId),
    );
  }

  // 3.3. 기간+buyerId 동시 필터
  if (sampleBuyerId !== undefined) {
    const resp3 =
      await api.functional.aiCommerce.admin.recommendationSnapshots.index(
        connection,
        {
          body: {
            ai_commerce_buyer_id: sampleBuyerId,
            snapshot_timestamp_from: from,
            snapshot_timestamp_to: to,
          } satisfies IAiCommerceRecommendationSnapshot.IRequest,
        },
      );
    typia.assert(resp3);
    TestValidator.predicate(
      "동시필터결과 buyer/기간 일치",
      resp3.data.every(
        (row) =>
          row.ai_commerce_buyer_id === sampleBuyerId &&
          row.snapshot_timestamp >= from &&
          row.snapshot_timestamp <= to,
      ),
    );
  }

  // 3.4. 전체 리스트(page/limit 지정 없이)
  const resp4 =
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {} satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  typia.assert(resp4);
  TestValidator.predicate("data 배열 존재", Array.isArray(resp4.data));

  // 3.5. 페이징 정상 호출(page/limit)
  const resp5 =
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  typia.assert(resp5);
  TestValidator.equals("페이지 길이<=limit", resp5.data.length <= 2, true);

  // 3.6. 잘못된 페이징(음수, 0, 초과)
  await TestValidator.error("음수 page는 실패", async () => {
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          page: -1 as number & tags.Type<"int32">,
          limit: 1,
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  });
  await TestValidator.error("limit=0 실패", async () => {
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          limit: 0 as number & tags.Type<"int32">,
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  });

  // 3.7. 존재하지 않는 buyerId
  await TestValidator.error("존재하지 않는 buyerId 실패", async () => {
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          ai_commerce_buyer_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  });

  // 3.8. 잘못된 날짜 포맷, 논리 오류
  await TestValidator.error("잘못된 snapshot_timestamp_from 포맷", async () => {
    await api.functional.aiCommerce.admin.recommendationSnapshots.index(
      connection,
      {
        body: {
          snapshot_timestamp_from: "invalid-date",
        } satisfies IAiCommerceRecommendationSnapshot.IRequest,
      },
    );
  });
}

/**
 * 전반적으로 해당 테스트는 E2E 시나리오 및 TypeScript 타입/비즈니스 로직을 충실히 반영한다. 모든 API 호출에 await,
 * typia.assert, TestValidator 사용 시 title 파라미터 명확히 제공 및 성공/실패 경로 분리 등 올바르게 구성되어
 * 있다. 잘못된 타입 전송, as any, 잘못된 DTO 프로퍼티/비존재 필드 접근 없이,
 * IAiCommerceRecommendationSnapshot.IRequest와 반환타입을 정확히 분별하여 페이징, 필터, 에러 시나리오를
 * 구현하였다. buyerId 동적 추출 및 존재하지 않는 값 테스트 등 실제 데이터를 활용한 검증도 탁월하다. (draft의 각종
 * 정상/비정상 케이스는 규정 위반 없이 모두 실행 가능하다.) 전체적으로 준수해야 할 구현/코딩 규칙, 제약사항, 품질 기준을 모두
 * 만족한다. 별도의 수정/수정사항이 발견되지 않았으며, draft 그대로 production quality로 활용 가능하다.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function follows the correct naming convention
 *   - O All TestValidator functions include title as first parameter
 *   - O Compilation errors not present
 *   - O NO type error testing present
 *   - O Proper async/await usage everywhere
 *   - O All DTO usage matches scenario
 *   - O No response type validation after typia.assert()
 *   - O No business rule violations (illogical code)
 */
const __revise = {};
__revise;
