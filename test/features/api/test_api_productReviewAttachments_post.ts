import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReviewAttachment";

export async function test_api_productReviewAttachments_post(
  connection: api.IConnection,
) {
  const output: IProductReviewAttachment =
    await api.functional.productReviewAttachments.post(connection, {
      body: typia.random<IProductReviewAttachment.ICreate>(),
    });
  typia.assert(output);
}
