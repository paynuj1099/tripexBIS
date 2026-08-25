SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_CreateBooking
    @RoomId INT,
    @CheckIn DATE,
    @CheckOut DATE,
    @GuestCount INT,
    @GuestName NVARCHAR(150),
    @GuestEmail NVARCHAR(254),
    @GuestPhone NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @CheckIn IS NULL OR @CheckOut IS NULL OR @CheckIn >= @CheckOut
    BEGIN
        SELECT 1 ResultCode, N'Check-in must be before check-out.' Message,
               CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
        RETURN;
    END;
    IF @GuestCount IS NULL OR @GuestCount <= 0
    BEGIN
        SELECT 5 ResultCode, N'Guest count must be greater than zero.' Message,
               CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
        RETURN;
    END;
    IF NULLIF(LTRIM(RTRIM(@GuestName)), N'') IS NULL
       OR NULLIF(LTRIM(RTRIM(@GuestEmail)), N'') IS NULL
       OR NULLIF(LTRIM(RTRIM(@GuestPhone)), N'') IS NULL
       OR @GuestEmail NOT LIKE N'%_@_%._%'
       OR LEN(@GuestName) > 150
       OR LEN(@GuestEmail) > 254
       OR LEN(@GuestPhone) > 30
    BEGIN
        SELECT 8 ResultCode, N'Valid primary guest contact details are required.' Message,
               CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
        RETURN;
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Lock this room only. Bookings for other rooms can still run in parallel.
        DECLARE @LockResult INT;
        DECLARE @LockResource NVARCHAR(255) = N'RoomBooking:' + CONVERT(NVARCHAR(20), @RoomId);
        EXEC @LockResult = sys.sp_getapplock
            @Resource = @LockResource, @LockMode = 'Exclusive',
            @LockOwner = 'Transaction', @LockTimeout = 10000;

        IF @LockResult < 0
        BEGIN
            ROLLBACK;
            SELECT 7 ResultCode, N'The room booking lock could not be acquired. Please retry.' Message,
                   CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
            RETURN;
        END;

        DECLARE @Capacity INT, @OverbookingGuestAllowance INT;
        SELECT @Capacity = r.Capacity,
               @OverbookingGuestAllowance = h.OverbookingGuestAllowance
        FROM dbo.Room r INNER JOIN dbo.Hotel h ON h.Id = r.HotelId WHERE r.Id = @RoomId;

        IF @Capacity IS NULL
        BEGIN
            ROLLBACK;
            SELECT 2 ResultCode, N'The selected room does not exist.' Message,
                   CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
            RETURN;
        END;

        IF @GuestCount > @Capacity + @OverbookingGuestAllowance
        BEGIN
            ROLLBACK;
            SELECT 4 ResultCode, N'The guest count exceeds the room capacity.' Message,
                   CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, CAST(0 AS BIT) IsOverCapacity;
            RETURN;
        END;

        DECLARE @IsOverCapacity BIT = CASE WHEN @GuestCount > @Capacity THEN 1 ELSE 0 END;

        -- Check again after taking the lock in case another request booked first.
        IF EXISTS (SELECT 1 FROM dbo.Booking
                   WHERE RoomId = @RoomId AND Status = 1
                     AND CheckIn < @CheckOut AND CheckOut > @CheckIn)
        BEGIN
            ROLLBACK;
            SELECT 3 ResultCode, N'The room is already booked for part of the selected date range.' Message,
                   CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, @IsOverCapacity IsOverCapacity;
            RETURN;
        END;

        DECLARE @NightCount INT = DATEDIFF(DAY, @CheckIn, @CheckOut);
        DECLARE @NightlyRates TABLE (NightDate DATE NOT NULL PRIMARY KEY, NightlyRate DECIMAL(18,2) NULL);

        -- Generate each occupied night. Checkout is not a charged night.
        WITH Nights AS
        (
            SELECT @CheckIn AS NightDate
            UNION ALL
            SELECT DATEADD(DAY, 1, NightDate) FROM Nights
            WHERE DATEADD(DAY, 1, NightDate) < @CheckOut
        )
        INSERT @NightlyRates (NightDate, NightlyRate)
        SELECT n.NightDate, rate.NightlyRate
        -- Keep missing rates as NULL so the validation below can catch them.
        FROM Nights n OUTER APPLY
        (
            SELECT TOP (1) rr.NightlyRate FROM dbo.RoomRate rr
            WHERE rr.RoomId = @RoomId AND rr.EffectiveFrom <= n.NightDate
            ORDER BY rr.EffectiveFrom DESC
        ) rate
        OPTION (MAXRECURSION 32767);

        IF (SELECT COUNT(*) FROM @NightlyRates WHERE NightlyRate IS NOT NULL) <> @NightCount
        BEGIN
            ROLLBACK;
            SELECT 6 ResultCode, N'A nightly rate is not configured for every night of the stay.' Message,
                   CAST(NULL AS INT) BookingId, CAST(NULL AS DECIMAL(18,2)) TotalPrice, @IsOverCapacity IsOverCapacity;
            RETURN;
        END;

        DECLARE @TotalPrice DECIMAL(18,2) = (SELECT SUM(NightlyRate) FROM @NightlyRates);
        INSERT dbo.Booking (RoomId, CheckIn, CheckOut, GuestCount, GuestName, GuestEmail, GuestPhone, TotalPrice, IsOverCapacity, OverbookingGuestAllowance)
        VALUES (@RoomId, @CheckIn, @CheckOut, @GuestCount, LTRIM(RTRIM(@GuestName)), LTRIM(RTRIM(@GuestEmail)), LTRIM(RTRIM(@GuestPhone)), @TotalPrice, @IsOverCapacity, @OverbookingGuestAllowance);
        DECLARE @BookingId INT = CONVERT(INT, SCOPE_IDENTITY());

        -- Keep the confirmed nightly prices even if room rates change later.
        INSERT dbo.BookingNightRate (BookingId, NightDate, NightlyRate)
        SELECT @BookingId, NightDate, NightlyRate
        FROM @NightlyRates;

        COMMIT;
        SELECT 0 ResultCode, N'Booking created successfully.' Message,
               @BookingId BookingId, @TotalPrice TotalPrice, @IsOverCapacity IsOverCapacity,
               @OverbookingGuestAllowance OverbookingGuestAllowance;
        SELECT NightDate, NightlyRate
        FROM @NightlyRates
        ORDER BY NightDate;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_CancelBooking @BookingId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @CheckIn DATE, @Status TINYINT, @CheckInTime TIME(0);

        -- Hold the booking row while its cancellation status is checked and updated.
        SELECT @CheckIn = b.CheckIn, @Status = b.Status, @CheckInTime = h.CheckInTime
        FROM dbo.Booking b WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.Room r ON r.Id = b.RoomId
        INNER JOIN dbo.Hotel h ON h.Id = r.HotelId
        WHERE b.Id = @BookingId;
        IF @CheckIn IS NULL
        BEGIN
            ROLLBACK; SELECT 1 ResultCode, N'The booking does not exist.' Message; RETURN;
        END;
        IF @Status = 2
        BEGIN
            ROLLBACK; SELECT 2 ResultCode, N'The booking is already cancelled.' Message; RETURN;
        END;
        DECLARE @CheckInAt DATETIME2(7) = DATEADD(
            SECOND,
            DATEDIFF(SECOND, CAST('00:00:00' AS TIME), @CheckInTime),
            CAST(@CheckIn AS DATETIME2(7)));
        IF @CheckInAt <= DATEADD(HOUR, 48, SYSUTCDATETIME())
        BEGIN
            ROLLBACK; SELECT 3 ResultCode, N'Bookings can only be cancelled more than 48 hours before check-in.' Message; RETURN;
        END;
        UPDATE dbo.Booking SET Status = 2, CancelledAt = SYSUTCDATETIME() WHERE Id = @BookingId;
        COMMIT; SELECT 0 ResultCode, N'Booking cancelled successfully.' Message;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetRooms
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.Id,
        r.RoomNumber,
        r.Capacity,
        h.Id AS HotelId,
        h.Name AS HotelName,
        h.AllowOverbooking,
        h.OverbookingGuestAllowance,
        h.CheckInTime,
        h.CheckOutTime
    FROM dbo.Room AS r
    INNER JOIN dbo.Hotel AS h ON h.Id = r.HotelId
    ORDER BY h.Name, r.RoomNumber;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_UpdateHotelOverbookingAllowance
    @HotelId INT,
    @GuestAllowance INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @GuestAllowance < 0
    BEGIN
        SELECT 1 ResultCode, N'The guest allowance cannot be negative.' Message;
        RETURN;
    END;

    UPDATE dbo.Hotel
    SET OverbookingGuestAllowance = @GuestAllowance,
        AllowOverbooking = CASE WHEN @GuestAllowance > 0 THEN 1 ELSE 0 END
    WHERE Id = @HotelId;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT 2 ResultCode, N'The hotel does not exist.' Message;
        RETURN;
    END;

    SELECT 0 ResultCode, N'Overbooking allowance updated successfully.' Message;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetBookings
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.Id,
        b.RoomId,
        r.RoomNumber,
        h.Name AS HotelName,
        b.OverbookingGuestAllowance,
        h.CheckInTime,
        h.CheckOutTime,
        b.CheckIn,
        b.CheckOut,
        b.GuestCount,
        b.GuestName,
        b.GuestEmail,
        b.GuestPhone,
        b.TotalPrice,
        b.IsOverCapacity,
        CASE b.Status WHEN 1 THEN N'Confirmed' ELSE N'Cancelled' END AS Status,
        b.CreatedAt,
        b.CancelledAt
    FROM dbo.Booking AS b
    INNER JOIN dbo.Room AS r ON r.Id = b.RoomId
    INNER JOIN dbo.Hotel AS h ON h.Id = r.HotelId
    ORDER BY b.CreatedAt DESC, b.Id DESC;

    -- Dapper reads this second result set and attaches the rows by booking ID.
    SELECT BookingId, NightDate, NightlyRate
    FROM dbo.BookingNightRate
    ORDER BY BookingId, NightDate;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetRoomAvailability
    @RoomId INT,
    @From DATE,
    @To DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CAST(CASE
            WHEN EXISTS (SELECT 1 FROM dbo.Room WHERE Id = @RoomId) THEN 1
            ELSE 0
        END AS BIT) AS RoomExists,
        CAST(CASE
            WHEN EXISTS
            (
                SELECT 1
                FROM dbo.Booking
                WHERE RoomId = @RoomId
                  AND Status = 1
                  AND CheckIn < @To
                  AND CheckOut > @From
            ) THEN 0
            ELSE 1
        END AS BIT) AS IsAvailable;
END;
GO
