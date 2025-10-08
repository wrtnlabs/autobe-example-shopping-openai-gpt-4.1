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

export async function putShoppingMallAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IShoppingMallRole.IUpdate;
}): Promise<IShoppingMallRole> {
  const { admin, roleId, body } = props;

  // Fetch current role; throw 404 if not found or consider deleted/forbidden in the future
  const role = await MyGlobal.prisma.shopping_mall_roles.findUnique({
    where: { id: roleId },
  });
  if (!role) throw new HttpException("Role not found", 404);

  // Ensure at least one updatable field provided
  const fieldsToUpdate: { [key: string]: any } = {};
  if (body.role_name !== undefined)
    fieldsToUpdate["role_name"] = body.role_name;
  if (body.description !== undefined)
    fieldsToUpdate["description"] = body.description;
  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new HttpException("No updatable fields provided", 400);
  }
  fieldsToUpdate["updated_at"] = toISOStringSafe(new Date());

  // Attempt update; handle unique constraint error
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_roles.update({
      where: { id: roleId },
      data: fieldsToUpdate,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" // Unique constraint failed
    ) {
      throw new HttpException("Role name already exists", 409);
    }
    throw err;
  }

  return {
    id: updated.id,
    role_name: updated.role_name,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
