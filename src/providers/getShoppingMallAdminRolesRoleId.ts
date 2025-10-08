import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRole> {
  const { roleId } = props;
  const role = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      role_name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  return {
    id: role.id,
    role_name: role.role_name,
    description: role.description,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
  };
}
