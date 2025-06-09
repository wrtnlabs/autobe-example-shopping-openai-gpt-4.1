import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReview";

export async function test_api_productReviews_getById(
  connection: api.IConnection,
) {
  const output: IProductReview = await api.functional.productReviews.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
