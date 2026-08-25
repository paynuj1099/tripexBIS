/*Simplified and shorter schema :) */

CREATE TABLE dbo.Hotel
(
    Id INT IDENTITY(1,1) CONSTRAINT PK_Hotel PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    AllowOverbooking BIT NOT NULL CONSTRAINT DF_Hotel_AllowOverbooking DEFAULT (0),
    OverbookingGuestAllowance INT NOT NULL CONSTRAINT DF_Hotel_OverbookingGuestAllowance DEFAULT (0),
    CheckInTime TIME(0) NOT NULL CONSTRAINT DF_Hotel_CheckInTime DEFAULT ('15:00'),
    CheckOutTime TIME(0) NOT NULL CONSTRAINT DF_Hotel_CheckOutTime DEFAULT ('11:00'),
    CONSTRAINT CK_Hotel_OverbookingGuestAllowance CHECK (OverbookingGuestAllowance >= 0)
);

CREATE TABLE dbo.Room
(
    Id INT IDENTITY(1,1) CONSTRAINT PK_Room PRIMARY KEY,
    HotelId INT NOT NULL CONSTRAINT FK_Room_Hotel REFERENCES dbo.Hotel(Id),
    RoomNumber NVARCHAR(20) NOT NULL,
    Capacity INT NOT NULL CONSTRAINT CK_Room_Capacity CHECK (Capacity > 0),
    CONSTRAINT UQ_Room_Hotel_RoomNumber UNIQUE (HotelId, RoomNumber)
);

CREATE TABLE dbo.RoomRate
(
    Id INT IDENTITY(1,1) CONSTRAINT PK_RoomRate PRIMARY KEY,
    RoomId INT NOT NULL CONSTRAINT FK_RoomRate_Room REFERENCES dbo.Room(Id),
    EffectiveFrom DATE NOT NULL,
    NightlyRate DECIMAL(18,2) NOT NULL CONSTRAINT CK_RoomRate_NightlyRate CHECK (NightlyRate >= 0),
    CONSTRAINT UQ_RoomRate_Room_EffectiveFrom UNIQUE (RoomId, EffectiveFrom)
);
CREATE INDEX IX_RoomRate_Room_EffectiveFrom ON dbo.RoomRate(RoomId, EffectiveFrom DESC) INCLUDE (NightlyRate);

CREATE TABLE dbo.Booking
(
    Id INT IDENTITY(1,1) CONSTRAINT PK_Booking PRIMARY KEY,
    RoomId INT NOT NULL CONSTRAINT FK_Booking_Room REFERENCES dbo.Room(Id),
    CheckIn DATE NOT NULL,
    CheckOut DATE NOT NULL,
    GuestCount INT NOT NULL,
    GuestName NVARCHAR(150) NOT NULL,
    GuestEmail NVARCHAR(254) NOT NULL,
    GuestPhone NVARCHAR(30) NOT NULL,
    TotalPrice DECIMAL(18,2) NOT NULL,
    IsOverCapacity BIT NOT NULL,
    OverbookingGuestAllowance INT NOT NULL CONSTRAINT DF_Booking_OverbookingGuestAllowance DEFAULT (0),
    Status TINYINT NOT NULL CONSTRAINT DF_Booking_Status DEFAULT (1),
    CreatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_Booking_CreatedAt DEFAULT SYSUTCDATETIME(),
    CancelledAt DATETIME2(7) NULL,
    CONSTRAINT CK_Booking_Dates CHECK (CheckIn < CheckOut),
    CONSTRAINT CK_Booking_GuestCount CHECK (GuestCount > 0),
    CONSTRAINT CK_Booking_TotalPrice CHECK (TotalPrice >= 0),
    CONSTRAINT CK_Booking_OverbookingGuestAllowance CHECK (OverbookingGuestAllowance >= 0),
    CONSTRAINT CK_Booking_Status CHECK (Status IN (1, 2)),
    CONSTRAINT CK_Booking_CancellationState CHECK
        ((Status = 1 AND CancelledAt IS NULL) OR (Status = 2 AND CancelledAt IS NOT NULL))
);

CREATE INDEX IX_Booking_ActiveRoomDates ON dbo.Booking(RoomId, CheckIn, CheckOut) WHERE Status = 1;

CREATE TABLE dbo.BookingNightRate
(
    BookingId INT NOT NULL CONSTRAINT FK_BookingNightRate_Booking
        REFERENCES dbo.Booking(Id) ON DELETE CASCADE,
    NightDate DATE NOT NULL,
    NightlyRate DECIMAL(18,2) NOT NULL
        CONSTRAINT CK_BookingNightRate_NightlyRate CHECK (NightlyRate >= 0),
    CONSTRAINT PK_BookingNightRate PRIMARY KEY (BookingId, NightDate)
);
