import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * 인증된 판매자가 올바른 형식으로 지원 티켓을 생성하는 절차를 검증합니다.
 *
 * - 판매자가 필수 필드(subject, body, priority, category)를 입력해 지원 티켓 생성 API를 호출할 수 있음을
 *   검증합니다.
 * - 반환 객체가 판매자 본인의 요청으로 식별되며, 서버가 할당하는 식별자/타임스탬프/상태 등 주요 메타 데이터가 모두 올바르게 반환되는지
 *   확인합니다.
 * - 저장값의 동일성, 부여 값 타입의 정합성까지 sanity check를 포함합니다.
 *
 * [절차]
 *
 * 1. 임의 판매자 UUID(sellerId) 생성
 * 2. Ticket 생성 DTO(필수 입력값) 준비: subject, body, priority, category
 * 3. 지원 티켓 생성 API 호출
 * 4. 반환 객체에 대해:
 *
 *    - 요청자(requester_id)가 sellerId와 일치하는지
 *    - 입력 필드(subject, body, priority, category)의 저장 정합성
 *    - 서버측 부여 필드(id, status, created_at, updated_at)의 유효성 predicate 체크
 */
export async function test_api_aimall_backend_seller_supportTickets_create(
  connection: api.IConnection,
) {
  // 1. 임의 판매자 UUID 생성
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. 필수 지원티켓 생성 DTO 준비
  const createDto: IAimallBackendSupportTicket.ICreate = {
    requester_id: sellerId,
    subject: RandomGenerator.alphabets(32),
    body: RandomGenerator.paragraph()(6),
    priority: RandomGenerator.pick(["normal", "high", "urgent"]),
    category: RandomGenerator.pick([
      "delivery",
      "payment",
      "product",
      "account",
      "support",
    ]),
  };

  // 3. API 호출 - seller 지원 티켓 생성
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      { body: createDto },
    );
  typia.assert(ticket);

  // 4. 반환값 필드 검증 - 요청자 ID와 입력값 동일성, 부여 메타데이터 유효성
  TestValidator.equals("requester_id is sellerId")(ticket.requester_id)(
    sellerId,
  );
  TestValidator.equals("subject matches")(ticket.subject)(createDto.subject);
  TestValidator.equals("body matches")(ticket.body)(createDto.body);
  TestValidator.equals("priority matches")(ticket.priority)(createDto.priority);
  TestValidator.equals("category matches")(ticket.category)(createDto.category);
  TestValidator.predicate("ticket.id is uuid")(
    typeof ticket.id === "string" && ticket.id.length > 10,
  );
  TestValidator.predicate("status is non-empty string")(
    typeof ticket.status === "string" && ticket.status.length > 0,
  );
  TestValidator.predicate("created_at is date-time string")(
    typeof ticket.created_at === "string" && ticket.created_at.length > 0,
  );
  TestValidator.predicate("updated_at is date-time string")(
    typeof ticket.updated_at === "string" && ticket.updated_at.length > 0,
  );
}
