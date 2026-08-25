namespace MiniBooking.Api.Models;
public sealed record ApiErrorResponse(string Code, string Message);
public sealed record CreateBookingRequest(int RoomId, DateOnly CheckIn, DateOnly CheckOut,
    int GuestCount, string GuestName, string GuestEmail, string GuestPhone);
public sealed record CreateBookingResponse(int BookingId, int RoomId, DateOnly CheckIn,
    DateOnly CheckOut, int GuestCount, string GuestName, string GuestEmail,
    string GuestPhone, decimal TotalPrice, bool IsOverCapacity, int OverbookingGuestAllowance,
    IReadOnlyCollection<MiniBooking.Application.Bookings.NightlyRateLine> RateBreakdown);
