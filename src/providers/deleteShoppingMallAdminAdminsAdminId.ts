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
  const { admin, adminId } = props;
  // Fetch the target admin to ensure they exist.
  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { id: adminId },
  });
  if (!targetAdmin) {
    throw new HttpException("Admin not found", 404);
  }
  // Cannot delete yourself
  if (admin.id === adminId) {
    throw new HttpException("Admins cannot delete their own account", 403);
  }
  // If platform distinguishes super-admins, check status or role. Here, as no explicit field exists, assume all admins are equal.
  await MyGlobal.prisma.shopping_mall_admins.delete({
    where: { id: adminId },
  });
}
