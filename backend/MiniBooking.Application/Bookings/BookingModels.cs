namespace MiniBooking.Application.Bookings;

public sealed record CreateBookingCommand(int RoomId, DateOnly CheckIn, DateOnly CheckOut,
    int GuestCount, string GuestName, string GuestEmail, string GuestPhone);
public sealed class CreateBookingDbResult
{
    public int ResultCode { get; init; }
    public string Message { get; init; } = string.Empty;
    public int? BookingId { get; init; }
    public decimal? TotalPrice { get; init; }
    public bool IsOverCapacity { get; init; }
    public int OverbookingGuestAllowance { get; init; }
    public IReadOnlyCollection<NightlyRateLine> RateBreakdown { get; init; } = [];
}
public sealed record NightlyRateLine(DateOnly NightDate, decimal NightlyRate);
public sealed class CancelBookingDbResult
{
    public int ResultCode { get; init; }
    public string Message { get; init; } = string.Empty;
}
public sealed record BookingListItem(
    int Id,
    int RoomId,
    string RoomNumber,
    string HotelName,
    int OverbookingGuestAllowance,
    TimeSpan CheckInTime,
    TimeSpan CheckOutTime,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int GuestCount,
    string GuestName,
    string GuestEmail,
    string GuestPhone,
    decimal TotalPrice,
    bool IsOverCapacity,
    string Status,
    DateTime CreatedAt,
    DateTime? CancelledAt,
    IReadOnlyCollection<NightlyRateLine> RateBreakdown);
public sealed record BookingOutcome(int ResultCode, string Message, int? BookingId,
    decimal? TotalPrice, bool IsOverCapacity, int OverbookingGuestAllowance,
    IReadOnlyCollection<NightlyRateLine> RateBreakdown);
public interface IBookingRepository
{
    Task<IReadOnlyCollection<BookingListItem>> GetAllAsync(CancellationToken cancellationToken);
    Task<CreateBookingDbResult> CreateAsync(CreateBookingCommand command, CancellationToken cancellationToken);
    Task<CancelBookingDbResult> CancelAsync(int bookingId, CancellationToken cancellationToken);
}
public interface IBookingService
{
    Task<IReadOnlyCollection<BookingListItem>> GetAllAsync(CancellationToken cancellationToken);
    Task<BookingOutcome> CreateAsync(CreateBookingCommand command, CancellationToken cancellationToken);
    Task<CancelBookingDbResult> CancelAsync(int bookingId, CancellationToken cancellationToken);
}
public sealed class BookingService(IBookingRepository repository) : IBookingService
{
    public Task<IReadOnlyCollection<BookingListItem>> GetAllAsync(CancellationToken cancellationToken) =>
        repository.GetAllAsync(cancellationToken);

    public async Task<BookingOutcome> CreateAsync(CreateBookingCommand command, CancellationToken cancellationToken)
    {
        var result = await repository.CreateAsync(command, cancellationToken);
        return new(result.ResultCode, result.Message, result.BookingId, result.TotalPrice,
            result.IsOverCapacity, result.OverbookingGuestAllowance, result.RateBreakdown);
    }
    public Task<CancelBookingDbResult> CancelAsync(int bookingId, CancellationToken cancellationToken) => repository.CancelAsync(bookingId, cancellationToken);
}
