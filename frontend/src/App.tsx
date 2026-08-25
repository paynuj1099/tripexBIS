import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { apiRequest } from "./api/client";
import { Detail, SortHeader } from "./components/Display";
import { BrandLogo } from "./components/BrandLogo";
import { DateField, HotelRoomFields } from "./components/FormFields";
import type {
  AvailabilityResult,
  Booking,
  BookingResult,
  Room,
  SortKey,
} from "./types/booking";
import {
  addDays,
  calculateNights,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNightlyRateRange,
  formatStayDate,
  formatTime,
  getErrorMessage,
  groupConsecutiveNightlyRates,
  toDateInputValue,
} from "./utils/formatters";

const today = toDateInputValue(new Date());

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationError, setCancellationError] = useState("");
  const [booking, setBooking] = useState({
    roomId: "",
    checkIn: "",
    checkOut: "",
    guestCount: "1",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
  });
  const [availability, setAvailability] = useState({
    roomId: "",
    from: "",
    to: "",
  });
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null,
  );
  const [availabilityResult, setAvailabilityResult] =
    useState<AvailabilityResult | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "id", direction: "desc" },
  );

  async function loadData() {
    try {
      const [loadedRooms, loadedBookings] = await Promise.all([
        apiRequest<Room[]>("/rooms"),
        apiRequest<Booking[]>("/bookings"),
      ]);
      setRooms(loadedRooms);
      setBookings(loadedBookings);
      const firstRoomId = loadedRooms[0]?.id;
      if (firstRoomId) {
        setBooking((current) => ({
          ...current,
          roomId: current.roomId || String(firstRoomId),
        }));
        setAvailability((current) => ({
          ...current,
          roomId: current.roomId || String(firstRoomId),
        }));
      }
      setLoadError("");
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          "Data could not be loaded. Confirm the API and database are running.",
        ),
      );
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleBookings = useMemo(() => {
    const term = search.trim().toLowerCase();
    const idSearch = term.match(/^#(\d+)$/);

    return bookings
      .filter((item) => item.checkOut >= today)
      .filter((item) => statusFilter === "All" || item.status === statusFilter)
      .filter(
        (item) =>
          !term ||
          (idSearch
            ? item.id === Number(idSearch[1])
            : `${item.id} ${item.hotelName} ${item.roomNumber} ${item.status} ${item.guestName} ${item.guestEmail} ${item.guestPhone}`
                .toLowerCase()
                .includes(term)),
      )
      .sort((left, right) => {
        const leftValue = left[sort.key];
        const rightValue = right[sort.key];
        const result =
          typeof leftValue === "number" && typeof rightValue === "number"
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue));
        return sort.direction === "asc" ? result : -result;
      });
  }, [bookings, search, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedBookings = visibleBookings.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  async function createBooking(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setBookingError("");
    setBookingResult(null);
    try {
      const result = await apiRequest<BookingResult>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...booking,
          roomId: Number(booking.roomId),
          guestCount: Number(booking.guestCount),
        }),
      });
      setBookingResult(result);
      setIsBookingModalOpen(false);
      await loadData();
    } catch (error) {
      setBookingError(
        getErrorMessage(error, "The booking could not be created."),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function confirmCancellation() {
    if (!bookingToCancel) return;
    setCancellingId(bookingToCancel.id);
    setCancellationError("");
    try {
      await apiRequest<void>(`/bookings/${bookingToCancel.id}`, {
        method: "DELETE",
      });
      setBookingToCancel(null);
      setSelectedBooking(null);
      await loadData();
    } catch (error) {
      setCancellationError(
        getErrorMessage(error, "The booking could not be cancelled."),
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function checkAvailability(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setAvailabilityError("");
    setAvailabilityResult(null);
    try {
      const query = new URLSearchParams({
        from: availability.from,
        to: availability.to,
      });
      setAvailabilityResult(
        await apiRequest<AvailabilityResult>(
          `/rooms/${availability.roomId}/availability?${query}`,
        ),
      );
    } catch (error) {
      setAvailabilityError(
        getErrorMessage(error, "Availability could not be checked."),
      );
    }
  }

  const selectedBookingRoom = rooms.find(
    (room) => room.id === Number(booking.roomId),
  );
  const selectedAvailabilityRoom = rooms.find(
    (room) => room.id === Number(availability.roomId),
  );
  const createdBookingRoom = rooms.find(
    (room) => room.id === bookingResult?.roomId,
  );

  return (
    <>
      <header className="page-header">
        <div className="header-row">
          <div>
            <div className="brand">
              <BrandLogo />
              <span>Mini Booking Inventory</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="secondary"
              onClick={() => {
                setAvailabilityResult(null);
                setAvailabilityError("");
                setIsAvailabilityModalOpen(true);
              }}
            >
              Check availability
            </button>
            <button
              onClick={() => {
                setBookingResult(null);
                setBookingError("");
                setIsBookingModalOpen(true);
              }}
            >
              Create booking
            </button>
          </div>
        </div>
      </header>
      <main>
        {loadError && (
          <div className="banner error" role="alert">
            {loadError}
          </div>
        )}
        <section className="card bookings-card">
          <div className="table-heading">
            <div>
              <div className="eyebrow">Reservations</div>
              <h2>Current and upcoming bookings</h2>
            </div>
            <span className="result-count">
              {visibleBookings.length
                ? `${pageStart + 1}-${Math.min(pageStart + pageSize, visibleBookings.length)} of ${visibleBookings.length}`
                : "0 results"}
            </span>
          </div>
          <div className="table-tools">
            <label>
              Search
              <input
                type="search"
                placeholder="#ID, hotel, room, guest, status"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                <option>Confirmed</option>
                <option>Cancelled</option>
              </select>
            </label>
            <label>
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </label>
          </div>
          <div
            className="table-scroll"
            role="region"
            aria-label="Bookings table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <SortHeader
                    label="ID"
                    column="id"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    label="Hotel / Room"
                    column="hotelName"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>Primary guest</th>
                  <SortHeader
                    label="Check-in"
                    column="checkIn"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    label="Check-out"
                    column="checkOut"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>Guests</th>
                  <SortHeader
                    label="Total"
                    column="totalPrice"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortHeader
                    label="Status"
                    column="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedBookings.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>
                      <strong>{item.hotelName}</strong>
                      <small>Room {item.roomNumber}</small>
                    </td>
                    <td>
                      <strong>{item.guestName}</strong>
                      <small>{item.guestEmail}</small>
                    </td>
                    <td>
                      {formatDate(item.checkIn)}
                      <small>{formatTime(item.checkInTime)}</small>
                    </td>
                    <td>
                      {formatDate(item.checkOut)}
                      <small>{formatTime(item.checkOutTime)}</small>
                    </td>
                    <td>
                      {item.guestCount}
                      {item.isOverCapacity && (
                        <span
                          className="capacity-flag"
                          title={`Uses +${item.overbookingGuestAllowance} allowance`}
                        >
                          +
                        </span>
                      )}
                    </td>
                    <td>
                      {item.totalPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => setSelectedBooking(item)}
                        >
                          Details
                        </button>
                        {item.status === "Confirmed" && (
                          <button
                            className="text-button danger"
                            disabled={cancellingId === item.id}
                            onClick={() => {
                              setCancellationError("");
                              setBookingToCancel(item);
                            }}
                          >
                            {cancellingId === item.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleBookings.length && (
                  <tr>
                    <td className="empty" colSpan={9}>
                      No bookings match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Bookings pagination">
            <button
              className="pagination-button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </button>
          </nav>
        </section>
      </main>

      {isBookingModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setIsBookingModalOpen(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-heading"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">Reservations</div>
                <h2 id="create-heading">Create a booking</h2>
              </div>
              <button
                className="close-button"
                aria-label="Close"
                onClick={() => setIsBookingModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="intro">
              Times follow the selected hotel's arrival and departure policy.
              Rates are calculated per occupied night.
            </p>
            <form onSubmit={createBooking}>
              {bookingError && (
                <div className="banner error form-error" role="alert">
                  {bookingError}
                </div>
              )}
              <div className="form-section-title">Primary guest</div>
              <label>
                Full name
                <input
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={booking.guestName}
                  onChange={(event) =>
                    setBooking({ ...booking, guestName: event.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={booking.guestEmail}
                    onChange={(event) =>
                      setBooking({ ...booking, guestEmail: event.target.value })
                    }
                  />
                </label>
                <label>
                  Phone number
                  <input
                    required
                    type="tel"
                    maxLength={30}
                    autoComplete="tel"
                    value={booking.guestPhone}
                    onChange={(event) =>
                      setBooking({ ...booking, guestPhone: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-section-title">Stay details</div>
              <HotelRoomFields
                rooms={rooms}
                roomId={booking.roomId}
                onRoomChange={(roomId) => setBooking({ ...booking, roomId })}
              />
              <div className="form-row">
                <DateField
                  label="Check-in date"
                  hint={formatTime(selectedBookingRoom?.checkInTime)}
                  value={booking.checkIn}
                  min={today}
                  onChange={(checkIn) =>
                    setBooking({
                      ...booking,
                      checkIn,
                      checkOut:
                        booking.checkOut && booking.checkOut <= checkIn
                          ? ""
                          : booking.checkOut,
                    })
                  }
                />
                <DateField
                  label="Check-out date"
                  hint={formatTime(selectedBookingRoom?.checkOutTime)}
                  value={booking.checkOut}
                  min={addDays(booking.checkIn || today, 1)}
                  onChange={(checkOut) => setBooking({ ...booking, checkOut })}
                />
              </div>
              <label>
                Guests
                <input
                  required
                  min="1"
                  type="number"
                  value={booking.guestCount}
                  onChange={(event) =>
                    setBooking({ ...booking, guestCount: event.target.value })
                  }
                />
              </label>
              <button disabled={isCreating || !rooms.length}>
                {isCreating ? "Creating…" : "Create booking"}
              </button>
            </form>
          </section>
        </div>
      )}

      {bookingResult && !isBookingModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-heading"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">Reservation confirmed</div>
                <h2 id="confirmation-heading">
                  Booking #{bookingResult.bookingId} created
                </h2>
              </div>
              <button
                className="close-button"
                aria-label="Close"
                onClick={() => setBookingResult(null)}
              >
                ×
              </button>
            </div>
            <div className="confirmation-check" aria-hidden="true">
              ✓
            </div>
            <dl className="details-grid">
              <Detail label="Primary guest" value={bookingResult.guestName} />
              <Detail label="Guests" value={String(bookingResult.guestCount)} />
              <Detail
                label="Hotel"
                value={createdBookingRoom?.hotelName ?? ""}
              />
              <Detail
                label="Room"
                value={createdBookingRoom?.roomNumber ?? ""}
              />
              <Detail
                label="Check-in"
                value={formatStayDate(
                  bookingResult.checkIn,
                  createdBookingRoom?.checkInTime,
                )}
              />
              <Detail
                label="Check-out"
                value={formatStayDate(
                  bookingResult.checkOut,
                  createdBookingRoom?.checkOutTime,
                )}
              />
            </dl>
            <div className="rate-breakdown">
              <h3>Price breakdown</h3>
              {groupConsecutiveNightlyRates(bookingResult.rateBreakdown).map(
                (range) => (
                  <div className="rate-line" key={range.startDate}>
                    <span>
                      {formatNightlyRateRange(range.startDate, range.endDate)}
                    </span>
                    <strong>{formatMoney(range.nightlyRate)}</strong>
                  </div>
                ),
              )}
              {bookingResult.rateBreakdown.length === 0 && (
                <p className="breakdown-unavailable">
                  Nightly rate details are unavailable. The confirmed total is
                  shown below.
                </p>
              )}
              <div className="rate-line rate-total">
                <span>Total</span>
                <strong>{formatMoney(bookingResult.totalPrice)}</strong>
              </div>
            </div>
            {bookingResult.isOverCapacity && (
              <div className="banner warning-banner">
                This booking uses the hotel's +
                {bookingResult.overbookingGuestAllowance} guest
                allowance.
              </div>
            )}
            <div className="modal-actions">
              <button onClick={() => setBookingResult(null)}>Done</button>
            </div>
          </section>
        </div>
      )}

      {isAvailabilityModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setIsAvailabilityModalOpen(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-heading"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">Inventory</div>
                <h2 id="availability-heading">Check availability</h2>
              </div>
              <button
                className="close-button"
                aria-label="Close"
                onClick={() => setIsAvailabilityModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="intro">
              Times follow the selected hotel's policy. Cancelled stays are
              immediately released.
            </p>
            <form onSubmit={checkAvailability}>
              <HotelRoomFields
                rooms={rooms}
                roomId={availability.roomId}
                onRoomChange={(roomId) =>
                  setAvailability({ ...availability, roomId })
                }
              />
              <div className="form-row">
                <DateField
                  label="Check-in date"
                  hint={formatTime(selectedAvailabilityRoom?.checkInTime)}
                  value={availability.from}
                  min={today}
                  onChange={(from) =>
                    setAvailability({
                      ...availability,
                      from,
                      to:
                        availability.to && availability.to <= from
                          ? ""
                          : availability.to,
                    })
                  }
                />
                <DateField
                  label="Check-out date"
                  hint={formatTime(selectedAvailabilityRoom?.checkOutTime)}
                  value={availability.to}
                  min={addDays(availability.from || today, 1)}
                  onChange={(to) => setAvailability({ ...availability, to })}
                />
              </div>
              <button className="secondary" disabled={!rooms.length}>
                Check availability
              </button>
            </form>
            {availabilityError && (
              <div className="banner error" role="alert">
                {availabilityError}
              </div>
            )}
            {availabilityResult && (
              <div
                className={`banner ${availabilityResult.isAvailable ? "success" : "unavailable"}`}
                role="status"
              >
                <strong>
                  {availabilityResult.isAvailable ? "Available" : "Unavailable"}
                </strong>
                {!availabilityResult.isAvailable && (
                  <span>
                    This room already has an active booking in the selected
                    range.
                  </span>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedBooking && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedBooking(null);
          }}
        >
          <section
            className="modal details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-details-heading"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">Booking #{selectedBooking.id}</div>
                <h2 id="booking-details-heading">Booking details</h2>
              </div>
              <button
                className="close-button"
                aria-label="Close"
                onClick={() => setSelectedBooking(null)}
              >
                ×
              </button>
            </div>
            <dl className="details-grid">
              <Detail label="Status">
                <span
                  className={`status ${selectedBooking.status.toLowerCase()}`}
                >
                  {selectedBooking.status}
                </span>
              </Detail>
              <Detail label="Hotel" value={selectedBooking.hotelName} />
              <Detail label="Room" value={selectedBooking.roomNumber} />
              <Detail
                label="Primary guest"
                value={selectedBooking.guestName || "Not provided"}
              />
              <Detail
                label="Email"
                value={selectedBooking.guestEmail || "Not provided"}
              />
              <Detail
                label="Phone"
                value={selectedBooking.guestPhone || "Not provided"}
              />
              <Detail
                label="Guests"
                value={String(selectedBooking.guestCount)}
              />
              <Detail
                label="Check-in"
                value={formatStayDate(
                  selectedBooking.checkIn,
                  selectedBooking.checkInTime,
                )}
              />
              <Detail
                label="Check-out"
                value={formatStayDate(
                  selectedBooking.checkOut,
                  selectedBooking.checkOutTime,
                )}
              />
              <Detail
                label="Nights"
                value={String(
                  calculateNights(
                    selectedBooking.checkIn,
                    selectedBooking.checkOut,
                  ),
                )}
              />
              <Detail
                label="Total price"
                value={selectedBooking.totalPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              />
              <Detail
                label="Capacity allowance"
                value={
                  selectedBooking.isOverCapacity
                    ? `Hotel +${selectedBooking.overbookingGuestAllowance} allowance used`
                    : "Not used"
                }
              />
              <Detail
                label="Created"
                value={formatDateTime(selectedBooking.createdAt)}
              />
              {selectedBooking.cancelledAt && (
                <Detail
                  label="Cancelled"
                  value={formatDateTime(selectedBooking.cancelledAt)}
                />
              )}
            </dl>
            <div className="rate-breakdown">
              <h3>Confirmed price breakdown</h3>
              {groupConsecutiveNightlyRates(selectedBooking.rateBreakdown).map(
                (range) => (
                  <div className="rate-line" key={range.startDate}>
                    <span>
                      {formatNightlyRateRange(range.startDate, range.endDate)}
                    </span>
                    <strong>{formatMoney(range.nightlyRate)}</strong>
                  </div>
                ),
              )}
              {selectedBooking.rateBreakdown.length === 0 && (
                <p className="breakdown-unavailable">
                  A nightly breakdown was not saved for this booking.
                </p>
              )}
              <div className="rate-line rate-total">
                <span>Confirmed total</span>
                <strong>{formatMoney(selectedBooking.totalPrice)}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setSelectedBooking(null)}
              >
                Close
              </button>
              {selectedBooking.status === "Confirmed" && (
                <button
                  className="danger-button"
                  disabled={cancellingId === selectedBooking.id}
                  onClick={() => {
                    setCancellationError("");
                    setBookingToCancel(selectedBooking);
                  }}
                >
                  {cancellingId === selectedBooking.id
                    ? "Cancelling..."
                    : "Cancel booking"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {bookingToCancel && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && cancellingId === null)
              setBookingToCancel(null);
          }}
        >
          <section
            className="modal confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-heading"
            aria-describedby="cancel-description"
          >
            <div className="modal-header">
              <div>
                <div className="eyebrow">Booking #{bookingToCancel.id}</div>
                <h2 id="cancel-heading">Cancel booking?</h2>
              </div>
              <button
                className="close-button"
                aria-label="Close"
                disabled={cancellingId !== null}
                onClick={() => setBookingToCancel(null)}
              >
                ×
              </button>
            </div>
            <p id="cancel-description" className="intro">
              This releases {bookingToCancel.hotelName}, room{" "}
              {bookingToCancel.roomNumber}, for the selected dates. The booking
              remains in history.
            </p>
            {cancellationError && (
              <div className="banner error form-error" role="alert">
                {cancellationError}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="secondary"
                disabled={cancellingId !== null}
                onClick={() => setBookingToCancel(null)}
              >
                Keep booking
              </button>
              <button
                className="danger-button"
                disabled={cancellingId !== null}
                onClick={() => void confirmCancellation()}
              >
                {cancellingId !== null
                  ? "Cancelling..."
                  : "Yes, cancel booking"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
