import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new store setting (ai_commerce_store_settings).
 *
 * This endpoint allows an authenticated admin to create a new configuration
 * setting for a specific store. The store setting includes a settings_json blob
 * and an explicit active flag. Each store may have only one active settings
 * record at a time. All operations are logged for compliance and audit.
 *
 * Business logic enforces uniqueness of the (store_id, active) pair. If an
 * active setting already exists for the target store, the operation will fail
 * with an explanatory error. Upon successful creation, an audit log entry is
 * generated.
 *
 * @param props - Object containing required properties.
 * @param props.admin - Authenticated admin performing the operation.
 * @param props.body - Store setting creation payload (store_id, settings_json,
 *   active flag).
 * @returns Newly created store setting record, including timestamps and
 *   references.
 * @throws {Error} If an active setting already exists for the specified store
 *   (uniqueness violation), or if Prisma encounters another error.
 */
export async function postaiCommerceAdminStoreSettings(props: {
  admin: AdminPayload;
  body: IAiCommerceStoreSetting.ICreate;
}): Promise<IAiCommerceStoreSetting> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const auditId: string & tags.Format<"uuid"> = v4();
  try {
    const created = await MyGlobal.prisma.ai_commerce_store_settings.create({
      data: {
        id,
        store_id: props.body.store_id,
        settings_json: props.body.settings_json,
        active: props.body.active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Write audit log for compliance (minimal fields)
    await MyGlobal.prisma.ai_commerce_cart_audit_logs.create({
      data: {
        id: auditId,
        cart_id: null,
        actor_id: props.admin.id,
        entity_type: "store_setting",
        action_type: "create",
        before_state_json: null,
        after_state_json: JSON.stringify({
          id: created.id,
          store_id: created.store_id,
          settings_json: created.settings_json,
          active: created.active,
        }),
        created_at: now,
      },
    });
    return {
      id: created.id,
      store_id: created.store_id,
      settings_json: created.settings_json,
      active: created.active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== undefined && created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new Error("Active setting already exists for this store");
    }
    throw err;
  }
}
