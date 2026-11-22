import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getComplaintById, getMyComplaints } from '../services/complaintService'
import { getSession } from '../services/authStorage'

function CitizenDashboard({ user, onLogout, navigate }) {
  const [complaints, setComplaints] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedComplaintId, setExpandedComplaintId] = useState(null)
  const [detailsById, setDetailsById] = useState({})
  const [detailsLoadingId, setDetailsLoadingId] = useState(null)
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    let active = true

    getMyComplaints(pagination.page, pagination.limit)
      .then((response) => {
        if (active) {
          setComplaints(response.data.complaints)
          setPagination(response.data.pagination)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [pagination.page, pagination.limit])

  useEffect(() => {
    const session = getSession()
    if (!session?.token || session.user?.role !== 'citizen') {
      return undefined
    }

    const socket = io(
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
      {
        auth: { token: session.token },
        transports: ['websocket', 'polling']
      }
    )

    const handleStatusUpdate = (update) => {
      if (!update?.complaintId || !update.status) return

      setComplaints((currentComplaints) => {
        return currentComplaints.map((complaint) =>
          String(complaint._id) === String(update.complaintId)
            ? {
                ...complaint,
                status: update.status,
                updatedAt: update.updatedAt || complaint.updatedAt
              }
            : complaint
        )
      })

      setDetailsById((currentDetails) => {
        const complaintId = String(update.complaintId)
        const existing = currentDetails[complaintId]
        if (!existing?.complaint) return currentDetails

        const history = Array.isArray(existing.complaint.statusHistory)
          ? existing.complaint.statusHistory
          : []
        const alreadyPresent = history.some((entry) =>
          entry.status === update.status &&
          update.updatedAt &&
          String(entry.changedAt) === String(update.updatedAt)
        )

        return {
          ...currentDetails,
          [complaintId]: {
            ...existing,
            complaint: {
              ...existing.complaint,
              status: update.status,
              updatedAt: update.updatedAt || existing.complaint.updatedAt,
              statusHistory: alreadyPresent
                ? history
                : [
                    ...history,
                    {
                      status: update.status,
                      changedAt: update.updatedAt || new Date().toISOString(),
                      changedBy: null
                    }
                  ]
            }
          }
        }
      })
    }

    socket.on('complaintStatusUpdated', handleStatusUpdate)

    return () => {
      socket.off('complaintStatusUpdated', handleStatusUpdate)
      socket.disconnect()
    }
  }, [])

  const formatDate = (value) => {
    if (!value) return '-'
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value))
  }

  const changePage = (page) => {
    setLoading(true)
    setPagination((current) => ({ ...current, page }))
  }

  const toggleComplaintDetails = async (complaintId) => {
    if (expandedComplaintId === complaintId) {
      setExpandedComplaintId(null)
      setDetailsError('')
      return
    }

    setExpandedComplaintId(complaintId)
    setDetailsError('')

    if (detailsById[complaintId]) return

    setDetailsLoadingId(complaintId)
    try {
      const response = await getComplaintById(complaintId)
      setDetailsById((current) => ({
        ...current,
        [complaintId]: response.data
      }))
    } catch (requestError) {
      setDetailsError(requestError.message)
    } finally {
      setDetailsLoadingId(null)
    }
  }

  const getSortedStatusHistory = (complaint) => {
    if (!Array.isArray(complaint?.statusHistory) || complaint.statusHistory.length === 0) {
      return []
    }

    return [...complaint.statusHistory].sort((first, second) => {
      const firstTime = new Date(first.changedAt).getTime()
      const secondTime = new Date(second.changedAt).getTime()
      if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) return 0
      return firstTime - secondTime
    })
  }

  return (
    <main className="citizen-dashboard">
      <header className="citizen-header">
        <div className="brand-lockup">
          <div className="brand-mark small">CC</div>
          <strong>CivicConnect</strong>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>Logout</button>
      </header>

      <section className="citizen-content">
        <div className="citizen-welcome">
          <div>
            <p className="form-kicker">CITIZEN PORTAL</p>
            <h1>Welcome, {user.name}</h1>
          </div>
          <button
            type="button"
            className="primary-button report-button"
            onClick={() => navigate('/citizen/report')}
          >
            Report a new issue
          </button>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <section className="citizen-complaints-panel">
          <div className="panel-heading">
            <p className="form-kicker">MY COMPLAINTS</p>
            <h2>Reported issues</h2>
          </div>

          {loading ? (
            <div className="table-state">Loading your complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="table-state citizen-empty">
              <strong>No complaints reported yet.</strong>
              <button
                type="button"
                className="primary-button report-button"
                onClick={() => navigate('/citizen/report')}
              >
                Report your first issue
              </button>
            </div>
          ) : (
            <div className="citizen-complaint-grid">
              {complaints.map((complaint) => (
                <article className="citizen-complaint-card" key={complaint._id}>
                  {complaint.image?.url && (
                    <img
                      src={complaint.image.url}
                      alt=""
                      className="complaint-image"
                    />
                  )}
                  <div className="complaint-card-body">
                    <div className="complaint-card-top">
                      <span className={`status-pill status-${complaint.status.toLowerCase().replaceAll(' ', '-')}`}>
                        {complaint.status}
                      </span>
                      <span className={`priority-pill priority-${complaint.priority.toLowerCase()}`}>
                        {complaint.priority}
                      </span>
                      {complaint.isPossibleDuplicate && (
                        <span className="duplicate-badge">Possible Duplicate</span>
                      )}
                    </div>
                    <h3>{complaint.title}</h3>
                    <p>{complaint.category}</p>
                    <p className="department-text">
                      {complaint.assignedDepartment || 'Department pending'}
                    </p>
                    <small>Reported {formatDate(complaint.createdAt)}</small>

                    <button
                      type="button"
                      className="track-progress-button"
                      onClick={() => toggleComplaintDetails(complaint._id)}
                    >
                      {expandedComplaintId === complaint._id
                        ? 'Hide Progress'
                        : 'Track Progress'}
                    </button>

                    {expandedComplaintId === complaint._id && (
                      <div className="complaint-progress-details">
                        {detailsLoadingId === complaint._id && (
                          <div className="progress-loading">Loading complaint details...</div>
                        )}

                        {detailsError && expandedComplaintId === complaint._id && (
                          <div className="progress-error" role="alert">
                            {detailsError}
                          </div>
                        )}

                        {detailsById[complaint._id]?.complaint && (() => {
                          const details = detailsById[complaint._id].complaint
                          const history = getSortedStatusHistory(details)

                          return (
                            <>
                              {details.image?.url && (
                                <img
                                  src={details.image.url}
                                  alt=""
                                  className="progress-detail-image"
                                />
                              )}
                              <dl className="progress-detail-grid">
                                <div>
                                  <dt>Description</dt>
                                  <dd>{details.description || 'No description provided.'}</dd>
                                </div>
                                <div>
                                  <dt>Location</dt>
                                  <dd>
                                    {Array.isArray(details.location?.coordinates) &&
                                    details.location.coordinates.length === 2
                                      ? `Longitude ${details.location.coordinates[0]}, Latitude ${details.location.coordinates[1]}`
                                      : 'No GPS location provided.'}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Assigned department</dt>
                                  <dd>{details.assignedDepartment || 'Department pending'}</dd>
                                </div>
                              </dl>

                              {history.length > 0 ? (
                                <div className="status-timeline" aria-label="Complaint progress timeline">
                                  {history.map((entry, index) => (
                                    <div
                                      className="timeline-entry"
                                      key={`${entry.status}-${entry.changedAt || index}`}
                                    >
                                      <span className={`timeline-dot timeline-${entry.status.toLowerCase().replaceAll(' ', '-')}`} />
                                      <div>
                                        <strong>{entry.status}</strong>
                                        {entry.changedAt && (
                                          <small>
  {new Date(entry.changedAt).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })}
</small>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="timeline-empty">
                                  Status history is not available for this complaint yet.
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => changePage(pagination.page - 1)}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => changePage(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default CitizenDashboard
