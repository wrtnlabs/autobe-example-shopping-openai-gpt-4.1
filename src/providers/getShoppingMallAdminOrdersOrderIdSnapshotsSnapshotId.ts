import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!snapshot || snapshot.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_order_id: snapshot.shopping_mall_order_id,
    snapshot_data: snapshot.snapshot_data,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
