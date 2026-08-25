import { useEffect, useState } from "react";
import type { Room } from "../types/booking";
import { SelectControl } from "./SelectControl";
import { DatePicker } from "./DatePicker";

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
  const [selectedHotelId, setSelectedHotelId] = useState(
    selectedRoom?.hotelId ?? 0,
  );

  useEffect(() => {
    if (selectedRoom) setSelectedHotelId(selectedRoom.hotelId);
  }, [roomId, selectedRoom]);

  const hotelRooms = rooms.filter((room) => room.hotelId === selectedHotelId);

  function changeHotel(hotelId: number) {
    setSelectedHotelId(hotelId);
    onRoomChange("");
  }

  return (
    <div className="form-row">
      <label>
        Hotel
        <SelectControl ariaLabel="Hotel" value={String(selectedHotelId)}
          onChange={(value) => changeHotel(Number(value))}
          options={[
            { value: "0", label: "Select hotel", disabled: true },
            ...hotels.map(([id, name]) => ({ value: String(id), label: name })),
          ]} />
      </label>
      <label>
        Room
        <SelectControl ariaLabel="Room" value={roomId} onChange={onRoomChange}
          options={[
            { value: "", label: "Select room", disabled: true },
            ...hotelRooms.map((room) => ({ value: String(room.id), label: `Room ${room.roomNumber} · ${room.capacity} guests${room.overbookingGuestAllowance > 0 ? ` (+${room.overbookingGuestAllowance} allowed)` : ""}` })),
          ]} />
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
      <DatePicker ariaLabel={label} min={min} value={value} onChange={onChange} />
    </label>
  );
}
