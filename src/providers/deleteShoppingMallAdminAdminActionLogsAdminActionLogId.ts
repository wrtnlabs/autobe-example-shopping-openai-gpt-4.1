import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminActionLogsAdminActionLogId(props: {
  admin: AdminPayload;
  adminActionLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Attempt to delete. If not found, throw 404.
  try {
    await MyGlobal.prisma.shopping_mall_admin_action_logs.delete({
      where: { id: props.adminActionLogId },
    });
  } catch (err) {
    // Detects Prisma 'record not found' error
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Admin action log not found", 404);
    }
    throw err;
  }
}
