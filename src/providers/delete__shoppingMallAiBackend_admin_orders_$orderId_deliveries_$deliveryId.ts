import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a specific delivery record of an order by marking it as deleted.
 *
 * 删除指定订单的配送记录（软删除，逻辑删除）。仅管理员可用。此操作会设置配送记录（shopping_mall_ai_backend_order_deliveries）的
 * deleted_at 字段，用于合规和可审计性。相关配送事件记录不会被级联删除。
 *
 * @param props - 请求参数对象
 * @param props.admin - 已认证的管理员身份标识（AdminPayload）
 * @param props.orderId - 要删除配送记录的订单ID（UUID）
 * @param props.deliveryId - 要删除的配送记录ID（UUID）
 * @returns 无返回值
 * @throws {Error} 如果指定的配送记录不存在或已被删除，则抛出异常
 * @throws {Error} 如果当前用户没有管理员权限，则抛出异常
 */
export async function delete__shoppingMallAiBackend_admin_orders_$orderId_deliveries_$deliveryId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  deliveryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderId, deliveryId } = props;

  // 查找未被删除的配送记录。如果未找到，则抛出异常。
  const delivery =
    await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.findFirst({
      where: {
        id: deliveryId,
        shopping_mall_ai_backend_order_id: orderId,
        deleted_at: null,
      },
    });
  if (!delivery) {
    throw new Error("Delivery not found");
  }

  // 设置 deleted_at 字段为当前时间（ISO 字符串，符合 API 规范）
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.shopping_mall_ai_backend_order_deliveries.update({
    where: { id: deliveryId },
    data: { deleted_at: deletedAt },
  });

  // 注意：不级联删除相关的配送事件，仅作逻辑删除。
}
