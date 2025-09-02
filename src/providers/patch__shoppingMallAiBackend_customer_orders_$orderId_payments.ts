import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";
import { IPageIShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * 검색 및 필터 가능한 주문 결제 내역을 페이징하여 조회합니다.
 *
 * 해당 고객이 소유한 주문에 한해 결제 시도 및 트랜잭션 기록을 필터, 정렬, 페이징으로 반환합니다. 메서드, 상태, 날짜 필터/정렬 지원.
 * 페이징 정보 포함.
 *
 * @param props - 요청 속성
 * @param props.customer - 인증된 고객 페이로드 (CustomerPayload)
 * @param props.orderId - 결제 내역을 조회할 주문 UUID
 * @param props.body - 결제 내역 페이징/검색 필터 파라미터
 * @returns 지정된 주문과 필터 기준에 맞는 결제 기록 페이지 네이션 결과
 * @throws {Error} 주문이 없거나 고객이 소유하지 않은 경우, 결과 없음
 */
export async function patch__shoppingMallAiBackend_customer_orders_$orderId_payments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendOrderPayment.IRequest;
}): Promise<IPageIShoppingMallAiBackendOrderPayment> {
  const { customer, orderId, body } = props;

  // 1. 주문 소유권 검증
  const order =
    await MyGlobal.prisma.shopping_mall_ai_backend_orders.findUnique({
      where: { id: orderId },
      select: { id: true, shopping_mall_ai_backend_customer_id: true },
    });
  if (!order || order.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error(
      "Unauthorized: Order does not belong to customer or not found",
    );
  }

  // 2. WHERE 조건 빌드
  const where = {
    shopping_mall_ai_backend_order_id: orderId,
    deleted_at: null,
    ...(body.payment_method && { payment_method: body.payment_method }),
    ...(body.status && { status: body.status }),
    ...(body.external_reference && {
      external_reference: body.external_reference,
    }),
    ...(body.requested_after || body.requested_before
      ? {
          requested_at: {
            ...(body.requested_after && {
              gte: toISOStringSafe(body.requested_after),
            }),
            ...(body.requested_before && {
              lte: toISOStringSafe(body.requested_before),
            }),
          },
        }
      : {}),
  };

  // 3. Pagination 계산
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 4. orderBy 처리 (기본: requested_at desc)
  const orderBy =
    body.sort && typeof body.sort === "string" && body.sort.includes(":")
      ? (() => {
          const [field, dir] = body.sort.split(":");
          if (
            [
              "requested_at",
              "created_at",
              "updated_at",
              "amount",
              "status",
            ].includes(field) &&
            (dir === "asc" || dir === "desc")
          ) {
            return { [field]: dir as "asc" | "desc" };
          }
          return { requested_at: "desc" as const };
        })()
      : { requested_at: "desc" as const };

  // 5. 결제 내역 조회/카운트
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_order_payments.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_order_payments.count({ where }),
  ]);

  // 6. 결과 매핑 (날짜타입 변환 포함)
  const data: IShoppingMallAiBackendOrderPayment[] = rows.map((p) => ({
    id: p.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_order_id:
      p.shopping_mall_ai_backend_order_id as string & tags.Format<"uuid">,
    payment_method: p.payment_method,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    external_reference: p.external_reference ?? null,
    requested_at: toISOStringSafe(p.requested_at),
    completed_at: p.completed_at ? toISOStringSafe(p.completed_at) : null,
    failed_at: p.failed_at ? toISOStringSafe(p.failed_at) : null,
    cancelled_at: p.cancelled_at ? toISOStringSafe(p.cancelled_at) : null,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
    deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
  }));

  // 7. 페이지네이션 구조 반환, brand type 적용
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
