import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCartsCartIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  cartId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartSnapshot> {
  const snapshot = await MyGlobal.prisma.shopping_mall_cart_snapshots.findFirst(
    {
      where: {
        id: props.snapshotId,
        shopping_mall_cart_id: props.cartId,
      },
    },
  );
  if (!snapshot) {
    throw new HttpException("Cart snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_cart_id: snapshot.shopping_mall_cart_id,
    snapshot_data: snapshot.snapshot_data,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
