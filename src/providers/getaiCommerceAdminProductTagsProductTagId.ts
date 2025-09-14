import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a specific product-tag binding (ai_commerce_product_tags).
 *
 * This operation retrieves detailed information for a specific product-tag
 * binding by its unique identifier from the ai_commerce_product_tags table.
 * Used for analytics, tag audits, or discovery workflows. Only accessible by
 * admins.
 *
 * The returned object includes all mandatory information about the product-tag
 * relationship, strictly matching the IAiCommerceProductTag specification.
 * Throws if not found or if the caller lacks permission (enforced by admin
 * payload and guards).
 *
 * @param props - Properties for the operation
 * @param props.admin - The authenticated admin requesting this operation
 * @param props.productTagId - UUID of the product-tag binding record to
 *   retrieve
 * @returns The full details of the product-tag binding
 * @throws {Error} If the binding is not found or the admin is unauthorized
 */
export async function getaiCommerceAdminProductTagsProductTagId(props: {
  admin: AdminPayload;
  productTagId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductTag> {
  const record =
    await MyGlobal.prisma.ai_commerce_product_tags.findFirstOrThrow({
      where: { id: props.productTagId },
      select: {
        id: true,
        ai_commerce_product_id: true,
        ai_commerce_tag_id: true,
        created_at: true,
      },
    });
  return {
    id: record.id,
    ai_commerce_product_id: record.ai_commerce_product_id,
    ai_commerce_tag_id: record.ai_commerce_tag_id,
    created_at: toISOStringSafe(record.created_at),
  };
}
