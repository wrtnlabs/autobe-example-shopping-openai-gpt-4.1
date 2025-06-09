import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReview";

export async function test_api_productReviews_putById(
  connection: api.IConnection,
) {
  const output: IProductReview = await api.functional.productReviews.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductReview.IUpdate>(),
    },
  );
  typia.assert(output);
}
