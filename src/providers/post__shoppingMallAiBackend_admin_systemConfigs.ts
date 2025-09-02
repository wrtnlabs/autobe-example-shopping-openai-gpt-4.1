import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new global system configuration entry.
 *
 * Adds a new record to shopping_mall_ai_backend_system_configs, defining the
 * key, value, optional description, and effective date bounds. Enables system
 * operators (admins) to control business policies, platform-wide toggles, and
 * operational parameters in an auditable manner.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation (must
 *   be authorized)
 * @param props.body - IShoppingMallAiBackendSystemConfig.ICreate: Configuration
 *   to create (key, value, description?, effective_from?, effective_to?)
 * @returns The full system config entry as stored (including id, timestamps,
 *   null deleted_at)
 * @throws {Error} If attempting to create a config with a duplicate key
 */
export async function post__shoppingMallAiBackend_admin_systemConfigs(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendSystemConfig.ICreate;
}): Promise<IShoppingMallAiBackendSystemConfig> {
  const { admin, body } = props;
  try {
    // ISO string timestamps (no Date types)
    const now = toISOStringSafe(new Date());
    const created =
      await MyGlobal.prisma.shopping_mall_ai_backend_system_configs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          key: body.key,
          value: body.value,
          description: body.description ?? null,
          effective_from: body.effective_from ?? null,
          effective_to: body.effective_to ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description ?? null,
      effective_from: created.effective_from
        ? toISOStringSafe(created.effective_from)
        : null,
      effective_to: created.effective_to
        ? toISOStringSafe(created.effective_to)
        : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    } satisfies IShoppingMallAiBackendSystemConfig;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("A system config with this key already exists.");
    }
    throw err;
  }
}
