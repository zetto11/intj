import express from "express";
import { getCameras, createCamera, discoverCameras, updateCamera, deleteCamera, restartCamera, blockCamera, captureCameraFrame, runVectorAnalysis, proxyCameraStream } from "../controllers/cameraController";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware";
import { Server } from "socket.io";

const createCameraRouter = (io: Server) => {
  const router = express.Router();

  router.get("/", authenticateToken, getCameras);
  router.get("/discover", authenticateToken, discoverCameras);
  router.post("/", authenticateToken, isAdmin, createCamera);
  router.put("/:id", authenticateToken, isAdmin, updateCamera);
  router.post("/:id/restart", authenticateToken, isAdmin, restartCamera);
  router.delete("/:id", authenticateToken, isAdmin, deleteCamera);
  router.post("/:id/block", authenticateToken, isAdmin, blockCamera(io));
  router.post("/:id/capture", authenticateToken, captureCameraFrame);
  router.post("/:id/vector-analysis", authenticateToken, runVectorAnalysis);
  router.get("/:id/stream", proxyCameraStream);

  return router;
};

export default createCameraRouter;
