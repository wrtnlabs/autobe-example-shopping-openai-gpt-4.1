import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminUserConnectionsUserConnectionId(props: {
  admin: AdminPayload;
  userConnectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.shopping_mall_user_connections.delete({
      where: {
        id: props.userConnectionId,
      },
    });
  } catch {
    throw new HttpException("User connection not found", 404);
  }
}
