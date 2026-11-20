import { useEffect, useState } from 'react'
import { createComplaint } from '../services/complaintService'

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 5 * 1024 * 1024

function ReportComplaint({ onLogout, navigate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: ''
  })
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [duplicateReference, setDuplicateReference] = useState(null)
  const [loading, setLoading] = useState(false)
  const [capturingLocation, setCapturingLocation] = useState(false)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }))
  }

  const handleImage = (event) => {
    const file = event.target.files?.[0]
    setError('')

    if (!file) return
    if (!allowedImageTypes.includes(file.type)) {
      setError('Only JPEG, PNG and WebP images are allowed.')
      event.target.value = ''
      return
    }
    if (file.size > maxImageSize) {
      setError('Image size must not exceed 5 MB.')
      event.target.value = ''
      return
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(null)
    setImagePreview('')
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by this browser.')
      return
    }

    setCapturingLocation(true)
    setLocationStatus('Capturing location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
        setLocationStatus('Location captured successfully.')
        setCapturingLocation(false)
      },
      (locationError) => {
        setLocation(null)
        setCapturingLocation(false)

        if (locationError.code === locationError.PERMISSION_DENIED) {
          setLocationStatus('Location permission denied. You can submit without GPS location.')
        } else if (locationError.code === locationError.POSITION_UNAVAILABLE) {
          setLocationStatus('Location unavailable. You can submit without GPS location.')
        } else if (locationError.code === locationError.TIMEOUT) {
          setLocationStatus('Location request timed out. You can submit without GPS location.')
        } else {
          setLocationStatus('Unable to capture location. You can submit without GPS location.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  const clearLocation = () => {
    setLocation(null)
    setLocationStatus('Location removed.')
  }

  const validate = () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      return 'Title, description and category are required.'
    }
    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setSuccess('')
      setDuplicateWarning('')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setDuplicateWarning('')
    setDuplicateReference(null)

    try {
      const response = await createComplaint({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        image,
        location
      })

      setSuccess('Complaint reported successfully.')

      const duplicate = response.data?.duplicate
      if (duplicate?.isPossibleDuplicate) {
        setDuplicateWarning(
          duplicate.message ||
          'This complaint may be similar to an existing nearby complaint.'
        )
        setDuplicateReference(duplicate.duplicateOf || null)
      }

      setForm({ title: '', description: '', category: '' })
      removeImage()
      setLocation(null)
      setLocationStatus('')

      if (!duplicate?.isPossibleDuplicate) {
        window.setTimeout(() => {
          navigate('/citizen/dashboard')
        }, 700)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
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

      <section className="report-layout">
        <div className="report-heading">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/citizen/dashboard')}
          >
            ← My complaints
          </button>
          <p className="form-kicker">NEW CIVIC ISSUE</p>
          <h1>Report a complaint</h1>
          <p>Share the issue details and optional evidence. We will route it automatically.</p>
        </div>

        <div className="report-card">
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}
          {duplicateWarning && (
            <div className="duplicate-warning-panel" role="status">
              <div>
                <strong>Possible duplicate detected</strong>
                <p>{duplicateWarning}</p>
                {duplicateReference && (
                  <p className="duplicate-reference">
                    Similar complaint reference: <code>{duplicateReference}</code>
                  </p>
                )}
              </div>
              <button
                type="button"
                className="duplicate-continue-button"
                onClick={() => navigate('/citizen/dashboard')}
              >
                Continue to My Complaints
              </button>
            </div>
          )}

          <form className="report-form" onSubmit={handleSubmit}>
            <label htmlFor="complaint-title">Complaint title</label>
            <input
              id="complaint-title"
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="Example: Large pothole near school gate"
            />

            <label htmlFor="complaint-description">Description</label>
            <textarea
              id="complaint-description"
              name="description"
              value={form.description}
              onChange={updateField}
              rows="5"
              placeholder="Describe the issue, location, and how it is affecting people"
            />

            <label htmlFor="complaint-category">Category</label>
            <select
              id="complaint-category"
              name="category"
              value={form.category}
              onChange={updateField}
            >
              <option value="">Select a category</option>
              <option value="Road">Road</option>
              <option value="Garbage">Garbage</option>
              <option value="Water">Water</option>
              <option value="Streetlight">Streetlight</option>
              <option value="Other">Other</option>
            </select>

            <fieldset className="report-fieldset">
              <legend>Image (optional)</legend>
              <div className="image-upload">
                {imagePreview ? (
                  <div className="image-preview-wrap">
                    <img src={imagePreview} alt="Selected complaint preview" />
                    <button type="button" onClick={removeImage}>Remove</button>
                  </div>
                ) : (
                  <label className="file-picker" htmlFor="complaint-image">
                    <strong>Choose an image</strong>
                    <span>JPEG, PNG or WebP · Maximum 5 MB</span>
                  </label>
                )}
                <input
                  id="complaint-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImage}
                />
              </div>
            </fieldset>

            <fieldset className="report-fieldset">
              <legend>GPS location (optional)</legend>
              <button
                type="button"
                className="location-button"
                onClick={captureLocation}
                disabled={capturingLocation}
              >
                {capturingLocation ? 'Capturing...' : 'Capture my location'}
              </button>

              {location && (
                <div className="location-result">
                  <span>
                    Latitude: {location.latitude.toFixed(6)} · Longitude: {location.longitude.toFixed(6)}
                  </span>
                  <button type="button" onClick={clearLocation}>Remove location</button>
                </div>
              )}
              {locationStatus && <p className="location-status">{locationStatus}</p>}
            </fieldset>

            <button
              type="submit"
              className="primary-button submit-complaint"
              disabled={loading}
            >
              {loading ? 'Submitting complaint...' : 'Submit complaint'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default ReportComplaint
