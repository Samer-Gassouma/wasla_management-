import React, { useEffect, useState, useRef } from 'react'
import { listStaff, createStaff, updateStaff, deleteStaff, listVehicles, createVehicle, updateVehicle, deleteVehicle, listAuthorizedStations, addAuthorizedStation, deleteAuthorizedStation } from '@/api/client'
import EnhancedStatistics from './EnhancedStatistics'
import QueueManagement from './QueueManagement'
import UpdateStatus from './UpdateStatus'
import { Modal } from './ui/modal'
import Layout from './Layout'

function StaffView() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  
  // Notification state
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null)
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const cinRef = useRef<HTMLInputElement>(null)
  const phoneNumberRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await listStaff()
      setStaff(response.data)
    } catch (error) {
      console.error('Failed to load staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = {
        firstName: firstNameRef.current?.value || '',
        lastName: lastNameRef.current?.value || '',
        cin: cinRef.current?.value || '',
        phoneNumber: phoneNumberRef.current?.value || '',
        role: roleRef.current?.value || 'WORKER'
      }
      
      if (editingStaff) {
        await updateStaff(editingStaff.id, formData)
        showNotification('Personnel modifié avec succès', 'success')
      } else {
        await createStaff(formData)
        showNotification('Personnel créé avec succès', 'success')
      }
      setShowForm(false)
      setEditingStaff(null)
      loadStaff()
    } catch (error) {
      console.error('Failed to save staff:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      showNotification(`Erreur sauvegarde personnel: ${errorMsg}`, 'error')
    }
  }

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember)
    // Set form values for editing
    if (firstNameRef.current) firstNameRef.current.value = staffMember.firstName || ''
    if (lastNameRef.current) lastNameRef.current.value = staffMember.lastName || ''
    if (cinRef.current) cinRef.current.value = staffMember.cin || ''
    if (phoneNumberRef.current) phoneNumberRef.current.value = staffMember.phoneNumber || ''
    if (roleRef.current) roleRef.current.value = staffMember.role || 'WORKER'
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    try {
      await deleteStaff(id)
      loadStaff()
      showNotification('Personnel supprimé avec succès', 'success')
    } catch (error) {
      console.error('Failed to delete staff:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      showNotification(`Erreur suppression personnel: ${errorMsg}`, 'error')
    }
  }

  return (
    <div>
      {/* Notification Toast */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl transform transition-all duration-300 max-w-md border ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium break-words">{notification.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gestion du Personnel</h2>
          <p className="text-sm text-muted-foreground mt-1">Créez, modifiez et gérez les membres du personnel</p>
        </div>
        <button 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
          onClick={() => setShowForm(true)}
        >
          + Ajouter Personnel
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 border-2 border-border rounded-lg bg-card shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">{editingStaff ? 'Modifier Personnel' : 'Ajouter Personnel'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Prénom</label>
              <input
                type="text"
                ref={firstNameRef}
                placeholder="Prénom"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom</label>
              <input
                type="text"
                ref={lastNameRef}
                placeholder="Nom"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CIN</label>
              <input
                type="text"
                ref={cinRef}
                placeholder="CIN (8 chiffres)"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Téléphone</label>
              <input
                type="text"
                ref={phoneNumberRef}
                placeholder="Numéro de Téléphone"
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rôle</label>
              <select
                ref={roleRef}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                defaultValue="WORKER"
              >
                <option value="WORKER">Employé</option>
                <option value="SUPERVISOR">Superviseur</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button 
                type="submit" 
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {editingStaff ? 'Mettre à jour' : 'Créer'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false)
                  setEditingStaff(null)
                  // Clear all inputs
                  if (firstNameRef.current) firstNameRef.current.value = ''
                  if (lastNameRef.current) lastNameRef.current.value = ''
                  if (cinRef.current) cinRef.current.value = ''
                  if (phoneNumberRef.current) phoneNumberRef.current.value = ''
                  if (roleRef.current) roleRef.current.value = 'WORKER'
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Chargement du personnel...</div>
        </div>
      )}
      {!loading && staff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Aucun membre du personnel trouvé</p>
        </div>
      )}
      {!loading && staff.length > 0 && (
        <div className="overflow-x-auto border border-border rounded-lg shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-semibold text-foreground">Nom</th>
                <th className="text-left p-4 font-semibold text-foreground">CIN</th>
                <th className="text-left p-4 font-semibold text-foreground">Téléphone</th>
                <th className="text-left p-4 font-semibold text-foreground">Rôle</th>
                <th className="text-left p-4 font-semibold text-foreground">Statut</th>
                <th className="text-left p-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, index) => (
                <tr 
                  key={s.id}
                  className={`border-b border-border hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                  }`}
                >
                  <td className="p-4 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                  <td className="p-4 text-muted-foreground">{s.cin}</td>
                  <td className="p-4 text-muted-foreground">{s.phoneNumber}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.role === 'SUPERVISOR' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.role === 'SUPERVISOR' ? 'Superviseur' : 'Employé'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      s.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {s.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(s)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        Modifier
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function VehiclesView() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [allVehicles, setAllVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null)
  const [authorized, setAuthorized] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  
  // Notification state
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null)
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const licensePlateRef = useRef<HTMLInputElement>(null)
  const capacityRef = useRef<HTMLInputElement>(null)
  const phoneNumberRef = useRef<HTMLInputElement>(null)
  const isActiveRef = useRef<HTMLInputElement>(null)
  const isAvailableRef = useRef<HTMLInputElement>(null)
  const isBannedRef = useRef<HTMLInputElement>(null)
  const selectedStationsRef = useRef<{[key: string]: HTMLInputElement}>({})

  const validateLicensePlate = (plate: string) => {
    const cleaned = plate.replace(/\s/g, '').toUpperCase()
    return /^\d{2,3}TUN\d{1,4}$/.test(cleaned)
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const response = await listVehicles()
      setAllVehicles(response.data)
      setVehicles(response.data)
    } catch (error) {
      console.error('Failed to load vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter vehicles based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setVehicles(allVehicles)
      return
    }
    
    const query = searchQuery.toLowerCase().trim()
    const filtered = allVehicles.filter(v => 
      v.licensePlate?.toLowerCase().includes(query) ||
      v.phoneNumber?.toLowerCase().includes(query)
    )
    setVehicles(filtered)
  }, [searchQuery, allVehicles])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const licensePlate = licensePlateRef.current?.value || ''
    const capacity = parseInt(capacityRef.current?.value || '8')
    const phoneNumber = phoneNumberRef.current?.value || ''
    const isActive = isActiveRef.current?.checked ?? true
    const isAvailable = isAvailableRef.current?.checked ?? true
    const isBanned = isBannedRef.current?.checked ?? false
    
    // Get selected stations from checkboxes
    const stationIds = ['station-jemmal', 'station-ksar-hlel', 'station-moknin', 'station-teboulba']
    const currentSelected = stationIds.filter(id => selectedStationsRef.current[id]?.checked)
    
    // Validate license plate format
    if (!validateLicensePlate(licensePlate)) {
      showNotification('Format invalide. Format: 123 TUN 4567 (2-3 chiffres, TUN, 1-4 chiffres)', 'error')
      return
    }
    
    try {
      const vehicleData = {
        licensePlate,
        capacity,
        phoneNumber,
        isActive,
        isAvailable,
        isBanned
      }
      
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleData)
        
        // Update authorized stations
        const currentStations = authorized.map((station: any) => station.stationId)
        
        // Remove stations that are no longer selected
        for (const station of authorized) {
          if (!currentSelected.includes(station.stationId)) {
            await deleteAuthorizedStation(editingVehicle.id, station.id)
          }
        }
        
        // Add new stations
        for (const stationId of currentSelected) {
          if (!currentStations.includes(stationId)) {
            const stationName = stationId === 'station-jemmal' ? 'JEMMAL' :
                              stationId === 'station-ksar-hlel' ? 'KSAR HLEL' :
                              stationId === 'station-moknin' ? 'MOKNIN' :
                              stationId === 'station-teboulba' ? 'TEBOULBA' : stationId
            await addAuthorizedStation(editingVehicle.id, {
              stationId,
              stationName,
              priority: 1,
              isDefault: currentSelected.length === 1
            })
          }
        }
      } else {
        const newVehicle = await createVehicle(vehicleData)
        
        // Add selected stations to the new vehicle
        if (currentSelected.length > 0) {
          for (const stationId of currentSelected) {
            const stationName = stationId === 'station-jemmal' ? 'JEMMAL' :
                              stationId === 'station-ksar-hlel' ? 'KSAR HLEL' :
                              stationId === 'station-moknin' ? 'MOKNIN' :
                              stationId === 'station-teboulba' ? 'TEBOULBA' : stationId
            await addAuthorizedStation(newVehicle.data.id, {
              stationId,
              stationName,
              priority: 1,
              isDefault: currentSelected.length === 1
            })
          }
        }
      }
      
      showNotification(editingVehicle ? 'Véhicule modifié avec succès' : 'Véhicule créé avec succès', 'success')
      setShowForm(false)
      setEditingVehicle(null)
      loadVehicles()
    } catch (error) {
      console.error('Failed to save vehicle:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      showNotification(`Erreur sauvegarde véhicule: ${errorMsg}`, 'error')
    }
  }

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle)
    
    // Set values in refs
    if (licensePlateRef.current) licensePlateRef.current.value = vehicle.licensePlate || ''
    if (capacityRef.current) capacityRef.current.value = vehicle.capacity?.toString() || '8'
    if (phoneNumberRef.current) phoneNumberRef.current.value = vehicle.phoneNumber || ''
    if (isActiveRef.current) isActiveRef.current.checked = vehicle.isActive ?? true
    if (isAvailableRef.current) isAvailableRef.current.checked = vehicle.isAvailable ?? true
    if (isBannedRef.current) isBannedRef.current.checked = vehicle.isBanned ?? false
    
    // load authorized stations for this vehicle
    listAuthorizedStations(vehicle.id).then((r) => {
      setAuthorized(r.data)
      // Set selected stations based on current authorized stations
      const currentStations = r.data.map((station: any) => station.stationId)
      
      // Set checkboxes for authorized stations
      currentStations.forEach(stationId => {
        if (selectedStationsRef.current[stationId]) {
          selectedStationsRef.current[stationId].checked = true
        }
      })
    }).catch(() => {
      setAuthorized([])
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle? This will also delete all related records (queue entries, day passes, etc.).')) return
    try {
      const result = await deleteVehicle(id)
      console.log('Delete result:', result)
      loadVehicles()
      showNotification('Véhicule supprimé avec succès', 'success')
    } catch (error) {
      console.error('Failed to delete vehicle:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      showNotification(`Erreur suppression véhicule: ${errorMsg}`, 'error')
    }
  }

  return (
    <div>
      {/* Notification Toast */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 max-w-md ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium break-words">{notification.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Manage vehicles (CRUD)</p>
        <button 
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          onClick={() => setShowForm(true)}
        >
          Add Vehicle
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par plaque ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {showForm && !editingVehicle && (
        <div className="mb-4 p-4 border rounded">
          <h3 className="font-medium mb-3">Add Vehicle</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <input
              type="text"
              ref={licensePlateRef}
              placeholder="License Plate (e.g., 123 TUN 4567)"
              className="px-2 py-1 border rounded"
              required
            />
            <input
              type="number"
              ref={capacityRef}
              placeholder="Capacity"
              defaultValue="8"
              className="px-2 py-1 border rounded"
              min="1"
              required
            />
            <input
              type="text"
              ref={phoneNumberRef}
              placeholder="Phone Number (optional)"
              className="px-2 py-1 border rounded"
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  ref={isActiveRef}
                  defaultChecked
                />
                Active
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  ref={isAvailableRef}
                  defaultChecked
                />
                Available
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  ref={isBannedRef}
                />
                Banned
              </label>
            </div>
            
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Authorized Stations</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'station-jemmal', name: 'JEMMAL' },
                    { id: 'station-ksar-hlel', name: 'KSAR HLEL' },
                    { id: 'station-moknin', name: 'MOKNIN' },
                    { id: 'station-teboulba', name: 'TEBOULBA' }
                  ].map((station) => (
                    <label key={station.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        ref={(el) => { if (el) selectedStationsRef.current[station.id] = el }}
                      />
                      {station.name}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 px-3 py-1 bg-purple-500 text-white rounded text-sm"
                  onClick={() => {
                    Object.keys(selectedStationsRef.current).forEach(key => {
                      if (selectedStationsRef.current[key]) {
                        selectedStationsRef.current[key].checked = true
                      }
                    })
                  }}
                >
                  Select All Governorates
                </button>
              </div>
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1 bg-green-500 text-white rounded text-sm">
                Create
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false)
                  setEditingVehicle(null)
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>

        </div>
      )}

      {loading && <div className="text-sm">Loading vehicles...</div>}
      {!loading && vehicles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 border">License Plate</th>
                <th className="text-left p-2 border">Capacity</th>
                <th className="text-left p-2 border">Phone</th>
                <th className="text-left p-2 border">Authorized Stations</th>
                <th className="text-left p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="p-2 border font-medium">{v.licensePlate}</td>
                  <td className="p-2 border">{v.capacity}</td>
                  <td className="p-2 border">{v.phoneNumber || '-'}</td>
                  <td className="p-2 border">
                    <div className="space-y-1">
                      {v.authorizedStations && v.authorizedStations.length > 0 ? (
                        (() => {
                          const stationNames = v.authorizedStations.map((s: any) => s.stationName || s.stationId).sort();
                          const allStations = ['JEMMAL', 'KSAR HLEL', 'MOKNIN', 'TEBOULBA'];
                          const hasAllStations = allStations.every(station => stationNames.includes(station));
                          
                          if (hasAllStations) {
                            return (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                                All Governorates
                              </span>
                            );
                          }
                          
                          return v.authorizedStations.map((station: any) => (
                            <div key={station.id} className="flex items-center gap-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {station.stationName || station.stationId}
                              </span>
                              {station.isDefault && (
                                <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          ));
                        })()
                      ) : (
                        <span className="text-xs text-gray-500">No stations</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 border">
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(v)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && vehicles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No vehicles registered yet
        </div>
      )}

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={editingVehicle !== null}
        onClose={() => {
          setEditingVehicle(null)
        }}
        title="Edit Vehicle"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">License Plate</label>
              <input
                type="text"
                ref={licensePlateRef}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input
                type="number"
                ref={capacityRef}
                className="w-full px-3 py-2 border rounded"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number (optional)</label>
              <input
                type="text"
                ref={phoneNumberRef}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    ref={isActiveRef}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    ref={isAvailableRef}
                  />
                  Available
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    ref={isBannedRef}
                  />
                  Banned
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Authorized Stations</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'station-jemmal', name: 'JEMMAL' },
                { id: 'station-ksar-hlel', name: 'KSAR HLEL' },
                { id: 'station-moknin', name: 'MOKNIN' },
                { id: 'station-teboulba', name: 'TEBOULBA' }
              ].map((station) => (
                <label key={station.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    ref={(el) => { if (el) selectedStationsRef.current[station.id] = el }}
                  />
                  {station.name}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 px-3 py-1 bg-purple-500 text-white rounded text-sm"
              onClick={() => {
                Object.keys(selectedStationsRef.current).forEach(key => {
                  if (selectedStationsRef.current[key]) {
                    selectedStationsRef.current[key].checked = true
                  }
                })
              }}
            >
              Select All Governorates
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => {
                setEditingVehicle(null)
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

type Props = { onLogout: () => void };

export default function SupervisorMain({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'statistics' | 'queue' | 'staff' | 'vehicles'>('queue')
  
  // Get user role and info from localStorage
  const userRole = typeof window !== 'undefined' ? (localStorage.getItem('userRole') || 'WORKER') : 'WORKER'
  const isSupervisor = userRole === 'SUPERVISOR'
  
  // Get staff info for display
  const [userName, setUserName] = useState<string>('')
  
  useEffect(() => {
    try {
      const staffInfo = localStorage.getItem('staffInfo')
      if (staffInfo) {
        const parsed = JSON.parse(staffInfo)
        setUserName(`${parsed.firstName} ${parsed.lastName}`)
      }
    } catch (e) {
      console.error('Failed to parse staff info:', e)
    }
  }, [])
  
  // Workers can only see queue and vehicles, supervisors see all
  useEffect(() => {
    if (!isSupervisor) {
      // Workers can only access queue and vehicles
      if (activeTab !== 'queue' && activeTab !== 'vehicles') {
        setActiveTab('queue')
      }
    }
  }, [isSupervisor, activeTab])

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={onLogout}
      isSupervisor={isSupervisor}
      userName={userName}
      userRole={userRole}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {activeTab === 'statistics' && 'Statistiques'}
              {activeTab === 'queue' && 'Gestion de la Queue'}
              {activeTab === 'staff' && 'Gestion du Personnel'}
              {activeTab === 'vehicles' && 'Gestion des Véhicules'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'statistics' && 'Consultez les statistiques et rapports détaillés'}
              {activeTab === 'queue' && 'Gérez les files d\'attente et les réservations'}
              {activeTab === 'staff' && 'Gérez les membres du personnel'}
              {activeTab === 'vehicles' && 'Gérez la flotte de véhicules'}
            </p>
          </div>
          <UpdateStatus />
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'statistics' && isSupervisor && <EnhancedStatistics />}
          {activeTab === 'queue' && <QueueManagement />}
          {activeTab === 'staff' && isSupervisor && <StaffView />}
          {activeTab === 'vehicles' && <VehiclesView />}
        </div>
      </div>
    </Layout>
  )
}



