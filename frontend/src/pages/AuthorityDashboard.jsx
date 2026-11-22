import { useCallback, useEffect, useState } from 'react'
import {
  assignComplaintDepartment,
  getComplaints,
  getComplaintStats,
  updateComplaintPriority,
  updateComplaintStatus
} from '../services/complaintService'
import AuthorityComplaintMap from '../components/AuthorityComplaintMap'

const initialFilters = {
  status: '',
  category: '',
  priority: '',
  assignedDepartment: '',
  search: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10
}

const statusOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected']
const categoryOptions = ['Road', 'Garbage', 'Water', 'Streetlight', 'Other']
const priorityOptions = ['Low', 'Medium', 'High', 'Critical']
const departmentOptions = [
  'Public Works Department',
  'Sanitation Department',
  'Water Department',
  'Electrical Department',
  'General Department'
]

function AuthorityDashboard({ user, onLogout }) {
  const [filters, setFilters] = useState(initialFilters)
  const [stats, setStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionId, setActionId] = useState('')
  const [mapComplaints, setMapComplaints] = useState([])
  const [mapLoading, setMapLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const response = await getComplaintStats()
      setStats(response.data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadComplaints = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getComplaints(filters)
      setComplaints(response.data.complaints)
      setPagination(response.data.pagination)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let active = true

    getComplaintStats()
      .then((response) => {
        if (active) setStats(response.data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setStatsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getComplaints(filters)
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
  }, [filters])

  useEffect(() => {
    let active = true

    const loadAllMapComplaints = async () => {
      setMapLoading(true)

      const mapFilters = {
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        assignedDepartment: filters.assignedDepartment,
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page: 1,
        limit: 100
      }

      try {
        const firstResponse = await getComplaints(mapFilters)
        let allComplaints = [...firstResponse.data.complaints]
        const firstPagination = firstResponse.data.pagination
        const remainingPages = Math.max(
          0,
          (firstPagination.totalPages || 0) - 1
        )

        for (let page = 2; page <= remainingPages + 1; page += 1) {
          const response = await getComplaints({
            ...mapFilters,
            page
          })
          allComplaints = [...allComplaints, ...response.data.complaints]
        }

        const uniqueComplaints = Array.from(
          new Map(
            allComplaints
              .filter((complaint) => complaint?._id)
              .map((complaint) => [complaint._id, complaint])
          ).values()
        )

        if (active) setMapComplaints(uniqueComplaints)
      } catch (requestError) {
        if (active) {
          setMapComplaints([])
          setError(requestError.message)
        }
      } finally {
        if (active) setMapLoading(false)
      }
    }

    loadAllMapComplaints()

    return () => {
      active = false
    }
  }, [filters.status, filters.category, filters.priority, filters.assignedDepartment, filters.search, filters.startDate, filters.endDate])

  const updateFilter = (event) => {
    const { name, value } = event.target
    setFilters((current) => ({
      ...current,
      [name]: name === 'page' || name === 'limit' ? Number(value) : value,
      ...(name !== 'page' ? { page: 1 } : {})
    }))
  }

  const clearFilters = () => {
    setFilters(initialFilters)
  }

  const changePage = (page) => {
    setFilters((current) => ({ ...current, page }))
  }

  const runAction = async (id, actionType, value) => {
    if (!value) return

    setActionId(id)
    setActionMessage('')
    setError('')

    try {
      if (actionType === 'status') {
        await updateComplaintStatus(id, value)
      } else if (actionType === 'priority') {
        await updateComplaintPriority(id, value)
      } else {
        await assignComplaintDepartment(id, value)
      }

      setActionMessage('Complaint updated successfully.')
      await Promise.all([loadComplaints(), loadStats()])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setActionId('')
    }
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value))
  }

  const statCards = stats
    ? [
        { label: 'Total complaints', value: stats.total, tone: 'blue' },
        { label: 'Pending', value: stats.status.Pending, tone: 'yellow' },
        { label: 'In Progress', value: stats.status['In Progress'], tone: 'blue' },
        { label: 'Resolved', value: stats.status.Resolved, tone: 'green' },
        { label: 'Rejected', value: stats.status.Rejected, tone: 'red' },
        { label: 'High / Critical', value: stats.priority.High + stats.priority.Critical, tone: 'purple' }
      ]
    : []

  return (
    <main className="authority-dashboard">
      <aside className="authority-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">CC</div>
          <span>CivicConnect</span>
        </div>
        <nav aria-label="Authority navigation">
          <button type="button" className="sidebar-link active">Dashboard</button>
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.name?.charAt(0)?.toUpperCase() || 'A'}</div>
          <div>
            <strong>{user.name}</strong>
            <span>Authority</span>
          </div>
        </div>
        <button type="button" className="sidebar-logout" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <section className="authority-content">
        <header className="authority-heading">
          <div>
            <p className="form-kicker">AUTHORITY PORTAL</p>
            <h1>Complaint Overview</h1>
          </div>
        </header>

        {error && <div className="alert alert-error dashboard-alert" role="alert">{error}</div>}
        {actionMessage && <div className="alert alert-success dashboard-alert" role="status">{actionMessage}</div>}

        {statsLoading ? (
          <div className="stats-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div className="stat-card skeleton-card" key={item} />
            ))}
          </div>
        ) : (
          <section className="stats-grid" aria-label="Complaint statistics">
            {statCards.map((card) => (
              <article className={`stat-card stat-${card.tone}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </section>
        )}

        <section className="complaints-panel">
          <div className="panel-heading">
            <div>
              <p className="form-kicker">COMPLAINTS</p>
              <h2>Manage complaints</h2>
            </div>
          </div>

          <div className="filter-grid">
            <label>
              Search
              <input
                type="search"
                name="search"
                value={filters.search}
                onChange={updateFilter}
                placeholder="Title or description"
              />
            </label>

            <label>
              Status
              <select name="status" value={filters.status} onChange={updateFilter}>
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select name="category" value={filters.category} onChange={updateFilter}>
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select name="priority" value={filters.priority} onChange={updateFilter}>
                <option value="">All priorities</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>

            <label>
              Department
              <select name="assignedDepartment" value={filters.assignedDepartment} onChange={updateFilter}>
                <option value="">All departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>

            <label>
              From
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={updateFilter}
              />
            </label>

            <label>
              To
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={updateFilter}
              />
            </label>

            <button type="button" className="clear-filter" onClick={clearFilters}>
              Clear filters
            </button>
          </div>

          {!loading && !mapLoading && (
            <AuthorityComplaintMap
              complaints={mapComplaints}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              departmentOptions={departmentOptions}
              actionId={actionId}
              onAction={runAction}
            />
          )}

          {loading ? (
            <div className="table-state">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="table-state">No complaints match these filters.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((complaint) => (
                    <tr key={complaint._id}>
                      <td>
                        <strong>{complaint.title}</strong>
                        {complaint.isPossibleDuplicate === true && (
                          <span className="duplicate-badge authority-table-duplicate-badge">
                            Possible Duplicate
                          </span>
                        )}
                      </td>
                      <td>{complaint.category}</td>
                      <td>
                        <select
                          className="table-action"
                          value={complaint.assignedDepartment || ''}
                          disabled={actionId === complaint._id}
                          onChange={(event) => runAction(complaint._id, 'department', event.target.value)}
                          aria-label={`Department for ${complaint.title}`}
                        >
                          <option value="">Unassigned</option>
                          {departmentOptions.map((department) => (
                            <option key={department} value={department}>{department}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="table-action"
                          value={complaint.priority}
                          disabled={actionId === complaint._id}
                          onChange={(event) => runAction(complaint._id, 'priority', event.target.value)}
                          aria-label={`Priority for ${complaint.title}`}
                        >
                          {priorityOptions.map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="table-action"
                          value={complaint.status}
                          disabled={actionId === complaint._id}
                          onChange={(event) => runAction(complaint._id, 'status', event.target.value)}
                          aria-label={`Status for ${complaint.title}`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td>{formatDate(complaint.createdAt)}</td>
                      <td><code className="complaint-id">{complaint._id}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
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

export default AuthorityDashboard
