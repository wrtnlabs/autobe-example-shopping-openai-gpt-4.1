import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductReviewAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReviewAttachment";

export async function test_api_productReviewAttachments_putById(
  connection: api.IConnection,
) {
  const output: IProductReviewAttachment =
    await api.functional.productReviewAttachments.putById(connection, {
      id: typia.random<string>(),
      body: typia.random<IProductReviewAttachment.IUpdate>(),
    });
  typia.assert(output);
}
