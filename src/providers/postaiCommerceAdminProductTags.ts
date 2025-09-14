import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new product-tag binding in the ai_commerce_product_tags table.
 *
 * This endpoint is used to associate a tag with an existing product to improve
 * search, discovery, and categorization features. Only an authenticated admin
 * may access this operation. The binding must be unique for each (product, tag)
 * pair: if the association already exists, the request is rejected.
 *
 * @param props - The request object
 * @param props.admin - The authenticated admin user
 * @param props.body - The binding creation request with product and tag IDs
 * @returns The newly created product-tag binding
 * @throws {Error} If the binding for (product, tag) already exists, or if there
 *   is a data layer error
 */
export async function postaiCommerceAdminProductTags(props: {
  admin: AdminPayload;
  body: IAiCommerceProductTag.ICreate;
}): Promise<IAiCommerceProductTag> {
  // Check for duplicate association
  const duplicate = await MyGlobal.prisma.ai_commerce_product_tags.findFirst({
    where: {
      ai_commerce_product_id: props.body.ai_commerce_product_id,
      ai_commerce_tag_id: props.body.ai_commerce_tag_id,
    },
  });
  if (duplicate) {
    throw new Error("The specified tag is already assigned to this product.");
  }

  // Insert new product-tag binding
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.ai_commerce_product_tags.create({
    data: {
      id: newId,
      ai_commerce_product_id: props.body.ai_commerce_product_id,
      ai_commerce_tag_id: props.body.ai_commerce_tag_id,
      created_at: now,
    },
  });

  // Return with correct branded types
  return {
    id: created.id,
    ai_commerce_product_id: created.ai_commerce_product_id,
    ai_commerce_tag_id: created.ai_commerce_tag_id,
    created_at: created.created_at,
  };
}
