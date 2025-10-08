import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrderHistoriesOrderHistoryId(props: {
  admin: AdminPayload;
  orderHistoryId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderHistory.IUpdate;
}): Promise<IShoppingMallOrderHistory> {
  const { admin, orderHistoryId, body } = props;

  // Fetch the order history record, throw 404 if missing
  const record = await MyGlobal.prisma.shopping_mall_order_histories.findUnique(
    {
      where: { id: orderHistoryId },
    },
  );
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Order history not found", 404);
  }

  // Only update snapshot_reason if provided
  let updatedRecord;
  if (body.snapshot_reason !== undefined) {
    updatedRecord = await MyGlobal.prisma.shopping_mall_order_histories.update({
      where: { id: orderHistoryId },
      data: {
        snapshot_reason: body.snapshot_reason,
        // updated_at will be auto-handled by Prisma
      },
    });
  } else {
    // No update; just return existing record
    updatedRecord = record;
  }

  return {
    id: updatedRecord.id,
    shopping_mall_order_id: updatedRecord.shopping_mall_order_id,
    snapshot_type: updatedRecord.snapshot_type,
    order_status: updatedRecord.order_status,
    order_total: updatedRecord.order_total,
    snapshot_reason: updatedRecord.snapshot_reason ?? undefined,
    created_at: toISOStringSafe(updatedRecord.created_at),
    deleted_at: updatedRecord.deleted_at
      ? toISOStringSafe(updatedRecord.deleted_at)
      : undefined,
  };
}
