import { useState, useEffect, useRef } from 'react'
import { 
  getAllStaffIncomeForDate,
  getIncomeForDay,
  getIncomeForMonth
} from '@/api/client'
import { connectStatistics, type WSClient } from '@/ws/client'
import { Button } from '@/components/ui/button'
import { printerService, StatisticsReportData } from '@/services/printerService'
import { getStaffInfo } from '@/api/client'

type DateRange = 'today' | 'specific-day' | 'month'

export default function EnhancedStatistics() {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const wsClientRef = useRef<WSClient | null>(null)
  
  // Specific day
  const [selectedDay, setSelectedDay] = useState('')
  
  // Month selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Statistics data
  const [stats, setStats] = useState<any>(null)
  const [actualIncome, setActualIncome] = useState<any>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const loadStatistics = async () => {
    setLoading(true)
    try {
      let dateISO: string | undefined = undefined
      let response

      switch (dateRange) {
        case 'today':
          dateISO = new Date().toISOString().split('T')[0]
          response = await getAllStaffIncomeForDate(dateISO)
          console.log('📋 Full API Response:', response)
          break
        case 'specific-day':
          if (selectedDay) {
            response = await getIncomeForDay(selectedDay)
          }
          break
        case 'month':
          response = await getIncomeForMonth(selectedYear, selectedMonth)
          // Reset actual income when loading month data
          setActualIncome(null)
          break
      }

      if (response && response.data) {
        // Calculate total stats from staff data
        const staffData = Array.isArray(response.data) ? response.data : []
        console.log('📊 Staff Data:', staffData)
        
        // Only set stats if we have actual data
        if (staffData.length > 0) {
          const totalStats = staffData.reduce((acc: any, staff: any) => ({
            totalSeatsBooked: acc.totalSeatsBooked + (staff.seatBookings || 0),
            totalSeatIncome: acc.totalSeatIncome + (Number(staff.seatIncome) || 0),
            totalDayPassesSold: acc.totalDayPassesSold + (staff.dayPassSales || 0),
            totalDayPassIncome: acc.totalDayPassIncome + (Number(staff.dayPassIncome) || 0),
            totalIncome: acc.totalIncome + (Number(staff.totalIncome) || 0)
          }), {
            totalSeatsBooked: 0,
            totalSeatIncome: 0,
            totalDayPassesSold: 0,
            totalDayPassIncome: 0,
            totalIncome: 0
          })
          console.log('📊 Total Stats:', totalStats)
          setStats({ totalStats, staffData })
        } else {
          // No data for this period
          setStats(null)
        }
      } else {
        // No response or null data
        setStats(null)
      }

    } catch (err) {
      console.error('Failed to load statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatistics()
  }, [dateRange])


  // WebSocket connection for real-time updates
  useEffect(() => {
    console.log('🔌 Setting up Statistics WebSocket connection...')
    
    const wsClient = connectStatistics({
      onOpen: () => {
        console.log('Statistics WebSocket connected')
        setWsConnected(true)
      },
      onClose: () => {
        console.log('Statistics WebSocket disconnected')
        setWsConnected(false)
      },
      onError: (error) => {
        console.error('Statistics WebSocket error:', error)
        setWsConnected(false)
      },
      onMessage: (message) => {
        console.log('📨 Statistics update received:', message)
        
        // Refresh statistics when we receive an update
        if (message.type === 'statistics_update' || 
            message.type === 'transaction_update' ||
            message.type === 'staff_income_update') {
          console.log('Auto-refreshing statistics...')
          loadStatistics()
        }
      }
    })
    
    wsClientRef.current = wsClient
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Statistics WebSocket connection...')
      wsClient.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoad = () => {
    loadStatistics()
  }

  // Helper function to convert image to base64
  const imageToBase64 = (imagePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          try {
            const base64 = canvas.toDataURL('image/png')
            resolve(base64)
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error('Could not get canvas context'))
        }
      }
      img.onerror = reject
      // Use the public path
      img.src = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
    })
  }

  const handlePrint = async () => {
    if (!stats?.totalStats) {
      alert('Aucune donnée à imprimer')
      return
    }

    // For monthly data, use monthly summary print
    if (dateRange === 'month') {
      await handlePrintMonthlySummary()
      return
    }

    try {
      // Compute staff chart data for printing
      const printStaffChartData = stats?.staffData?.map((staff: any) => ({
        name: staff.staffName || staff.staffId,
        seats: staff.seatBookings || 0,
        seatIncome: Number(staff.seatIncome) || 0,
        dayPasses: staff.dayPassSales || 0,
        dayPassIncome: Number(staff.dayPassIncome) || 0,
        income: Number(staff.totalIncome) || 0
      })) || []

      // Get period label
      let periodLabel = ''
      switch (dateRange) {
        case 'today':
          periodLabel = `Aujourd'hui - ${new Date().toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })}`
          break
        case 'specific-day':
          if (selectedDay) {
            const date = new Date(selectedDay)
            periodLabel = date.toLocaleDateString('fr-FR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })
          }
          break
      }

      // Get staff info for createdBy
      const staffInfo = getStaffInfo()
      const staffName = staffInfo ? `${staffInfo.firstName} ${staffInfo.lastName}` : 'System'

      // Prepare statistics report data
      const reportData: StatisticsReportData = {
        periodLabel,
        totalSeatsBooked: stats.totalStats.totalSeatsBooked,
        totalSeatIncome: Number(stats.totalStats.totalSeatIncome),
        totalDayPassesSold: stats.totalStats.totalDayPassesSold,
        totalDayPassIncome: Number(stats.totalStats.totalDayPassIncome),
        totalIncome: Number(stats.totalStats.totalIncome),
        staffData: printStaffChartData,
        createdBy: staffName,
        createdAt: new Date().toISOString()
      }

      // Print using printer service
      await printerService.printStatisticsReport(reportData)
      alert('Rapport imprimé avec succès')
    } catch (error) {
      console.error('Failed to print statistics:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      // Fallback to HTML print for single day reports
      if (dateRange === 'today' || dateRange === 'specific-day') {
        try {
          const dateISO = dateRange === 'today' 
            ? new Date().toISOString().split('T')[0]
            : selectedDay
          
          if (dateISO) {
            let logoBase64 = ''
            try {
              try {
                logoBase64 = await imageToBase64('icons/ste.png')
              } catch {
                logoBase64 = await imageToBase64('/icons/ste.png')
              }
            } catch (err) {
              console.warn('Could not load logo:', err)
            }
            
            const htmlContent = generateDayReportHTML(dateISO, stats, logoBase64)
            const printContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>Rapport de Revenus</title>
                  <style>
                    @page { size: A4; margin: 0.8cm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Arial', sans-serif; font-size: 8pt; line-height: 1.3; color: #000; }
                    .page-break { page-break-after: always; min-height: 100vh; }
                    .page-break:last-child { page-break-after: auto; }
                    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
                    .header-logo { margin-bottom: 4px; }
                    .header-logo img { max-width: 60px; max-height: 60px; object-fit: contain; }
                    .header-company { font-size: 10pt; font-weight: bold; margin-bottom: 4px; color: #000; }
                    .header h1 { font-size: 14pt; font-weight: bold; margin-bottom: 3px; }
                    .header .period { font-size: 9pt; color: #333; }
                    .header .date { font-size: 7pt; color: #666; margin-top: 2px; }
                    .summary-section { margin-bottom: 10px; }
                    .summary-section h2 { font-size: 10pt; font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 3px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 10px; }
                    .summary-card { border: 1px solid #000; padding: 6px; text-align: center; background: #f9f9f9; }
                    .summary-card-label { font-size: 7pt; color: #666; margin-bottom: 3px; font-weight: 600; }
                    .summary-card-value { font-size: 11pt; font-weight: bold; color: #000; }
                    .summary-card-total { background: #e8e8e8; }
                    .summary-card-total .summary-card-value { font-size: 12pt; color: #000; }
                    .staff-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 7pt; }
                    .staff-table th { background: #333; color: #fff; padding: 4px 4px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 7pt; }
                    .staff-table th.text-right { text-align: right; }
                    .staff-table td { padding: 3px 4px; border: 1px solid #000; font-size: 7pt; }
                    .staff-table td.text-right { text-align: right; }
                    .staff-table tr:nth-child(even) { background: #f5f5f5; }
                    .staff-table .total-row { background: #e8e8e8; font-weight: bold; }
                    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #000; text-align: center; font-size: 7pt; color: #666; }
                    @media print {
                      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                      .no-print { display: none; }
                      .page-break { page-break-after: always; }
                      .page-break:last-child { page-break-after: auto; }
                    }
                  </style>
                </head>
                <body>${htmlContent}</body>
              </html>
            `
            const printWindow = window.open('', '_blank')
            if (printWindow) {
              printWindow.document.write(printContent)
              printWindow.document.close()
              printWindow.onload = () => {
                setTimeout(() => printWindow.print(), 500)
              }
              return
            }
          }
        } catch (fallbackError) {
          console.error('Fallback print also failed:', fallbackError)
        }
      }
      alert(`Erreur impression: ${errorMsg}`)
    }
  }

  // Helper function to generate print content for a specific day (for combined document) - DEPRECATED: Now using printer service
  const generateDayReportHTML = (dateISO: string, dayStats: any, logoBase64: string) => {
    if (!dayStats?.totalStats) {
      return ''
    }

    const printStaffChartData = dayStats?.staffData?.map((staff: any) => ({
      name: staff.staffName || staff.staffId,
      seats: staff.seatBookings || 0,
      seatIncome: Number(staff.seatIncome) || 0,
      dayPasses: staff.dayPassSales || 0,
      dayPassIncome: Number(staff.dayPassIncome) || 0,
      income: Number(staff.totalIncome) || 0
    })) || []

    const date = new Date(dateISO)
    const periodLabel = date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })

    return `
      <div class="page-break">
        <div class="header">
          ${logoBase64 ? `<div class="header-logo"><img src="${logoBase64}" alt="Logo" /></div>` : ''}
          <div class="header-company">STE Dhraiff Services Transport</div>
          <h1>Rapport de Revenus</h1>
          <div class="period">${periodLabel}</div>
          <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>

        <div class="summary-section">
          <h2>Résumé des Revenus</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-card-label">Total Sièges</div>
              <div class="summary-card-value">${dayStats.totalStats.totalSeatsBooked}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card-label">Revenus Sièges</div>
              <div class="summary-card-value">${Number(dayStats.totalStats.totalSeatIncome).toFixed(3)} TND</div>
            </div>
            <div class="summary-card">
              <div class="summary-card-label">Passes Jour</div>
              <div class="summary-card-value">${dayStats.totalStats.totalDayPassesSold}</div>
            </div>
            <div class="summary-card">
              <div class="summary-card-label">Revenus Passes</div>
              <div class="summary-card-value">${Number(dayStats.totalStats.totalDayPassIncome).toFixed(3)} TND</div>
            </div>
            <div class="summary-card summary-card-total">
              <div class="summary-card-label">Revenus Totaux</div>
              <div class="summary-card-value">${Number(dayStats.totalStats.totalIncome).toFixed(3)} TND</div>
            </div>
          </div>
        </div>

        ${printStaffChartData.length > 0 ? `
        <div class="summary-section">
          <h2>Performance du Personnel</h2>
          <table class="staff-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th class="text-right">Sièges</th>
                <th class="text-right">Revenus Sièges</th>
                <th class="text-right">Passes Jour</th>
                <th class="text-right">Revenus Passes</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${printStaffChartData.map((staff: any) => `
                <tr>
                  <td>${staff.name}</td>
                  <td class="text-right">${staff.seats}</td>
                  <td class="text-right">${staff.seatIncome.toFixed(3)} TND</td>
                  <td class="text-right">${staff.dayPasses}</td>
                  <td class="text-right">${staff.dayPassIncome.toFixed(3)} TND</td>
                  <td class="text-right">${staff.income.toFixed(3)} TND</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="text-right"><strong>${dayStats.totalStats.totalSeatsBooked}</strong></td>
                <td class="text-right"><strong>${Number(dayStats.totalStats.totalSeatIncome).toFixed(3)} TND</strong></td>
                <td class="text-right"><strong>${dayStats.totalStats.totalDayPassesSold}</strong></td>
                <td class="text-right"><strong>${Number(dayStats.totalStats.totalDayPassIncome).toFixed(3)} TND</strong></td>
                <td class="text-right"><strong>${Number(dayStats.totalStats.totalIncome).toFixed(3)} TND</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Document généré automatiquement par le système de gestion</p>
        </div>
      </div>
    `
  }

  // Function to print monthly summary (single page with all data)
  const handlePrintMonthlySummary = async () => {
    if (dateRange !== 'month' || !stats) {
      alert('Veuillez sélectionner "Ce Mois", charger les données du mois souhaité, puis réessayer')
      return
    }

    try {

      // Load logo
      let logoBase64 = ''
      try {
        try {
          logoBase64 = await imageToBase64('icons/ste.png')
        } catch {
          logoBase64 = await imageToBase64('/icons/ste.png')
        }
      } catch (err) {
        console.warn('Could not load logo:', err)
      }

      // Prepare staff data
      const staffData = stats.staffData || []
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('fr', { month: 'long' })
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

      // Calculate original income (from staff data - what staff earned)
      const originalIncome = {
        totalSeatsBooked: stats.totalStats.totalSeatsBooked,
        totalSeatIncome: Number(stats.totalStats.totalSeatIncome),
        totalDayPassesSold: stats.totalStats.totalDayPassesSold,
        totalDayPassIncome: Number(stats.totalStats.totalDayPassIncome),
        totalIncome: Number(stats.totalStats.totalIncome)
      }

      // Generate HTML for single page summary
      const htmlContent = `
        <div class="monthly-summary">
          <div class="header">
            ${logoBase64 ? `<div class="header-logo"><img src="${logoBase64}" alt="Logo" /></div>` : ''}
            <div class="header-company">STE Dhraiff Services Transport</div>
            <h1>Rapport Mensuel - Commissions du Personnel</h1>
            <div class="period">${capitalizedMonth} ${selectedYear}</div>
            <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</div>
          </div>

          <div class="summary-section">
            <h2>Commissions du Personnel</h2>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-card-label">Total Sièges</div>
                <div class="summary-card-value">${originalIncome.totalSeatsBooked}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Commissions Sièges</div>
                <div class="summary-card-value">${originalIncome.totalSeatIncome.toFixed(3)} TND</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Passes Jour</div>
                <div class="summary-card-value">${originalIncome.totalDayPassesSold}</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Commissions Passes</div>
                <div class="summary-card-value">${originalIncome.totalDayPassIncome.toFixed(3)} TND</div>
              </div>
              <div class="summary-card summary-card-total">
                <div class="summary-card-label">Total Commissions</div>
                <div class="summary-card-value">${originalIncome.totalIncome.toFixed(3)} TND</div>
              </div>
            </div>
          </div>

          ${staffData.length > 0 ? `
          <div class="summary-section">
            <h2>Performance du Personnel</h2>
            <table class="staff-table">
              <thead>
                <tr>
                  <th>Personnel</th>
                  <th class="text-right">Sièges</th>
                  <th class="text-right">Revenus Sièges</th>
                  <th class="text-right">Passes Jour</th>
                  <th class="text-right">Revenus Passes</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${staffData.map((staff: any) => `
                  <tr>
                    <td>${staff.staffName || staff.staffId}</td>
                    <td class="text-right">${staff.seatBookings || 0}</td>
                    <td class="text-right">${(Number(staff.seatIncome) || 0).toFixed(3)} TND</td>
                    <td class="text-right">${staff.dayPassSales || 0}</td>
                    <td class="text-right">${(Number(staff.dayPassIncome) || 0).toFixed(3)} TND</td>
                    <td class="text-right">${(Number(staff.totalIncome) || 0).toFixed(3)} TND</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td class="text-right"><strong>${originalIncome.totalSeatsBooked}</strong></td>
                  <td class="text-right"><strong>${originalIncome.totalSeatIncome.toFixed(3)} TND</strong></td>
                  <td class="text-right"><strong>${originalIncome.totalDayPassesSold}</strong></td>
                  <td class="text-right"><strong>${originalIncome.totalDayPassIncome.toFixed(3)} TND</strong></td>
                  <td class="text-right"><strong>${originalIncome.totalIncome.toFixed(3)} TND</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>Document généré automatiquement par le système de gestion</p>
            <p><strong>Commissions du Personnel:</strong> 0.150 TND par siège réservé + 2.000 TND par passe jour vendu</p>
          </div>
        </div>
      `

      // Create print document
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Rapport Mensuel - ${capitalizedMonth} ${selectedYear}</title>
            <style>
              @page { size: A4; margin: 0.8cm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Arial', sans-serif; font-size: 9pt; line-height: 1.4; color: #000; }
              .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .header-logo { margin-bottom: 5px; }
              .header-logo img { max-width: 70px; max-height: 70px; object-fit: contain; }
              .header-company { font-size: 12pt; font-weight: bold; margin-bottom: 5px; color: #000; }
              .header h1 { font-size: 16pt; font-weight: bold; margin-bottom: 5px; }
              .header .period { font-size: 11pt; color: #333; font-weight: 600; }
              .header .date { font-size: 8pt; color: #666; margin-top: 3px; }
              .summary-section { margin-bottom: 15px; }
              .summary-section h2 { font-size: 11pt; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
              .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
              .summary-card { border: 1px solid #000; padding: 8px; text-align: center; background: #f9f9f9; }
              .summary-card-label { font-size: 8pt; color: #666; margin-bottom: 4px; font-weight: 600; }
              .summary-card-value { font-size: 12pt; font-weight: bold; color: #000; }
              .summary-card-total { background: #e8e8e8; }
              .summary-card-total .summary-card-value { font-size: 14pt; color: #000; }
              .staff-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8pt; }
              .staff-table th { background: #333; color: #fff; padding: 6px 5px; text-align: left; font-weight: bold; border: 1px solid #000; font-size: 8pt; }
              .staff-table th.text-right { text-align: right; }
              .staff-table td { padding: 5px 5px; border: 1px solid #000; font-size: 8pt; }
              .staff-table td.text-right { text-align: right; }
              .staff-table tr:nth-child(even) { background: #f5f5f5; }
              .staff-table .total-row { background: #e8e8e8; font-weight: bold; }
              .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #000; text-align: center; font-size: 7pt; color: #666; }
              .footer p { margin: 3px 0; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>${htmlContent}</body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Veuillez autoriser les pop-ups pour imprimer')
        return
      }

      printWindow.document.write(printContent)
      printWindow.document.close()

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    } catch (error) {
      console.error('Failed to print monthly summary:', error)
      alert('Erreur lors de l\'impression du rapport mensuel')
    }
  }

  const incomeChartData = stats?.totalStats ? [
    { name: 'Revenus Sièges', value: Number(stats.totalStats.totalSeatIncome), color: '#3B82F6' },
    { name: 'Revenus Passes Jour', value: Number(stats.totalStats.totalDayPassIncome), color: '#10B981' }
  ] : []

  const staffChartData = stats?.staffData?.map((staff: any) => ({
    name: staff.staffName || staff.staffId,
    seats: staff.seatBookings || 0,
    seatIncome: Number(staff.seatIncome) || 0,
    dayPasses: staff.dayPassSales || 0,
    dayPassIncome: Number(staff.dayPassIncome) || 0,
    income: Number(staff.totalIncome) || 0
  })) || []

  return (
    <div className="space-y-4">
      {/* WebSocket Status Indicator */}
      <div className="mb-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
          wsConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          {wsConnected ? 'Mise à jour en temps réel activée' : 'Connexion...'}
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Période d'Analyse</h3>
            <p className="text-xs text-gray-500 mt-1">Sélectionnez la période pour consulter les statistiques</p>
          </div>
          <div className="flex gap-2">
            {dateRange === 'month' && !loading && stats?.totalStats && stats.totalStats.totalIncome > 0 && (
              <Button
                onClick={handlePrintMonthlySummary}
                variant="default"
                size="default"
                className="gap-2"
              >
                Imprimer Rapport Mensuel
              </Button>
            )}
            {!loading && stats?.totalStats && stats.totalStats.totalIncome > 0 && dateRange !== 'month' && (
              <Button
                onClick={handlePrint}
                variant="default"
                size="default"
                className="gap-2"
              >
                Imprimer
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-3">
          <button
            onClick={() => setDateRange('today')}
            className={`px-3 py-2 rounded text-sm ${
              dateRange === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setDateRange('specific-day')}
            className={`px-3 py-2 rounded text-sm ${
              dateRange === 'specific-day' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Jour Spécifique
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-3 py-2 rounded text-sm ${
              dateRange === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Ce Mois
          </button>
        </div>

        {dateRange === 'specific-day' && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <button
              onClick={handleLoad}
              disabled={!selectedDay}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              Charger
            </button>
          </div>
        )}

        {dateRange === 'month' && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Année</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min="2020"
                max="2099"
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Mois</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{new Date(2000, m-1).toLocaleString('fr', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleLoad}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Charger
            </button>
          </div>
        )}
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Chargement...</div>}

      {!loading && stats?.totalStats && stats.totalStats.totalIncome > 0 && (
        <>
          {/* Revenue Overview Section */}
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Vue d'ensemble des Revenus</h2>
              <p className="text-xs text-gray-500">
                {dateRange === 'month' && actualIncome 
                  ? 'Comparaison entre les revenus réels et les commissions du personnel'
                  : 'Résumé des revenus pour la période sélectionnée'}
              </p>
            </div>

            {/* For month view: Show only staff commissions */}
            {dateRange === 'month' ? (
              <div className="max-w-2xl">
                {/* Staff Commissions Only */}
                <div className="border-2 border-amber-200 rounded-lg p-4 bg-gradient-to-br from-amber-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-amber-800">Commissions Personnel</h3>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">0.150 TND/siège + 2.000 TND/passe</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">Sièges réservés</span>
                      <span className="font-semibold">{stats.totalStats.totalSeatsBooked}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">Commissions sièges</span>
                      <span className="font-semibold text-blue-700">{Number(stats.totalStats.totalSeatIncome).toFixed(3)} TND</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">Passes jour vendus</span>
                      <span className="font-semibold">{stats.totalStats.totalDayPassesSold}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">Commissions passes</span>
                      <span className="font-semibold text-green-700">{Number(stats.totalStats.totalDayPassIncome).toFixed(3)} TND</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-amber-100 rounded px-3 py-2">
                      <span className="font-semibold text-amber-900">Total Commissions</span>
                      <span className="text-xl font-bold text-amber-900">{Number(stats.totalStats.totalIncome).toFixed(3)} TND</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* For non-month views: Show simple income cards */
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Total Sièges</div>
                  <div className="text-2xl font-bold text-blue-900">{stats.totalStats.totalSeatsBooked}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Revenus Sièges</div>
                  <div className="text-2xl font-bold text-blue-900">{Number(stats.totalStats.totalSeatIncome).toFixed(3)} TND</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">Passes Jour</div>
                  <div className="text-2xl font-bold text-green-900">{stats.totalStats.totalDayPassesSold}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">Revenus Passes</div>
                  <div className="text-2xl font-bold text-green-900">{Number(stats.totalStats.totalDayPassIncome).toFixed(3)} TND</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-400 rounded-lg p-4 shadow-lg">
                  <div className="text-xs font-medium text-purple-100 uppercase tracking-wide mb-2">Revenus Total</div>
                  <div className="text-3xl font-bold text-white">{Number(stats.totalStats.totalIncome).toFixed(3)} TND</div>
                </div>
              </div>
            )}
          </div>

          {/* Income Breakdown Chart */}
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Répartition des Revenus</h3>
            
            {incomeChartData.length > 0 && incomeChartData.some(item => item.value > 0) ? (
              <>
                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mb-6 pb-4 border-b">
                  {incomeChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-5 h-5 rounded shadow-sm" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-semibold text-gray-700">{item.name}</span>
                      <span className="text-sm font-bold text-gray-900">{item.value.toFixed(3)} TND</span>
                    </div>
                  ))}
                </div>
                
                {/* Bar Chart */}
                <div className="flex items-end justify-center gap-6 h-48 px-4">
                  {incomeChartData.map((item, index) => {
                    const maxValue = Math.max(...incomeChartData.map(i => i.value))
                    const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
                    
                    return (
                      <div key={index} className="flex-1 max-w-32 flex flex-col items-center">
                        <div 
                          className="w-full rounded-t-lg shadow-md transition-all duration-300 hover:shadow-lg hover:opacity-90 cursor-pointer"
                          style={{ 
                            backgroundColor: item.color,
                            height: `${Math.max(percentage, 8)}%`,
                            minHeight: '30px'
                          }}
                          title={`${item.name}: ${item.value.toFixed(3)} TND`}
                        ></div>
                        <div className="text-sm font-semibold text-gray-700 mt-3 text-center">
                          {item.value.toFixed(2)} TND
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          {item.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="mb-3">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="font-medium mb-1">Aucune donnée disponible</p>
                <p className="text-sm">Les graphiques apparaîtront ici une fois que les revenus seront enregistrés</p>
              </div>
            )}
          </div>

          {/* Staff Performance Table */}
          {staffChartData.length > 0 && (
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Performance du Personnel</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="py-3 px-4 font-semibold text-gray-700 text-left">Personnel</th>
                      <th className="py-3 px-4 font-semibold text-gray-700 text-right">Sièges</th>
                      <th className="py-3 px-4 font-semibold text-gray-700 text-right">Revenus Sièges</th>
                      <th className="py-3 px-4 font-semibold text-gray-700 text-right">Passes Jour</th>
                      <th className="py-3 px-4 font-semibold text-gray-700 text-right">Revenus Passes</th>
                      <th className="py-3 px-4 font-semibold text-gray-700 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffChartData.map((staff: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">{staff.name}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{staff.seats}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{staff.seatIncome.toFixed(3)} TND</td>
                        <td className="py-3 px-4 text-right text-gray-700">{staff.dayPasses}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{staff.dayPassIncome.toFixed(3)} TND</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{staff.income.toFixed(3)} TND</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="py-3 px-4 text-gray-900">TOTAL</td>
                      <td className="py-3 px-4 text-right text-gray-900">{stats.totalStats.totalSeatsBooked}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{Number(stats.totalStats.totalSeatIncome).toFixed(3)} TND</td>
                      <td className="py-3 px-4 text-right text-gray-900">{stats.totalStats.totalDayPassesSold}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{Number(stats.totalStats.totalDayPassIncome).toFixed(3)} TND</td>
                      <td className="py-3 px-4 text-right text-gray-900">{Number(stats.totalStats.totalIncome).toFixed(3)} TND</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && stats?.totalStats && stats.totalStats.totalIncome === 0 && (
        <div className="bg-white border rounded-lg shadow-sm p-12 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune donnée disponible</h3>
          <p className="text-sm text-gray-500">
            Les statistiques apparaîtront ici une fois que les transactions seront enregistrées pour cette période
          </p>
        </div>
      )}

      {!loading && !stats && (
        <div className="bg-white border rounded-lg shadow-sm p-12 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune donnée disponible</h3>
          <p className="text-sm text-gray-500">
            Sélectionnez une période et cliquez sur "Charger" pour afficher les statistiques
          </p>
        </div>
      )}
    </div>
  )
}
