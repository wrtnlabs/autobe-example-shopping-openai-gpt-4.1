import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdContent(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductContent.IUpdate;
}): Promise<IShoppingMallProductContent> {
  // 1. Verify product exists, is owned by seller, not deleted, and not discontinued or deleted status
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      status: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Only owning seller can update product content",
      403,
    );
  }
  if (product.status === "Deleted" || product.status === "Discontinued") {
    throw new HttpException(
      "Cannot update content for discontinued or deleted product",
      400,
    );
  }

  // 2. Find existing content entity for this product (by productId and locale)
  const content = await MyGlobal.prisma.shopping_mall_product_content.findFirst(
    {
      where: {
        shopping_mall_product_id: props.productId,
        locale: props.body.locale,
      },
    },
  );
  if (!content) {
    throw new HttpException("Product content not found for update", 404);
  }

  // 3. Audit/Snapshot: (skip if table/model is not defined)
  // -- If shopping_mall_product_content_snapshots model exists, insert snapshot of old state before update (not implemented here)

  // 4. Update content fields
  const updated = await MyGlobal.prisma.shopping_mall_product_content.update({
    where: { id: content.id },
    data: {
      content_markdown: props.body.content_markdown,
      return_policy: props.body.return_policy,
      warranty_policy: props.body.warranty_policy,
      locale: props.body.locale,
    },
  });

  // 5. Return the updated row as IShoppingMallProductContent
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    content_markdown: updated.content_markdown,
    return_policy: updated.return_policy,
    warranty_policy: updated.warranty_policy,
    locale: updated.locale,
  };
}
