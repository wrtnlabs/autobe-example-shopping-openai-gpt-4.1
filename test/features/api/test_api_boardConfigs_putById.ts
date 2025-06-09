import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardConfig";

export async function test_api_boardConfigs_putById(
  connection: api.IConnection,
) {
  const output: IBoardConfig = await api.functional.boardConfigs.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IBoardConfig.IUpdate>(),
    },
  );
  typia.assert(output);
}
