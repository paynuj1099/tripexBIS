import type { Room } from "../types/booking";

export function HotelRoomFields({
  rooms,
  roomId,
  onRoomChange,
}: {
  rooms: Room[];
  roomId: string;
  onRoomChange: (roomId: string) => void;
}) {
  const selectedRoom = rooms.find((room) => room.id === Number(roomId));
  const hotels = [
    ...new Map(rooms.map((room) => [room.hotelId, room.hotelName])),
  ];
  const selectedHotelId = selectedRoom?.hotelId ?? hotels[0]?.[0] ?? 0;
  const hotelRooms = rooms.filter((room) => room.hotelId === selectedHotelId);

  function changeHotel(hotelId: number) {
    const firstRoom = rooms.find((room) => room.hotelId === hotelId);
    onRoomChange(firstRoom ? String(firstRoom.id) : "");
  }

  return (
    <div className="form-row">
      <label>
        Hotel
        <select
          required
          value={selectedHotelId}
          onChange={(event) => changeHotel(Number(event.target.value))}
        >
          {hotels.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Room
        <select
          required
          value={roomId}
          onChange={(event) => onRoomChange(event.target.value)}
        >
          {hotelRooms.map((room) => (
            <option key={room.id} value={room.id}>
              Room {room.roomNumber} · {room.capacity} guests
              {room.overbookingGuestAllowance > 0
                ? ` (+${room.overbookingGuestAllowance} allowed)`
                : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function DateField({
  label,
  hint,
  min,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  min?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="field-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input
        required
        type="date"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
