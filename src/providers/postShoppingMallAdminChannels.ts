import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminChannels(props: {
  admin: AdminPayload;
  body: IShoppingMallChannel.ICreate;
}): Promise<IShoppingMallChannel> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  try {
    const created = await MyGlobal.prisma.shopping_mall_channels.create({
      data: {
        id,
        code: props.body.code,
        name: props.body.name,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description ?? undefined,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Channel code must be unique.", 409);
    }
    throw err;
  }
}
