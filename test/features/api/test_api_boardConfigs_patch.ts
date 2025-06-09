import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBoardConfig";
import { IBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoardConfig";

export async function test_api_boardConfigs_patch(connection: api.IConnection) {
  const output: IPageIBoardConfig = await api.functional.boardConfigs.patch(
    connection,
    {
      body: typia.random<IBoardConfig.IRequest>(),
    },
  );
  typia.assert(output);
}
