using Microsoft.AspNetCore.Mvc;
using MiniBooking.Api.Models;
using MiniBooking.Application.Rooms;

namespace MiniBooking.Api.Controllers;
[ApiController]
[Route("api/rooms")]
public sealed class RoomsController(IRoomService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) => Ok(await service.GetAllAsync(cancellationToken));
    [HttpGet("{id:int}/availability")]
    public async Task<IActionResult> GetAvailability(int id, [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken cancellationToken)
    {
        if (from >= to) return BadRequest(new ApiErrorResponse("INVALID_DATE_RANGE", "From must be before to."));
        var result = await service.GetAvailabilityAsync(id, from, to, cancellationToken);
        return result.RoomExists ? Ok(new { result.RoomId, result.From, result.To, result.IsAvailable, result.Reason }) : NotFound(new ApiErrorResponse("ROOM_NOT_FOUND", "The selected room does not exist."));
    }
}
