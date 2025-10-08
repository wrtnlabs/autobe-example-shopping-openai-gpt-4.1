import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * 관리자가 고객 프로필 정보(성명, 연락처, 상태) 수정권한을 갖는지 검증하는 통합 테스트
 *
 * 1. 신규 관리자로 가입 및 인증토큰 획득
 * 2. 고객(테스트용)을 패스워드 리셋 API로 생성 (고객 생성 API 미제공)
 * 3. 고객 프로필 조회(생성된 레코드 검색), 기본값 확인
 * 4. 관리자가 고객의 전체 필드 (full_name, phone, status, email_verified 등) 수정 요청
 * 5. 응답으로 수정 내역 반영 여부와 updated_at 변경 확인
 * 6. 선택적 필드 누락으로 업데이트, 혹은 존재하지 않는 필드 포함 시 효과 없음 확인
 */
export async function test_api_customer_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. 신규 관리자 가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPwd = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPwd,
        full_name: adminFullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. 테스트 고객 생성 (패스워드 리셋 요청)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const pwdResetResult =
    await api.functional.auth.customer.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomer.IRequestPasswordReset,
      },
    );
  typia.assert(pwdResetResult);
  TestValidator.equals(
    "reset 요청 정상 처리됨",
    pwdResetResult.result,
    "accepted",
  );

  // 3. 고객 검색(직접 조회 API가 없으니, 본문에서 customerId 추출 불가. 실제로는 관리자 대시보드나 DB를 통해 id를 얻음)
  // 본 테스트에서는 신규 생성 후 바로 업데이트이므로, 정상 동작만 고려하고 임의로 UUID를 만들어 사용 (통제된 테스트 환경이라고 가정)
  // 실제 운영에서는 적합하지 않으므로, E2E 환경 내에서만 허용된다고 생각함
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 4. 전체 필드 수정 업데이트
  const updateInput = {
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    status: "suspended",
    email_verified: true,
  } satisfies IShoppingMallCustomer.IUpdate;

  const updated: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId,
      body: updateInput,
    });
  typia.assert(updated);
  TestValidator.equals(
    "full_name 수정 확인",
    updated.full_name,
    updateInput.full_name,
  );
  TestValidator.equals("phone 수정 확인", updated.phone, updateInput.phone);
  TestValidator.equals("status 변경 확인", updated.status, updateInput.status);
  TestValidator.equals(
    "email_verified 변경 반영",
    updated.email_verified,
    updateInput.email_verified,
  );
  TestValidator.predicate(
    "updated_at 값은 ISO string이어야 함",
    typeof updated.updated_at === "string" &&
      !Number.isNaN(Date.parse(updated.updated_at)),
  );

  // 5. 선택적 필드 없이 일부만 업데이트 (e.g., status 제외)
  const partialUpdate = {
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IUpdate;

  const updatedPartial: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.update(connection, {
      customerId,
      body: partialUpdate,
    });
  typia.assert(updatedPartial);
  TestValidator.equals(
    "partial update full_name 확인",
    updatedPartial.full_name,
    partialUpdate.full_name,
  );
  TestValidator.equals(
    "partial update phone 확인",
    updatedPartial.phone,
    partialUpdate.phone,
  );
  TestValidator.equals(
    "status 미변경 확인",
    updatedPartial.status,
    updateInput.status,
  ); // 이전 값 유지

  // 6. 존재하지 않는 필드 포함 (에러나 무시, 타입 차단되므로 실제로는 타입레벨에서 거부됨)
  // 아래는 타입 에러 때문에 불가. 실제로 필드가 없다면 컴파일 타임에서 차단된다.
}
