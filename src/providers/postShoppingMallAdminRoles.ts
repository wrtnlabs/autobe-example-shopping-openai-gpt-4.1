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

export async function postShoppingMallAdminRoles(props: {
  admin: AdminPayload;
  body: IShoppingMallRole.ICreate;
}): Promise<IShoppingMallRole> {
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.shopping_mall_roles.create({
      data: {
        id: v4(),
        role_name: props.body.role_name,
        description: props.body.description,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      role_name: created.role_name,
      description: created.description,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Duplicate role_name: Role already exists.", 409);
    }
    throw new HttpException("Failed to create role", 500);
  }
}
