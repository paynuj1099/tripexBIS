using System.Data;
using Dapper;
using MiniBooking.Application.Rooms;
using MiniBooking.Infrastructure.Data;

namespace MiniBooking.Infrastructure.Rooms;
public sealed class RoomRepository(IDbConnectionFactory connectionFactory) : IRoomRepository
{
    public async Task<IReadOnlyCollection<RoomDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.CreateConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "dbo.sp_GetRooms",
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        var rows = await connection.QueryAsync<RoomDto>(command);
        return rows.AsList();
    }
    public async Task<AvailabilityResult> GetAvailabilityAsync(int roomId, DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        await using var connection = await connectionFactory.CreateConnectionAsync(cancellationToken);
        var command = new CommandDefinition(
            "dbo.sp_GetRoomAvailability",
            new
            {
                RoomId = roomId,
                From = from.ToDateTime(TimeOnly.MinValue),
                To = to.ToDateTime(TimeOnly.MinValue)
            },
            commandType: CommandType.StoredProcedure,
            cancellationToken: cancellationToken);
        var row = await connection.QuerySingleAsync<AvailabilityRow>(command);
        return new(roomId, from, to, row.IsAvailable && row.RoomExists, row.RoomExists && !row.IsAvailable ? "OVERLAPPING_BOOKING" : null, row.RoomExists);
    }
    private sealed record AvailabilityRow(bool RoomExists, bool IsAvailable);
}
