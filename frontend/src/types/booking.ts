export type Room = {
  id: number;
  hotelId: number;
  roomNumber: string;
  capacity: number;
  hotelName: string;
  overbookingGuestAllowance: number;
  allowOverbooking: boolean;
  checkInTime: string;
  checkOutTime: string;
};

export type Booking = {
  id: number;
  roomId: number;
  roomNumber: string;
  hotelName: string;
  overbookingGuestAllowance: number;
  checkInTime: string;
  checkOutTime: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number;
  isOverCapacity: boolean;
  status: "Confirmed" | "Cancelled";
  createdAt: string;
  cancelledAt: string | null;
  rateBreakdown: { nightDate: string; nightlyRate: number }[];
};

export type BookingResult = {
  bookingId: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number;
  isOverCapacity: boolean;
  overbookingGuestAllowance: number;
  rateBreakdown: { nightDate: string; nightlyRate: number }[];
};

export type AvailabilityResult = {
  isAvailable: boolean;
  reason: string | null;
};
export type SortKey =
  | "id"
  | "hotelName"
  | "checkIn"
  | "checkOut"
  | "totalPrice"
  | "status";
