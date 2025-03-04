import { CommandFactory } from "nest-commander";

import { ConsoleModule } from "./libs/console/console.module";

async function console() {
  await CommandFactory.run(ConsoleModule, ["warn", "error", "log"]);
}

console();
