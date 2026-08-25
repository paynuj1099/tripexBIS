SET XACT_ABORT ON;
BEGIN TRANSACTION;

INSERT dbo.Hotel (Name, AllowOverbooking, OverbookingGuestAllowance, CheckInTime, CheckOutTime) VALUES
 (N'City Hotel', 0, 0, '15:00', '11:00'),
 (N'Harbor Suites', 1, 1, '14:00', '10:00');
INSERT dbo.Room (HotelId, RoomNumber, Capacity) VALUES (1,N'101',2),(1,N'102',3),(1,N'201',2),(2,N'301',2),(2,N'302',4);
INSERT dbo.RoomRate (RoomId, EffectiveFrom, NightlyRate) VALUES
 (1,'2026-08-01',3000),(1,'2026-08-15',3500),(2,'2026-08-01',4200),
 (3,'2026-08-01',3800),(4,'2026-08-01',5000),(4,'2026-08-15',5500),(5,'2026-08-01',7200);

INSERT dbo.Booking (RoomId, CheckIn, CheckOut, GuestCount, GuestName, GuestEmail, GuestPhone, TotalPrice, IsOverCapacity, OverbookingGuestAllowance, Status, CreatedAt, CancelledAt) VALUES
 (1,'2026-09-10','2026-09-12',2,N'Maria Santos',N'maria.santos@example.com',N'+63 917 555 0101',7000,0,0,1,SYSUTCDATETIME(),NULL),
 (1,'2026-09-12','2026-09-14',2,N'Daniel Cruz',N'daniel.cruz@example.com',N'+63 917 555 0102',7000,0,0,1,SYSUTCDATETIME(),NULL),
 (2,'2026-10-01','2026-10-03',2,N'Anna Reyes',N'anna.reyes@example.com',N'+63 917 555 0103',8400,0,0,2,DATEADD(DAY,-3,SYSUTCDATETIME()),DATEADD(DAY,-2,SYSUTCDATETIME())),
 (4,'2026-11-05','2026-11-07',3,N'Luis Garcia',N'luis.garcia@example.com',N'+63 917 555 0104',11000,1,1,1,SYSUTCDATETIME(),NULL);

INSERT dbo.BookingNightRate (BookingId, NightDate, NightlyRate) VALUES
 (1,'2026-09-10',3500),(1,'2026-09-11',3500),
 (2,'2026-09-12',3500),(2,'2026-09-13',3500),
 (3,'2026-10-01',4200),(3,'2026-10-02',4200),
 (4,'2026-11-05',5500),(4,'2026-11-06',5500);
COMMIT;
