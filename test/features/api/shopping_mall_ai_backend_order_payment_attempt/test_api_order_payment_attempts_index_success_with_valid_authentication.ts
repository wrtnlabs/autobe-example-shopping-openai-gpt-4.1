import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";
import type { IPageIShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPaymentAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_payment_attempts_index_success_with_valid_authentication(
  connection: api.IConnection,
) {
  /**
   * 인증된 고객이 특정 주문의 결제의 모든 결제 시도 내역을 페이지네이션/필터와 함께 정상 조회하는 E2E 시나리오.
   *
   * 1. 고객 회원가입(/auth/customer/join) API로 인증 컨텍스트를 확보한다(토큰 발급 및 연결).
   * 2. 더미 orderId, paymentId를 typia.random()으로 생성한다(실제 주문/결제 생성 API 미제공이므로 가상 값
   *    사용).
   * 3. Patch
   *    /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}/attempts
   *    API를 호출한다.
   * 4. 결제 시도 목록(페이지네이션/필터 적용) 응답이 schema와 비즈니스 규약상 유효한지 점검한다.
   */
  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);

  // 실제 주문/결제 엔드포인트 없으므로 mock uuid로 대체(비즈니스 시나리오 설명 주석)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const paymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const input: IShoppingMallAiBackendOrderPaymentAttempt.IRequest =
    typia.random<IShoppingMallAiBackendOrderPaymentAttempt.IRequest>();

  const attemptsPage =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.index(
      connection,
      {
        orderId: orderId,
        paymentId: paymentId,
        body: input,
      },
    );
  typia.assert(attemptsPage);
  TestValidator.predicate(
    "attemptsPage.pagination 존재 여부",
    attemptsPage.pagination != null,
  );
  TestValidator.predicate(
    "attemptsPage.data는 배열 여부",
    Array.isArray(attemptsPage.data),
  );
  attemptsPage.data.forEach((attempt, idx) => {
    typia.assert<IShoppingMallAiBackendOrderPaymentAttempt>(attempt);
    TestValidator.predicate(
      `attempt[${idx}] id는 string 및 uuid`,
      typeof attempt.id === "string" && attempt.id.length > 0,
    );
    TestValidator.predicate(
      `attempt[${idx}] attempt_state string 여부`,
      typeof attempt.attempt_state === "string",
    );
    TestValidator.predicate(
      `attempt[${idx}] requested_at date-time 여부`,
      typeof attempt.requested_at === "string" &&
        attempt.requested_at.length > 0,
    );
    TestValidator.predicate(
      `attempt[${idx}] created_at date-time 여부`,
      typeof attempt.created_at === "string" && attempt.created_at.length > 0,
    );
  });
}
