using MiniBooking.Application.Bookings;
using MiniBooking.Application.Rooms;
using MiniBooking.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy => policy
    .WithOrigins(builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173")
    .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
