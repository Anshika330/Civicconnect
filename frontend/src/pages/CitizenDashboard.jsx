import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { getMyComplaints } from '../services/complaintService'
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

      setComplaints((currentComplaints) =>
        currentComplaints.map((complaint) =>
          String(complaint._id) === String(update.complaintId)
            ? {
                ...complaint,
                status: update.status,
                updatedAt: update.updatedAt || complaint.updatedAt
              }
            : complaint
        )
      )
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
