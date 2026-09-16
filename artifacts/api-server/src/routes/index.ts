import { Router, type IRouter } from "express";
import healthRouter from "./health";
import caseFilesRouter from "./case-files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(caseFilesRouter);

export default router;
