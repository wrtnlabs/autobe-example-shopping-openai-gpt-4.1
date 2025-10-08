import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  // Check if admin exists (not soft-deleted)
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new HttpException("Admin not found", 404);
  }

  // Reject duplicate email if changing
  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const duplicate = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.adminId },
      },
    });
    if (duplicate) {
      throw new HttpException("Email already in use by another admin", 409);
    }
  }

  // Prepare update fields (only allow mutable fields + updated_at)
  const now = toISOStringSafe(new Date());
  const data: {
    email?: string;
    full_name?: string;
    status?: string;
    two_factor_secret?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (props.body.email !== undefined) data.email = props.body.email;
  if (props.body.full_name !== undefined) data.full_name = props.body.full_name;
  if (props.body.status !== undefined) data.status = props.body.status;
  if (props.body.two_factor_secret !== undefined)
    data.two_factor_secret = props.body.two_factor_secret;

  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data,
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.full_name,
    status: updated.status,
    two_factor_secret: updated.two_factor_secret ?? null,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
