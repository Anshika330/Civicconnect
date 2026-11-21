import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

const priorityColors = {
  Critical: '#b42318',
  High: '#dc6b2f',
  Medium: '#d8a217',
  Low: '#2f855a'
}

const defaultCenter = [20.5937, 78.9629]

function FitComplaintBounds({ positions }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 13)
      return
    }

    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [35, 35], maxZoom: 14 })
    }
  }, [map, positions])

  return null
}

function AuthorityComplaintMap({ complaints = [] }) {
  const mappedComplaints = complaints
    .map((complaint) => {
      const coordinates = complaint.location?.coordinates
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return null
      }

      const longitude = Number(coordinates[0])
      const latitude = Number(coordinates[1])

      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return null
      }

      return { complaint, position: [latitude, longitude] }
    })
    .filter(Boolean)

  const positions = mappedComplaints.map((item) => item.position)
  const center = positions[0] || defaultCenter

  if (mappedComplaints.length === 0) {
    return (
      <section className="complaint-map-panel" aria-label="Complaint map">
        <div className="map-panel-heading">
          <div>
            <p className="form-kicker">MAP VIEW</p>
            <h2>Complaint locations</h2>
          </div>
        </div>
        <div className="map-empty-state">
          No complaints with valid GPS coordinates on this page.
        </div>
      </section>
    )
  }

  return (
    <section className="complaint-map-panel" aria-label="Complaint map">
      <div className="map-panel-heading">
        <div>
          <p className="form-kicker">MAP VIEW</p>
          <h2>Complaint locations</h2>
        </div>
        <div className="map-legend" aria-label="Priority legend">
          {Object.entries(priorityColors).map(([priority, color]) => (
            <span key={priority}>
              <i style={{ backgroundColor: color }} />
              {priority}
            </span>
          ))}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={positions.length === 1 ? 13 : 5}
        scrollWheelZoom
        className="authority-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitComplaintBounds positions={positions} />
        {mappedComplaints.map(({ complaint, position }) => {
          const color = priorityColors[complaint.priority] || '#1764b1'

          return (
            <CircleMarker
              key={complaint._id}
              center={position}
              radius={9}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 2
              }}
            >
              <Popup>
                <div className="complaint-map-popup">
                  <strong>{complaint.title}</strong>
                  <span>Category: {complaint.category}</span>
                  <span>Status: {complaint.status}</span>
                  <span>Priority: {complaint.priority}</span>
                  <span>Department: {complaint.assignedDepartment || 'Unassigned'}</span>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </section>
  )
}

export default AuthorityComplaintMap
