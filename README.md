# Mini Booking Inventory System

## Stack

- ASP.NET Core 8, C#, Swagger/OpenAPI
- Dapper and Microsoft.Data.SqlClient
- SQL Server
- React, TypeScript, and Vite
- xUnit

## Database setup

Create a Database in local or cloud.

1. An empty database is created.
2. `database/01-schema.sql` is executed.
3. `database/02-stored-procedures.sql` is executed.
4. `database/03-seed.sql` is executed.
5. `ConnectionStrings:BookingDatabase` is configured in MiniBooking.API/appsettings.json
6. The API and frontend are started.


## Running locally

Running the backend:

```powershell
dotnet restore
dotnet run --project backend/MiniBooking.Api
```
For an API URL other than `http://localhost:5297/api`; check what URL is in the terminal and replace the link in the .env.local(create this file if not present.), 
You may also want to change the URL fallback in `frontend/src/api/client.ts`.
Swagger is available at `URL/swagger`. 


In another terminal to run the frontend:

```powershell
cd frontend
npm install
npm run dev
```


Endpoints:

- `POST /api/bookings`
- `GET /api/bookings`
- `DELETE /api/bookings/{id}`
- `GET /api/rooms`
- `GET /api/rooms/{id}/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`

These endpoints use `sp_CreateBooking`, `sp_CancelBooking`, `sp_GetRooms`, and `sp_GetRoomAvailability`, all installed by `database/02-stored-procedures.sql`.



## Rules and assumptions

**Exclusive checkout.** A stay from August 10 to August 12 occupies August 10 and 11 so the August 12 is not included in the calculations.

**Effective-dated rates.** `RoomRate.EffectiveFrom` starts a rate period that lasts until a newer rate becomes effective. The procedure generates every occupied night, selects that night's latest applicable rate, and sums the results. A missing rate for any night rejects the entire booking. A single currency is assumed; currency conversion is out of scope.

**Capacity.** A value of `0` disables overbooking, while `1` allows guests above room capacity. Every booking snapshots this value in its own `OverbookingGuestAllowance` column, so later hotel changes do not alter historical booking details. A successful booking above normal capacity records `IsOverCapacity = 1`.

**Primary guest contact.** I added this so every booking requires a primary guest name, email address, and phone number. These fields support realistic booking identification and contact.

**Hotel arrival and departure times.** Each hotel stores its own `CheckInTime` and `CheckOutTime` to make it realistic.

**Cancellation.** `sp_CancelBooking` enforces cancellation at the SQL layer. Cancellation is allowed only when the selected hotel's check-in timestamp is more than 48 hours away.

**Soft cancellation.** Cancelled bookings remain for history (`Status = 2`, with `CancelledAt`) but only active rows (`Status = 1`) block availability.

**Lock timeout.** The API maps a room-lock failure after 10 seconds of submission, signaling that the client may retry.

## Concurrency

`sp_CreateBooking` begins a transaction and obtains an exclusive transaction `sp_getapplock` on `RoomBooking:{RoomId}`. It then loads the room, checks capacity and overlap, calculates rates, inserts, and commits.

If two overlapping requests target one room, the second waits. After the first commits, the second obtains the lock, sees the new active booking, and returns `BOOKING_OVERLAP`. Locks are room-specific, so a booking for another room can proceed independently. The procedure checks negative lock return codes and always rolls back on expected failures or SQL exceptions.

## Tests

```powershell
dotnet test
npm run build --prefix frontend
```

`NightlyRateCalculator` Tests single rates, mid-stay changes, changes on check-in and checkout, three rate periods, missing rates, and invalid date ranges.


## Design trade-offs

- **Dapper:** It is lightweight, but I'm normally using EF for this kind of projects, but dapper showcases the data layer by using stored procedures.
- **Table Filter** Only displays data from current day onwards.
- **RoomRate history:** supports historical and scheduled prices and prices each night correctly; one `Room.BaseRate` could not do this.
- **Stored procedures:** keep locking, validation, pricing, and insertion within one database operation. In more standard way, we separate each procedure for cleaner and more maintanable procedures.
- **Minimal UI:** focuses effort on rule visibility, specific errors, loading/disabled states, and responsiveness.
- 


## System Improvements
- **UI for Management** Add management page to edit data in the Frontend.
- **Availability Suggestion** If selected dates and rooms are not available, add suggestion for the nearest dates available to book.