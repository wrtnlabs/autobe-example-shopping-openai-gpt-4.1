import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check the role exists
  const role = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { id: props.roleId },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }

  // 2. Delete the role (hard delete, no soft-delete field)
  await MyGlobal.prisma.shopping_mall_roles.delete({
    where: { id: props.roleId },
  });

  // 3. Log the deletion for audit/compliance
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action_type: "delete-role",
      action_reason: `Permanently deleted role '${role.role_name}' (ID: ${role.id})`,
      domain: "role",
      details_json: JSON.stringify({
        roleId: role.id,
        roleName: role.role_name,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
