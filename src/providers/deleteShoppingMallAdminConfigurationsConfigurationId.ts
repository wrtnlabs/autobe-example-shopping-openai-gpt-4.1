import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check for existence & not already deleted
  const config = await MyGlobal.prisma.shopping_mall_configurations.findFirst({
    where: {
      id: props.configurationId,
      deleted_at: null,
    },
  });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  // Soft delete (set deleted_at only)
  await MyGlobal.prisma.shopping_mall_configurations.update({
    where: { id: props.configurationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
