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

export async function putShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IShoppingMallConfiguration.IUpdate;
}): Promise<IShoppingMallConfiguration> {
  const config = await MyGlobal.prisma.shopping_mall_configurations.findUnique({
    where: { id: props.configurationId },
  });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  // Determine new revision (if not supplied): increment existing
  const newRevision =
    props.body.revision !== undefined
      ? props.body.revision
      : config.revision + 1;
  // Prepare update object: only editable fields
  const updated = await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: props.configurationId },
    data: {
      // Optional channel scope
      shopping_mall_channel_id:
        props.body.shopping_mall_channel_id ?? undefined,
      key: props.body.key ?? undefined,
      value: props.body.value ?? undefined,
      revision: newRevision,
      description: props.body.description ?? undefined,
      deleted_at: props.body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Map DB values to API DTO structure with correct null/undefined
  return {
    id: updated.id,
    shopping_mall_channel_id:
      updated.shopping_mall_channel_id === null
        ? undefined
        : updated.shopping_mall_channel_id,
    key: updated.key,
    value: updated.value,
    revision: updated.revision,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || typeof updated.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
