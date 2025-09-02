import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";

export async function test_api_seller_verification_detail_admin_not_found(
  connection: api.IConnection,
) {
  /**
   * 관리자 권한으로 존재하지 않는 판매자 인증 정보 조회 시 404 not found 또는 비즈니스 에러가 올바르게 발생하는지 검증한다.
   *
   * 1. 관리자(어드민) 계정 생성 및 인증 (POST /auth/admin/join)
   * 2. 존재하지 않는 sellerId와 verificationId (랜덤 UUID)로 상세 조회 요청
   * 3. 해당 리소스가 없으므로 404 not found 혹은 적절한 비즈니스 에러가 발생하는지 TestValidator.error로 검증
   */
  // 1. 관리자 계정 가입 및 인증
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(30),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. 존재하지 않는 sellerId/verificationId로 조회 요청
  const notExistsSellerId = typia.random<string & tags.Format<"uuid">>();
  const notExistsVerificationId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "관리자가 없는 판매자 인증 상세 조회 시 404 not found 혹은 비즈니스 에러 발생을 검증",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.verifications.at(
        connection,
        {
          sellerId: notExistsSellerId,
          verificationId: notExistsVerificationId,
        },
      );
    },
  );
}
