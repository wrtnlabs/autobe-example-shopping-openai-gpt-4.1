import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  // Check for duplicate configuration key in current (not-deleted) rows
  const exists = await MyGlobal.prisma.shopping_mall_configurations.findFirst({
    where: {
      shopping_mall_channel_id: props.body.shopping_mall_channel_id ?? null,
      key: props.body.key,
      deleted_at: null,
    },
  });
  if (exists) {
    throw new HttpException("Duplicate configuration key", 409);
  }
  const now = toISOStringSafe(new Date());
  const record = await MyGlobal.prisma.shopping_mall_configurations.create({
    data: {
      id: v4(),
      shopping_mall_channel_id: props.body.shopping_mall_channel_id ?? null,
      key: props.body.key,
      value: props.body.value,
      revision: props.body.revision,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: record.id,
    shopping_mall_channel_id:
      record.shopping_mall_channel_id === null
        ? undefined
        : record.shopping_mall_channel_id,
    key: record.key,
    value: record.value,
    revision: record.revision,
    description: record.description === null ? undefined : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? undefined
        : toISOStringSafe(record.deleted_at),
  };
}
