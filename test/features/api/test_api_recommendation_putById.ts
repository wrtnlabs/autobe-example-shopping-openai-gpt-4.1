import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecommendation";

export async function test_api_recommendation_putById(
  connection: api.IConnection,
) {
  const output: IRecommendation = await api.functional.recommendation.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRecommendation.IUpdate>(),
    },
  );
  typia.assert(output);
}
