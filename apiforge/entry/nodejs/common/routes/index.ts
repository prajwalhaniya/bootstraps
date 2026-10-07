import { Router } from "express";

// apiforge:app-imports:start
import sampleAppRoutes from "../../apps/sample-app/routes/index.js";
// apiforge:app-imports:end

const router = Router();

// apiforge:app-mounts:start
router.use("/app/js/sample-app/api", sampleAppRoutes);
// apiforge:app-mounts:end

export default router;
