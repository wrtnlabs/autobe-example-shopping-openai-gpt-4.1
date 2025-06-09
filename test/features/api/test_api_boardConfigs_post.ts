import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardConfig";

export async function test_api_boardConfigs_post(connection: api.IConnection) {
  const output: IBoardConfig = await api.functional.boardConfigs.post(
    connection,
    {
      body: typia.random<IBoardConfig.ICreate>(),
    },
  );
  typia.assert(output);
}
