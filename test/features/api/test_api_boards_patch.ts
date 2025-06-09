import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBoard";
import { IBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoard";

export async function test_api_boards_patch(connection: api.IConnection) {
  const output: IPageIBoard = await api.functional.boards.patch(connection, {
    body: typia.random<IBoard.IRequest>(),
  });
  typia.assert(output);
}
