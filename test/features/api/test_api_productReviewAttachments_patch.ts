import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductReviewAttachment";
import { IProductReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReviewAttachment";

export async function test_api_productReviewAttachments_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductReviewAttachment =
    await api.functional.productReviewAttachments.patch(connection, {
      body: typia.random<IProductReviewAttachment.IRequest>(),
    });
  typia.assert(output);
}
