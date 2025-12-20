

import React, { useState, useEffect } from "react";
import './App.css';
import { useAuth } from "react-oidc-context";
import Axios from "axios";

function App() {
  const auth = useAuth();

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [isAvailable, setIsAvailable] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setRooms([]);
      return;
    }

    let cancelled = false;

    const fetchRooms = async () => {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const token = auth.user.id_token;
        const headers = { Authorization: `Bearer ${token}` };
        const res = await Axios.get("http://localhost:8000/booking/getrooms", { headers });
        if (!cancelled) {
          const raw = Array.isArray(res.data) ? res.data : [];
          const normalized = raw.map((r) => {
            const location_id = r.location_id;
            const room_id = r.room_id;
            return { ...r, location_id, room_id };
          });
          setRooms(normalized);
        }
      } catch (err) {
        if (!cancelled) setRoomsError(err.message || String(err));
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    };

    fetchRooms();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated]);

  const openModal = (room) => {
    setSelectedRoom(room);
    setBookingDate('');
    setCalculatedPrice(null);
    setPriceError(null);
    setIsAvailable(null);
    setBookingResult(null);
    setShowModal(true);
  };

  const bookRoom = async () => {
    if (!selectedRoom || !bookingDate) return;
    setBookingLoading(true);
    setBookingResult(null);
    try {
      const token = auth.user.id_token;
      const userId = auth.user.profile.sub;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(userId ? { 'x-user-id': userId } : {}) };

      const qs = `?date=${encodeURIComponent(bookingDate)}&room_id=${encodeURIComponent(selectedRoom._id)}`;
      const url = `http://localhost:8000/booking/makebooking${qs}`;
      console.log("Booking URL: " + url);

      const res = await Axios.post(url, null, { headers });
      setBookingResult({ success: true, data: res.data });
      setIsAvailable(false);
    } catch (err) {
      setBookingResult({ success: false, message: err.message || String(err) });
    } finally {
      setBookingLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRoom(null);
    setBookingDate('');
    setCalculatedPrice(null);
    setPriceError(null);
    setIsAvailable(null);
    setBookingResult(null);
  };

  const submitCalcPrice = async (e) => {
    e.preventDefault();
    if (!selectedRoom || !bookingDate) return;
    setPriceLoading(true);
    setPriceError(null);
    setCalculatedPrice(null);
    setIsAvailable(null);
    setBookingResult(null);
    try {
      const token = auth.user?.id_token;
      const headers = { Authorization: `Bearer ${token}` };
      const qs = `?date=${encodeURIComponent(bookingDate)}&location_id=${encodeURIComponent(selectedRoom.location_id)}&room_id=${encodeURIComponent(selectedRoom._id)}`;
      const url = `http://localhost:8000/booking/calcprice${qs}`;
      const res = await Axios.get(url, { headers });
      const price = res && res.data && (res.data.adjustedPrice ?? res.data);
      setCalculatedPrice(price);
      try {
        const checkQs = `?date=${encodeURIComponent(bookingDate)}&room_id=${encodeURIComponent(selectedRoom._id)}`;
        const checkUrl = `http://localhost:8000/booking/checkbooking${checkQs}`;
        const checkRes = await Axios.get(checkUrl, { headers });
        const avail = checkRes && checkRes.data && (typeof checkRes.data.available === 'boolean' ? checkRes.data.available : !!checkRes.data.available);
        setIsAvailable(avail);
      } catch (checkErr) {
        setIsAvailable(null);
      }
    } catch (err) {
      setPriceError(err.message || String(err));
    } finally {
      setPriceLoading(false);
    }
  };

  const signOutRedirect = () => {
    const clientId = "79fqhpuav35r2umo4ahufkmir4";
    const logoutUri = "http://localhost:3000/";
    const cognitoDomain = "https://us-east-1ouv3vrwj6.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {

    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>

        {roomsLoading && <div className="rooms-loading">Loading rooms...</div>}
        {roomsError && <div className="rooms-error">Error loading rooms: {roomsError}</div>}
        {!roomsLoading && !roomsError && rooms.length > 0 && (
          <div>
            <h3>Rooms</h3>
            <table className="rooms-table">
              <thead>
                <tr>
                  <th className="rooms-th">Name</th>
                  <th className="rooms-th">Capacity</th>
                  <th className="rooms-th">Base Price</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                    <tr
                      key={index}
                      className="rooms-row"
                      onClick={() => openModal(room)}
                      data-location-id={room.location_id}
                      data-room-id={room.room_id}
                      data-room-basePrice={room.basePrice}
                    >
                      <td className="rooms-td">{room.name}</td>
                      <td className="rooms-td">{room.capacity}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

          {showModal && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h4>Booking</h4>
                <div><strong>Room:</strong> {selectedRoom?.name}</div>
                <form onSubmit={submitCalcPrice}>
                  <label className="field">
                    Date:
                    <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required />
                  </label>
                  <div className="modal-actions">
                    <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn" disabled={priceLoading}>{priceLoading ? 'Checking...' : 'Check'}</button>
                  </div>
                </form>
                {priceError && <div className="message message-error">Error: {priceError}</div>}
                {calculatedPrice !== null && <div className="message message-info">Price: £<strong>{String(calculatedPrice)}</strong></div>}

                {isAvailable === true && (
                  <div className="availability">
                    <div className="message message-success">Available</div>
                    <button className="btn" onClick={bookRoom} disabled={bookingLoading}>{bookingLoading ? 'Booking...' : 'Book'}</button>
                  </div>
                )}
                {isAvailable === false && (
                  <div className="message message-error">Room is unavailable on that date</div>
                )}
                {isAvailable === null && calculatedPrice !== null && (
                  <div className="message message-info">Availability: unknown</div>
                )}

                {bookingResult && (
                  <div className="message">
                    {bookingResult.success ? (
                      <div className="message message-success">Booking successful</div>
                    ) : (
                      <div className="message message-error">Booking failed: {bookingResult.message}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  );
}

export default App;