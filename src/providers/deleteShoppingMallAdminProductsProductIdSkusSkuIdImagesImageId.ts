import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdSkusSkuIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the catalog image, ensure it matches the product and sku
  const image = await MyGlobal.prisma.shopping_mall_catalog_images.findUnique({
    where: { id: props.imageId },
  });
  if (
    !image ||
    image.shopping_mall_product_id !== props.productId ||
    image.shopping_mall_product_sku_id !== props.skuId
  ) {
    throw new HttpException(
      "Image does not exist or does not belong to the specified SKU/product.",
      404,
    );
  }

  // 2. Hard delete the image
  await MyGlobal.prisma.shopping_mall_catalog_images.delete({
    where: { id: props.imageId },
  });

  // 3. Insert audit log
  await MyGlobal.prisma.shopping_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: props.admin.id,
      affected_product_id: props.productId,
      affected_seller_id: null,
      affected_order_id: null,
      affected_customer_id: null,
      affected_review_id: null,
      action_type: "delete_image",
      action_reason: "Admin deleted SKU image.",
      domain: "product_image",
      details_json: JSON.stringify({
        imageId: props.imageId,
        productId: props.productId,
        skuId: props.skuId,
        url: image.url,
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
