import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get a single global system configuration by configId.
 *
 * Retrieves all properties of a single system/global configuration from its
 * unique configId. Used for viewing current, scheduled, or archived config
 * entries and their details. Security restrictions apply—admin/DevOps only.
 * Throws an error if config does not exist or is deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.configId - Unique identifier of the configuration record (UUID)
 * @returns The detailed system configuration entry with all properties,
 *   formatted for API output
 * @throws {Error} When the config record does not exist or is soft-deleted
 */
export async function get__shoppingMallAiBackend_admin_systemConfigs_$configId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendSystemConfig> {
  const { admin, configId } = props;

  // Authorization is enforced by decorator, but double-check for defense-in-depth
  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  const config =
    await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.findFirst({
      where: { id: configId, deleted_at: null },
    });

  if (!config) {
    throw new Error("Config not found");
  }

  return {
    id: config.id,
    key: config.key,
    value: config.value,
    description: config.description ?? null,
    effective_from: config.effective_from
      ? toISOStringSafe(config.effective_from)
      : null,
    effective_to: config.effective_to
      ? toISOStringSafe(config.effective_to)
      : null,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
