namespace MiniBooking.Application.Rooms;

public sealed class RoomDto
{
    public int Id { get; init; }
    public string RoomNumber { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public int HotelId { get; init; }
    public string HotelName { get; init; } = string.Empty;
    public bool AllowOverbooking { get; init; }
    public int OverbookingGuestAllowance { get; init; }
    public TimeSpan CheckInTime { get; init; }
    public TimeSpan CheckOutTime { get; init; }
}
public sealed record AvailabilityResult(int RoomId, DateOnly From, DateOnly To, bool IsAvailable, string? Reason, bool RoomExists = true);
public interface IRoomRepository
{
    Task<IReadOnlyCollection<RoomDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<AvailabilityResult> GetAvailabilityAsync(int roomId, DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
public interface IRoomService
{
    Task<IReadOnlyCollection<RoomDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<AvailabilityResult> GetAvailabilityAsync(int roomId, DateOnly from, DateOnly to, CancellationToken cancellationToken);
}
public sealed class RoomService(IRoomRepository repository) : IRoomService
{
    public Task<IReadOnlyCollection<RoomDto>> GetAllAsync(CancellationToken cancellationToken) => repository.GetAllAsync(cancellationToken);
    public Task<AvailabilityResult> GetAvailabilityAsync(int roomId, DateOnly from, DateOnly to, CancellationToken cancellationToken) => repository.GetAvailabilityAsync(roomId, from, to, cancellationToken);
}
