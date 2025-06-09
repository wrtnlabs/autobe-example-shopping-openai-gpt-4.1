import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecommendation";

export async function test_api_recommendation_getById(
  connection: api.IConnection,
) {
  const output: IRecommendation = await api.functional.recommendation.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
