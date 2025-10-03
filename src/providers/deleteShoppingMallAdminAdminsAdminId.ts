import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const target = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (target === null) {
    throw new HttpException("Admin not found or already deleted", 404);
  }

  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
