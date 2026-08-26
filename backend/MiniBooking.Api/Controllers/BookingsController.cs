using Microsoft.AspNetCore.Mvc;
using MiniBooking.Api.Models;
using MiniBooking.Application.Bookings;

namespace MiniBooking.Api.Controllers;
[ApiController]
[Route("api/bookings")]
public sealed class BookingsController(IBookingService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) =>
        Ok(await service.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(new(request.RoomId, request.CheckIn, request.CheckOut,
            request.GuestCount, request.GuestName, request.GuestEmail, request.GuestPhone), cancellationToken);
        if (result.ResultCode != 0) return MapCreateError(result.ResultCode, result.Message);
        var response = new CreateBookingResponse(result.BookingId!.Value, request.RoomId,
            request.CheckIn, request.CheckOut, request.GuestCount, request.GuestName,
            request.GuestEmail, request.GuestPhone, result.TotalPrice!.Value,
            result.IsOverCapacity, result.OverbookingGuestAllowance, result.RateBreakdown);
        return Created($"/api/bookings/{response.BookingId}", response);
    }
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Cancel(int id, CancellationToken cancellationToken)
    {
        var result = await service.CancelAsync(id, cancellationToken);
        return result.ResultCode switch
        {
            0 => NoContent(), 1 => NotFound(new ApiErrorResponse("BOOKING_NOT_FOUND", result.Message)),
            2 => Conflict(new ApiErrorResponse("BOOKING_ALREADY_CANCELLED", result.Message)),
            3 => Conflict(new ApiErrorResponse("CANCELLATION_WINDOW_CLOSED", result.Message)),
            _ => StatusCode(500, new ApiErrorResponse("INTERNAL_ERROR", "An unexpected error occurred."))
        };
    }
    private IActionResult MapCreateError(int code, string message) => code switch
    {
        1 => BadRequest(new ApiErrorResponse("INVALID_DATE_RANGE", message)), 
        2 => NotFound(new ApiErrorResponse("ROOM_NOT_FOUND", message)), 
        3 => Conflict(new ApiErrorResponse("BOOKING_OVERLAP", message)),
        4 => UnprocessableEntity(new ApiErrorResponse("OVER_CAPACITY", message)),
        5 => BadRequest(new ApiErrorResponse("INVALID_GUEST_COUNT", message)),
        6 => UnprocessableEntity(new ApiErrorResponse("RATE_NOT_CONFIGURED", message)),
        7 => StatusCode(503, new ApiErrorResponse("BOOKING_LOCK_TIMEOUT", message)),
        8 => BadRequest(new ApiErrorResponse("INVALID_GUEST_DETAILS", message)),
        _ => StatusCode(500, new ApiErrorResponse("INTERNAL_ERROR", "An unexpected error occurred."))
    };
}
