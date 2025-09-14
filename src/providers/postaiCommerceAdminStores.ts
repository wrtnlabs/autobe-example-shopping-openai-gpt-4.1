import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new store (ai_commerce_stores table) for an authenticated seller or
 * admin.
 *
 * This operation enables an authenticated admin to register a new store. It
 * validates uniqueness of store_code, verifies all referenced entities, assigns
 * required fields (with explicit nulls for optional fields), and returns the
 * full store record as IAiCommerceStores. All datetime values are formatted as
 * string & tags.Format<'date-time'>. Only administrators may create stores with
 * this endpoint.
 *
 * @param props - Object containing:
 *
 *   - Admin: The administrator performing the operation
 *   - Body: Store creation payload with all required and optional store fields
 *
 * @returns Full IAiCommerceStores record representing the newly created store
 * @throws {Error} If store_code already exists, referenced owner_user_id or
 *   seller_profile_id are missing, or if any step fails integrity validation.
 */
export async function postaiCommerceAdminStores(props: {
  admin: AdminPayload;
  body: IAiCommerceStores.ICreate;
}): Promise<IAiCommerceStores> {
  // Prepare current datetime
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Uniqueness: store_code must not already exist
  const duplicate = await MyGlobal.prisma.ai_commerce_stores.findUnique({
    where: { store_code: props.body.store_code },
  });
  if (duplicate) throw new Error("A store with that store_code already exists");

  // Validate owner_user_id exists
  const owner =
    await MyGlobal.prisma.ai_commerce_user_authentications.findUnique({
      where: { id: props.body.owner_user_id },
    });
  if (!owner) throw new Error("Specified owner_user_id does not exist");

  // Validate seller_profile_id exists
  const sellerProfile =
    await MyGlobal.prisma.ai_commerce_seller_profiles.findUnique({
      where: { id: props.body.seller_profile_id },
    });
  if (!sellerProfile)
    throw new Error("Specified seller_profile_id does not exist");

  // Create new store record
  const created = await MyGlobal.prisma.ai_commerce_stores.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      owner_user_id: props.body.owner_user_id,
      seller_profile_id: props.body.seller_profile_id,
      store_name: props.body.store_name,
      store_code: props.body.store_code,
      store_metadata: props.body.store_metadata ?? null,
      approval_status: props.body.approval_status,
      closure_reason: props.body.closure_reason ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Map fields to IAiCommerceStores, using undefined for optional/nullable fields if value is null
  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    seller_profile_id: created.seller_profile_id,
    store_name: created.store_name,
    store_code: created.store_code,
    store_metadata:
      created.store_metadata === null ? undefined : created.store_metadata,
    approval_status: created.approval_status,
    closure_reason:
      created.closure_reason === null ? undefined : created.closure_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
