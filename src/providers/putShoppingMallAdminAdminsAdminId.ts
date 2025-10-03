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
  // 1. Authorization: Only the admin themselves can update their own info
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // 2. Prepare update fields (prune to only updatable fields)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      email: props.body.email,
      password_hash: props.body.password_hash ?? undefined,
      name: props.body.name,
      status: props.body.status,
      kyc_status: props.body.kyc_status,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      kyc_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // 3. Return, formatting datetime fields as string & tags.Format<'date-time'>
  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    status: updated.status,
    kyc_status: updated.kyc_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
