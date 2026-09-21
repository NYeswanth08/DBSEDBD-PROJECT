import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getParentProfile,
  getParentStudents,
  getStudentTransportStatus,
  getParentDashboard,
  getParentNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/parent-dashboard.controller.js";

export const parentDashboardRouter = Router();

// All parent routes require authentication and PARENT role
parentDashboardRouter.use(authenticate, authorize("PARENT"));

// Profile
parentDashboardRouter.get("/me", getParentProfile);

// Dashboard (profile + all students + status in one call)
parentDashboardRouter.get("/dashboard", getParentDashboard);

// Students
parentDashboardRouter.get("/students", getParentStudents);
parentDashboardRouter.get("/students/:studentId/status", getStudentTransportStatus);

// Notifications
parentDashboardRouter.get("/notifications", getParentNotifications);
parentDashboardRouter.put("/notifications/read-all", markAllNotificationsRead);
parentDashboardRouter.put("/notifications/:id/read", markNotificationRead);
