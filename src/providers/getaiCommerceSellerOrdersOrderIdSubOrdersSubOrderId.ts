import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve details of a specific sub-order for an order
 * (ai_commerce_sub_orders).
 *
 * 이 함수는 주어진 seller 자격의 인증 정보를 바탕으로, 지정된 상위 주문(orderId) 내에서 특정 하위
 * 주문(subOrderId)의 상세 정보를 반환합니다. 조회 권한은 오직 본인에게 배정된(본인 소유) 하위 주문에 한정되며, 해당 하위
 * 주문이 소프트 삭제되지 않은 경우에만 결과를 반환합니다.
 *
 * - Seller: 인증된 판매자 payload (ai_commerce_buyer.id와 일치)
 * - OrderId: 조회 대상이 되는 상위 주문의 uuid
 * - SubOrderId: 상세 정보를 가져올 하위 주문의 uuid
 *
 * @param props - Seller 권한 payload, 상위 주문 uuid, 하위 주문 uuid
 * @returns IAiCommerceSubOrder - 하위주문의 모든 비즈니스 상세 정보 (상태, 금액, 운송, 코드 등)
 * @throws {Error} 하위주문이 존재하지 않거나, 판매자에게 소유/권한이 없는 경우
 */
export async function getaiCommerceSellerOrdersOrderIdSubOrdersSubOrderId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  subOrderId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceSubOrder> {
  const record = await MyGlobal.prisma.ai_commerce_sub_orders.findFirst({
    where: {
      id: props.subOrderId,
      order_id: props.orderId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new Error("Sub-order not found or access denied.");
  }
  return {
    id: record.id,
    order_id: record.order_id,
    seller_id: record.seller_id,
    suborder_code: record.suborder_code,
    status: record.status,
    shipping_method:
      record.shipping_method === null ? undefined : record.shipping_method,
    tracking_number:
      record.tracking_number === null ? undefined : record.tracking_number,
    total_price: record.total_price,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
