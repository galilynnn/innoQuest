'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CustomerDataSet {
  id: string
  game_id: string
  file_name: string
  uploaded_at: string
  record_count: number
  is_active: boolean
}

interface CustomerDataManagementProps {
  gameId: string
}

export default function CustomerDataManagement({ gameId }: CustomerDataManagementProps) {
  const supabase = createClient()
  const [dataSets, setDataSets] = useState<CustomerDataSet[]>([])
  const [activeDataSetId, setActiveDataSetId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')

  useEffect(() => {
    loadDataSets()
  }, [])

  const loadDataSets = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_data_sets')
        .select('*')
        .eq('game_id', gameId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error

      setDataSets(data || [])
      
      // Set the active data set (most recent or marked as active)
      const active = data?.find(d => d.is_active)
      if (active) {
        setActiveDataSetId(active.id)
      } else if (data && data.length > 0) {
        setActiveDataSetId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading data sets:', error)
    }
    setLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUploadCSV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Please select a CSV file')
      return
    }

    setUploading(true)
    try {
      // Parse CSV file
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length < 1) {
        alert('CSV file is empty')
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim())
      const records = []

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue
        
        const values = lines[i].split(',').map(v => v.trim())
        const record: any = {}
        
        headers.forEach((header, index) => {
          record[header] = values[index] || ''
        })
        records.push(record)
      }

      if (records.length === 0) {
        alert('No valid records found in CSV')
        setUploading(false)
        return
      }

      console.log(`Uploading ${records.length} records from ${selectedFile.name}`)

      // Store file reference and record count in database
      const { data, error } = await supabase
        .from('customer_data_sets')
        .insert({
          game_id: gameId,
          file_name: selectedFile.name,
          record_count: records.length,
          uploaded_at: new Date().toISOString(),
          is_active: dataSets.length === 0,
          csv_data: records,
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (data && data[0]) {
        setActiveDataSetId(data[0].id)
        alert(`Successfully uploaded ${records.length} records from ${selectedFile.name}`)
        loadDataSets()
      }
      setSelectedFile(null)
      const inputElement = document.getElementById('csv-input') as HTMLInputElement
      if (inputElement) inputElement.value = ''
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert(`Failed to upload CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setUploading(false)
  }

  const handleSetActive = async (dataSetId: string) => {
    try {
      // Deactivate all data sets for this game
      await supabase
        .from('customer_data_sets')
        .update({ is_active: false })
        .eq('game_id', gameId)

      // Activate selected data set
      await supabase
        .from('customer_data_sets')
        .update({ is_active: true })
        .eq('id', dataSetId)

      setActiveDataSetId(dataSetId)
      loadDataSets()
    } catch (error) {
      console.error('Error setting active data set:', error)
    }
  }

  const handleDownload = async (dataSet: CustomerDataSet) => {
    try {
      const { data, error } = await supabase
        .from('customer_data_sets')
        .select('csv_data')
        .eq('id', dataSet.id)
        .single()

      if (error) throw error

      const csvContent = data.csv_data
      const csvString = JSON.stringify(csvContent, null, 2)
      const blob = new Blob([csvString], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = dataSet.file_name
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const handleDeleteDataSet = async (dataSetId: string) => {
    if (!confirm('Delete this customer data set?')) return

    try {
      await supabase
        .from('customer_data_sets')
        .delete()
        .eq('id', dataSetId)

      loadDataSets()
    } catch (error) {
      console.error('Error deleting data set:', error)
    }
  }

  const handleStartEdit = (dataSet: CustomerDataSet) => {
    setEditingId(dataSet.id)
    setEditingName(dataSet.file_name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (dataSetId: string) => {
    if (!editingName.trim()) {
      alert('Name cannot be empty')
      return
    }

    try {
      await supabase
        .from('customer_data_sets')
        .update({ file_name: editingName })
        .eq('id', dataSetId)

      loadDataSets()
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Error renaming data set:', error)
      alert('Failed to rename data set')
    }
  }

  if (loading) {
    return <div className="p-4">Loading customer data sets...</div>
  }

  return (
    <div className="space-y-6">
      {/* CSV Upload Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-serif font-bold mb-4">Upload Customer Data (CSV)</h3>
        <form onSubmit={handleUploadCSV} className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => document.getElementById('csv-input')?.click()}
              className="btn-secondary"
            >
              Choose CSV File
            </button>
            <span className="text-sm text-muted-foreground flex-1">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </span>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="btn-primary disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-serif font-bold mb-4">Customer Data Sets</h3>
        {dataSets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No customer data sets uploaded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="text-left py-2 px-4 w-80">File Name</th>
                  <th className="text-left py-2 px-4">Records</th>
                  <th className="text-left py-2 px-4">Uploaded Date</th>
                  <th className="text-left py-2 px-4">Status</th>
                  <th className="text-center py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataSets.map((dataSet) => (
                  <tr key={dataSet.id} className={`border-b border-border hover:bg-secondary/30 ${dataSet.is_active ? 'bg-green-500/5' : ''}`}>
                    <td className="py-3 px-4 w-80 overflow-hidden">
                      {editingId === dataSet.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-3 py-1 border border-border rounded-lg bg-input text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(dataSet.id)}
                              className="btn-primary text-xs px-3 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn-secondary text-xs px-3 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between w-80 pr-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{dataSet.file_name}</p>
                              <button
                                onClick={() => handleStartEdit(dataSet)}
                                className="px-1.5 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 rounded transition shrink-0"
                                title="Edit name"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">ID: {dataSet.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{dataSet.record_count}</td>
                    <td className="py-3 px-4">{new Date(dataSet.uploaded_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {dataSet.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs rounded font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-600 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center space-x-2 flex justify-center">
                      <button
                        onClick={() => handleDownload(dataSet)}
                        className="btn-secondary text-xs"
                        title="Download CSV"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleSetActive(dataSet.id)}
                        className="btn-secondary text-xs"
                        disabled={dataSet.is_active}
                        title="Set as Active"
                      >
                        Set Active
                      </button>
                      <button
                        onClick={() => handleDeleteDataSet(dataSet.id)}
                        className="text-red-600 hover:text-red-700 text-lg"
                        title="Delete"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
