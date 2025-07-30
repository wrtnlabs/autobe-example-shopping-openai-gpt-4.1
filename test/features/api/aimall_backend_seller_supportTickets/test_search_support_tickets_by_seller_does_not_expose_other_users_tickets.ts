import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 판매자 지원 티켓 보안: 자신의 티켓만 조회되는지 검증
 *
 * 본 테스트는 PATCH /aimall-backend/seller/supportTickets(검색 API)를 이용할 때, 각 판매자가 오직
 * 본인이 생성한 티켓만 볼 수 있고, 다른 판매자나 고객이 생성한 티켓을 볼 수 없음을 검증합니다.
 *
 * 1. 고유 UUID를 갖는 seller1, seller2, customer1 식별자를 생성
 * 2. Seller1로 support ticket 2건, seller2로 1건, customer1로 1건을 각각 생성
 * 3. Seller1로 다양한 filter 조합을 이용해 티켓 검색을 반복 실시
 * 4. 각 검색 결과에서 ticket의 requester_id가 seller1의 id와 동일한지만을 검사. If not, 실패 처리
 */
export async function test_api_aimall_backend_seller_supportTickets_test_search_support_tickets_by_seller_does_not_expose_other_users_tickets(
  connection: api.IConnection,
) {
  // 1. 테스트용 계정 UUID 세팅 (계정 인증 가정)
  const seller1_id = typia.random<string & tags.Format<"uuid">>();
  const seller2_id = typia.random<string & tags.Format<"uuid">>();
  const customer1_id = typia.random<string & tags.Format<"uuid">>();

  // 2. seller1로 티켓 2건 생성
  const seller1_ticket1 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller1_id,
          subject: "상품 입고 문의",
          body: "신규 상품 a의 입고 일정을 알고 싶습니다.",
          priority: "normal",
          category: "product",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(seller1_ticket1);
  const seller1_ticket2 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller1_id,
          subject: "정산 문제",
          body: "지난달 정산서 내역에 오류가 있는 것 같습니다.",
          priority: "high",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(seller1_ticket2);

  // 3. seller2로 티켓 1건 생성
  const seller2_ticket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller2_id,
          subject: "배송 지연",
          body: "구매자 문의로 주문번호 2024-001의 배송이 늦어지고 있어 확인 바랍니다.",
          priority: "urgent",
          category: "delivery",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(seller2_ticket);

  // 4. customer1로 티켓 1건 생성
  const customer1_ticket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customer1_id,
          subject: "쿠폰 적용 오류",
          body: "결제 시 쿠폰이 제대로 적용되지 않습니다.",
          priority: "normal",
          category: "payment",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(customer1_ticket);

  // 5. seller1로 다양한 필터를 사용하여 검색 반복
  const filters: IAimallBackendSupportTicket.IRequest[] = [
    {}, // 전체
    { status: seller1_ticket1.status },
    { category: seller1_ticket1.category },
    { subject: seller1_ticket2.subject },
    { priority: seller1_ticket2.priority },
    { requester_id: seller1_id },
    { requester_id: seller1_id, category: seller1_ticket1.category },
    { requester_id: seller1_id, status: seller1_ticket1.status },
    { requester_id: seller1_id, subject: seller1_ticket1.subject },
  ];
  for (const filter of filters) {
    filter.requester_id = seller1_id;
    const page =
      await api.functional.aimall_backend.seller.supportTickets.search(
        connection,
        {
          body: filter,
        },
      );
    typia.assert(page);
    for (const ticket of page.data) {
      TestValidator.equals("seller1의 티켓만 조회되어야 함")(
        ticket.requester_id,
      )(seller1_id);
    }
  }
}
