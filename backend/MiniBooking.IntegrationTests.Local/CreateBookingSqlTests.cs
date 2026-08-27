using System.Data;
using Microsoft.Data.SqlClient;

namespace MiniBooking.IntegrationTests.Local;

[Collection(SqlServerCollection.Name)]
public sealed class CreateBookingSqlTests(SqlServerFixture database) : IAsyncLifetime
{
    private int _roomId;

    public async Task InitializeAsync()
    {
        await database.ResetDataAsync();
        _roomId = await database.ExecuteScalarAsync<int>("""
            SET NOCOUNT ON;
            INSERT dbo.Hotel (Name, AllowOverbooking, OverbookingGuestAllowance)
            VALUES (N'Test Hotel', 1, 1);
            DECLARE @HotelId INT = CONVERT(INT, SCOPE_IDENTITY());

            INSERT dbo.Room (HotelId, RoomNumber, Capacity)
            VALUES (@HotelId, N'101', 2);
            DECLARE @RoomId INT = CONVERT(INT, SCOPE_IDENTITY());

            INSERT dbo.RoomRate (RoomId, EffectiveFrom, NightlyRate)
            VALUES (@RoomId, '2030-01-01', 3000), (@RoomId, '2030-01-15', 3500);
            SELECT @RoomId;
            """);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task RateChangeDuringStay_CalculatesAndSavesEachNight()
    {
        var result = await CreateBookingAsync(new(2030, 1, 13), new(2030, 1, 17), 2);

        Assert.Equal(0, result.ResultCode);
        Assert.Equal(13_000m, result.TotalPrice);
        Assert.Equal([3000m, 3000m, 3500m, 3500m], result.NightlyRates);
    }

    [Fact]
    public async Task BackToBackBooking_IsAllowed()
    {
        Assert.Equal(0, (await CreateBookingAsync(new(2030, 1, 10), new(2030, 1, 12), 2)).ResultCode);
        Assert.Equal(0, (await CreateBookingAsync(new(2030, 1, 12), new(2030, 1, 14), 2)).ResultCode);
    }

    [Fact]
    public async Task OverlappingBooking_IsRejected()
    {
        Assert.Equal(0, (await CreateBookingAsync(new(2030, 1, 10), new(2030, 1, 13), 2)).ResultCode);
        Assert.Equal(3, (await CreateBookingAsync(new(2030, 1, 12), new(2030, 1, 14), 2)).ResultCode);
    }

    [Fact]
    public async Task OneExtraGuest_IsAllowedAndFlagged()
    {
        var allowed = await CreateBookingAsync(new(2030, 2, 1), new(2030, 2, 2), 3);
        var rejected = await CreateBookingAsync(new(2030, 2, 2), new(2030, 2, 3), 4);

        Assert.Equal(0, allowed.ResultCode);
        Assert.True(allowed.IsOverCapacity);
        Assert.Equal(4, rejected.ResultCode);
    }

    private async Task<CreateResult> CreateBookingAsync(DateOnly checkIn, DateOnly checkOut, int guestCount)
    {
        await using var connection = new SqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var command = new SqlCommand("dbo.sp_CreateBooking", connection)
        {
            CommandType = CommandType.StoredProcedure
        };
        command.Parameters.AddWithValue("@RoomId", _roomId);
        command.Parameters.AddWithValue("@CheckIn", checkIn.ToDateTime(TimeOnly.MinValue));
        command.Parameters.AddWithValue("@CheckOut", checkOut.ToDateTime(TimeOnly.MinValue));
        command.Parameters.AddWithValue("@GuestCount", guestCount);
        command.Parameters.AddWithValue("@GuestName", "Integration Test");
        command.Parameters.AddWithValue("@GuestEmail", "integration@example.com");
        command.Parameters.AddWithValue("@GuestPhone", "09170000000");

        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        var resultCode = reader.GetInt32(reader.GetOrdinal("ResultCode"));
        var totalOrdinal = reader.GetOrdinal("TotalPrice");
        decimal? totalPrice = reader.IsDBNull(totalOrdinal) ? null : reader.GetDecimal(totalOrdinal);
        var isOverCapacity = reader.GetBoolean(reader.GetOrdinal("IsOverCapacity"));
        var nightlyRates = new List<decimal>();

        if (resultCode == 0 && await reader.NextResultAsync())
        {
            while (await reader.ReadAsync())
                nightlyRates.Add(reader.GetDecimal(reader.GetOrdinal("NightlyRate")));
        }

        return new(resultCode, totalPrice, isOverCapacity, nightlyRates);
    }

    private sealed record CreateResult(
        int ResultCode,
        decimal? TotalPrice,
        bool IsOverCapacity,
        IReadOnlyCollection<decimal> NightlyRates);
}
