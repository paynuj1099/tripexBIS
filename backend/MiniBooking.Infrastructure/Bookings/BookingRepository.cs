using System.Data;
using Dapper;
using MiniBooking.Application.Bookings;
using MiniBooking.Infrastructure.Data;

namespace MiniBooking.Infrastructure.Bookings;
public sealed class BookingRepository(IDbConnectionFactory connectionFactory) : IBookingRepository
{
    public async Task<IReadOnlyCollection<BookingListItem>> GetAllAsync(CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.CreateConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "dbo.sp_GetBookings",
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var rows = (await results.ReadAsync<BookingRow>()).ToArray();
        var rateRows = (await results.ReadAsync<BookingNightRateRow>()).ToArray();
        var ratesByBooking = rateRows
            .GroupBy(row => row.BookingId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyCollection<NightlyRateLine>)group
                    .Select(row => new NightlyRateLine(DateOnly.FromDateTime(row.NightDate), row.NightlyRate))
                    .ToArray());
        return rows.Select(row => new BookingListItem(
            row.Id,
            row.RoomId,
            row.RoomNumber,
            row.HotelName,
            row.OverbookingGuestAllowance,
            row.CheckInTime,
            row.CheckOutTime,
            DateOnly.FromDateTime(row.CheckIn),
            DateOnly.FromDateTime(row.CheckOut),
            row.GuestCount,
            row.GuestName,
            row.GuestEmail,
            row.GuestPhone,
            row.TotalPrice,
            row.IsOverCapacity,
            row.Status,
            row.CreatedAt,
            row.CancelledAt,
            ratesByBooking.GetValueOrDefault(row.Id) ?? [])).ToArray();
    }

    public async Task<CreateBookingDbResult> CreateAsync(CreateBookingCommand booking, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.CreateConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "dbo.sp_CreateBooking",
            new
            {
                booking.RoomId,
                CheckIn = booking.CheckIn.ToDateTime(TimeOnly.MinValue),
                CheckOut = booking.CheckOut.ToDateTime(TimeOnly.MinValue),
                booking.GuestCount,
                booking.GuestName,
                booking.GuestEmail,
                booking.GuestPhone
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        using var results = await connection.QueryMultipleAsync(command);
        var result = await results.ReadSingleAsync<CreateBookingDbResult>();
        if (result.ResultCode != 0)
            return result;

        var rateRows = results.IsConsumed
            ? []
            : (await results.ReadAsync<NightlyRateRow>()).ToArray();
        return new CreateBookingDbResult
        {
            ResultCode = result.ResultCode,
            Message = result.Message,
            BookingId = result.BookingId,
            TotalPrice = result.TotalPrice,
            IsOverCapacity = result.IsOverCapacity,
            OverbookingGuestAllowance = result.OverbookingGuestAllowance,
            RateBreakdown = rateRows
                .Select(row => new NightlyRateLine(DateOnly.FromDateTime(row.NightDate), row.NightlyRate))
                .ToArray()
        };
    }
    public async Task<CancelBookingDbResult> CancelAsync(int bookingId, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.CreateConnectionAsync(cancellationToken);
        var command = new CommandDefinition("dbo.sp_CancelBooking", new { BookingId = bookingId }, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
        return await connection.QuerySingleAsync<CancelBookingDbResult>(command);
    }

    private sealed class BookingRow
    {
        public int Id { get; init; }
        public int RoomId { get; init; }
        public string RoomNumber { get; init; } = string.Empty;
        public string HotelName { get; init; } = string.Empty;
        public int OverbookingGuestAllowance { get; init; }
        public TimeSpan CheckInTime { get; init; }
        public TimeSpan CheckOutTime { get; init; }
        public DateTime CheckIn { get; init; }
        public DateTime CheckOut { get; init; }
        public int GuestCount { get; init; }
        public string GuestName { get; init; } = string.Empty;
        public string GuestEmail { get; init; } = string.Empty;
        public string GuestPhone { get; init; } = string.Empty;
        public decimal TotalPrice { get; init; }
        public bool IsOverCapacity { get; init; }
        public string Status { get; init; } = string.Empty;
        public DateTime CreatedAt { get; init; }
        public DateTime? CancelledAt { get; init; }
    }

    private sealed class NightlyRateRow
    {
        public DateTime NightDate { get; init; }
        public decimal NightlyRate { get; init; }
    }

    private sealed class BookingNightRateRow
    {
        public int BookingId { get; init; }
        public DateTime NightDate { get; init; }
        public decimal NightlyRate { get; init; }
    }
}
