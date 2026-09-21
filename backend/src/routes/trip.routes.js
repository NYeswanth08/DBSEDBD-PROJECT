import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listTrips,
  getTripOptions,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  closeStaleTrip,
} from '../controllers/trip.controller.js';
import { getAdminTripLocation } from '../controllers/tracking.controller.js';

export const tripRouter = Router();

// All routes require ADMIN role
tripRouter.use(authenticate, authorize('ADMIN'));

// Options for dropdown selectors (must precede /:id)
tripRouter.get('/options', getTripOptions);

// Live bus location telemetry
tripRouter.get('/:id/location', getAdminTripLocation);

// Stale trip closure by admin
tripRouter.post('/:id/close-stale', closeStaleTrip);

// CRUD
tripRouter.get('/', listTrips);
tripRouter.get('/:id', getTrip);
tripRouter.post('/', createTrip);
tripRouter.put('/:id', updateTrip);
tripRouter.delete('/:id', deleteTrip);

