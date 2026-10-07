import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(config.port, () => {
    logger.info(`apiforge sidecar listening on port ${config.port} (${config.nodeEnv})`);
});
