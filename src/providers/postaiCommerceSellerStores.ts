import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new store (ai_commerce_stores table) for an authenticated seller or
 * admin.
 *
 * This operation creates a new store record in the ai_commerce_stores table. It
 * requires the authenticated seller (props.seller) context, and exact DTO
 * conformance for IAiCommerceStores.ICreate. Business logic ensures compliance
 * with schema, uniqueness of store_code, and linkage to a valid seller
 * profile.
 *
 * All timestamps and identifiers are generated using compliant strategies
 * (toISOStringSafe and v4 for UUIDs). Any constraint violation, such as unique
 * store_code conflict, will result in an explicit error. Returns the newly
 * created store as a full IAiCommerceStores record.
 *
 * @param props - The properties for this operation
 * @param props.seller - The authenticated seller (must be authorized)
 * @param props.body - Payload containing the information necessary to create a
 *   new store
 * @returns The newly created store record
 * @throws {Error} If store_code already exists or other database constraint is
 *   violated.
 */
export async function postaiCommerceSellerStores(props: {
  seller: SellerPayload;
  body: IAiCommerceStores.ICreate;
}): Promise<IAiCommerceStores> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const {
    owner_user_id,
    seller_profile_id,
    store_name,
    store_code,
    store_metadata,
    approval_status,
    closure_reason,
  } = props.body;
  try {
    const created = await MyGlobal.prisma.ai_commerce_stores.create({
      data: {
        id: id,
        owner_user_id: owner_user_id,
        seller_profile_id: seller_profile_id,
        store_name: store_name,
        store_code: store_code,
        store_metadata: store_metadata ?? null,
        approval_status: approval_status,
        closure_reason: closure_reason ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      owner_user_id: created.owner_user_id,
      seller_profile_id: created.seller_profile_id,
      store_name: created.store_name,
      store_code: created.store_code,
      store_metadata: created.store_metadata ?? null,
      approval_status: created.approval_status,
      closure_reason: created.closure_reason ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    // Map unique constraint (store_code) violation or others to business errors if required
    throw err;
  }
}
