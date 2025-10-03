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

export async function getShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallConfiguration> {
  const conf = await MyGlobal.prisma.shopping_mall_configurations.findUnique({
    where: { id: props.configurationId },
  });

  if (!conf || conf.deleted_at) {
    throw new HttpException("Configuration not found", 404);
  }

  return {
    id: conf.id,
    shopping_mall_channel_id:
      conf.shopping_mall_channel_id === null
        ? null
        : conf.shopping_mall_channel_id,
    key: conf.key,
    value: conf.value,
    revision: conf.revision,
    description: conf.description === null ? null : conf.description,
    created_at: toISOStringSafe(conf.created_at),
    updated_at: toISOStringSafe(conf.updated_at),
    deleted_at:
      conf.deleted_at === null ? null : toISOStringSafe(conf.deleted_at),
  };
}
