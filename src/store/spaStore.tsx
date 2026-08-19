// Spa store — API-backed (Phase 3). localStorage is no longer the source of truth.
import { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import {
  getSpaSlots,
  getMyBookings,
  type TimeSlotItem,
  type ApiSpaBooking,
} from '../services/spaService';

// ── Public types kept for backward compatibility with modal / admin page ──────
export type TimeSlot = TimeSlotItem;
export type SpaBooking = ApiSpaBooking;

// ── State ─────────────────────────────────────────────────────────────────────
interface SpaState {
  slots: TimeSlot[];
  bookings: SpaBooking[]; // current user's bookings (customer view)
  slotsLoading: boolean;
  bookingsLoading: boolean;
}

type SpaAction =
  | { type: 'SET_SLOTS'; payload: TimeSlot[] }
  | { type: 'SET_SLOTS_LOADING'; payload: boolean }
  | { type: 'ADD_SLOT'; payload: TimeSlot }
  | { type: 'UPDATE_SLOT'; payload: TimeSlot }
  | { type: 'DELETE_SLOT'; payload: string | number }
  | { type: 'SET_BOOKINGS'; payload: SpaBooking[] }
  | { type: 'SET_BOOKINGS_LOADING'; payload: boolean }
  | { type: 'ADD_BOOKING'; payload: SpaBooking }
  | { type: 'UPDATE_BOOKING'; payload: SpaBooking }
  | { type: 'REMOVE_BOOKING'; payload: string | number };

function reducer(state: SpaState, action: SpaAction): SpaState {
  switch (action.type) {
    case 'SET_SLOTS':
      return {
        ...state,
        slots: Array.isArray(action.payload) ? action.payload : [],
      };

    case 'SET_SLOTS_LOADING':
      return { ...state, slotsLoading: action.payload };

    case 'ADD_SLOT':
      return { ...state, slots: [...state.slots, action.payload] };

    case 'UPDATE_SLOT':
      return {
        ...state,
        slots: state.slots.map(s =>
          String(s.id) === String(action.payload.id)
            ? action.payload
            : s
        ),
      };

    case 'DELETE_SLOT':
      return {
        ...state,
        slots: state.slots.filter(
          s => String(s.id) !== String(action.payload)
        ),
      };

    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };

    case 'SET_BOOKINGS_LOADING':
      return { ...state, bookingsLoading: action.payload };

    case 'ADD_BOOKING':
      return {
        ...state,
        bookings: [action.payload, ...state.bookings],
      };

    case 'UPDATE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.map(b =>
          String(b.id) === String(action.payload.id)
            ? action.payload
            : b
        ),
      };

    case 'REMOVE_BOOKING':
      return {
        ...state,
        bookings: state.bookings.filter(
          b => String(b.id) !== String(action.payload)
        ),
      };

    default:
      return state;
  }
}

const initialState: SpaState = {
  slots: [],
  bookings: [],
  slotsLoading: false,
  bookingsLoading: false,
};

// ── Context ───────────────────────────────────────────────────────────────────
interface SpaContextType {
  state: SpaState;
  dispatch: React.Dispatch<SpaAction>;
  refreshSlots: () => Promise<void>;
  refreshMyBookings: () => Promise<void>;
  // Legacy helpers used by existing admin page — now no-op shims mapped to dispatch
  addBooking: (booking: SpaBooking) => void;
  updateBookingStatus: (id: string | number, status: SpaBooking['status']) => void;
}

const SpaContext = createContext<SpaContextType | null>(null);

export function SpaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

 const refreshSlots = useCallback(async () => {
  dispatch({ type: 'SET_SLOTS_LOADING', payload: true });

  try {
    const slots = await getSpaSlots();

    dispatch({
      type: 'SET_SLOTS',
      payload: Array.isArray(slots) ? slots : [],
    });
  } finally {
    dispatch({ type: 'SET_SLOTS_LOADING', payload: false });
  }
}, []);

  const refreshMyBookings = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    dispatch({ type: 'SET_BOOKINGS_LOADING', payload: true });
    try {
      const bookings = await getMyBookings();
      dispatch({ type: 'SET_BOOKINGS', payload: bookings });
    } catch {
      // User may not be authenticated — swallow silently
    } finally {
      dispatch({ type: 'SET_BOOKINGS_LOADING', payload: false });
    }
  }, []);
  

  // Load slots on mount
  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const value: SpaContextType = {
    state,
    dispatch,
    refreshSlots,
    refreshMyBookings,
    // Shims for backward-compat with old admin page until it's fully replaced
    addBooking: (booking) => dispatch({ type: 'ADD_BOOKING', payload: booking }),
    updateBookingStatus: (id, status) =>
      dispatch({ type: 'UPDATE_BOOKING', payload: { ...state.bookings.find(b => String(b.id) === String(id))! as SpaBooking, status } }),
  };

  return <SpaContext.Provider value={value}>{children}</SpaContext.Provider>;
}

export function useSpa() {
  const ctx = useContext(SpaContext);
  if (!ctx) throw new Error('useSpa must be inside SpaProvider');
  return ctx;
}
