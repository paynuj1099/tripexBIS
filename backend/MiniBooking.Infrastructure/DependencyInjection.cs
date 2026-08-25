using Microsoft.Extensions.DependencyInjection;
using MiniBooking.Application.Bookings;
using MiniBooking.Application.Rooms;
using MiniBooking.Infrastructure.Bookings;
using MiniBooking.Infrastructure.Data;
using MiniBooking.Infrastructure.Rooms;

namespace MiniBooking.Infrastructure;
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services) => services
        .AddSingleton<IDbConnectionFactory, SqlConnectionFactory>()
        .AddScoped<IBookingRepository, BookingRepository>()
        .AddScoped<IRoomRepository, RoomRepository>();
}
