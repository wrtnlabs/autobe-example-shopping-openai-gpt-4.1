import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";

export async function test_api_coupon_issuance_update_status_success_admin(
  connection: api.IConnection,
) {
  /**
   * 관리자가 쿠폰 발급(status/만료일 등)을 성공적으로 갱신할 수 있는지 검증합니다.
   *
   * 1. /auth/admin/join 으로 관리자 인증/권한 확보
   * 2. 테스트용 couponId/issuanceId(난수)를 생성
   * 3. PUT /shoppingMallAiBackend/admin/coupons/{couponId}/issuances/{issuanceId}에
   *    status와 expires_at을 갱신하여 요청
   * 4. 응답으로 받은 결과에서 변경 사항 반영 여부 확인
   */
  const adminUsername = RandomGenerator.alphabets(10);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const adminEmail = `${RandomGenerator.alphabets(6)}@company.com` as string &
    tags.Format<"email">;

  // 1. 관리자 계정 생성 및 인증
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.predicate("관리자 가입 결과 admin 있음", !!adminJoin.admin);
  TestValidator.predicate("관리자 가입 결과 token 있음", !!adminJoin.token);

  // 2. 쿠폰/발급 난수로 생성 (실제 쿠폰/고객 생성 API 없으므로 대체)
  const couponId = typia.random<string & tags.Format<"uuid">>();
  const issuanceId = typia.random<string & tags.Format<"uuid">>();

  // 3. status와 미래 expires_at 갱신 요청
  const expiresAt = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString() as string & tags.Format<"date-time">;
  })();
  const updateBody = {
    status: "revoked",
    expires_at: expiresAt,
  } satisfies IShoppingMallAiBackendCouponIssuance.IUpdate;

  const result =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.updateIssuance(
      connection,
      {
        couponId,
        issuanceId,
        body: updateBody,
      },
    );
  typia.assert(result);

  TestValidator.equals(
    "쿠폰 발급 status — revoked 적용",
    result.status,
    "revoked",
  );
  TestValidator.equals(
    "쿠폰 발급 expires_at 동기화",
    result.expires_at,
    updateBody.expires_at,
  );
}
